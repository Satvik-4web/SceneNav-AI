"""
SceneNav AI — FastAPI route definitions.

Endpoints:
  GET  /health
  GET  /api/v1/capabilities
  POST /api/v1/match
  GET  /api/v1/jobs/{job_id}
  GET  /api/v1/artifacts/{job_id}/{filename}
  POST /api/v1/evaluate
"""
from __future__ import annotations

import asyncio
import json
import logging
import re
import uuid
from pathlib import Path
from typing import Annotated, Optional

from fastapi import APIRouter, File, Form, HTTPException, UploadFile, status
from fastapi.responses import FileResponse
from starlette.concurrency import run_in_threadpool

from app.config import settings
from app.schemas import (
    CapabilitiesResponse, EvaluateRequest, HealthResponse,
    JobStatusResponse, MatchParams, MatchResult, MatchStatus,
    SamplePairInfo, SampleListResponse,
)
from app.services.image_loader import load_image_from_bytes, ImageLoadError
from app.services.pipeline import run_matching_pipeline

logger = logging.getLogger(__name__)
router = APIRouter()

# In-memory job store with thread-safe lock and bounded eviction
MAX_JOB_STORE_ITEMS = 200
_JOB_STORE: dict[str, MatchResult] = {}
_JOB_STORE_LOCK = asyncio.Lock()

MAX_UPLOAD_BYTES = settings.max_upload_mb * 1024 * 1024


async def _read_upload_file_bounded(upload_file: UploadFile, max_bytes: int) -> bytes:
    """
    Read an uploaded file in bounded chunks to prevent memory exhaustion attacks.
    Aborts immediately with HTTP 413 if max_bytes is exceeded.
    """
    chunks = []
    total = 0
    chunk_size = 64 * 1024  # 64 KB
    while True:
        chunk = await upload_file.read(chunk_size)
        if not chunk:
            break
        total += len(chunk)
        if total > max_bytes:
            raise HTTPException(
                status_code=status.HTTP_413_CONTENT_TOO_LARGE,
                detail=f"Uploaded file '{upload_file.filename}' exceeds {max_bytes // (1024 * 1024)} MB limit.",
            )
        chunks.append(chunk)
    return b"".join(chunks)


# ---------------------------------------------------------------------------
# GET /health
# ---------------------------------------------------------------------------

@router.get("/health", response_model=HealthResponse, tags=["System"])
async def health_check() -> HealthResponse:
    """Return application health and version."""
    return HealthResponse(
        status="ok",
        version=settings.app_version,
        algorithm_version=settings.algorithm_version,
    )


# ---------------------------------------------------------------------------
# GET /api/v1/capabilities
# ---------------------------------------------------------------------------

@router.get("/api/v1/capabilities", response_model=CapabilitiesResponse, tags=["System"])
async def get_capabilities() -> CapabilitiesResponse:
    """Return supported formats, algorithms, and size limits."""
    return CapabilitiesResponse(
        supported_formats=["JPEG", "PNG", "TIFF", "BMP", "WEBP"],
        algorithms=[
            "ORB + BFMatcher (Hamming) + RANSAC Homography",
            "SIFT + BFMatcher (L2) + RANSAC Homography",
        ],
        max_upload_mb=settings.max_upload_mb,
        max_image_dim=settings.max_image_dim,
        features=[
            "feature_detection",
            "descriptor_matching",
            "ratio_test_filtering",
            "ransac_homography",
            "region_estimation",
            "visualization_artifacts",
        ],
    )


# ---------------------------------------------------------------------------
# POST /api/v1/match
# ---------------------------------------------------------------------------

