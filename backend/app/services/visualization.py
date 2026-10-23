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

    # 3. Inlier-only correspondences (with outliers distinguished)
    if geo_result and geo_result.success and geo_result.inlier_mask is not None:
        inlier_matches = [
            m for m, keep in zip(match_result.good_matches, geo_result.inlier_mask)
            if keep
        ]
        outlier_matches = [
            m for m, keep in zip(match_result.good_matches, geo_result.inlier_mask)
            if not keep
        ]
        if inlier_matches:
            path = job_dir / "03_inlier_matches.png"
            _save_matches_with_inlier_distinction(
                reference.array, match_result.reference_keypoints_list,
                query.array, match_result.query_keypoints_list,
                inlier_matches,
                outlier_matches,
                path,
                title=f"RANSAC Inliers: {len(inlier_matches)}/{len(match_result.good_matches)} ({len(inlier_matches)/len(match_result.good_matches):.1%}) | Outliers: {len(outlier_matches)}",
            )
            artifacts["inlier_matches"] = str(path)

    # 4. Footprint overlay on reference image
    if region_result and region_result.success:
        path = job_dir / "04_footprint.png"
        _save_footprint(reference.array, region_result, path)
        artifacts["footprint"] = str(path)

    # 5. Warped query projective registration blend
    if geo_result and geo_result.success and geo_result.homography is not None:
        path = job_dir / "05_warped_blend.png"
        _save_warped_blend(reference.array, query.array, geo_result.homography, path)
        artifacts["warped_blend"] = str(path)

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


def _save_matches_with_inlier_distinction(
    ref_bgr: np.ndarray,
    kp_ref: list,
    qry_bgr: np.ndarray,
    kp_qry: list,
    inliers: list,
    outliers: list,
    path: Path,
    title: str = "",
    max_inliers: int = 120,
    max_outliers: int = 40,
) -> None:
    """
    Draw correspondences with clear visual distinction:
    - Inliers: vibrant green (50, 220, 100)
    - Outliers: muted red/coral (80, 80, 220)
    """
    # Create side-by-side canvas
    target_h = max(ref_bgr.shape[0], qry_bgr.shape[0])
    scale_q = target_h / qry_bgr.shape[0] if qry_bgr.shape[0] > 0 else 1.0
    scale_r = target_h / ref_bgr.shape[0] if ref_bgr.shape[0] > 0 else 1.0

    qw = int(qry_bgr.shape[1] * scale_q)
    rw = int(ref_bgr.shape[1] * scale_r)

    q_res = cv2.resize(qry_bgr, (qw, target_h), interpolation=cv2.INTER_AREA) if scale_q != 1.0 else qry_bgr
    r_res = cv2.resize(ref_bgr, (rw, target_h), interpolation=cv2.INTER_AREA) if scale_r != 1.0 else ref_bgr

    combined = np.hstack([q_res, r_res])

    # Draw outliers first (subdued red)
    for m in outliers[:max_outliers]:
        pt_q = (int(kp_qry[m.queryIdx].pt[0] * scale_q), int(kp_qry[m.queryIdx].pt[1] * scale_q))
        pt_r = (int(qw + kp_ref[m.trainIdx].pt[0] * scale_r), int(kp_ref[m.trainIdx].pt[1] * scale_r))
        cv2.line(combined, pt_q, pt_r, (80, 80, 220), 1, cv2.LINE_AA)
        cv2.circle(combined, pt_q, 3, (80, 80, 220), -1, cv2.LINE_AA)
        cv2.circle(combined, pt_r, 3, (80, 80, 220), -1, cv2.LINE_AA)

    # Draw inliers on top (bright green)
    for m in inliers[:max_inliers]:
        pt_q = (int(kp_qry[m.queryIdx].pt[0] * scale_q), int(kp_qry[m.queryIdx].pt[1] * scale_q))
        pt_r = (int(qw + kp_ref[m.trainIdx].pt[0] * scale_r), int(kp_ref[m.trainIdx].pt[1] * scale_r))
        cv2.line(combined, pt_q, pt_r, (50, 220, 100), 2, cv2.LINE_AA)
        cv2.circle(combined, pt_q, 4, (212, 182, 6), -1, cv2.LINE_AA)
        cv2.circle(combined, pt_r, 4, (50, 220, 100), -1, cv2.LINE_AA)

    # Header banner with title
    cv2.rectangle(combined, (0, 0), (combined.shape[1], 40), (15, 23, 42), -1)
    if title:
        cv2.putText(combined, title, (14, 26), cv2.FONT_HERSHEY_SIMPLEX, 0.7, (241, 245, 249), 2)

    cv2.imwrite(str(path), combined)


def _save_footprint(
    ref_bgr: np.ndarray,
    region: RegionResult,
    path: Path,
) -> None:
    """Draw the estimated query footprint polygon with semi-transparent fill and corner labels."""
    out = ref_bgr.copy()
    overlay = out.copy()
    corners = np.int32([
        region.top_left,
        region.top_right,
        region.bottom_right,
        region.bottom_left,
    ])

    # Semi-transparent cyan fill
    cv2.fillPoly(overlay, [corners], (212, 182, 6))
    cv2.addWeighted(overlay, 0.22, out, 0.78, 0, out)

    # Outer polygon outline
    cv2.polylines(out, [corners.reshape(-1, 1, 2)], isClosed=True,
                  color=(212, 182, 6), thickness=3, lineType=cv2.LINE_AA)

    # Corner dots and text labels
    labels = ["NW", "NE", "SE", "SW"]
    for i, pt in enumerate(corners):
        cv2.circle(out, tuple(pt), 7, (94, 63, 244), -1, cv2.LINE_AA)
        cv2.circle(out, tuple(pt), 10, (255, 255, 255), 2, cv2.LINE_AA)
        cv2.putText(out, f"{labels[i]} ({pt[0]},{pt[1]})", (pt[0] + 12, pt[1] - 8),
                    cv2.FONT_HERSHEY_SIMPLEX, 0.55, (255, 255, 255), 2)

    # Header banner
    cv2.rectangle(out, (0, 0), (out.shape[1], 42), (15, 23, 42), -1)
    cv2.putText(out, "SceneNav AI — Estimated Query Footprint on Reference Raster", (12, 28),
                cv2.FONT_HERSHEY_SIMPLEX, 0.75, (241, 245, 249), 2)

    cv2.imwrite(str(path), out)


def _save_warped_blend(
    ref_bgr: np.ndarray,
    qry_bgr: np.ndarray,
    H: np.ndarray,
    path: Path,
) -> None:
    """Warp query into reference space and generate a 50/50 multi-temporal blended overlay."""
    h_ref, w_ref = ref_bgr.shape[:2]
    warped_qry = cv2.warpPerspective(qry_bgr, H, (w_ref, h_ref), flags=cv2.INTER_LINEAR)
    gray = cv2.cvtColor(warped_qry, cv2.COLOR_BGR2GRAY)
    mask = (gray > 0).astype(np.uint8) * 255

    blend = ref_bgr.copy()
    overlap = cv2.addWeighted(ref_bgr, 0.5, warped_qry, 0.5, 0)
    blend[mask > 0] = overlap[mask > 0]

    # Header banner
    cv2.rectangle(blend, (0, 0), (w_ref, 42), (15, 23, 42), -1)
    cv2.putText(blend, "SceneNav AI — 50/50 Warped Multi-Temporal Registration Blend", (12, 28),
                cv2.FONT_HERSHEY_SIMPLEX, 0.75, (241, 245, 249), 2)

    cv2.imwrite(str(path), blend)
