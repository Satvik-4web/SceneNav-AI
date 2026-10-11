"""
SceneNav AI — Main matching pipeline.

Orchestrates image loading → feature matching → geometric verification →
region estimation → visualization into a single callable function.
"""
from __future__ import annotations

import json
import logging
import time
import uuid
from pathlib import Path
from typing import Optional

import cv2
import numpy as np

from app.config import settings
from app.schemas import (
    ImageInfo, MatchParams, MatchResult, MatchStatus,
    RegionCoordinates, ReprojectionStats,
)
from app.services.image_loader import LoadedImage, ImageLoadError
from app.services.feature_matcher import detect_and_match
from app.services.geometric_verification import verify_geometry
from app.services.region_estimator import estimate_region
from app.services.visualization import save_all_visualizations

logger = logging.getLogger(__name__)


def _software_versions() -> dict[str, str]:
    return {
        "opencv": cv2.__version__,
        "numpy": np.__version__,
        "app": settings.app_version,
    }


def run_matching_pipeline(
    reference: LoadedImage,
    query: LoadedImage,
    params: MatchParams,
    job_id: Optional[str] = None,
) -> MatchResult:
    """
    End-to-end image matching pipeline.

    Returns a MatchResult with structured metrics and artifact paths.
    """
    if job_id is None:
        job_id = str(uuid.uuid4())

    t_start = time.perf_counter()
    warnings: list[str] = []

    ref_info = ImageInfo(
        filename=reference.filename,
        width=reference.width,
        height=reference.height,
        channels=reference.channels,
        file_size_bytes=reference.file_size_bytes,
    )
    qry_info = ImageInfo(
        filename=query.filename,
        width=query.width,
        height=query.height,
        channels=query.channels,
        file_size_bytes=query.file_size_bytes,
    )

    # --- Feature matching ---
    match_result = detect_and_match(
        reference, query,
        algorithm=getattr(params, "algorithm", "ORB"),
        orb_max_features=params.orb_max_features,
        ratio_threshold=params.ratio_threshold,
        mutual_consistency=params.mutual_consistency,
    )
    warnings.extend(match_result.warnings)

    if not match_result.success:
        status = _classify_match_failure(match_result)
        return MatchResult(
            job_id=job_id,
            status=status,
            reference_image=ref_info,
            query_image=qry_info,
            reference_keypoints=match_result.reference_keypoints,
            query_keypoints=match_result.query_keypoints,
            tentative_matches=match_result.tentative_matches,
            filtered_matches=match_result.filtered_matches,
            failure_reason=match_result.failure_reason,
            warnings=warnings,
            processing_time_s=time.perf_counter() - t_start,
            algorithm_params=params,
            algorithm_version=settings.algorithm_version,
            software_versions=_software_versions(),
        )

    if match_result.filtered_matches < settings.min_matches_before_geometry:
        return MatchResult(
            job_id=job_id,
            status=MatchStatus.INSUFFICIENT_MATCHES,
            reference_image=ref_info,
            query_image=qry_info,
            reference_keypoints=match_result.reference_keypoints,
            query_keypoints=match_result.query_keypoints,
            tentative_matches=match_result.tentative_matches,
            filtered_matches=match_result.filtered_matches,
            failure_reason=(
                f"Only {match_result.filtered_matches} matches remain after "
                f"filtering (minimum for geometry: {settings.min_matches_before_geometry})."
            ),
            warnings=warnings,
            processing_time_s=time.perf_counter() - t_start,
            algorithm_params=params,
            algorithm_version=settings.algorithm_version,
            software_versions=_software_versions(),
        )

    # --- Geometric verification ---
    geo_result = verify_geometry(
        match_result.query_pts,
        match_result.reference_pts,
        ransac_reproj_threshold=params.ransac_reproj_threshold,
        min_inliers=params.min_inliers,
    )
    warnings.extend(geo_result.warnings)

    if not geo_result.success:
        return MatchResult(
            job_id=job_id,
            status=MatchStatus.GEOMETRY_FAILED,
            reference_image=ref_info,
            query_image=qry_info,
            reference_keypoints=match_result.reference_keypoints,
            query_keypoints=match_result.query_keypoints,
            tentative_matches=match_result.tentative_matches,
            filtered_matches=match_result.filtered_matches,
            geometric_inliers=geo_result.inlier_count,
            inlier_ratio=geo_result.inlier_ratio,
            failure_reason=geo_result.failure_reason,
            warnings=warnings,
            processing_time_s=time.perf_counter() - t_start,
            algorithm_params=params,
            algorithm_version=settings.algorithm_version,
            software_versions=_software_versions(),
        )

    # --- Region estimation ---
    region_result = estimate_region(
        query.width, query.height,
        reference.width, reference.height,
        geo_result.homography,
    )
    region_warnings = list(region_result.warnings)

    # --- Visualizations ---
    job_dir = settings.results_dir / job_id
    artifact_paths = save_all_visualizations(
        reference, query, match_result, geo_result,
        region_result if region_result.success else None,
        job_dir,
    )

    # Save JSON result too
    json_path = job_dir / "result.json"
    reproj = None
    if geo_result.mean_reproj_error is not None:
        reproj = ReprojectionStats(
            mean_px=geo_result.mean_reproj_error,
            median_px=geo_result.median_reproj_error or 0.0,
            max_px=geo_result.max_reproj_error or 0.0,
        )

    estimated_region = None
    if region_result.success:
        estimated_region = RegionCoordinates(
            top_left=region_result.top_left,
            top_right=region_result.top_right,
            bottom_right=region_result.bottom_right,
            bottom_left=region_result.bottom_left,
        )

    homography_list = geo_result.homography.tolist() if geo_result.homography is not None else None

    result = MatchResult(
        job_id=job_id,
        status=MatchStatus.SUCCESS,
        reference_image=ref_info,
        query_image=qry_info,
        reference_keypoints=match_result.reference_keypoints,
        query_keypoints=match_result.query_keypoints,
        tentative_matches=match_result.tentative_matches,
        filtered_matches=match_result.filtered_matches,
        geometric_inliers=geo_result.inlier_count,
        inlier_ratio=geo_result.inlier_ratio,
        reprojection_error=reproj,
        homography_matrix=homography_list,
        estimated_region=estimated_region,
        region_warnings=region_warnings,
        warnings=warnings,
        processing_time_s=time.perf_counter() - t_start,
        algorithm_params=params,
        algorithm_version=f"{params.algorithm}-v1",
        software_versions=_software_versions(),
        artifacts={k: str(Path(v).relative_to(settings.results_dir.parent).as_posix())
                   for k, v in artifact_paths.items()},
    )

    with open(json_path, "w") as f:
        json.dump(result.model_dump(), f, indent=2, default=str)

    logger.info(
        "Job %s completed: status=%s inliers=%d time=%.2fs",
        job_id, result.status, geo_result.inlier_count,
        result.processing_time_s,
    )
    return result


def _classify_match_failure(match_result) -> MatchStatus:
    if match_result.reference_keypoints == 0 or match_result.query_keypoints == 0:
        return MatchStatus.INSUFFICIENT_FEATURES
    if match_result.filtered_matches == 0:
        return MatchStatus.INSUFFICIENT_MATCHES
    return MatchStatus.PROCESSING_ERROR
