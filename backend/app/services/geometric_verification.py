"""
SceneNav AI — Geometric Verification Service

Algorithm: RANSAC homography estimation (cv2.findHomography)

What a homography models:
  A projective transformation between two planes.  It is an appropriate
  model when both cameras observe the same approximately planar surface
  from different viewpoints, or when the camera undergoes pure rotation.

When a homography is NOT appropriate:
  - Non-planar 3-D scenes with significant parallax.
  - Large forward/backward translation (depth relief becomes prominent).
  - Scenes with multiple independently moving objects.

In those cases, fundamental/essential matrix estimation is more principled,
but requires calibration data and does not directly support region projection.

The number of geometric inliers is a more reliable indicator of a true match
than the raw match count, but it still does not constitute proof of
geographic co-location without external georeferencing.

References:
  Hartley & Zisserman, "Multiple View Geometry in Computer Vision," 2nd ed.
  OpenCV documentation: cv2.findHomography
"""
from __future__ import annotations

import logging
from dataclasses import dataclass, field
from typing import Optional

import cv2
import numpy as np

logger = logging.getLogger(__name__)

# Minimum correspondences required by RANSAC to fit a homography (4 point pairs).
RANSAC_MIN_POINTS = 4


@dataclass
class GeometryResult:
    """Output of the geometric verification stage."""
    success: bool = False

    # Homography matrix (3×3, maps query pixels → reference pixels)
    homography: Optional[np.ndarray] = None

    # Inlier mask (length N boolean array, one entry per filtered match)
    inlier_mask: Optional[np.ndarray] = None

    # Statistics
    inlier_count: int = 0
    total_correspondences: int = 0
    inlier_ratio: float = 0.0

    # Reprojection error computed on inliers (pixels)
    mean_reproj_error: Optional[float] = None
    median_reproj_error: Optional[float] = None
    max_reproj_error: Optional[float] = None

    failure_reason: Optional[str] = None
    warnings: list[str] = field(default_factory=list)


def verify_geometry(
    query_pts: np.ndarray,
    reference_pts: np.ndarray,
    *,
    ransac_reproj_threshold: float = 4.0,
    min_inliers: int = 10,
) -> GeometryResult:
    """
    Estimate a homography via RANSAC and validate it.

    Args:
        query_pts:               (N,2) float32 — query image pixel coordinates.
        reference_pts:           (N,2) float32 — corresponding reference pixels.
        ransac_reproj_threshold: Maximum pixel error for a point to be an inlier.
        min_inliers:             Minimum acceptable inlier count.

    Coordinate convention:
        The returned homography H maps query image pixel coordinates (x_q, y_q)
        to reference image pixel coordinates (x_r, y_r):
            [x_r, y_r, 1]^T  ∝  H · [x_q, y_q, 1]^T

    Returns:
        GeometryResult with inlier statistics and homography matrix if valid.
    """
    result = GeometryResult(total_correspondences=len(query_pts))

    if len(query_pts) < RANSAC_MIN_POINTS:
        result.failure_reason = (
            f"Insufficient correspondences for RANSAC homography estimation "
            f"(have {len(query_pts)}, need ≥ {RANSAC_MIN_POINTS})."
        )
        return result

    # findHomography expects shape (N,1,2) or (N,2)
    src = query_pts.reshape(-1, 1, 2).astype(np.float32)
    dst = reference_pts.reshape(-1, 1, 2).astype(np.float32)

    try:
        H, mask = cv2.findHomography(
            src, dst,
            method=cv2.RANSAC,
            ransacReprojThreshold=ransac_reproj_threshold,
            confidence=0.995,
            maxIters=2000,
        )
    except cv2.error as exc:
        result.failure_reason = f"OpenCV findHomography raised an error: {exc}"
        return result

    if H is None or mask is None:
        result.failure_reason = (
            "RANSAC failed to estimate a homography. "
            "Too few consistent correspondences may exist."
        )
        return result

    inlier_mask = mask.ravel().astype(bool)
    inlier_count = int(inlier_mask.sum())
    result.inlier_mask = inlier_mask
    result.inlier_count = inlier_count
    result.inlier_ratio = inlier_count / len(query_pts) if len(query_pts) > 0 else 0.0

    logger.info(
        "RANSAC homography: %d/%d inliers (%.1f%%)",
        inlier_count, len(query_pts), result.inlier_ratio * 100
    )

    if inlier_count < min_inliers:
        result.failure_reason = (
            f"Geometric verification produced only {inlier_count} inliers "
            f"(threshold: {min_inliers}). "
            "The scenes may be different, or the overlap is too small."
        )
        return result

    # Validate the homography matrix on the consensus inlier domain
    validation_failure = _validate_homography(H, query_pts[inlier_mask])
    if validation_failure:
        result.failure_reason = validation_failure
        return result

    if result.inlier_ratio < 0.1:
        result.warnings.append(
            f"Low inlier ratio ({result.inlier_ratio:.1%}) — "
            "the homography may be unreliable."
        )

    # Compute reprojection error on inliers
    reproj_stats = _compute_reprojection_error(
        query_pts[inlier_mask], reference_pts[inlier_mask], H
    )
    result.mean_reproj_error = reproj_stats.get("mean")
    result.median_reproj_error = reproj_stats.get("median")
    result.max_reproj_error = reproj_stats.get("max")

    result.homography = H
    result.success = True
    return result


