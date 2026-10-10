"""
SceneNav AI — Region Estimator Service

When geometric verification succeeds, this module projects the query image
boundary into the reference image coordinate system using the verified
homography.

Important caveats (reported as warnings):
  - The result is an estimated image-plane region, NOT a geographic location.
  - Accuracy depends on the correctness of the homography, which in turn
    depends on scene planarity and overlap quality.
  - Coordinates outside the reference image indicate extrapolation beyond
    the matched area — treat these with scepticism.
  - Never convert these pixel coordinates to latitude/longitude without
    valid, accurate georeferencing metadata for the reference image.
"""
from __future__ import annotations

import logging
from dataclasses import dataclass, field
from typing import Optional

import cv2
import numpy as np

logger = logging.getLogger(__name__)


@dataclass
class RegionResult:
    """Projected query footprint in reference-image pixel space."""
    success: bool = False

    # Corners in reference-image pixel coordinates (clockwise from top-left)
    top_left: Optional[tuple[float, float]] = None
    top_right: Optional[tuple[float, float]] = None
    bottom_right: Optional[tuple[float, float]] = None
    bottom_left: Optional[tuple[float, float]] = None

    # Fraction of the projected polygon that lies within the reference image
    overlap_fraction: Optional[float] = None

    failure_reason: Optional[str] = None
    warnings: list[str] = field(default_factory=list)


def estimate_region(
    query_width: int,
    query_height: int,
    reference_width: int,
    reference_height: int,
    homography: np.ndarray,
) -> RegionResult:
    """
    Project the query image boundary into reference-image pixel coordinates.

    Convention:
        H maps [x_q, y_q, 1]^T → [x_r, y_r, w]^T (homogeneous)
        Corner order: top-left, top-right, bottom-right, bottom-left.

    Args:
        query_width:      Query image width in pixels.
        query_height:     Query image height in pixels.
        reference_width:  Reference image width in pixels.
        reference_height: Reference image height in pixels.
        homography:       3×3 homography matrix (query → reference).

    Returns:
        RegionResult with projected corner coordinates and validity flags.
    """
    result = RegionResult()

    # Query image corners in pixel coordinates (clockwise from top-left)
    qw, qh = query_width - 1, query_height - 1
    corners_query = np.float32([
        [0,  0 ],   # top-left
        [qw, 0 ],   # top-right
        [qw, qh],   # bottom-right
        [0,  qh],   # bottom-left
    ]).reshape(-1, 1, 2)

    try:
        corners_ref = cv2.perspectiveTransform(corners_query, homography)
    except cv2.error as exc:
        result.failure_reason = f"perspectiveTransform failed: {exc}"
        return result

    corners_ref = corners_ref.reshape(-1, 2)

    # Sanity: all coordinates must be finite
    if not np.all(np.isfinite(corners_ref)):
        result.failure_reason = (
            "Projected corners contain non-finite values. "
            "The homography may be numerically degenerate."
        )
        return result

    tl = (float(corners_ref[0, 0]), float(corners_ref[0, 1]))
    tr = (float(corners_ref[1, 0]), float(corners_ref[1, 1]))
    br = (float(corners_ref[2, 0]), float(corners_ref[2, 1]))
    bl = (float(corners_ref[3, 0]), float(corners_ref[3, 1]))

    warnings: list[str] = []

    # Check for degenerate polygon (near-zero area)
    area = _polygon_area(corners_ref)
    if area < 1.0:
        result.failure_reason = (
            f"Projected query footprint has near-zero area ({area:.2f} px²) — "
            "the estimated transformation is degenerate."
        )
        return result

    # Check extreme scale distortion
    ref_area = reference_width * reference_height
    if area > ref_area * 10:
        warnings.append(
            "Projected footprint is more than 10× the reference image area — "
            "the homography may be extrapolating unreliably."
        )

    # Check how much of the projected polygon lies within the reference image
    overlap = _compute_overlap_fraction(
        corners_ref, reference_width, reference_height
    )
    result.overlap_fraction = overlap

    if overlap < 0.01:
        warnings.append(
            "Less than 1% of the projected footprint falls within the "
            "reference image bounds. The match may be unreliable."
        )
    elif overlap < 0.5:
        warnings.append(
            f"Only {overlap:.0%} of the projected footprint lies within the "
            "reference image — significant extrapolation is occurring."
        )

    result.top_left = tl
    result.top_right = tr
    result.bottom_right = br
    result.bottom_left = bl
    result.warnings = warnings
    result.success = True

    logger.info(
        "Projected footprint: TL=%s TR=%s BR=%s BL=%s (overlap=%.1f%%)",
        tl, tr, br, bl, overlap * 100
    )
    return result


# ---------------------------------------------------------------------------
# Geometry helpers
# ---------------------------------------------------------------------------

def _polygon_area(pts: np.ndarray) -> float:
    """Shoelace formula for signed polygon area. Returns absolute value."""
    n = len(pts)
    area = 0.0
    for i in range(n):
        j = (i + 1) % n
        area += pts[i, 0] * pts[j, 1]
        area -= pts[j, 0] * pts[i, 1]
    return abs(area) / 2.0


def _compute_overlap_fraction(
    corners: np.ndarray,
    ref_w: int,
    ref_h: int,
) -> float:
    """
    Estimate what fraction of the projected polygon lies within
    the reference image rectangle [0, ref_w) × [0, ref_h).

    Uses OpenCV's polygon clipping approach via contour intersection.
    """
    # Reference image bounding polygon
    ref_poly = np.float32([
        [0,     0    ],
        [ref_w, 0    ],
        [ref_w, ref_h],
        [0,     ref_h],
    ])

    # Clip the projected polygon to the reference bounds
    # (Sutherland-Hodgman via intersection)
    clipped = _clip_polygon(corners.astype(np.float32), ref_poly)
    if clipped is None or len(clipped) < 3:
        return 0.0

    projected_area = _polygon_area(corners)
    if projected_area < 1e-6:
        return 0.0

    clipped_area = _polygon_area(np.array(clipped))
    return min(1.0, clipped_area / projected_area)


def _clip_polygon(
    subject: np.ndarray,
    clip: np.ndarray,
) -> Optional[list[tuple[float, float]]]:
    """
    Sutherland-Hodgman polygon clipping.
    Returns clipped polygon vertices or None if the result is empty.
    """
    def inside(p, a, b):
        return (b[0] - a[0]) * (p[1] - a[1]) - (b[1] - a[1]) * (p[0] - a[0]) >= 0

    def intersection(p1, p2, p3, p4):
        x1, y1 = p1
        x2, y2 = p2
        x3, y3 = p3
        x4, y4 = p4
        denom = (x1 - x2) * (y3 - y4) - (y1 - y2) * (x3 - x4)
        if abs(denom) < 1e-10:
            return p1
        t = ((x1 - x3) * (y3 - y4) - (y1 - y3) * (x3 - x4)) / denom
        return (x1 + t * (x2 - x1), y1 + t * (y2 - y1))

    output = [tuple(p) for p in subject]
    n = len(clip)
    for i in range(n):
        if not output:
            return None
        a, b = tuple(clip[i]), tuple(clip[(i + 1) % n])
        inp = output
        output = []
        for j in range(len(inp)):
            curr = inp[j]
            prev = inp[j - 1]
            if inside(curr, a, b):
                if not inside(prev, a, b):
                    output.append(intersection(prev, curr, a, b))
                output.append(curr)
            elif inside(prev, a, b):
                output.append(intersection(prev, curr, a, b))
    return output if output else None
