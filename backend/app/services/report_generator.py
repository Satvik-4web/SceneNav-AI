"""
SceneNav AI — Research Report Generator

Builds a publication-grade multi-page PDF research report summarizing:
  1. Experiment metadata & software environment
  2. Selected algorithms & matching hyperparameters
  3. Executive localization verdict & reliability assessment
  4. Feature detection, matching, & geometric verification metrics
  5. Geospatial intelligence analysis & footprint containment
  6. Embedded visualization figures (Footprint centerpiece, inliers, tentative matches)
  7. Dynamic algorithmic interpretation & scientific limitations
"""
from __future__ import annotations

import logging
from datetime import datetime
from pathlib import Path
from typing import Optional

from PIL import Image as PILImage
from reportlab.lib import colors
from reportlab.lib.pagesizes import letter
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.platypus import (
    HRFlowable,
    Image as RLImage,
    KeepTogether,
    PageBreak,
    Paragraph,
    SimpleDocTemplate,
    Spacer,
    Table,
    TableStyle,
)

from app.schemas import MatchResult

logger = logging.getLogger(__name__)

# Color Palette (Hex colors)
C_DARK_NAVY  = colors.HexColor("#0f172a")  # Slate 900
C_SLATE_800  = colors.HexColor("#1e293b")  # Slate 800
C_SLATE_700  = colors.HexColor("#334155")  # Slate 700
C_SLATE_200  = colors.HexColor("#e2e8f0")  # Slate 200
C_SLATE_50   = colors.HexColor("#f8fafc")  # Slate 50
C_CYAN       = colors.HexColor("#0284c7")  # Sky 600
C_CYAN_LIGHT = colors.HexColor("#e0f2fe")  # Sky 100
C_GREEN      = colors.HexColor("#16a34a")  # Green 600
C_GREEN_BG   = colors.HexColor("#dcfce7")  # Green 100
C_AMBER      = colors.HexColor("#d97706")  # Amber 600
C_AMBER_BG   = colors.HexColor("#fef3c7")  # Amber 100
C_RED        = colors.HexColor("#dc2626")  # Red 600
C_RED_BG     = colors.HexColor("#fee2e2")  # Red 100
C_MUTED      = colors.HexColor("#64748b")  # Slate 500


def _scale_image(img_path: Path, max_w: float = 480.0, max_h: float = 260.0) -> Optional[RLImage]:
    """Proportionally scale an image to fit within bounding box dimensions."""
    if not img_path.exists():
        return None
    try:
        with PILImage.open(img_path) as im:
            w, h = im.size
        aspect = w / float(h)
        target_w = max_w
        target_h = target_w / aspect
        if target_h > max_h:
            target_h = max_h
            target_w = target_h * aspect
        return RLImage(str(img_path), width=target_w, height=target_h)
    except Exception as exc:
        logger.warning("Failed to open or scale image '%s': %s", img_path, exc)
        return None