@router.post(
    "/api/v1/match",
    response_model=MatchResult,
    status_code=status.HTTP_200_OK,
    tags=["Matching"],
)
async def match_images(
    reference_image: Annotated[UploadFile, File(description="Reference map/database image.")],
    query_image:     Annotated[UploadFile, File(description="Query scene image to locate.")],
    algorithm:                 Annotated[str,   Form()] = "ORB",
    orb_max_features:          Annotated[int,   Form()] = 5000,
    ratio_threshold:           Annotated[float, Form()] = 0.75,
    ransac_reproj_threshold:   Annotated[float, Form()] = 4.0,
    min_inliers:               Annotated[int,   Form()] = 10,
    mutual_consistency:        Annotated[bool,  Form()] = False,
) -> MatchResult:
    """
    Match a query image against a reference image.

    Returns structured metrics, artifact references, and warnings.
    No geographic localization claims are made.
    """
    # Validate params via Pydantic (re-raise as 422)
    try:
        params = MatchParams(
            algorithm=algorithm,
            orb_max_features=orb_max_features,
            ratio_threshold=ratio_threshold,
            ransac_reproj_threshold=ransac_reproj_threshold,
            min_inliers=min_inliers,
            mutual_consistency=mutual_consistency,
        )
    except Exception as exc:
        raise HTTPException(status_code=422, detail=str(exc))

    # Read and size-check uploads using bounded streaming
    ref_bytes = await _read_upload_file_bounded(reference_image, MAX_UPLOAD_BYTES)
    qry_bytes = await _read_upload_file_bounded(query_image, MAX_UPLOAD_BYTES)

    # Load and validate images
    try:
        ref_img = load_image_from_bytes(
            ref_bytes, reference_image.filename or "reference.jpg"
        )
        qry_img = load_image_from_bytes(
            qry_bytes, query_image.filename or "query.jpg"
        )
    except ImageLoadError as exc:
        raise HTTPException(status_code=400, detail=str(exc))

    # Run pipeline in worker thread to prevent event-loop blocking
    job_id = str(uuid.uuid4())
    try:
        result = await run_in_threadpool(
            run_matching_pipeline, ref_img, qry_img, params, job_id=job_id
        )
    except Exception as exc:
        logger.exception("Unexpected error in matching pipeline for job %s", job_id)
        # Return structured error rather than exposing stack trace
        raise HTTPException(
            status_code=500,
            detail="An internal processing error occurred. Check server logs."
        )

    async with _JOB_STORE_LOCK:
        if len(_JOB_STORE) >= MAX_JOB_STORE_ITEMS:
            for old_id in list(_JOB_STORE.keys())[:50]:
                _JOB_STORE.pop(old_id, None)
        _JOB_STORE[job_id] = result

    return result


# ---------------------------------------------------------------------------
# GET /api/v1/jobs/{job_id}
# ---------------------------------------------------------------------------

@router.get(
    "/api/v1/jobs/{job_id}",
    response_model=JobStatusResponse,
    tags=["Matching"],
)
async def get_job(job_id: str) -> JobStatusResponse:
    """Return job status and result for a previously submitted match."""
    async with _JOB_STORE_LOCK:
        if job_id not in _JOB_STORE:
            raise HTTPException(status_code=404, detail=f"Job '{job_id}' not found.")
        result = _JOB_STORE[job_id]

    return JobStatusResponse(
        job_id=job_id,
        status=result.status.value,
        result=result,
    )


# ---------------------------------------------------------------------------
# GET /api/v1/artifacts/{job_id}/{filename}
# ---------------------------------------------------------------------------

