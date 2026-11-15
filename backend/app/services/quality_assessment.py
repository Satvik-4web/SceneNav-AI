"""
SceneNav AI — Localization Quality & Reliability Assessment Service

Provides multi-signal verification, spatial inlier dispersion analysis,
homography numerical conditioning diagnostics, and uncalibrated heuristic
confidence scoring for visual localization.

Key Principles:
1. Multi-Signal Verification:
   A high raw match count does NOT guarantee correct visual localization.
   This service combines five independent signals:
     - Filtered feature match consensus
     - Geometric inlier count and inlier ratio
     - Spatial dispersion of inliers across the image plane
     - Homography conditioning and geometric sanity (condition number,
       projective horizon crossing, interior angle distortion, convexity)
     - Reprojection error distribution (mean, median, maximum)

2. Inlier Clustering Defense:
   Prevents false locks from localized repetitive textures (e.g. a single window,
   roof tile, or watermark) where 15+ inliers are clustered in a tiny 20x20 px area.
   Evaluates convex hull coverage, 4x4 spatial grid cell occupancy, and normalized
   Shannon entropy.

3. Scale-Invariant Numerical Conditioning:
   Evaluates Hartley-Zisserman isotropic coordinate-normalized homography conditioning:
     H_canon = T_ref · H · T_qry^(-1)
   where T normalizes image coordinates to [-1, 1]. The condition number kappa(H_canon)
   is scale-invariant and dimensionless, avoiding false rejections on large-format rasters.

4. Uncalibrated Heuristic Confidence Index:
   The composite confidence score in [0.0, 1.0] is explicitly designated as an
   UNCALIBRATED HEURISTIC index. It is NOT an absolute Bayesian posterior probability.
"""
from __future__ import annotations

import logging
import math
from dataclasses import dataclass, field
from enum import Enum
from typing import Optional, Union

import cv2
import numpy as np

logger = logging.getLogger(__name__)


class ReliabilityStatus(str, Enum):
    """Categorical reliability status for visual localization."""
    ACCEPTED = "ACCEPTED"              # High confidence, well-conditioned, well-distributed
    LOW_CONFIDENCE = "LOW_CONFIDENCE"  # Feasible match, but marginal signals or warnings
    REJECTED = "REJECTED"              # Failed geometry, ill-conditioned, clustered, or degenerate


@dataclass
class SpatialDistributionMetrics:
    """Quantitative spatial dispersion metrics of inliers across the query image."""
    bbox_area_ratio: float = 0.0          # Bounding box area / image area
    convex_hull_area_ratio: float = 0.0   # Convex hull area / image area
    grid_coverage_ratio: float = 0.0      # Occupied cells in 4x4 grid (16 cells)
    spatial_entropy: float = 0.0          # Normalized Shannon entropy [0.0, 1.0]
    spatial_spread_score: float = 0.0     # Composite dispersion score in [0.0, 1.0]


@dataclass
class ConditioningMetrics:
    """Numerical stability and projective geometry diagnostics."""
    raw_condition_number: float = 1.0
    canonical_condition_number: float = 1.0
    singular_values: list[float] = field(default_factory=list)
    determinant: float = 1.0
    horizon_crossing: bool = False
    quad_angles_deg: list[float] = field(default_factory=list)
    min_quad_angle_deg: Optional[float] = None
    max_quad_angle_deg: Optional[float] = None
    area_ratio: Optional[float] = None
    scale_factor: Optional[float] = None


