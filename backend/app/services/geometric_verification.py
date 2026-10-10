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

    # Validate the homography matrix
    validation_failure = _validate_homography(H)
    if validation_failure:
        result.failure_reason = validation_failure
        return result

    inlier_mask = mask.ravel().astype(bool)
    inlier_count = int(inlier_mask.sum())
    result.inlier_mask = inlier_mask
    result.inlier_count = inlier_count
    result.inlier_ratio = inlier_count / len(query_pts)

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


def _validate_homography(H: np.ndarray) -> Optional[str]:
    """
    Return an error string if H is degenerate, otherwise None.

    Checks:
      1. All entries finite.
      2. Not singular (det ≠ 0).
      3. Scale factor not extreme (H[2,2] ≈ 1 after normalisation).
      4. Determinant positive (preserves orientation; negative = reflection).
    """
    if not np.all(np.isfinite(H)):
        return "Homography contains non-finite values (NaN or Inf)."

    # Normalise so H[2,2] = 1
    if abs(H[2, 2]) < 1e-10:
        return "Homography is degenerate: H[2,2] ≈ 0."

    H_norm = H / H[2, 2]

    det = np.linalg.det(H_norm[:2, :2])
    if abs(det) < 1e-6:
        return "Homography linear part is singular — likely a degenerate configuration."

    if det < 0:
        return (
            "Homography determinant is negative, implying a reflection. "
            "This is geometrically implausible for typical scene matching."
        )

    # Check that scale change is not extreme (> ~100x or < ~0.01x)
    scale = np.sqrt(abs(det))
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