@router.get(
    "/api/v1/artifacts/{job_id}/{filename}",
    tags=["Artifacts"],
)
async def get_artifact(job_id: str, filename: str) -> FileResponse:
    """
    Serve a generated artifact image for a valid job.

    Security:
    - job_id must match alphanumeric/hyphen pattern.
    - filename must match safe pattern and be a plain basename.
    - target path must resolve strictly within the job directory and within results_dir.
    - only image and JSON formats are served.
    """
    if not re.match(r"^[a-zA-Z0-9_-]+$", job_id):
        raise HTTPException(status_code=400, detail="Invalid job ID format.")

    if not re.match(r"^[a-zA-Z0-9_.-]+$", filename) or Path(filename).name != filename:
        raise HTTPException(status_code=400, detail="Invalid filename.")

    async with _JOB_STORE_LOCK:
        in_store = job_id in _JOB_STORE

    results_root = settings.results_dir.resolve()
    job_dir = (settings.results_dir / job_id).resolve()
    artifact_path = (job_dir / filename).resolve()

    if not in_store:
        try:
            if not job_dir.is_relative_to(results_root) or not job_dir.is_dir():
                raise HTTPException(status_code=404, detail=f"Job '{job_id}' not found.")
        except (ValueError, OSError):
            raise HTTPException(status_code=404, detail=f"Job '{job_id}' not found.")

    try:
        if (
            not job_dir.is_relative_to(results_root)
            or not artifact_path.is_relative_to(job_dir)
            or not artifact_path.is_file()
        ):
            raise HTTPException(status_code=404, detail=f"Artifact '{filename}' not found.")
    except (ValueError, OSError):
        raise HTTPException(status_code=404, detail="Invalid artifact path.")

    # Only serve image files and JSON
    if artifact_path.suffix.lower() not in {".png", ".jpg", ".jpeg", ".json"}:
        raise HTTPException(status_code=400, detail="Unsupported artifact type.")

    return FileResponse(str(artifact_path))


# ---------------------------------------------------------------------------
# POST /api/v1/evaluate
# ---------------------------------------------------------------------------

@router.post(
    "/api/v1/evaluate",
    tags=["Evaluation"],
)
async def run_evaluation(request: EvaluateRequest) -> dict:
    """
    Run a batch evaluation over a named dataset manifest.

    Only manifests in the configured data/manifests/ directory are accessible.
    """
    from app.services.evaluation import aggregate_metrics, SinglePairMetrics, save_results_json, save_results_csv
    from app.services.image_loader import load_image_from_path

    manifests_root = (settings.data_dir / "manifests").resolve()
    manifest_path = (manifests_root / request.manifest_name).resolve()
    try:
        if not manifest_path.is_relative_to(manifests_root) or not manifest_path.is_file():
            raise HTTPException(
                status_code=404,
                detail=f"Manifest '{request.manifest_name}' not found in data/manifests/."
            )
    except (ValueError, OSError):
        raise HTTPException(status_code=400, detail="Invalid manifest path.")

    try:
        with open(manifest_path, "r", encoding="utf-8") as f:
            manifest = json.load(f)
    except Exception as exc:
        raise HTTPException(status_code=400, detail=f"Cannot parse manifest: {exc}")

    pairs = manifest.get("pairs", [])
    if not pairs:
        raise HTTPException(status_code=400, detail="Manifest contains no pairs.")

    params = request.params
    pair_metrics: list[SinglePairMetrics] = []
    eval_job_id = str(uuid.uuid4())

    for pair in pairs[:50]:  # Cap at 50 pairs per API call
        pair_id = pair.get("id", "unknown")
        ref_path_str = pair.get("reference")
        qry_path_str = pair.get("query")

        if not ref_path_str or not qry_path_str:
            pair_metrics.append(SinglePairMetrics(
                pair_id=pair_id,
                status="invalid_image",
                failure_reason="Missing reference or query path in manifest.",
            ))
            continue

        # Restrict paths to data directory (no traversal, accounting for symlinks)
        data_root = settings.data_dir.resolve()
        ref_path = (settings.data_dir / ref_path_str).resolve()
        qry_path = (settings.data_dir / qry_path_str).resolve()

        try:
            is_safe = (
                ref_path.is_relative_to(data_root)
                and qry_path.is_relative_to(data_root)
                and ref_path.is_file()
                and qry_path.is_file()
            )
        except (ValueError, OSError):
            is_safe = False

        if not is_safe:
            pair_metrics.append(SinglePairMetrics(
                pair_id=pair_id,
                status="processing_error",
                failure_reason="Path traversal detected or image file does not exist.",
            ))
            continue

        try:
            ref_img = load_image_from_path(ref_path)
            qry_img = load_image_from_path(qry_path)
            job_id = str(uuid.uuid4())
            result = run_matching_pipeline(ref_img, qry_img, params, job_id=job_id)
            pm = SinglePairMetrics(
                pair_id=pair_id,
                status=result.status.value,
                reference_keypoints=result.reference_keypoints,
                query_keypoints=result.query_keypoints,
                tentative_matches=result.tentative_matches,
                filtered_matches=result.filtered_matches,
                geometric_inliers=result.geometric_inliers or 0,
                inlier_ratio=result.inlier_ratio or 0.0,
                mean_reproj_error_px=(
                    result.reprojection_error.mean_px
                    if result.reprojection_error else None
                ),
                processing_time_s=result.processing_time_s,
                failure_reason=result.failure_reason,
                warnings=result.warnings,
            )
        except ImageLoadError as exc:
            pm = SinglePairMetrics(
                pair_id=pair_id,
                status="invalid_image",
                failure_reason=str(exc),
            )
        except Exception as exc:
            logger.exception("Error processing pair %s", pair_id)
            pm = SinglePairMetrics(
                pair_id=pair_id,
                status="processing_error",
                failure_reason="Internal error.",
            )
        pair_metrics.append(pm)

    summary = aggregate_metrics(pair_metrics)

    # Save results
    eval_dir = settings.results_dir / f"eval_{eval_job_id}"
    eval_dir.mkdir(parents=True, exist_ok=True)
    save_results_json(summary, eval_dir / "summary.json")
    save_results_csv(pair_metrics, eval_dir / "pairs.csv")

    return {
        "eval_id": eval_job_id,
        "total_pairs": summary.total_pairs,
        "successful_pairs": summary.successful_pairs,
        "success_rate": summary.success_rate,
        "mean_inliers": summary.mean_inliers,
        "mean_reproj_error_px": summary.mean_reproj_error_px,
        "mean_processing_time_s": summary.mean_processing_time_s,
        "failure_breakdown": summary.failure_breakdown,
    }