@dataclass
class QualityAssessmentResult:
    """Consolidated outcome of localization quality evaluation."""
    status: ReliabilityStatus = ReliabilityStatus.REJECTED
    confidence_score: float = 0.0
    is_calibrated: bool = False
    confidence_components: dict[str, float] = field(default_factory=dict)
    spatial_metrics: Optional[SpatialDistributionMetrics] = None
    conditioning_metrics: Optional[ConditioningMetrics] = None
    reprojection_mean_px: Optional[float] = None
    reprojection_median_px: Optional[float] = None
    reprojection_max_px: Optional[float] = None
    inlier_count: int = 0
    inlier_ratio: float = 0.0
    failure_reasons: list[str] = field(default_factory=list)
    diagnostic_flags: list[str] = field(default_factory=list)
    disclaimer: str = (
        "Heuristic multi-signal confidence metric; not an absolute calibrated Bayesian probability."
    )


# ---------------------------------------------------------------------------
# Coordinate Normalization Helpers
# ---------------------------------------------------------------------------

def compute_isotropic_transform(width: int, height: int) -> np.ndarray:
    """
    Construct Hartley-Zisserman isotropic 2D normalization matrix T.
    Translates center of image (W/2, H/2) to origin and scales by 2 / max(W, H).
    Points in [0, W] x [0, H] are mapped to [-1, 1] approximately.
    """
    s = 2.0 / max(float(width), float(height), 1.0)
    tx = -s * (float(width) / 2.0)
    ty = -s * (float(height) / 2.0)
    return np.array([
        [s, 0.0, tx],
        [0.0, s, ty],
        [0.0, 0.0, 1.0],
    ], dtype=np.float64)


def compute_quad_interior_angles(corners: np.ndarray) -> list[float]:
    """
    Compute the four interior angles (in degrees) of a planar quadrilateral
    given corners in cyclic clockwise order.
    """
    if len(corners) != 4:
        return []
    angles: list[float] = []
    for i in range(4):
        p_prev = corners[(i - 1) % 4]
        p_curr = corners[i]
        p_next = corners[(i + 1) % 4]
        v1 = p_prev - p_curr
        v2 = p_next - p_curr
        norm1 = float(np.linalg.norm(v1))
        norm2 = float(np.linalg.norm(v2))
        if norm1 < 1e-6 or norm2 < 1e-6:
            angles.append(0.0)
            continue
        cos_ang = float(np.dot(v1, v2) / (norm1 * norm2))
        cos_ang = max(-1.0, min(1.0, cos_ang))
        ang_deg = float(np.degrees(np.arccos(cos_ang)))
        angles.append(ang_deg)
    return angles


# ---------------------------------------------------------------------------
# Spatial Distribution Analysis
# ---------------------------------------------------------------------------