def generate_research_report_pdf(result: MatchResult, job_dir: Path) -> Path:
    """
    Generate an authoritative, publication-grade PDF research report from a MatchResult.
    Saves to job_dir / "research_report.pdf" and returns the path.
    """
    job_dir.mkdir(parents=True, exist_ok=True)
    pdf_path = job_dir / "research_report.pdf"

    # Letter page size with 36pt (0.5 in) margins -> usable width = 540pt
    doc = SimpleDocTemplate(
        str(pdf_path),
        pagesize=letter,
        leftMargin=36,
        rightMargin=36,
        topMargin=36,
        bottomMargin=36,
    )

    base_styles = getSampleStyleSheet()
    styles = {
        "DocTitle": ParagraphStyle(
            "DocTitle",
            parent=base_styles["Heading1"],
            fontSize=16,
            leading=20,
            textColor=C_DARK_NAVY,
            fontName="Helvetica-Bold",
        ),
        "DocSubtitle": ParagraphStyle(
            "DocSubtitle",
            parent=base_styles["Normal"],
            fontSize=9,
            leading=12,
            textColor=C_MUTED,
            fontName="Helvetica",
        ),
        "SectionHeader": ParagraphStyle(
            "SectionHeader",
            parent=base_styles["Heading2"],
            fontSize=11,
            leading=15,
            textColor=C_DARK_NAVY,
            fontName="Helvetica-Bold",
            spaceAfter=4,
            spaceBefore=8,
        ),
        "SubHeader": ParagraphStyle(
            "SubHeader",
            parent=base_styles["Heading3"],
            fontSize=9.5,
            leading=13,
            textColor=C_SLATE_800,
            fontName="Helvetica-Bold",
            spaceAfter=3,
        ),
        "Body": ParagraphStyle(
            "Body",
            parent=base_styles["Normal"],
            fontSize=8.5,
            leading=11.5,
            textColor=C_DARK_NAVY,
            fontName="Helvetica",
        ),
        "BodyMuted": ParagraphStyle(
            "BodyMuted",
            parent=base_styles["Normal"],
            fontSize=8,
            leading=10.5,
            textColor=C_MUTED,
            fontName="Helvetica",
        ),
        "TableHead": ParagraphStyle(
            "TableHead",
            parent=base_styles["Normal"],
            fontSize=8,
            leading=10,
            textColor=C_SLATE_50,
            fontName="Helvetica-Bold",
        ),
        "TableCell": ParagraphStyle(
            "TableCell",
            parent=base_styles["Normal"],
            fontSize=8,
            leading=10.5,
            textColor=C_DARK_NAVY,
            fontName="Helvetica",
        ),
        "TableCellBold": ParagraphStyle(
            "TableCellBold",
            parent=base_styles["Normal"],
            fontSize=8,
            leading=10.5,
            textColor=C_DARK_NAVY,
            fontName="Helvetica-Bold",
        ),
        "Mono": ParagraphStyle(
            "Mono",
            parent=base_styles["Normal"],
            fontSize=7.5,
            leading=9.5,
            textColor=C_SLATE_800,
            fontName="Courier",
        ),
        "Disclaimer": ParagraphStyle(
            "Disclaimer",
            parent=base_styles["Normal"],
            fontSize=7.5,
            leading=9.5,
            textColor=C_MUTED,
            fontName="Helvetica-Oblique",
        ),
        "Caption": ParagraphStyle(
            "Caption",
            parent=base_styles["Normal"],
            fontSize=8,
            leading=10,
            textColor=C_MUTED,
            fontName="Helvetica-Bold",
            alignment=1,  # Centered
        ),
    }

    story = []

    # -----------------------------------------------------------------------
    # PAGE 1: HEADER & EXECUTIVE VERDICT
    # -----------------------------------------------------------------------
    story.append(Paragraph("SceneNav AI — Visual Localization & Registration Report", styles["DocTitle"]))
    timestamp_str = datetime.now().strftime("%Y-%m-%d %H:%M:%S UTC")
    meta_line = f"Job ID: <b>{result.job_id}</b> | Generated: {timestamp_str} | Software: OpenCV {result.software_versions.get('opencv', '4.x')} | SceneNav v{result.software_versions.get('app', '0.1.0')}"
    story.append(Paragraph(meta_line, styles["DocSubtitle"]))
    story.append(Spacer(1, 8))
    story.append(HRFlowable(width="100%", thickness=1, color=C_SLATE_700, spaceAfter=8))

    # Executive Verdict Banner (Table)
    qa = result.quality_assessment
    qa_status = qa.status.value if qa else ("ACCEPTED" if result.status.value == "success" else "REJECTED")
    conf_pct = f"{qa.confidence_score * 100.0:.1f}%" if qa else "N/A"

    is_georef = result.localization_status.value == "localized"
    loc_mode_str = "GEOGRAPHICALLY REFERENCED (WGS-84 / UTM)" if is_georef else "IMAGE-PLANE MATCH ONLY (Pixel Coordinates)"

    if qa_status == "ACCEPTED":
        badge_bg, badge_fg, badge_icon = C_GREEN_BG, C_GREEN, "PASS"
    elif qa_status == "LOW_CONFIDENCE":
        badge_bg, badge_fg, badge_icon = C_AMBER_BG, C_AMBER, "CAUTION"
    else:
        badge_bg, badge_fg, badge_icon = C_RED_BG, C_RED, "FAIL"

    verdict_data = [
        [
            Paragraph(f"<b>STATUS:</b> <font color='{badge_fg.hexval()}'>{badge_icon} {qa_status}</font>", styles["TableCellBold"]),
            Paragraph(f"<b>MODE:</b> {loc_mode_str}", styles["TableCellBold"]),
            Paragraph(f"<b>CONFIDENCE INDEX:</b> <font color='{C_CYAN.hexval()}'><b>{conf_pct}</b></font>", styles["TableCellBold"]),
        ],
    ]
    verdict_table = Table(verdict_data, colWidths=[150, 240, 150])
    verdict_table.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, -1), C_SLATE_200),
        ("BACKGROUND", (0, 0), (0, 0), badge_bg),
        ("TEXTCOLOR", (0, 0), (0, 0), badge_fg),
        ("ALIGN", (0, 0), (-1, -1), "LEFT"),
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
        ("INNERGRID", (0, 0), (-1, -1), 0.5, C_SLATE_700),
        ("BOX", (0, 0), (-1, -1), 1.0, C_SLATE_700),
        ("TOPPADDING", (0, 0), (-1, -1), 6),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
    ]))
    story.append(verdict_table)
    story.append(Spacer(1, 4))
    story.append(Paragraph(
        "<i>* Heuristic multi-signal confidence metric; not an absolute calibrated Bayesian probability. Image matching establishes 2D planar consistency, not independently verified ground-truth geodetic positioning.</i>",
        styles["Disclaimer"]
    ))
    story.append(Spacer(1, 8))

    # Input Data & Configuration Summary
    story.append(Paragraph("1. System Configuration & Input Images", styles["SectionHeader"]))
    params = result.algorithm_params
    config_data = [
        [
            Paragraph("<b>Reference Image</b>", styles["TableCellBold"]),
            Paragraph(f"{result.reference_image.filename} ({result.reference_image.width}x{result.reference_image.height} px, {result.reference_image.channels}ch)", styles["TableCell"]),
            Paragraph("<b>Algorithm</b>", styles["TableCellBold"]),
            Paragraph(f"{params.algorithm} ({result.algorithm_version})", styles["TableCell"]),
        ],
        [
            Paragraph("<b>Query Image</b>", styles["TableCellBold"]),
            Paragraph(f"{result.query_image.filename} ({result.query_image.width}x{result.query_image.height} px, {result.query_image.channels}ch)", styles["TableCell"]),
            Paragraph("<b>Pyramid Multi-Scale</b>", styles["TableCellBold"]),
            Paragraph(f"{'Enabled (1.0, 0.75, 0.5)' if getattr(params, 'multi_scale', False) else 'Disabled (Single Scale)'}", styles["TableCell"]),
        ],
        [
            Paragraph("<b>Lowe Ratio Threshold</b>", styles["TableCellBold"]),
            Paragraph(f"{params.ratio_threshold:.2f}", styles["TableCell"]),
            Paragraph("<b>RANSAC Reproj. Tol.</b>", styles["TableCellBold"]),
            Paragraph(f"{params.ransac_reproj_threshold:.1f} px (min inliers={params.min_inliers})", styles["TableCell"]),
        ],
    ]
    config_table = Table(config_data, colWidths=[110, 180, 110, 140])
    config_table.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (0, -1), C_SLATE_50),
        ("BACKGROUND", (2, 0), (2, -1), C_SLATE_50),
        ("GRID", (0, 0), (-1, -1), 0.5, C_SLATE_200),
        ("TOPPADDING", (0, 0), (-1, -1), 4),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
    ]))
    story.append(config_table)
    story.append(Spacer(1, 8))

    # Quantitative Performance & Diagnostic Metrics Table
    story.append(Paragraph("2. Computer Vision & Geometric Verification Metrics", styles["SectionHeader"]))
    reproj_mean = f"{result.reprojection_error.mean_px:.2f} px" if result.reprojection_error else "N/A"
    reproj_median = f"{result.reprojection_error.median_px:.2f} px" if result.reprojection_error else "N/A"
    inlier_ratio_str = f"{result.inlier_ratio * 100.0:.1f}%" if result.inlier_ratio is not None else "N/A"

    spatial = qa.spatial_metrics if qa else None
    spatial_spread_str = f"{spatial.spatial_spread_score * 100.0:.1f}%" if spatial else "N/A"
    grid_cov_str = f"{int(round(spatial.grid_coverage_ratio * 16))}/16 cells" if spatial else "N/A"

    cond = qa.conditioning_metrics if qa else None
    cond_str = f"{cond.canonical_condition_number:.2f}" if cond else "N/A"

    metrics_data = [
        [
            Paragraph("<b>Metric Name</b>", styles["TableHead"]),
            Paragraph("<b>Observed Value</b>", styles["TableHead"]),
            Paragraph("<b>Engineering Significance & Interpretation</b>", styles["TableHead"]),
        ],
        [
            Paragraph("Reference Keypoints", styles["TableCellBold"]),
            Paragraph(str(result.reference_keypoints), styles["Mono"]),
            Paragraph("Salient feature points detected across the reference map.", styles["TableCell"]),
        ],
        [
            Paragraph("Query Keypoints", styles["TableCellBold"]),
            Paragraph(str(result.query_keypoints), styles["Mono"]),
            Paragraph("Salient feature points detected across the observation scene.", styles["TableCell"]),
        ],
        [
            Paragraph("Tentative Matches", styles["TableCellBold"]),
            Paragraph(str(result.tentative_matches), styles["Mono"]),
            Paragraph("Initial nearest-neighbor descriptor correspondences.", styles["TableCell"]),
        ],
        [
            Paragraph("Filtered Matches", styles["TableCellBold"]),
            Paragraph(str(result.filtered_matches), styles["Mono"]),
            Paragraph("Correspondences surviving Lowe's ratio test and landmark deduplication.", styles["TableCell"]),
        ],
        [
            Paragraph("RANSAC Inliers", styles["TableCellBold"]),
            Paragraph(f"<b>{result.geometric_inliers or 0}</b> ({inlier_ratio_str})", styles["TableCellBold"]),
            Paragraph("Correspondences adhering to estimated planar homography within threshold.", styles["TableCell"]),
        ],
        [
            Paragraph("Reprojection Error", styles["TableCellBold"]),
            Paragraph(f"Mean: {reproj_mean}<br/>Median: {reproj_median}", styles["Mono"]),
            Paragraph("Sub-pixel residual between warped query and reference landmarks.", styles["TableCell"]),
        ],
        [
            Paragraph("Inlier Spatial Spread", styles["TableCellBold"]),
            Paragraph(f"{spatial_spread_str} ({grid_cov_str})", styles["Mono"]),
            Paragraph("Normalized geometric coverage across image quadrants.", styles["TableCell"]),
        ],
        [
            Paragraph("Condition Number κ(H)", styles["TableCellBold"]),
            Paragraph(cond_str, styles["Mono"]),
            Paragraph("Hartley-Zisserman isotropic condition number (< 10 indicates high stability).", styles["TableCell"]),
        ],
        [
            Paragraph("Total Pipeline Latency", styles["TableCellBold"]),
            Paragraph(f"{result.processing_time_s:.3f} s", styles["Mono"]),
            Paragraph("Wall-clock time including feature extraction, matching, RANSAC, and artifacts.", styles["TableCell"]),
        ],
    ]
    metrics_table = Table(metrics_data, colWidths=[120, 110, 310])
    metrics_table.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, 0), C_DARK_NAVY),
        ("ROWBACKGROUNDS", (0, 1), (-1, -1), [C_SLATE_50, colors.white]),
        ("GRID", (0, 0), (-1, -1), 0.5, C_SLATE_200),
        ("TOPPADDING", (0, 0), (-1, -1), 3),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 3),
    ]))
    story.append(metrics_table)
    story.append(Spacer(1, 8))

    # Dynamic Result Interpretation
    story.append(Paragraph("3. Algorithmic Interpretation & Findings", styles["SectionHeader"]))
    interpretation_paras = _generate_interpretation_narrative(result)
    for p_text in interpretation_paras:
        story.append(Paragraph(p_text, styles["Body"]))
        story.append(Spacer(1, 3))

    # -----------------------------------------------------------------------
    # PAGE 2: GEOSPATIAL INTELLIGENCE & FOOTPRINT (CENTERPIECE)
    # -----------------------------------------------------------------------
    story.append(PageBreak())
    story.append(Paragraph("4. Geospatial Intelligence & Estimated Footprint", styles["DocTitle"]))
    story.append(Paragraph("Visual centerpiece illustrating the projected observation footprint overlaid on the reference raster.", styles["DocSubtitle"]))
    story.append(Spacer(1, 8))
    story.append(HRFlowable(width="100%", thickness=1, color=C_SLATE_700, spaceAfter=8))

    # Geospatial Metadata Table
    if is_georef and result.geographic_footprint and result.georeference:
        gf = result.geographic_footprint
        pf = result.projected_footprint
        gr = result.georeference

        in_ha = (gf.in_raster_area_m2 or 0) / 10000.0
        out_ha = (gf.extrapolated_area_m2 or 0) / 10000.0
        tot_ha = (gf.area_m2 or 0) / 10000.0
        pct = gf.overlap_percentage or 100.0

        geo_data = [
            [
                Paragraph("<b>Coordinate System (CRS)</b>", styles["TableCellBold"]),
                Paragraph(f"{gr.crs_name or gr.crs} (EPSG:{gr.crs_epsg or 'Unknown'})", styles["TableCell"]),
                Paragraph("<b>Ground Sampling Dist.</b>", styles["TableCellBold"]),
                Paragraph(f"{gr.gsd_x:.2f} m/px" if gr.gsd_x else "N/A", styles["TableCell"]),
            ],
            [
                Paragraph("<b>Estimated Center (WGS-84)</b>", styles["TableCellBold"]),
                Paragraph(f"<b>{gf.center.lat:.6f}° N, {gf.center.lon:.6f}° E</b>", styles["TableCellBold"]),
                Paragraph("<b>Projected Center (UTM)</b>", styles["TableCellBold"]),
                Paragraph(f"E: {pf.center.x:.1f} m, N: {pf.center.y:.1f} m" if pf else "N/A", styles["TableCell"]),
            ],
            [
                Paragraph("<b>In-Raster Observed Area</b>", styles["TableCellBold"]),
                Paragraph(f"<b>{in_ha:.2f} ha</b> ({gf.in_raster_area_m2 or 0:,.0f} m² · {pct:.1f}%)", styles["TableCellBold"]),
                Paragraph("<b>Extrapolated Area</b>", styles["TableCellBold"]),
                Paragraph(f"{out_ha:.2f} ha ({gf.extrapolated_area_m2 or 0:,.0f} m²)", styles["TableCell"]),
            ],
            [
                Paragraph("<b>Northwest (NW) Corner</b>", styles["TableCellBold"]),
                Paragraph(f"{gf.top_left.lat:.5f}° N, {gf.top_left.lon:.5f}° E", styles["Mono"]),
                Paragraph("<b>Northeast (NE) Corner</b>", styles["TableCellBold"]),
                Paragraph(f"{gf.top_right.lat:.5f}° N, {gf.top_right.lon:.5f}° E", styles["Mono"]),
            ],
            [
                Paragraph("<b>Southwest (SW) Corner</b>", styles["TableCellBold"]),
                Paragraph(f"{gf.bottom_left.lat:.5f}° N, {gf.bottom_left.lon:.5f}° E", styles["Mono"]),
                Paragraph("<b>Southeast (SE) Corner</b>", styles["TableCellBold"]),
                Paragraph(f"{gf.bottom_right.lat:.5f}° N, {gf.bottom_right.lon:.5f}° E", styles["Mono"]),
            ],
        ]
        geo_table = Table(geo_data, colWidths=[120, 160, 120, 140])
        geo_table.setStyle(TableStyle([
            ("BACKGROUND", (0, 0), (0, -1), C_SLATE_50),
            ("BACKGROUND", (2, 0), (2, -1), C_SLATE_50),
            ("GRID", (0, 0), (-1, -1), 0.5, C_SLATE_200),
            ("TOPPADDING", (0, 0), (-1, -1), 4),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
        ]))
        story.append(geo_table)
    else:
        # Pixel-only table
        reg = result.estimated_region
        pix_data = [
            [
                Paragraph("<b>Reference Geometry</b>", styles["TableCellBold"]),
                Paragraph(f"{result.reference_image.width}x{result.reference_image.height} px (Unreferenced Raster)", styles["TableCell"]),
                Paragraph("<b>Coordinate System</b>", styles["TableCellBold"]),
                Paragraph("Image Pixel Coordinates Only (No GNSS)", styles["TableCell"]),
            ],
            [
                Paragraph("<b>Footprint NW Corner</b>", styles["TableCellBold"]),
                Paragraph(f"({reg.top_left[0]:.1f}, {reg.top_left[1]:.1f}) px" if reg else "N/A", styles["Mono"]),
                Paragraph("<b>Footprint NE Corner</b>", styles["TableCellBold"]),
                Paragraph(f"({reg.top_right[0]:.1f}, {reg.top_right[1]:.1f}) px" if reg else "N/A", styles["Mono"]),
            ],
            [
                Paragraph("<b>Footprint SW Corner</b>", styles["TableCellBold"]),
                Paragraph(f"({reg.bottom_left[0]:.1f}, {reg.bottom_left[1]:.1f}) px" if reg else "N/A", styles["Mono"]),
                Paragraph("<b>Footprint SE Corner</b>", styles["TableCellBold"]),
                Paragraph(f"({reg.bottom_right[0]:.1f}, {reg.bottom_right[1]:.1f}) px" if reg else "N/A", styles["Mono"]),
            ],
        ]
        pix_table = Table(pix_data, colWidths=[120, 160, 120, 140])
        pix_table.setStyle(TableStyle([
            ("BACKGROUND", (0, 0), (0, -1), C_SLATE_50),
            ("BACKGROUND", (2, 0), (2, -1), C_SLATE_50),
            ("GRID", (0, 0), (-1, -1), 0.5, C_SLATE_200),
            ("TOPPADDING", (0, 0), (-1, -1), 4),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
        ]))
        story.append(pix_table)

    story.append(Spacer(1, 10))

    # Figure 1: Estimated Footprint (Centerpiece)
    fp_img_path = job_dir / "04_footprint.png"
    rl_fp = _scale_image(fp_img_path, max_w=520.0, max_h=340.0)
    if rl_fp:
        story.append(rl_fp)
        story.append(Spacer(1, 4))
        story.append(Paragraph(
            "<b>Figure 1:</b> Estimated Query Footprint Overlaid on Reference Raster. "
            "Cyan fill indicates observed in-raster territory; amber indicates extrapolated area beyond raster boundaries.",
            styles["Caption"]
        ))
    else:
        story.append(Paragraph("<i>[Footprint visualization artifact not available]</i>", styles["BodyMuted"]))

    # -----------------------------------------------------------------------
    # PAGE 3: VISUAL CORRESPONDENCES & SCIENTIFIC LIMITATIONS
    # -----------------------------------------------------------------------
    story.append(PageBreak())
    story.append(Paragraph("5. Feature Correspondences & Geometric Verification", styles["DocTitle"]))
    story.append(Paragraph("Visual evidence of feature correspondences and RANSAC inlier consensus.", styles["DocSubtitle"]))
    story.append(Spacer(1, 8))
    story.append(HRFlowable(width="100%", thickness=1, color=C_SLATE_700, spaceAfter=8))

    # Figure 2: Geometric Verification (Inliers vs Outliers)
    inlier_img_path = job_dir / "03_inlier_matches.png"
    rl_inliers = _scale_image(inlier_img_path, max_w=520.0, max_h=190.0)
    if rl_inliers:
        story.append(rl_inliers)
        story.append(Spacer(1, 3))
        story.append(Paragraph(
            "<b>Figure 2:</b> RANSAC Inlier & Outlier Geometric Verification. "
            "Green lines indicate correspondences agreeing with estimated homography; coral red lines represent rejected outliers.",
            styles["Caption"]
        ))
        story.append(Spacer(1, 8))

    # Figure 3: Tentative Feature Correspondences
    tentative_img_path = job_dir / "02_tentative_matches.png"
    rl_tentative = _scale_image(tentative_img_path, max_w=520.0, max_h=170.0)
    if rl_tentative:
        story.append(rl_tentative)
        story.append(Spacer(1, 3))
        story.append(Paragraph(
            "<b>Figure 3:</b> Tentative Feature Correspondences (post Lowe's ratio test and landmark deduplication).",
            styles["Caption"]
        ))
        story.append(Spacer(1, 10))

    # Scientific Limitations & Sensor Caveats
    story.append(Paragraph("6. Scientific Limitations & Operational Guidance", styles["SectionHeader"]))
    limitations = [
        "<b>Planar Surface Assumption:</b> The homography estimation assumes either a planar Earth surface or a camera undergoing pure rotation. 3D structural parallax from tall buildings or steep elevation gradients will induce residual reprojection error.",
        "<b>Heuristic Reliability Score:</b> The confidence score is an uncalibrated heuristic index synthesizing inlier support, conditioning, and spatial dispersion. It is not an absolute frequentist or Bayesian probability.",
        "<b>Geodetic Orthoimagery Baseline:</b> Sub-pixel localization accuracy establishes geometric consistency with the reference raster. Absolute Earth geodetic position remains subject to the underlying map's circular error (e.g. USGS CE90 horizontal uncertainty of ±3 to 5 metres).",
        "<b>Autonomous Actuation Rule:</b> Flight path or targeting decisions should not rely on single-frame image matching; temporal Kalman filtering across consecutive frames is strongly recommended.",
    ]
    for lim in limitations:
        story.append(Paragraph(f"• {lim}", styles["Body"]))
        story.append(Spacer(1, 3))

    # Build PDF
    doc.build(story)
    logger.info("Successfully generated research report PDF at %s (%d bytes)", pdf_path, pdf_path.stat().st_size)
    return pdf_path