# ---------------------------------------------------------------------------
# GET /api/v1/samples
# ---------------------------------------------------------------------------

@router.get(
    "/api/v1/samples",
    response_model=SampleListResponse,
    tags=["Samples"],
)
async def list_samples(manifest: Optional[str] = None) -> SampleListResponse:
    """Return available sample pairs from a manifest for UI demo."""
    manifest_name = manifest or "synthetic_pairs.json"
    safe_name = Path(manifest_name).name
    if safe_name != manifest_name or "/" in manifest_name or "\\" in manifest_name or not manifest_name.endswith(".json"):
        raise HTTPException(status_code=400, detail="Invalid manifest filename.")

    manifest_path = settings.data_dir / "manifests" / safe_name
    if not manifest_path.exists():
        raise HTTPException(status_code=404, detail=f"Manifest '{safe_name}' not found.")

    try:
        with open(manifest_path, "r", encoding="utf-8") as f:
            data = json.load(f)
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Cannot read samples manifest: {exc}")

    pairs_out: list[SamplePairInfo] = []
    for p in data.get("pairs", []):
        tx = p.get("transform") or {}
        tx_type = tx.get("type", "uncalibrated" if not p.get("is_negative") else "negative")
        pair_id = p.get("id", "pair")
        label = f"{pair_id.replace('_', ' ').title()} ({tx_type})"
        pairs_out.append(SamplePairInfo(
            id=pair_id,
            label=label,
            reference_path=p.get("reference", ""),
            query_path=p.get("query", ""),
            transform_type=tx_type,
            description=p.get("description", p.get("note", "Evaluation pair.")),
            ground_truth_type=p.get("ground_truth_type", "synthetic_homography"),
        ))

    return SampleListResponse(
        manifest_name=data.get("name", safe_name),
        description=data.get("description", "Benchmark pairs"),
        pairs=pairs_out,
    )