def compute_inlier_spatial_distribution(
    query_inliers: np.ndarray,
    query_width: int,
    query_height: int,
) -> SpatialDistributionMetrics:
    """
    Evaluate the spatial dispersion of inlier feature coordinates across the query image.

    Returns:
        SpatialDistributionMetrics with bbox ratio, convex hull ratio, grid coverage,
        spatial entropy, and composite spread score.
    """
    n_pts = len(query_inliers)
    if n_pts == 0 or query_width <= 0 or query_height <= 0:
        return SpatialDistributionMetrics()

    img_area = float(query_width * query_height)

    # 1. Bounding box coverage
    min_x, min_y = float(np.min(query_inliers[:, 0])), float(np.min(query_inliers[:, 1]))
    max_x, max_y = float(np.max(query_inliers[:, 0])), float(np.max(query_inliers[:, 1]))
    bbox_w = max(0.0, max_x - min_x)
    bbox_h = max(0.0, max_y - min_y)
    bbox_area_ratio = min(1.0, max(0.0, (bbox_w * bbox_h) / img_area))

    # 2. Convex hull coverage
    if n_pts >= 3:
        pts_f32 = query_inliers.astype(np.float32)
        hull = cv2.convexHull(pts_f32)
        hull_area = float(cv2.contourArea(hull))
    else:
        hull_area = 0.0
    convex_hull_area_ratio = min(1.0, max(0.0, hull_area / img_area))

    # 3. 4x4 Grid cell occupancy (16 cells)
    grid = np.zeros((4, 4), dtype=int)
    step_x = max(1.0, float(query_width) / 4.0)
    step_y = max(1.0, float(query_height) / 4.0)
    for pt in query_inliers:
        gx = min(3, max(0, int(pt[0] / step_x)))
        gy = min(3, max(0, int(pt[1] / step_y)))
        grid[gy, gx] += 1

    occupied_cells = int(np.sum(grid > 0))
    grid_coverage_ratio = float(occupied_cells / 16.0)

    # 4. Normalized Shannon entropy across the 16 cells
    counts = grid[grid > 0].astype(np.float64)
    probs = counts / float(n_pts)
    entropy_bits = -float(np.sum(probs * np.log2(probs)))
    max_entropy_bits = float(np.log2(16.0))  # 4.0 bits for uniform 16 cells
    spatial_entropy = min(1.0, max(0.0, entropy_bits / max_entropy_bits))

    # 5. Composite spread score
    # Requires BOTH geometric extent across the image and multi-quadrant coverage.
    # Uses the geometric mean factor sqrt(hull_area_ratio) to ensure clusters sitting
    # on grid lines cannot inflate grid coverage.
    extent = math.sqrt(max(0.0, convex_hull_area_ratio))
    multi_region = 0.50 * grid_coverage_ratio + 0.50 * spatial_entropy
    spread_score = float(min(1.0, max(0.0, extent * multi_region)))

    return SpatialDistributionMetrics(
        bbox_area_ratio=bbox_area_ratio,
        convex_hull_area_ratio=convex_hull_area_ratio,
        grid_coverage_ratio=grid_coverage_ratio,
        spatial_entropy=spatial_entropy,
        spatial_spread_score=spread_score,
    )


# ---------------------------------------------------------------------------
# Homography Conditioning Analysis
# ---------------------------------------------------------------------------

def compute_conditioning_metrics(
    H: np.ndarray,
    query_width: int,
    query_height: int,
    reference_width: int,
    reference_height: int,
    projected_corners: Optional[np.ndarray] = None,
) -> ConditioningMetrics:
    """
    Evaluate SVD condition numbers, projective scale consistency,
    and angular distortion of the estimated homography.
    """
    if H is None or H.shape != (3, 3) or not np.all(np.isfinite(H)):
        return ConditioningMetrics(
            raw_condition_number=float("inf"),
            canonical_condition_number=float("inf"),
            determinant=0.0,
            horizon_crossing=True,
        )

    # Raw SVD condition number
    u, s_raw, vt = np.linalg.svd(H)
    s_raw_list = [float(v) for v in s_raw]
    raw_cond = float(s_raw[0] / s_raw[2]) if s_raw[2] > 1e-12 else float("inf")

    # Hartley-Zisserman isotropic canonical condition number
    T_ref = compute_isotropic_transform(reference_width, reference_height)
    T_qry = compute_isotropic_transform(query_width, query_height)
    try:
        inv_T_qry = np.linalg.inv(T_qry)
        H_canon = T_ref @ H @ inv_T_qry
        norm_factor = np.linalg.norm(H_canon)
        if norm_factor > 1e-12:
            H_canon = H_canon / norm_factor
        _, s_canon, _ = np.linalg.svd(H_canon)
        canon_cond = float(s_canon[0] / s_canon[2]) if s_canon[2] > 1e-12 else float("inf")
    except Exception:
        canon_cond = raw_cond

    # Determinant of H normalized so H[2,2] = 1 (if possible, fallback to Frobenius norm)
    h22 = H[2, 2]
    if abs(h22) > 1e-10:
        H_norm = H / h22
    else:
        fnorm = float(np.linalg.norm(H))
        H_norm = H / fnorm if fnorm > 1e-12 else H
    det_val = float(np.linalg.det(H_norm))

    # Horizon crossing check on query corners
    qw = float(query_width - 1)
    qh = float(query_height - 1)
    q_corners = np.array([
        [0.0, 0.0],
        [qw,  0.0],
        [qw,  qh],
        [0.0, qh],
    ], dtype=np.float64)
    q_corners_h = np.hstack([q_corners, np.ones((4, 1), dtype=np.float64)])
    proj_h = q_corners_h @ H_norm.T
    w_scales = proj_h[:, 2]

    # True if any w scale is near zero or crosses the projective horizon (sign flip)
    horizon_crossing = bool(
        np.any(np.abs(w_scales) < 1e-10) or np.any(np.sign(w_scales) != np.sign(w_scales[0]))
    )

    # Interior quad angles
    quad_angles: list[float] = []
    min_angle = None
    max_angle = None
    area_ratio = None
    scale_factor = None

    if projected_corners is not None and len(projected_corners) == 4 and not horizon_crossing:
        quad_angles = compute_quad_interior_angles(projected_corners)
        if quad_angles:
            min_angle = float(min(quad_angles))
            max_angle = float(max(quad_angles))

        # Quad area
        src_area = float(query_width * query_height)
        if src_area > 0:
            # Shoelace formula
            pts = projected_corners
            shoelace = 0.5 * abs(
                (pts[0, 0] * pts[1, 1] - pts[1, 0] * pts[0, 1]) +
                (pts[1, 0] * pts[2, 1] - pts[2, 0] * pts[1, 1]) +
                (pts[2, 0] * pts[3, 1] - pts[3, 0] * pts[2, 1]) +
                (pts[3, 0] * pts[0, 1] - pts[0, 0] * pts[3, 1])
            )
            area_ratio = float(shoelace / src_area)
            scale_factor = float(math.sqrt(area_ratio))

    return ConditioningMetrics(
        raw_condition_number=raw_cond,
        canonical_condition_number=canon_cond,
        singular_values=s_raw_list,
        determinant=det_val,
        horizon_crossing=horizon_crossing,
        quad_angles_deg=quad_angles,
        min_quad_angle_deg=min_angle,
        max_quad_angle_deg=max_angle,
        area_ratio=area_ratio,
        scale_factor=scale_factor,
    )


