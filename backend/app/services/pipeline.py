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
    LocalizationResult, LocalizationStatus,
    QualityAssessment, ReliabilityStatus,
    SpatialDistributionMetrics, ConditioningMetrics,
)
from app.services.image_loader import LoadedImage, ImageLoadError
from app.services.georeferencing import compute_geographic_footprint
from app.services.feature_matcher import detect_and_match
from app.services.geometric_verification import verify_geometry
from app.services.region_estimator import estimate_region
from app.services.quality_assessment import assess_localization_quality
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
        multi_scale=getattr(params, "multi_scale", False),
        max_processing_dim=getattr(params, "max_processing_dim", None),
    )
    warnings.extend(match_result.warnings)

    if not match_result.success:
        status = _classify_match_failure(match_result)
        qa = QualityAssessment(
            status=ReliabilityStatus.REJECTED,
            confidence_score=0.0,
            is_calibrated=False,
            inlier_count=0,
            inlier_ratio=0.0,
            failure_reasons=[match_result.failure_reason or "Feature matching failed."],
            diagnostic_flags=["FEATURE_MATCHING_FAILED"],
        )
        return MatchResult(
            job_id=job_id,
            status=status,
            localization_status=LocalizationStatus.REJECTED,
            georeference=reference.georeference,
            quality_assessment=qa,
            localization=LocalizationResult(
                status=LocalizationStatus.REJECTED,
                georeference=reference.georeference,
                quality_assessment=qa,
                warnings=[match_result.failure_reason or "Feature matching failed."],
            ),
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
        fail_msg = (
            f"Only {match_result.filtered_matches} matches remain after "
            f"filtering (minimum for geometry: {settings.min_matches_before_geometry})."
        )
        qa = QualityAssessment(
            status=ReliabilityStatus.REJECTED,
            confidence_score=0.0,
            is_calibrated=False,
            inlier_count=0,
            inlier_ratio=0.0,
            failure_reasons=[fail_msg],
            diagnostic_flags=["INSUFFICIENT_MATCHES_BEFORE_GEOMETRY"],
        )
        return MatchResult(
            job_id=job_id,
            status=MatchStatus.INSUFFICIENT_MATCHES,
            localization_status=LocalizationStatus.REJECTED,
            georeference=reference.georeference,
            quality_assessment=qa,
            localization=LocalizationResult(
                status=LocalizationStatus.REJECTED,
                georeference=reference.georeference,
                quality_assessment=qa,
                warnings=[fail_msg],
            ),
            reference_image=ref_info,
            query_image=qry_info,
            reference_keypoints=match_result.reference_keypoints,
            query_keypoints=match_result.query_keypoints,
            tentative_matches=match_result.tentative_matches,
            filtered_matches=match_result.filtered_matches,
            failure_reason=fail_msg,
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
        qa = QualityAssessment(
            status=ReliabilityStatus.REJECTED,
            confidence_score=0.0,
            is_calibrated=False,
            inlier_count=geo_result.inlier_count,
            inlier_ratio=geo_result.inlier_ratio,
            failure_reasons=[geo_result.failure_reason or "Geometric verification failed."],
            diagnostic_flags=["GEOMETRIC_VERIFICATION_FAILED"],
        )
        return MatchResult(
            job_id=job_id,
            status=MatchStatus.GEOMETRY_FAILED,
            localization_status=LocalizationStatus.REJECTED,
            georeference=reference.georeference,
            quality_assessment=qa,
            localization=LocalizationResult(
                status=LocalizationStatus.REJECTED,
                georeference=reference.georeference,
                quality_assessment=qa,
                warnings=[geo_result.failure_reason or "Geometric verification failed."],
            ),
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

    # --- Quality Assessment ---
    corners_arr = (
        np.array([
            region_result.top_left,
            region_result.top_right,
            region_result.bottom_right,
            region_result.bottom_left,
        ], dtype=np.float64)
        if region_result.success
        else None
    )

    inlier_pts_qry = (
        match_result.query_pts[geo_result.inlier_mask]
        if (match_result.query_pts is not None and geo_result.inlier_mask is not None)
        else None
    )

    qa_res = assess_localization_quality(
        match_success=match_result.success,
        geometry_success=geo_result.success,
        query_width=query.width,
        query_height=query.height,
        reference_width=reference.width,
        reference_height=reference.height,
        inlier_count=geo_result.inlier_count,
        filtered_matches=match_result.filtered_matches,
        inlier_ratio=geo_result.inlier_ratio,
        query_inliers=inlier_pts_qry,
        homography=geo_result.homography,
        projected_corners=corners_arr,
        mean_reproj_error_px=geo_result.mean_reproj_error,
        median_reproj_error_px=geo_result.median_reproj_error,
        max_reproj_error_px=geo_result.max_reproj_error,
        overlap_fraction=region_result.overlap_fraction,
        min_inliers_threshold=params.min_inliers,
    )

    spatial_schema = (
        SpatialDistributionMetrics(
            bbox_area_ratio=qa_res.spatial_metrics.bbox_area_ratio,
            convex_hull_area_ratio=qa_res.spatial_metrics.convex_hull_area_ratio,
            grid_coverage_ratio=qa_res.spatial_metrics.grid_coverage_ratio,
            spatial_entropy=qa_res.spatial_metrics.spatial_entropy,
            spatial_spread_score=qa_res.spatial_metrics.spatial_spread_score,
        )
        if qa_res.spatial_metrics
        else None
    )

    cond_schema = (
        ConditioningMetrics(
            raw_condition_number=qa_res.conditioning_metrics.raw_condition_number,
            canonical_condition_number=qa_res.conditioning_metrics.canonical_condition_number,
            singular_values=qa_res.conditioning_metrics.singular_values,
            determinant=qa_res.conditioning_metrics.determinant,
            horizon_crossing=qa_res.conditioning_metrics.horizon_crossing,
            quad_angles_deg=qa_res.conditioning_metrics.quad_angles_deg,
            min_quad_angle_deg=qa_res.conditioning_metrics.min_quad_angle_deg,
            max_quad_angle_deg=qa_res.conditioning_metrics.max_quad_angle_deg,
            area_ratio=qa_res.conditioning_metrics.area_ratio,
            scale_factor=qa_res.conditioning_metrics.scale_factor,
        )
        if qa_res.conditioning_metrics
        else None
    )

    qa_schema = QualityAssessment(
        status=qa_res.status,
        confidence_score=qa_res.confidence_score,
        is_calibrated=False,
        confidence_components=qa_res.confidence_components,
        spatial_metrics=spatial_schema,
        conditioning_metrics=cond_schema,
        reprojection_mean_px=qa_res.reprojection_mean_px,
        reprojection_median_px=qa_res.reprojection_median_px,
        reprojection_max_px=qa_res.reprojection_max_px,
        inlier_count=qa_res.inlier_count,
        inlier_ratio=qa_res.inlier_ratio,
        failure_reasons=qa_res.failure_reasons,
        diagnostic_flags=qa_res.diagnostic_flags,
        disclaimer=qa_res.disclaimer,
    )

    # --- Georeferenced Visual Localization ---
    proj_footprint = None
    geo_footprint = None
    if region_result.success and reference.georeference and reference.georeference.is_georeferenced:
        # Project query center to reference pixel coordinates
        cq_x = (query.width - 1.0) / 2.0
        cq_y = (query.height - 1.0) / 2.0
        c_proj_arr = cv2.perspectiveTransform(np.float32([[[cq_x, cq_y]]]), geo_result.homography)
        center_px = (float(c_proj_arr[0, 0, 0]), float(c_proj_arr[0, 0, 1]))

        corners_map = {
            "top_left": region_result.top_left,
            "top_right": region_result.top_right,
            "bottom_right": region_result.bottom_right,
            "bottom_left": region_result.bottom_left,
        }
        proj_footprint, geo_footprint, geo_warnings = compute_geographic_footprint(
            corners_pixel=corners_map,
            center_pixel=center_px,
            georef=reference.georeference,
            ref_width=reference.width,
            ref_height=reference.height,
            in_raster_area_px=region_result.in_raster_area_px,
            extrapolated_area_px=region_result.extrapolated_area_px,
            total_projected_area_px=region_result.total_projected_area_px,
            overlap_fraction=region_result.overlap_fraction,
        )
        if geo_warnings:
            region_warnings.extend(geo_warnings)

        loc_status = LocalizationStatus.LOCALIZED
        loc_result = LocalizationResult(
            status=loc_status,
            georeference=reference.georeference,
            projected_footprint=proj_footprint,
            geographic_footprint=geo_footprint,
            estimated_center_geographic=geo_footprint.center if geo_footprint else None,
            estimated_center_projected=proj_footprint.center if proj_footprint else None,
            is_within_bounds=(len(geo_warnings) == 0),
            quality_assessment=qa_schema,
            warnings=geo_warnings,
        )
    elif region_result.success:
        loc_status = LocalizationStatus.IMAGE_MATCH_ONLY
        loc_result = LocalizationResult(
            status=loc_status,
            georeference=reference.georeference,
            quality_assessment=qa_schema,
            warnings=["Reference raster is not georeferenced; coordinates remain in pixel space."],
        )
    else:
        loc_status = LocalizationStatus.REJECTED
        loc_result = LocalizationResult(
            status=loc_status,
            georeference=reference.georeference,
            quality_assessment=qa_schema,
            warnings=["Region estimation failed; footprint cannot be established."],
        )

    # --- Visualizations ---
    job_dir = settings.results_dir / job_id
    artifact_paths = save_all_visualizations(
        reference, query, match_result, geo_result,
        region_result if region_result.success else None,
        job_dir,
        proj_footprint=proj_footprint,
        geo_footprint=geo_footprint,
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
        localization_status=loc_status,
        georeference=reference.georeference,
        projected_footprint=proj_footprint,
        geographic_footprint=geo_footprint,
        localization=loc_result,
        quality_assessment=qa_schema,
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

    # Generate publication-grade PDF research report
    try:
        from app.services.report_generator import generate_research_report_pdf
        pdf_path = generate_research_report_pdf(result, job_dir)
        result.artifacts["research_report"] = str(pdf_path.relative_to(settings.results_dir.parent).as_posix())
    except Exception as exc:
        logger.warning("Could not auto-generate research report PDF for job %s: %s", job_id, exc)

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