# ---------------------------------------------------------------------------
# GET /api/v1/samples/image/{category}/{filename}
# ---------------------------------------------------------------------------

@router.get(
    "/api/v1/samples/image/{category}/{filename}",
    tags=["Samples"],
)
async def get_sample_image(category: str, filename: str) -> FileResponse:
    """Safely serve a reference or query sample image for UI preview."""
    if category not in {"references", "queries"}:
        raise HTTPException(status_code=400, detail="Invalid sample category.")

    if not re.match(r"^[a-zA-Z0-9_.-]+$", filename) or Path(filename).name != filename:
        raise HTTPException(status_code=400, detail="Invalid filename format.")

    data_root = settings.data_dir.resolve()
    category_dir = (settings.data_dir / category).resolve()
    img_path = (category_dir / filename).resolve()

    try:
        if (
            not img_path.is_relative_to(category_dir)
            or not img_path.is_relative_to(data_root)
            or not img_path.is_file()
        ):
            raise HTTPException(status_code=404, detail="Sample image not found.")
    except (ValueError, OSError):
        raise HTTPException(status_code=404, detail="Sample image not found.")

    if img_path.suffix.lower() not in {".png", ".jpg", ".jpeg", ".tiff", ".tif", ".bmp", ".webp"}:
        raise HTTPException(status_code=400, detail="Unsupported sample image type.")

    return FileResponse(str(img_path))


# ---------------------------------------------------------------------------
# Research Demonstration Endpoints
# ---------------------------------------------------------------------------

def _get_research_dir() -> Path:
    """Return the latest available research demonstration directory."""
    for candidate in [
        settings.results_dir / "demo_readiness_release_20261022",
        settings.results_dir / "forensic_qa_pass_20261022",
        settings.results_dir / "visual_refinement_pass2_20261022",
        settings.results_dir / "refined_demonstration_20261022",
        settings.results_dir / "research_demo_20261022",
    ]:
        if (candidate / "experiment_record.json").exists():
            return candidate.resolve()
    return (settings.results_dir / "demo_readiness_release_20261022").resolve()


@router.get(
    "/api/v1/research/demonstration",
    tags=["Research Demonstration"],
)
async def get_research_demonstration() -> dict:
    """Return the audited single source of truth experiment record."""
    res_dir = _get_research_dir()
    record_path = res_dir / "experiment_record.json"
    if not record_path.exists():
        raise HTTPException(status_code=404, detail="Research demonstration record not found.")

    try:
        with open(record_path, "r", encoding="utf-8") as f:
            return json.load(f)
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Failed to read experiment record: {exc}")


@router.get(
    "/api/v1/research/artifacts/{filename}",
    tags=["Research Demonstration"],
)
async def get_research_artifact(filename: str) -> FileResponse:
    """Safely serve publication-grade research figures."""
    if not re.match(r"^[a-zA-Z0-9_.-]+$", filename) or Path(filename).name != filename:
        raise HTTPException(status_code=400, detail="Invalid filename format.")

    res_dir = _get_research_dir()
    file_path = (res_dir / filename).resolve()
    results_root = settings.results_dir.resolve()

    try:
        if (
            not file_path.is_relative_to(res_dir)
            or not file_path.is_relative_to(results_root)
            or not file_path.is_file()
        ):
            raise HTTPException(status_code=404, detail=f"Research artifact '{filename}' not found.")
    except (ValueError, OSError):
        raise HTTPException(status_code=404, detail="Invalid artifact path.")

    if file_path.suffix.lower() not in {".png", ".jpg", ".jpeg", ".json"}:
        raise HTTPException(status_code=400, detail="Unsupported artifact format.")

    return FileResponse(str(file_path))



