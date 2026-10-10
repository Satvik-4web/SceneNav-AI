"""
SceneNav AI — Visualization Service

Generates OpenCV-based visualization artifacts:
  1. Side-by-side reference and query images.
  2. All tentative feature correspondences.
  3. Geometric inlier correspondences only.
  4. Reference image with estimated query footprint overlaid.

All outputs are saved as PNG files in a job-specific results subdirectory.
"""
from __future__ import annotations

import logging
from pathlib import Path
from typing import Optional

import cv2
import numpy as np

from app.services.image_loader import LoadedImage
from app.services.feature_matcher import MatchingResult
from app.services.geometric_verification import GeometryResult
from app.services.region_estimator import RegionResult

logger = logging.getLogger(__name__)

# Colour scheme (BGR)
_COLOUR_TENTATIVE = (180, 180, 60)   # muted gold
_COLOUR_INLIER    = (50, 220, 100)   # green
_COLOUR_FOOTPRINT = (50, 120, 255)   # blue
_COLOUR_CORNER    = (0, 0, 255)      # red dot


def save_all_visualizations(
    reference: LoadedImage,
    query: LoadedImage,
    match_result: MatchingResult,
    geo_result: Optional[GeometryResult],
    region_result: Optional[RegionResult],
    job_dir: Path,
) -> dict[str, str]:
    """
    Generate and save all visualization artifacts.

    Returns a dict mapping artifact name → filename (relative to results/).
    """
    job_dir.mkdir(parents=True, exist_ok=True)
    artifacts: dict[str, str] = {}

    # 1. Side-by-side images
    path = job_dir / "01_side_by_side.png"
    _save_side_by_side(reference.array, query.array, path)
    artifacts["side_by_side"] = str(path)

    # 2. Tentative feature correspondences (all filtered matches)
    if match_result.good_matches:
        path = job_dir / "02_tentative_matches.png"
        _save_matches(
            reference.array, match_result.reference_keypoints_list,
            query.array, match_result.query_keypoints_list,
            match_result.good_matches,
            path,
            title="Tentative Matches (post ratio-test)",
            colour=_COLOUR_TENTATIVE,
        )
        artifacts["tentative_matches"] = str(path)

    # 3. Inlier-only correspondences
    if geo_result and geo_result.success and geo_result.inlier_mask is not None:
        inlier_matches = [
            m for m, keep in zip(match_result.good_matches, geo_result.inlier_mask)
            if keep
        ]
        if inlier_matches:
            path = job_dir / "03_inlier_matches.png"
            _save_matches(
                reference.array, match_result.reference_keypoints_list,
                query.array, match_result.query_keypoints_list,
                inlier_matches,
                path,
                title=f"Geometric Inliers ({len(inlier_matches)})",
                colour=_COLOUR_INLIER,
            )
            artifacts["inlier_matches"] = str(path)

    # 4. Footprint overlay on reference image
    if region_result and region_result.success:
        path = job_dir / "04_footprint.png"
        _save_footprint(reference.array, region_result, path)
        artifacts["footprint"] = str(path)

    logger.info("Saved %d visualization artifacts to %s", len(artifacts), job_dir)
    return artifacts


def _save_side_by_side(ref_bgr: np.ndarray, qry_bgr: np.ndarray, path: Path) -> None:
    """Create a side-by-side image with labels."""
    target_h = max(ref_bgr.shape[0], qry_bgr.shape[0])

    def _pad_height(img: np.ndarray, h: int) -> np.ndarray:
        if img.shape[0] == h:
            return img
        pad = np.zeros((h - img.shape[0], img.shape[1], 3), dtype=np.uint8)
        return np.vstack([img, pad])

    ref_pad = _pad_height(ref_bgr, target_h)
    qry_pad = _pad_height(qry_bgr, target_h)

    gap = np.zeros((target_h, 10, 3), dtype=np.uint8)
    combined = np.hstack([ref_pad, gap, qry_pad])

    # Labels
    font = cv2.FONT_HERSHEY_SIMPLEX
    cv2.putText(combined, "Reference", (10, 28), font, 0.8, (255, 255, 255), 2)
    qry_x = ref_pad.shape[1] + 20
    cv2.putText(combined, "Query", (qry_x, 28), font, 0.8, (255, 255, 255), 2)

    cv2.imwrite(str(path), combined)


def _save_matches(
    ref_bgr: np.ndarray,
    kp_ref: list,
    qry_bgr: np.ndarray,
    kp_qry: list,
    matches: list,
    path: Path,
    title: str = "",
    colour: tuple = _COLOUR_INLIER,
    max_display: int = 100,
) -> None:
    """Draw feature correspondences using OpenCV drawMatches."""
    display_matches = matches[:max_display]
    out = cv2.drawMatches(
        qry_bgr, kp_qry,
        ref_bgr, kp_ref,
        display_matches, None,
        matchColor=colour,
        singlePointColor=(100, 100, 100),
        flags=cv2.DrawMatchesFlags_NOT_DRAW_SINGLE_POINTS,
    )
    if title:
        cv2.putText(out, title, (10, 28), cv2.FONT_HERSHEY_SIMPLEX,
                    0.8, (255, 255, 255), 2)
    cv2.imwrite(str(path), out)


def _save_footprint(
    ref_bgr: np.ndarray,
    region: RegionResult,
    path: Path,
) -> None:
    """Draw the estimated query footprint polygon on the reference image."""
    out = ref_bgr.copy()
    corners = np.int32([
        region.top_left,
        region.top_right,
        region.bottom_right,
        region.bottom_left,
    ])
    cv2.polylines(out, [corners.reshape(-1, 1, 2)], isClosed=True,
                  color=_COLOUR_FOOTPRINT, thickness=3)

    # Corner dots
    for pt in corners:
        cv2.circle(out, tuple(pt), 6, _COLOUR_CORNER, -1)

    cv2.putText(out, "Est. Query Footprint", (10, 28),
                cv2.FONT_HERSHEY_SIMPLEX, 0.8, (255, 255, 255), 2)
    cv2.imwrite(str(path), out)
