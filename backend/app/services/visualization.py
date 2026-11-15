"""
SceneNav AI — Visualization Service

Generates OpenCV-based publication-grade visualization artifacts:
  1. Side-by-side reference and query images (aspect ratio preserved, no black void padding).
  2. All tentative feature correspondences (ratio-filtered).
  3. Geometric inlier and outlier correspondences (RANSAC-verified with distinct visual styling).
  4. Estimated query footprint polygon overlaid on reference raster (with two-tone in-raster/extrapolated partition).
  5. 50/50 Warped query projective registration blend.

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
from app.services.region_estimator import RegionResult, _clip_polygon
from app.schemas import GeographicFootprint, ProjectedFootprint

logger = logging.getLogger(__name__)

# BGR Colour definitions
_BG_DARK_SLATE    = (15, 23, 42)     # #0f172a slate-900
_BG_DIVIDER       = (51, 65, 85)     # #334155 slate-700
_TEXT_WHITE       = (248, 250, 252)  # #f8fafc slate-50
_TEXT_MUTED       = (148, 163, 184)  # #94a3b8 slate-400
_COLOUR_TENTATIVE = (180, 180, 60)   # Muted gold (tentative)
_COLOUR_INLIER    = (50, 220, 100)   # Vibrant emerald green (inliers)
_COLOUR_OUTLIER   = (80, 80, 220)    # Subdued coral red (outliers)
_COLOUR_CYAN      = (212, 182, 6)    # Cyan / sky blue (in-raster footprint)
_COLOUR_AMBER     = (11, 158, 245)   # Amber / orange (extrapolated footprint)
_COLOUR_CORNER    = (94, 63, 244)    # Rose / magenta corner point


def save_all_visualizations(
    reference: LoadedImage,
    query: LoadedImage,
    match_result: MatchingResult,
    geo_result: Optional[GeometryResult],
    region_result: Optional[RegionResult],
    job_dir: Path,
    proj_footprint: Optional[ProjectedFootprint] = None,
    geo_footprint: Optional[GeographicFootprint] = None,
) -> dict[str, str]:
    """
    Generate and save all visualization artifacts with publication-grade rendering.

    Returns a dict mapping artifact name -> filename.
    """
    job_dir.mkdir(parents=True, exist_ok=True)
    artifacts: dict[str, str] = {}

    # 1. Side-by-side images (aspect-ratio preserved, clean layout)
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
            title="SceneNav AI — Tentative Feature Correspondences (Ratio-Filtered)",
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

    # 4. Footprint overlay on reference image (with two-tone boundary handling)
    if region_result and region_result.success:
        path = job_dir / "04_footprint.png"
        _save_footprint(
            reference.array, region_result, path,
            reference.georeference, proj_footprint, geo_footprint
        )
        artifacts["footprint"] = str(path)

    # 5. Warped query projective registration blend
    if geo_result and geo_result.success and geo_result.homography is not None:
        path = job_dir / "05_warped_blend.png"
        _save_warped_blend(reference.array, query.array, geo_result.homography, path)
        artifacts["warped_blend"] = str(path)

    logger.info("Saved %d visualization artifacts to %s", len(artifacts), job_dir)
    return artifacts


def _save_side_by_side(ref_bgr: np.ndarray, qry_bgr: np.ndarray, path: Path) -> None:
    """
    Create a clean side-by-side comparison without black padding voids.
    Both images are scaled to match vertical height while strictly preserving original aspect ratios.
    """
    h_ref, w_ref = ref_bgr.shape[:2]
    h_qry, w_qry = qry_bgr.shape[:2]

    # Target display height: use the larger height, bounded to max 1200px to prevent gigantic canvases
    target_h = max(h_ref, h_qry)
    if target_h > 1200:
        target_h = 1200

    scale_r = target_h / h_ref
    scale_q = target_h / h_qry

    target_w_ref = max(1, int(round(w_ref * scale_r)))
    target_w_qry = max(1, int(round(w_qry * scale_q)))

    interp_r = cv2.INTER_AREA if scale_r < 1.0 else cv2.INTER_LINEAR
    interp_q = cv2.INTER_AREA if scale_q < 1.0 else cv2.INTER_LINEAR

    ref_res = cv2.resize(ref_bgr, (target_w_ref, target_h), interpolation=interp_r)
    qry_res = cv2.resize(qry_bgr, (target_w_qry, target_h), interpolation=interp_q)

    # Header height 46px, vertical divider 8px
    header_h = 46
    divider_w = 8
    canvas_w = target_w_ref + divider_w + target_w_qry
    canvas_h = target_h + header_h

    canvas = np.full((canvas_h, canvas_w, 3), _BG_DARK_SLATE, dtype=np.uint8)

    # Place images
    canvas[header_h:canvas_h, 0:target_w_ref] = ref_res
    canvas[header_h:canvas_h, target_w_ref + divider_w:canvas_w] = qry_res

    # Divider bar
    canvas[header_h:canvas_h, target_w_ref:target_w_ref + divider_w] = _BG_DIVIDER

    # Header labels
    font = cv2.FONT_HERSHEY_SIMPLEX
    # Reference header
    cv2.putText(canvas, "REFERENCE IMAGE", (14, 20), font, 0.55, _TEXT_WHITE, 1, cv2.LINE_AA)
    cv2.putText(canvas, f"Map / Database | {w_ref}x{h_ref} px", (14, 38), font, 0.45, _TEXT_MUTED, 1, cv2.LINE_AA)

    # Query header
    qry_x = target_w_ref + divider_w + 14
    cv2.putText(canvas, "QUERY IMAGE", (qry_x, 20), font, 0.55, _TEXT_WHITE, 1, cv2.LINE_AA)
    cv2.putText(canvas, f"Observation Scene | {w_qry}x{h_qry} px", (qry_x, 38), font, 0.45, _TEXT_MUTED, 1, cv2.LINE_AA)

    cv2.imwrite(str(path), canvas)


def _save_matches(
    ref_bgr: np.ndarray,
    kp_ref: list,
    qry_bgr: np.ndarray,
    kp_qry: list,
    matches: list,
    path: Path,
    title: str = "",
    colour: tuple = _COLOUR_TENTATIVE,
    max_display: int = 120,
) -> None:
    """
    Draw feature correspondences across side-by-side images without black padding.
    Images are scaled to matching vertical heights with coordinates properly transformed.
    """
    h_ref, w_ref = ref_bgr.shape[:2]
    h_qry, w_qry = qry_bgr.shape[:2]

    target_h = max(h_ref, h_qry)
    if target_h > 1200:
        target_h = 1200

    scale_q = target_h / h_qry if h_qry > 0 else 1.0
    scale_r = target_h / h_ref if h_ref > 0 else 1.0

    target_w_qry = max(1, int(round(w_qry * scale_q)))
    target_w_ref = max(1, int(round(w_ref * scale_r)))

    interp_q = cv2.INTER_AREA if scale_q < 1.0 else cv2.INTER_LINEAR
    interp_r = cv2.INTER_AREA if scale_r < 1.0 else cv2.INTER_LINEAR

    q_res = cv2.resize(qry_bgr, (target_w_qry, target_h), interpolation=interp_q)
    r_res = cv2.resize(ref_bgr, (target_w_ref, target_h), interpolation=interp_r)

    header_h = 46
    footer_h = 28
    canvas_w = target_w_qry + target_w_ref
    canvas_h = target_h + header_h + footer_h

    canvas = np.full((canvas_h, canvas_w, 3), _BG_DARK_SLATE, dtype=np.uint8)
    canvas[header_h:header_h + target_h, 0:target_w_qry] = q_res
    canvas[header_h:header_h + target_h, target_w_qry:canvas_w] = r_res

    # Draw correspondence lines
    display_matches = matches[:max_display]
    for m in display_matches:
        pt_q = (
            int(round(kp_qry[m.queryIdx].pt[0] * scale_q)),
            int(round(kp_qry[m.queryIdx].pt[1] * scale_q)) + header_h,
        )
        pt_r = (
            int(round(target_w_qry + kp_ref[m.trainIdx].pt[0] * scale_r)),
            int(round(kp_ref[m.trainIdx].pt[1] * scale_r)) + header_h,
        )
        cv2.line(canvas, pt_q, pt_r, colour, 1, cv2.LINE_AA)
        cv2.circle(canvas, pt_q, 3, colour, -1, cv2.LINE_AA)
        cv2.circle(canvas, pt_r, 3, colour, -1, cv2.LINE_AA)

    # Header banner
    font = cv2.FONT_HERSHEY_SIMPLEX
    if title:
        cv2.putText(canvas, title, (14, 20), font, 0.55, _TEXT_WHITE, 1, cv2.LINE_AA)
    subtitle = f"Tentative Matches: {len(matches)} displayed (max {max_display}) | Query ({w_qry}x{h_qry}) -> Reference ({w_ref}x{h_ref})"
    cv2.putText(canvas, subtitle, (14, 38), font, 0.42, _TEXT_MUTED, 1, cv2.LINE_AA)

    # Footer legend
    legend_y = canvas_h - 10
    cv2.putText(canvas, "Amber lines: tentative descriptor matches passing Lowe's ratio test (0.75)", (14, legend_y), font, 0.40, _TEXT_MUTED, 1, cv2.LINE_AA)

    cv2.imwrite(str(path), canvas)


def _save_matches_with_inlier_distinction(
    ref_bgr: np.ndarray,
    kp_ref: list,
    qry_bgr: np.ndarray,
    kp_qry: list,
    inliers: list,
    outliers: list,
    path: Path,
    title: str = "",
    max_inliers: int = 150,
    max_outliers: int = 50,
) -> None:
    """
    Draw correspondences with distinct visual treatment for inliers (green) and outliers (coral red).
    """
    h_ref, w_ref = ref_bgr.shape[:2]
    h_qry, w_qry = qry_bgr.shape[:2]

    target_h = max(h_ref, h_qry)
    if target_h > 1200:
        target_h = 1200

    scale_q = target_h / h_qry if h_qry > 0 else 1.0
    scale_r = target_h / h_ref if h_ref > 0 else 1.0

    target_w_qry = max(1, int(round(w_qry * scale_q)))
    target_w_ref = max(1, int(round(w_ref * scale_r)))

    interp_q = cv2.INTER_AREA if scale_q < 1.0 else cv2.INTER_LINEAR
    interp_r = cv2.INTER_AREA if scale_r < 1.0 else cv2.INTER_LINEAR

    q_res = cv2.resize(qry_bgr, (target_w_qry, target_h), interpolation=interp_q)
    r_res = cv2.resize(ref_bgr, (target_w_ref, target_h), interpolation=interp_r)

    header_h = 46
    footer_h = 28
    canvas_w = target_w_qry + target_w_ref
    canvas_h = target_h + header_h + footer_h

    canvas = np.full((canvas_h, canvas_w, 3), _BG_DARK_SLATE, dtype=np.uint8)
    canvas[header_h:header_h + target_h, 0:target_w_qry] = q_res
    canvas[header_h:header_h + target_h, target_w_qry:canvas_w] = r_res

    # 1. Draw outliers first (subdued red)
    for m in outliers[:max_outliers]:
        pt_q = (
            int(round(kp_qry[m.queryIdx].pt[0] * scale_q)),
            int(round(kp_qry[m.queryIdx].pt[1] * scale_q)) + header_h,
        )
        pt_r = (
            int(round(target_w_qry + kp_ref[m.trainIdx].pt[0] * scale_r)),
            int(round(kp_ref[m.trainIdx].pt[1] * scale_r)) + header_h,
        )
        cv2.line(canvas, pt_q, pt_r, _COLOUR_OUTLIER, 1, cv2.LINE_AA)
        cv2.circle(canvas, pt_q, 3, _COLOUR_OUTLIER, -1, cv2.LINE_AA)
        cv2.circle(canvas, pt_r, 3, _COLOUR_OUTLIER, -1, cv2.LINE_AA)

    # 2. Draw inliers on top (vibrant green)
    for m in inliers[:max_inliers]:
        pt_q = (
            int(round(kp_qry[m.queryIdx].pt[0] * scale_q)),
            int(round(kp_qry[m.queryIdx].pt[1] * scale_q)) + header_h,
        )
        pt_r = (
            int(round(target_w_qry + kp_ref[m.trainIdx].pt[0] * scale_r)),
            int(round(kp_ref[m.trainIdx].pt[1] * scale_r)) + header_h,
        )
        cv2.line(canvas, pt_q, pt_r, _COLOUR_INLIER, 2, cv2.LINE_AA)
        cv2.circle(canvas, pt_q, 4, _COLOUR_CYAN, -1, cv2.LINE_AA)
        cv2.circle(canvas, pt_r, 4, _COLOUR_INLIER, -1, cv2.LINE_AA)

    # Header banner
    font = cv2.FONT_HERSHEY_SIMPLEX
    cv2.putText(canvas, "SceneNav AI — Geometric Verification (RANSAC Inliers & Outliers)", (14, 20), font, 0.55, _TEXT_WHITE, 1, cv2.LINE_AA)
    total = len(inliers) + len(outliers)
    ratio_str = f"{len(inliers)/total:.1%}" if total > 0 else "0.0%"
    cv2.putText(canvas, f"RANSAC Inliers: {len(inliers)}/{total} ({ratio_str}) | Outliers: {len(outliers)} | Verification confirms 2D planar consistency", (14, 38), font, 0.42, _TEXT_MUTED, 1, cv2.LINE_AA)

    # Footer legend
    legend_y = canvas_h - 10
    cv2.putText(canvas, "Green: RANSAC Inlier Correspondence | Red: Rejected Outlier | Notice: Inliers establish 2D geometric agreement, not absolute GNSS ground truth.", (14, legend_y), font, 0.38, _TEXT_MUTED, 1, cv2.LINE_AA)

    cv2.imwrite(str(path), canvas)


def _save_footprint(
    ref_bgr: np.ndarray,
    region: RegionResult,
    path: Path,
    georef=None,
    proj_footprint: Optional[ProjectedFootprint] = None,
    geo_footprint: Optional[GeographicFootprint] = None,
) -> None:
    """
    Draw estimated query footprint polygon on reference raster with two-tone partition:
    - In-raster polygon (observed): semi-transparent cyan
    - Extrapolated polygon (beyond bounds): semi-transparent amber
    - Corner markers with coordinates, centroid crosshair, and HUD banner.
    """
    h_ref, w_ref = ref_bgr.shape[:2]
    corners_raw = np.array([
        region.top_left,
        region.top_right,
        region.bottom_right,
        region.bottom_left,
    ], dtype=np.float64)

    min_x = np.min(corners_raw[:, 0])
    max_x = np.max(corners_raw[:, 0])
    min_y = np.min(corners_raw[:, 1])
    max_y = np.max(corners_raw[:, 1])

    is_extrapolated = (min_x < 0) or (max_x > w_ref) or (min_y < 0) or (max_y > h_ref)

    # Compute canvas margins to fit complete footprint without clipping
    margin_l = max(50, int(-min_x) + 40) if min_x < 0 else 50
    margin_r = max(50, int(max_x - w_ref) + 40) if max_x > w_ref else 50
    margin_t = max(60, int(-min_y) + 50) if min_y < 0 else 60
    margin_b = max(50, int(max_y - h_ref) + 40) if max_y > h_ref else 50

    canvas_w = w_ref + margin_l + margin_r
    canvas_h = h_ref + margin_t + margin_b

    canvas = np.full((canvas_h, canvas_w, 3), _BG_DARK_SLATE, dtype=np.uint8)

    # Insert reference raster at offset
    canvas[margin_t:margin_t + h_ref, margin_l:margin_l + w_ref] = ref_bgr

    # Draw raster boundary dashed/solid frame
    cv2.rectangle(
        canvas,
        (margin_l, margin_t),
        (margin_l + w_ref, margin_t + h_ref),
        _BG_DIVIDER,
        2,
        cv2.LINE_AA,
    )

    if is_extrapolated:
        # Draw dashed border on expanded sides
        bound_x = margin_l + w_ref
        for y_step in range(margin_t - 10, margin_t + h_ref + 10, 16):
            cv2.line(canvas, (bound_x, y_step), (bound_x, min(y_step + 8, margin_t + h_ref + 10)), _COLOUR_AMBER, 2, cv2.LINE_AA)

    # Shift corners to canvas coordinates
    offset = np.array([margin_l, margin_t], dtype=np.float64)
    corners_canvas = corners_raw + offset
    corners_int = np.int32(np.round(corners_canvas))

    overlay = canvas.copy()

    # Two-tone partition:
    # 1. Fill full polygon with Amber (extrapolated color if outside)
    if is_extrapolated:
        cv2.fillPoly(overlay, [corners_int], _COLOUR_AMBER)

    # 2. Clip against reference raster boundary and fill in-raster region with Cyan
    ref_poly = np.float32([[0, 0], [w_ref, 0], [w_ref, h_ref], [0, h_ref]])
    poly_in_raw = _clip_polygon(corners_raw.astype(np.float32), ref_poly)

    if poly_in_raw and len(poly_in_raw) >= 3:
        poly_in_canvas = np.int32(np.round(np.array(poly_in_raw) + offset))
        cv2.fillPoly(overlay, [poly_in_canvas], _COLOUR_CYAN)
    else:
        cv2.fillPoly(overlay, [corners_int], _COLOUR_CYAN)

    # Alpha blend overlay (24% polygon fill)
    cv2.addWeighted(overlay, 0.24, canvas, 0.76, 0, canvas)

    # Draw polygon outlines
    if is_extrapolated:
        cv2.polylines(canvas, [corners_int], isClosed=True, color=_COLOUR_AMBER, thickness=2, lineType=cv2.LINE_AA)

    if poly_in_raw and len(poly_in_raw) >= 3:
        poly_in_canvas = np.int32(np.round(np.array(poly_in_raw) + offset))
        cv2.polylines(canvas, [poly_in_canvas], isClosed=True, color=_COLOUR_CYAN, thickness=3, lineType=cv2.LINE_AA)
    else:
        cv2.polylines(canvas, [corners_int], isClosed=True, color=_COLOUR_CYAN, thickness=3, lineType=cv2.LINE_AA)

    # Corner nodes and labels
    labels = ["NW", "NE", "SE", "SW"]
    font = cv2.FONT_HERSHEY_SIMPLEX

    geo_corners = [
        getattr(geo_footprint, k, None)
        for k in ['top_left', 'top_right', 'bottom_right', 'bottom_left']
    ] if geo_footprint else [None] * 4

    for i, pt in enumerate(corners_int):
        cv2.circle(canvas, tuple(pt), 7, _COLOUR_CORNER, -1, cv2.LINE_AA)
        cv2.circle(canvas, tuple(pt), 10, (255, 255, 255), 2, cv2.LINE_AA)

        # Label text: pixel or Lat/Lon
        orig_pt = corners_raw[i]
        if geo_corners[i]:
            lbl = f"{labels[i]} ({geo_corners[i].lat:.5f}N, {geo_corners[i].lon:.5f}E)"
        else:
            lbl = f"{labels[i]} ({orig_pt[0]:.0f},{orig_pt[1]:.0f} px)"

        # Offset label to avoid overlapping edge
        tx = pt[0] + 12 if i in [0, 3] else pt[0] - 140
        ty = pt[1] - 10 if i in [0, 1] else pt[1] + 20
        # Keep inside canvas
        tx = max(10, min(canvas_w - 200, tx))
        ty = max(20, min(canvas_h - 10, ty))

        # Label badge background
        (w_t, h_t), _ = cv2.getTextSize(lbl, font, 0.42, 1)
        cv2.rectangle(canvas, (tx - 4, ty - h_t - 4), (tx + w_t + 4, ty + 4), _BG_DARK_SLATE, -1)
        cv2.rectangle(canvas, (tx - 4, ty - h_t - 4), (tx + w_t + 4, ty + 4), _BG_DIVIDER, 1)
        cv2.putText(canvas, lbl, (tx, ty), font, 0.42, _TEXT_WHITE, 1, cv2.LINE_AA)

    # Estimated Centroid crosshair
    center_raw = np.mean(corners_raw, axis=0)
    center_canvas = (int(round(center_raw[0] + margin_l)), int(round(center_raw[1] + margin_t)))
    cv2.drawMarker(canvas, center_canvas, _COLOUR_INLIER, cv2.MARKER_CROSS, 24, 2, cv2.LINE_AA)
    cv2.circle(canvas, center_canvas, 10, _COLOUR_INLIER, 2, cv2.LINE_AA)

    # Centroid label
    if geo_footprint:
        c_lbl = f"Center: {geo_footprint.center.lat:.5f}N, {geo_footprint.center.lon:.5f}E"
    else:
        c_lbl = f"Center: ({center_raw[0]:.1f}, {center_raw[1]:.1f} px)"
    cv2.putText(canvas, c_lbl, (center_canvas[0] + 14, center_canvas[1] + 5), font, 0.42, _COLOUR_INLIER, 1, cv2.LINE_AA)

    # Header HUD banner
    cv2.rectangle(canvas, (0, 0), (canvas_w, 48), _BG_DARK_SLATE, -1)
    cv2.line(canvas, (0, 48), (canvas_w, 48), _BG_DIVIDER, 1)
    cv2.putText(canvas, "SceneNav AI — Estimated Query Footprint on Reference Raster", (14, 20), font, 0.55, _TEXT_WHITE, 1, cv2.LINE_AA)

    if geo_footprint and georef:
        in_ha = (geo_footprint.in_raster_area_m2 or 0) / 10000.0
        out_ha = (geo_footprint.extrapolated_area_m2 or 0) / 10000.0
        pct = geo_footprint.overlap_percentage or 100.0
        hud_sub = f"Raster: {w_ref}x{h_ref} px | CRS: {georef.crs or 'EPSG:4326'} | In-Raster: {in_ha:.2f} ha ({pct:.1f}%) | Extrapolated: {out_ha:.2f} ha"
    else:
        hud_sub = f"Raster: {w_ref}x{h_ref} px | Unreferenced Raster (Image Pixel Space Only; No GPS fabricated)"
    cv2.putText(canvas, hud_sub, (14, 38), font, 0.42, _TEXT_MUTED, 1, cv2.LINE_AA)

    # Footer legend
    cv2.rectangle(canvas, (0, canvas_h - 26), (canvas_w, canvas_h), _BG_DARK_SLATE, -1)
    cv2.line(canvas, (0, canvas_h - 26), (canvas_w, canvas_h - 26), _BG_DIVIDER, 1)
    legend_txt = "Cyan = Observed In-Raster Footprint | Amber = Extrapolated Area | Purple/White = Corner Nodes | Green = Estimated Centroid"
    cv2.putText(canvas, legend_txt, (14, canvas_h - 9), font, 0.38, _TEXT_MUTED, 1, cv2.LINE_AA)

    cv2.imwrite(str(path), canvas)


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

    header_h = 46
    canvas_w = w_ref
    canvas_h = h_ref + header_h

    canvas = np.full((canvas_h, canvas_w, 3), _BG_DARK_SLATE, dtype=np.uint8)
    canvas[header_h:canvas_h, 0:canvas_w] = blend

    # Header banner
    font = cv2.FONT_HERSHEY_SIMPLEX
    cv2.putText(canvas, "SceneNav AI — 50/50 Warped Multi-Temporal Registration Blend", (14, 20), font, 0.55, _TEXT_WHITE, 1, cv2.LINE_AA)
    cv2.putText(canvas, f"Query perspective-warped via H into reference frame ({w_ref}x{h_ref} px)", (14, 38), font, 0.42, _TEXT_MUTED, 1, cv2.LINE_AA)

    cv2.imwrite(str(path), canvas)
