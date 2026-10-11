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

import json
import logging
import uuid
from pathlib import Path
from typing import Annotated

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

# In-memory job store (MVP: single process, not persistent across restarts)
_JOB_STORE: dict[str, MatchResult] = {}

MAX_UPLOAD_BYTES = settings.max_upload_mb * 1024 * 1024


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
        algorithms=["ORB + BFMatcher + RANSAC Homography"],
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
            orb_max_features=orb_max_features,
            ratio_threshold=ratio_threshold,
            ransac_reproj_threshold=ransac_reproj_threshold,
            min_inliers=min_inliers,
            mutual_consistency=mutual_consistency,
        )
    except Exception as exc:
        raise HTTPException(status_code=422, detail=str(exc))

    # Read and size-check uploads
    ref_bytes = await reference_image.read()
    qry_bytes = await query_image.read()

    if len(ref_bytes) > MAX_UPLOAD_BYTES:
        raise HTTPException(
            status_code=413,
            detail=f"Reference image exceeds {settings.max_upload_mb} MB limit."
        )
    if len(qry_bytes) > MAX_UPLOAD_BYTES:
        raise HTTPException(
            status_code=413,
            detail=f"Query image exceeds {settings.max_upload_mb} MB limit."
        )

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

    Security: only pre-computed job directories are accessible.
    Path traversal is blocked by validating the job_id and filename
    against the known results directory.
    """
    # Validate job exists
    if job_id not in _JOB_STORE:
        raise HTTPException(status_code=404, detail=f"Job '{job_id}' not found.")

    # Block path traversal: filename must be a plain basename
    safe_name = Path(filename).name
    if safe_name != filename or "/" in filename or "\\" in filename:
        raise HTTPException(status_code=400, detail="Invalid filename.")

    artifact_path = settings.results_dir / job_id / safe_name
    if not artifact_path.exists() or not artifact_path.is_file():
        raise HTTPException(status_code=404, detail=f"Artifact '{filename}' not found.")

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

    manifest_path = settings.data_dir / "manifests" / request.manifest_name
    if not manifest_path.exists():
        raise HTTPException(
            status_code=404,
            detail=f"Manifest '{request.manifest_name}' not found in data/manifests/."
        )

    try:
        with open(manifest_path) as f:
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

        # Restrict paths to data directory (no traversal)
        ref_path = (settings.data_dir / ref_path_str).resolve()
        qry_path = (settings.data_dir / qry_path_str).resolve()
        data_root = settings.data_dir.resolve()

        if not str(ref_path).startswith(str(data_root)) or not str(qry_path).startswith(str(data_root)):
            pair_metrics.append(SinglePairMetrics(
                pair_id=pair_id,
                status="processing_error",
                failure_reason="Path traversal detected — access denied.",
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
    import dataclasses
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
async def list_samples() -> SampleListResponse:
    """Return available sample pairs from the synthetic manifest for easy UI demo."""
    manifest_path = settings.data_dir / "manifests" / "synthetic_pairs.json"
    if not manifest_path.exists():
        raise HTTPException(status_code=404, detail="Synthetic samples manifest not found.")

    try:
        with open(manifest_path, "r", encoding="utf-8") as f:
            data = json.load(f)
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Cannot read samples manifest: {exc}")

    pairs_out: list[SamplePairInfo] = []
    for p in data.get("pairs", []):
        tx = p.get("transform", {})
        tx_type = tx.get("type", "unknown")
        pair_id = p.get("id", "pair")
        label = f"{pair_id.replace('_', ' ').title()} ({tx_type})"
        pairs_out.append(SamplePairInfo(
            id=pair_id,
            label=label,
            reference_path=p.get("reference", ""),
            query_path=p.get("query", ""),
            transform_type=tx_type,
            description=p.get("note", "Synthetic evaluation pair."),
            ground_truth_type=p.get("ground_truth_type", "synthetic_pixel"),
        ))

    return SampleListResponse(
        manifest_name=data.get("name", "synthetic_pairs"),
        description=data.get("description", "Synthetic benchmark pairs"),
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

    safe_name = Path(filename).name
    if safe_name != filename or "/" in filename or "\\" in filename:
        raise HTTPException(status_code=400, detail="Invalid filename format.")

    img_path = (settings.data_dir / category / safe_name).resolve()
    data_root = settings.data_dir.resolve()
    if not str(img_path).startswith(str(data_root)) or not img_path.exists():
        raise HTTPException(status_code=404, detail="Sample image not found.")

    return FileResponse(str(img_path))