def _generate_interpretation_narrative(result: MatchResult) -> list[str]:
    """Generate dynamic, scientifically grounded interpretation text based on actual outcomes."""
    paragraphs = []
    qa = result.quality_assessment
    status = result.status.value

    if status == "success":
        inliers = result.geometric_inliers or 0
        total_filtered = result.filtered_matches or 1
        ratio_pct = (result.inlier_ratio or 0.0) * 100.0

        p1 = (
            f"<b>Homography Convergence:</b> Feature matching converged successfully with <b>{inliers} RANSAC inliers</b> "
            f"out of {total_filtered} filtered correspondences (<b>{ratio_pct:.1f}% inlier consensus</b>). "
            f"The mean reprojection error was <b>{result.reprojection_error.mean_px:.2f} pixels</b>, confirming robust "
            f"two-dimensional projective alignment between the query observation and the reference imagery."
        )
        paragraphs.append(p1)

        if qa:
            if qa.status.value == "ACCEPTED":
                p2 = (
                    f"<b>Reliability Assessment (ACCEPTED):</b> The match achieved a composite heuristic confidence score of "
                    f"<b>{qa.confidence_score * 100:.1f}%</b>. Inliers are well-distributed across {qa.spatial_metrics.grid_coverage_ratio * 16:.0f}/16 "
                    f"spatial grid quadrants with a spatial spread score of {qa.spatial_metrics.spatial_spread_score * 100:.1f}%. "
                    f"The Hartley-Zisserman condition number κ(H) of {qa.conditioning_metrics.canonical_condition_number:.2f} indicates "
                    f"stable, non-degenerate projective transformation."
                )
            elif qa.status.value == "LOW_CONFIDENCE":
                p2 = (
                    f"<b>Reliability Assessment (LOW_CONFIDENCE):</b> The match achieved a marginal confidence score of "
                    f"<b>{qa.confidence_score * 100:.1f}%</b>. While geometric consensus was found, diagnostic indicators suggest caution "
                    f"(e.g., localized inlier clustering, high projective skew, or marginal inlier density). Secondary sensor verification is advised."
                )
            else:
                p2 = (
                    f"<b>Reliability Assessment (REJECTED):</b> The estimated transform failed verification thresholds "
                    f"(confidence score {qa.confidence_score * 100:.1f}%). Correspondence support is insufficient or geometrically unstable."
                )
            paragraphs.append(p2)

        if result.localization_status.value == "localized" and result.geographic_footprint:
            gf = result.geographic_footprint
            p3 = (
                f"<b>Geospatial Footprint:</b> The reference raster contains georeferenced spatial metadata. "
                f"The estimated ground footprint covers <b>{(gf.in_raster_area_m2 or 0)/10000:.2f} ha</b> inside the reference tile "
                f"({gf.overlap_percentage:.1f}% overlap), centered at WGS-84 coordinate <b>{gf.center.lat:.6f}° N, {gf.center.lon:.6f}° E</b>. "
            )
            if (gf.extrapolated_area_m2 or 0) > 0:
                p3 += f"A portion of {(gf.extrapolated_area_m2 or 0)/10000:.2f} ha extends beyond the raster boundary into adjacent unmapped territory."
            paragraphs.append(p3)
        else:
            paragraphs.append(
                "<b>Geospatial Status (Pixel-Only):</b> The reference image does not contain spatial metadata (GeoTIFF tags / CRS). "
                "Consequently, the estimated footprint is expressed strictly in raster pixel coordinates. No latitude/longitude coordinates have been fabricated."
            )

        if result.warnings or (qa and qa.diagnostic_flags):
            all_flags = list(result.warnings) + (qa.diagnostic_flags if qa else [])
            paragraphs.append(f"<b>Active Diagnostic Flags:</b> {', '.join(set(all_flags))}.")
    else:
        paragraphs.append(
            f"<b>Localization Failure:</b> Pipeline terminated with status <b>{status}</b>. "
            f"Failure reason: <i>{result.failure_reason or 'Correspondences failed to satisfy geometric constraints.'}</i>"
        )

    return paragraphs