def _validate_homography(
    H: np.ndarray,
    query_pts: Optional[np.ndarray] = None,
) -> Optional[str]:
    """
    Return an error string if H is degenerate or orientation-reversing, otherwise None.

    Checks:
      1. All entries finite (no NaN or Inf).
      2. Projective scale H[2,2] ≠ 0 (normalisable).
      3. Matrix is non-singular (full 3×3 det(H) ≠ 0).
      4. Orientation preservation:
         Project the query point bounding box (or unit quad) through H.
         - All projective scale factors w_i must have consistent positive sign
           (points lie on the same side of the line at infinity; no horizon crossing).
         - The projected quadrilateral must form a strictly convex polygon with
           positive signed area (preserves cyclic winding order without reflection).
      5. Scale bounds:
         The area ratio (projected_area / source_area) must not imply an extreme
         scale change (> 100× or < 0.01×).
    """
    if not np.all(np.isfinite(H)):
        return "Homography contains non-finite values (NaN or Inf)."

    # Normalise so H[2,2] = 1
    if abs(H[2, 2]) < 1e-10:
        return "Homography is degenerate: H[2,2] ≈ 0."

    H_norm = H / H[2, 2]

    # Check full 3x3 determinant non-singularity
    det3 = np.linalg.det(H_norm)
    if abs(det3) < 1e-12:
        return "Homography matrix is singular or degenerate (det ≈ 0)."

    # Determine test polygon in query space
    if query_pts is not None and len(query_pts) >= 4:
        min_x, min_y = float(np.min(query_pts[:, 0])), float(np.min(query_pts[:, 1]))
        max_x, max_y = float(np.max(query_pts[:, 0])), float(np.max(query_pts[:, 1]))
        if (max_x - min_x) < 1.0 or (max_y - min_y) < 1.0:
            corners = np.array([[0.0, 0.0], [1000.0, 0.0], [1000.0, 1000.0], [0.0, 1000.0]], dtype=np.float64)
        else:
            corners = np.array([
                [min_x, min_y],
                [max_x, min_y],
                [max_x, max_y],
                [min_x, max_y]
            ], dtype=np.float64)
    else:
        corners = np.array([[0.0, 0.0], [1000.0, 0.0], [1000.0, 1000.0], [0.0, 1000.0]], dtype=np.float64)

    # Compute source area
    src_area = 0.5 * abs(
        (corners[0, 0] * corners[1, 1] - corners[1, 0] * corners[0, 1]) +
        (corners[1, 0] * corners[2, 1] - corners[2, 0] * corners[1, 1]) +
        (corners[2, 0] * corners[3, 1] - corners[3, 0] * corners[2, 1]) +
        (corners[3, 0] * corners[0, 1] - corners[0, 0] * corners[3, 1])
    )
    if src_area < 1e-6:
        src_area = 1.0

    # Project corners through H in homogeneous coordinates
    pts_h = np.hstack([corners, np.ones((4, 1), dtype=np.float64)])
    proj_h = pts_h @ H_norm.T
    w = proj_h[:, 2]

    # Check for projective horizon degeneracy: all w must share the same sign
    if np.any(np.abs(w) < 1e-10) or np.any(np.sign(w) != np.sign(w[0])):
        return "Homography is degenerate: query polygon crosses projective line at infinity."

    # Normalise projected 2D coordinates
    proj_2d = proj_h[:, :2] / w[:, np.newaxis]

    # Signed area via Shoelace formula
    x = proj_2d[:, 0]
    y = proj_2d[:, 1]
    signed_area = 0.5 * (
        (x[0]*y[1] - x[1]*y[0]) +
        (x[1]*y[2] - x[2]*y[1]) +
        (x[2]*y[3] - x[3]*y[2]) +
        (x[3]*y[0] - x[0]*y[3])
    )

    if signed_area <= 0:
        return (
            "Homography reverses polygon orientation (reflection or foldover). "
            "This is geometrically implausible for typical scene matching."
        )

    # Check strict convexity: edge cross products must all be positive
    edges = np.roll(proj_2d, -1, axis=0) - proj_2d
    cross_products = edges[:, 0] * np.roll(edges[:, 1], -1) - edges[:, 1] * np.roll(edges[:, 0], -1)
    if np.any(cross_products <= 0):
        return "Homography projects to a non-convex or self-intersecting polygon."

    # Check scale factor bounds
    scale = np.sqrt(abs(signed_area) / src_area)
    if scale > 100 or scale < 0.01:
        return (
            f"Homography implies an implausible scale change ({scale:.1f}×). "
            "The estimated transformation is likely incorrect."
        )

    return None  # Valid


def _compute_reprojection_error(
    query_pts: np.ndarray,
    reference_pts: np.ndarray,
    H: np.ndarray,
) -> dict[str, float]:
    """
    Compute reprojection errors for inlier correspondences.

    Projects each query point through H and measures the Euclidean distance
    to the ground-truth reference point.
    """
    if len(query_pts) == 0:
        return {}

    src = query_pts.reshape(-1, 1, 2).astype(np.float32)
    projected = cv2.perspectiveTransform(src, H).reshape(-1, 2)
    ref = reference_pts.reshape(-1, 2)

    errors = np.linalg.norm(projected - ref, axis=1)
    return {
        "mean": float(np.mean(errors)),
        "median": float(np.median(errors)),
        "max": float(np.max(errors)),
    }