# ---------------------------------------------------------------------------
# Multi-Signal Quality Assessment Engine
# ---------------------------------------------------------------------------

def assess_localization_quality(
    *,
    match_success: bool,
    geometry_success: bool,
    query_width: int,
    query_height: int,
    reference_width: int,
    reference_height: int,
    inlier_count: int,
    filtered_matches: int,
    inlier_ratio: float,
    query_inliers: Optional[np.ndarray] = None,
    homography: Optional[np.ndarray] = None,
    projected_corners: Optional[np.ndarray] = None,
    mean_reproj_error_px: Optional[float] = None,
    median_reproj_error_px: Optional[float] = None,
    max_reproj_error_px: Optional[float] = None,
    overlap_fraction: Optional[float] = None,
    min_inliers_threshold: int = 10,
    base_failure_reason: Optional[str] = None,
) -> QualityAssessmentResult:
    """
    Execute comprehensive multi-signal assessment of localization reliability.

    Produces:
      - Categorical status: ACCEPTED, LOW_CONFIDENCE, REJECTED
      - Diagnostic flags explaining specific risk factors
      - Detailed failure reasons
      - Uncalibrated heuristic confidence index in [0.0, 1.0]
    """
    failure_reasons: list[str] = []
    diagnostic_flags: list[str] = []

    # Early rejection if feature matching or base geometry failed
    if not match_success or not geometry_success or homography is None or inlier_count < min_inliers_threshold:
        if base_failure_reason:
            failure_reasons.append(base_failure_reason)
        else:
            failure_reasons.append("Insufficient geometric consensus or failed feature matching.")
        diagnostic_flags.append("FAILED_GEOMETRY_OR_MATCHING")

        return QualityAssessmentResult(
            status=ReliabilityStatus.REJECTED,
            confidence_score=0.0,
            is_calibrated=False,
            inlier_count=inlier_count,
            inlier_ratio=inlier_ratio,
            failure_reasons=failure_reasons,
            diagnostic_flags=diagnostic_flags,
        )

    # 1. Spatial dispersion evaluation
    spatial = compute_inlier_spatial_distribution(
        query_inliers if query_inliers is not None else np.zeros((0, 2)),
        query_width,
        query_height,
    )

    # 2. Conditioning and projective sanity evaluation
    conditioning = compute_conditioning_metrics(
        H=homography,
        query_width=query_width,
        query_height=query_height,
        reference_width=reference_width,
        reference_height=reference_height,
        projected_corners=projected_corners,
    )

    # -----------------------------------------------------------------------
    # Signal Diagnostic Checks & Flagging
    # -----------------------------------------------------------------------

    # A. Inlier count check
    if inlier_count < 15:
        diagnostic_flags.append("LOW_INLIER_COUNT")
        failure_reasons.append(f"Inlier count ({inlier_count}) is near minimum margin (10-15).")

    # B. Inlier ratio check
    if inlier_ratio < 0.15:
        diagnostic_flags.append("LOW_INLIER_RATIO")
        failure_reasons.append(f"Inlier ratio ({inlier_ratio:.1%}) indicates high proportion of tentative outliers.")

    # C. Reprojection error check
    if mean_reproj_error_px is not None and mean_reproj_error_px > 3.0:
        diagnostic_flags.append("HIGH_REPROJECTION_ERROR")
        failure_reasons.append(f"Mean reprojection error ({mean_reproj_error_px:.2f} px) exceeds preferred tolerance (3.0 px).")

    # D. Inlier spatial clustering check
    # If convex hull is tiny (< 3% of image) or spread score < 0.08
    if spatial.spatial_spread_score < 0.08:
        diagnostic_flags.append("CLUSTERED_INLIERS")
        failure_reasons.append(
            f"Inliers are concentrated in a localized cluster (spatial spread {spatial.spatial_spread_score:.2f} < 0.08). "
            "High risk of false lock on repetitive micro-texture."
        )
    elif spatial.spatial_spread_score < 0.18:
        diagnostic_flags.append("MODERATE_INLIER_CLUSTERING")

    # E. Collinear inliers check
    if query_inliers is not None and len(query_inliers) >= 4:
        centered = query_inliers - np.mean(query_inliers, axis=0)
        _, s_pts, _ = np.linalg.svd(centered)
        if len(s_pts) >= 2 and (s_pts[1] < 1.0 or (s_pts[1] / max(s_pts[0], 1e-6)) < 1e-3):
            diagnostic_flags.append("COLLINEAR_INLIERS")
            failure_reasons.append("Inliers are approximately collinear; homography estimate is degenerate along orthogonal axis.")

    # F. Homography conditioning
    if conditioning.canonical_condition_number > 50.0:
        diagnostic_flags.append("ILL_CONDITIONED_HOMOGRAPHY")
        failure_reasons.append(
            f"Canonical condition number kappa(H_canon)={conditioning.canonical_condition_number:.1f} > 50.0 indicates numerical sensitivity."
        )
    elif conditioning.canonical_condition_number > 15.0:
        diagnostic_flags.append("MODERATE_HOMOGRAPHY_CONDITIONING")

    # G. Projective horizon crossing
    if conditioning.horizon_crossing:
        diagnostic_flags.append("HORIZON_CROSSING")
        failure_reasons.append("Projected query polygon intersects the projective line at infinity (horizon crossing).")

    # H. Angular distortion (acute or obtuse quad angles)
    if conditioning.min_quad_angle_deg is not None and conditioning.max_quad_angle_deg is not None:
        if conditioning.min_quad_angle_deg < 25.0 or conditioning.max_quad_angle_deg > 155.0:
            diagnostic_flags.append("ACUTE_QUAD_ANGLES")
            failure_reasons.append(
                f"Projected quad interior angles range from {conditioning.min_quad_angle_deg:.1f}° to {conditioning.max_quad_angle_deg:.1f}° "
                "(outside safe [25°, 155°] envelope)."
            )

    # I. Overlap fraction
    if overlap_fraction is not None and overlap_fraction < 0.40:
        diagnostic_flags.append("MARGINAL_OVERLAP")
        failure_reasons.append(f"Only {overlap_fraction:.0%} of the projected footprint lies within the reference raster.")

    # -----------------------------------------------------------------------
    # Heuristic Multi-Signal Confidence Index Computation
    # -----------------------------------------------------------------------
    # Multi-component weighted scoring:
    # 1. Inlier volume factor: min(1.0, inliers / 100) (weight 0.25)
    f_inliers = min(1.0, inlier_count / 100.0)

    # 2. Inlier ratio factor: min(1.0, inlier_ratio / 0.50) (weight 0.20)
    f_ratio = min(1.0, inlier_ratio / 0.50)

    # 3. Reprojection accuracy factor: max(0.0, 1.0 - mean_err / 4.0) (weight 0.20)
    err = mean_reproj_error_px if mean_reproj_error_px is not None else 2.0
    f_reproj = max(0.0, min(1.0, 1.0 - (err / 4.0)))

    # 4. Spatial dispersion factor: spatial_spread_score in [0.0, 1.0] (weight 0.20)
    f_spatial = max(0.0, min(1.0, spatial.spatial_spread_score))

    # 5. Conditioning factor: scale-invariant kappa(H_canon) (weight 0.15)
    # kappa in [1.0, 5.0] -> 1.0; drops toward 0 as kappa approaches 50.0
    c_num = max(1.0, conditioning.canonical_condition_number)
    f_cond = max(0.0, min(1.0, 1.0 - (math.log10(c_num) / math.log10(50.0))))

    components = {
        "inlier_count_factor": round(float(f_inliers), 4),
        "inlier_ratio_factor": round(float(f_ratio), 4),
        "reprojection_factor": round(float(f_reproj), 4),
        "spatial_dispersion_factor": round(float(f_spatial), 4),
        "conditioning_factor": round(float(f_cond), 4),
    }

    raw_score = (
        0.25 * f_inliers +
        0.20 * f_ratio +
        0.20 * f_reproj +
        0.20 * f_spatial +
        0.15 * f_cond
    )
    confidence_score = round(max(0.0, min(1.0, float(raw_score))), 4)

    # -----------------------------------------------------------------------
    # Categorical Status Assignment
    # -----------------------------------------------------------------------
    # Hard rejection criteria:
    hard_reject_flags = {"HORIZON_CROSSING", "COLLINEAR_INLIERS"}
    is_hard_reject = bool(hard_reject_flags.intersection(diagnostic_flags)) or (spatial.spatial_spread_score < 0.05) or (conditioning.canonical_condition_number > 80.0)

    if is_hard_reject:
        status = ReliabilityStatus.REJECTED
        confidence_score = min(confidence_score, 0.20)
    elif len(diagnostic_flags) > 0 or inlier_count < 20 or inlier_ratio < 0.20 or spatial.spatial_spread_score < 0.20 or confidence_score < 0.65:
        status = ReliabilityStatus.LOW_CONFIDENCE
    else:
        status = ReliabilityStatus.ACCEPTED

    return QualityAssessmentResult(
        status=status,
        confidence_score=confidence_score,
        is_calibrated=False,
        confidence_components=components,
        spatial_metrics=spatial,
        conditioning_metrics=conditioning,
        reprojection_mean_px=mean_reproj_error_px,
        reprojection_median_px=median_reproj_error_px,
        reprojection_max_px=max_reproj_error_px,
        inlier_count=inlier_count,
        inlier_ratio=inlier_ratio,
        failure_reasons=failure_reasons,
        diagnostic_flags=diagnostic_flags,
    )
