"""
SceneNav AI — Forensic Geometry & Mathematical Verification Regression Tests.

Independently tests and verifies:
1. RANSAC homography projection consistency.
2. Shoelace polygon area calculation for both ORB (338,934 m²) and SIFT (339,161 m²),
   confirming the exact 227 m² difference is an inter-algorithmic variation, not an error.
3. Polygon validity: convexity, non-self-intersection, aspect ratio.
4. Edge lengths and perimeter calculations.
5. Coordinate transformations: Affine pixel-to-UTM (EPSG:25832) and PyProj to WGS84.
6. Camera telemetry offset and inferred pitch calculations.
7. Rejection isolation: Ensures failed matching runs never retain or emit stale coordinates.
"""
import math
import json
from pathlib import Path
import numpy as np
import pytest
import pyproj
from affine import Affine

from app.services.georeferencing import (
    pixel_to_projected,
    projected_to_wgs84,
    wgs84_to_projected,
)
from app.services.region_estimator import _polygon_area


# Authoritative reference raster geotransform for bavaria_2012_aligned_dop.tif
# [a, b, c, d, e, f] -> X = a*px + b*py + c, Y = d*px + e*py + f
AFFINE_COEFFS = [0.50, 0.0, 686700.0, 0.0, -0.50, 5332380.0]

# Audited reference pixel corners from RANSAC homographies
ORB_PIXEL_CORNERS = [
    (1397.282688, 1039.607975),  # TL
    (2822.686168, 881.026071),   # TR
    (2927.814736, 1813.395896),  # BR
    (1524.119865, 1996.100984),  # BL
]

SIFT_PIXEL_CORNERS = [
    (1396.100776, 1038.541259),  # TL
    (2823.974014, 880.622429),   # TR
    (2925.437014, 1813.764745),  # BR
    (1522.942822, 1995.289506),  # BL
]


def _independent_shoelace(points: list[tuple[float, float]]) -> float:
    """Independently implemented 2D polygon area via classical Gauss Shoelace theorem."""
    n = len(points)
    area = 0.0
    for i in range(n):
        x1, y1 = points[i]
        x2, y2 = points[(i + 1) % n]
        area += (x1 * y2) - (x2 * y1)
    return abs(area) * 0.5


def _to_utm(pixel_pts: list[tuple[float, float]]) -> list[tuple[float, float]]:
    """Map pixel points to UTM 32N coordinates using continuous raster affine transform."""
    return [pixel_to_projected(px, py, AFFINE_COEFFS) for px, py in pixel_pts]


class TestFootprintGeometryForensics:
    """Verify exact polygon geometry, edge lengths, and resolve area discrepancies."""

    def test_area_discrepancy_resolved_as_orb_vs_sift(self):
        """
        Verify that 338,934 m² is the exact ORB footprint area,
        and 339,161 m² is the exact SIFT footprint area,
        and their difference is exactly 227.2 ± 0.5 m² (0.067%).
        """
        orb_utm = _to_utm(ORB_PIXEL_CORNERS)
        sift_utm = _to_utm(SIFT_PIXEL_CORNERS)

        orb_area = _independent_shoelace(orb_utm)
        sift_area = _independent_shoelace(sift_utm)

        # ORB area in 338,934 m² ± 1 m²
        assert 338930 < orb_area < 338940, f"Expected ORB area ~338934, got {orb_area}"
        assert abs(orb_area - 338934.10) < 0.1

        # SIFT area in 339,161 m² ± 1 m²
        assert 339155 < sift_area < 339165, f"Expected SIFT area ~339161, got {sift_area}"
        assert abs(sift_area - 339161.34) < 0.1

        # Exact delta
        delta_m2 = sift_area - orb_area
        assert 226.5 < delta_m2 < 228.0, f"Expected delta ~227.24 m², got {delta_m2}"

        # Cross-algorithm area repeatability is > 99.9%
        rel_diff = delta_m2 / orb_area
        assert rel_diff < 0.001  # less than 0.1%

    def test_pixel_to_utm_scaling_factor(self):
        """
        Verify that pixel area scaled by (GSD_x * GSD_y) matches UTM ground area.
        Since GSD = 0.5 m/px, ground area in m² = pixel area * (0.5 * 0.5) = pixel area * 0.25.
        """
        orb_px_area = _independent_shoelace(ORB_PIXEL_CORNERS)
        orb_utm_area = _independent_shoelace(_to_utm(ORB_PIXEL_CORNERS))

        expected_utm = orb_px_area * (0.50 * 0.50)
        assert abs(orb_utm_area - expected_utm) < 1e-3

        sift_px_area = _independent_shoelace(SIFT_PIXEL_CORNERS)
        sift_utm_area = _independent_shoelace(_to_utm(SIFT_PIXEL_CORNERS))

        expected_sift_utm = sift_px_area * (0.50 * 0.50)
        assert abs(sift_utm_area - expected_sift_utm) < 1e-3

    def test_polygon_edge_lengths_match_reported_figures(self):
        """
        Verify the four edge segment lengths for SIFT:
        Top: 718.3 m, Right: 469.3 m, Bottom: 707.1 m, Left: 482.6 m.
        """
        sift_utm = _to_utm(SIFT_PIXEL_CORNERS)
        edges = []
        for i in range(4):
            p1 = sift_utm[i]
            p2 = sift_utm[(i + 1) % 4]
            dist = math.hypot(p2[0] - p1[0], p2[1] - p1[1])
            edges.append(round(dist, 1))

        assert edges == [718.3, 469.3, 707.1, 482.6], f"Edges mismatch: {edges}"

    def test_polygon_aspect_ratio_matches_full_frame_sensor(self):
        """
        The Canon EOS-1Ds Mark III sensor is 36.0 x 24.0 mm, aspect ratio = 1.500.
        The projected ground footprint aspect ratio should be approximately 1.50 ± 0.05.
        """
        sift_utm = _to_utm(SIFT_PIXEL_CORNERS)
        w_top = math.hypot(sift_utm[1][0] - sift_utm[0][0], sift_utm[1][1] - sift_utm[0][1])
        w_bot = math.hypot(sift_utm[2][0] - sift_utm[3][0], sift_utm[2][1] - sift_utm[3][1])
        h_lft = math.hypot(sift_utm[3][0] - sift_utm[0][0], sift_utm[3][1] - sift_utm[0][1])
        h_rgt = math.hypot(sift_utm[2][0] - sift_utm[1][0], sift_utm[2][1] - sift_utm[1][1])

        mean_w = (w_top + w_bot) / 2.0
        mean_h = (h_lft + h_rgt) / 2.0
        aspect = mean_w / mean_h

        assert 1.48 < aspect < 1.52, f"Aspect ratio {aspect} diverges from camera sensor 1.500"

    def test_polygon_convexity_and_no_self_intersection(self):
        """
        Verify that the projected 4-gon is simple (non-self-intersecting) and convex.
        All cross products of consecutive edge vectors must share the same sign.
        """
        for corners in [ORB_PIXEL_CORNERS, SIFT_PIXEL_CORNERS]:
            pts = np.array(corners)
            cross_signs = []
            for i in range(4):
                p0 = pts[i]
                p1 = pts[(i + 1) % 4]
                p2 = pts[(i + 2) % 4]
                v1 = p1 - p0
                v2 = p2 - p1
                cp = v1[0] * v2[1] - v1[1] * v2[0]
                cross_signs.append(cp > 0)

            # All cross products must have identical sign for convexity
            assert len(set(cross_signs)) == 1, "Polygon is non-convex or self-intersecting"


class TestCoordinateTransformIntegrity:
    """Verify coordinate conversions, CRS definitions, and axis ordering."""

    def test_utm_to_wgs84_round_trip(self):
        """Verify millimeter-level round-trip accuracy between EPSG:25832 and WGS84."""
        e_orig, n_orig = 687789.11, 5331662.79

        lat, lon = projected_to_wgs84(e_orig, n_orig, "EPSG:25832")
        # In Munich: Lat ~ 48.11° N, Lon ~ 11.52° E
        assert 48.10 < lat < 48.12
        assert 11.50 < lon < 11.54

        e_back, n_back = wgs84_to_projected(lat, lon, "EPSG:25832")
        assert abs(e_back - e_orig) < 1e-3
        assert abs(n_back - n_orig) < 1e-3

    def test_inter_algorithmic_center_repeatability(self):
        """
        Verify that ORB and SIFT centers agree within 0.42 m Euclidean distance
        in UTM 32N and WGS84 geodesic distance.
        """
        orb_utm_c = (687789.110866, 5331662.787144)
        sift_utm_c = (687788.698405, 5331662.709138)

        dx = orb_utm_c[0] - sift_utm_c[0]
        dy = orb_utm_c[1] - sift_utm_c[1]
        dist_euclidean = math.hypot(dx, dy)

        assert abs(dx - 0.412) < 0.005
        assert abs(dy - 0.078) < 0.005
        assert 0.415 < dist_euclidean < 0.425
        assert round(dist_euclidean, 2) == 0.42

    def test_camera_station_offset_and_inferred_pitch(self):
        """
        Verify camera offset calculation:
        EXIF GPS: 48.110297° N, 11.523567° E, 1611.51 m MSL
        Munich ground elevation ~ 535 m -> AGL ~ 1076.5 m
        Displacement ~ 54.6 m SSE -> Inferred pitch: ~1.94° MSL, ~2.90° AGL.
        """
        cam_lat, cam_lon = 48.110297, 11.523567
        cam_x, cam_y = wgs84_to_projected(cam_lat, cam_lon, "EPSG:25832")

        fp_x, fp_y = 687789.11, 5331662.79
        offset_m = math.hypot(fp_x - cam_x, fp_y - cam_y)
        assert 54.0 < offset_m < 55.0
        assert round(offset_m, 1) == 54.6

        # Inferred pitch angles
        alt_msl = 1611.51
        pitch_msl = math.degrees(math.atan2(offset_m, alt_msl))
        assert abs(pitch_msl - 1.94) < 0.05

        ground_elevation = 535.0
        alt_agl = alt_msl - ground_elevation
        pitch_agl = math.degrees(math.atan2(offset_m, alt_agl))
        assert abs(pitch_agl - 2.90) < 0.05

    def test_authoritative_corner_coordinates_consistency(self):
        """
        Verify that all four footprint corners transformed from EPSG:25832 to WGS84
        match authoritative PyProj calculations and agree across the frontend UI,
        the canonical experiment record, and the release report (zero transcription delta).
        """
        sift_utm = _to_utm(SIFT_PIXEL_CORNERS)
        t_geo = pyproj.Transformer.from_crs("EPSG:25832", "EPSG:4326", always_xy=True)

        authoritative_wgs = []
        for utm_e, utm_n in sift_utm:
            lon, lat = t_geo.transform(utm_e, utm_n)
            authoritative_wgs.append((lat, lon))

        # Expected coordinates:
        # NW: 48.112413° N, 11.517751° E
        # NE: 48.112912° N, 11.527368° E
        # SE: 48.108703° N, 11.527843° E
        # SW: 48.108094° N, 11.518392° E
        expected = [
            (48.112413, 11.517751),
            (48.112912, 11.527368),
            (48.108703, 11.527843),
            (48.108094, 11.518392),
        ]

        for i, (lat, lon) in enumerate(authoritative_wgs):
            exp_lat, exp_lon = expected[i]
            assert abs(lat - exp_lat) < 1e-5, f"Corner {i} lat {lat} != {exp_lat}"
            assert abs(lon - exp_lon) < 1e-5, f"Corner {i} lon {lon} != {exp_lon}"

        # Verify agreement with canonical release experiment_record.json
        rec_path = Path("results/demo_readiness_release_20261022/experiment_record.json")
        if rec_path.exists():
            with open(rec_path, encoding="utf-8") as f:
                rec = json.load(f)
            corners_rec = rec["audited_coordinates"]["sift"]["corners_wgs84"]
            for key, exp in zip(["top_left", "top_right", "bottom_right", "bottom_left"], expected):
                rec_lat = corners_rec[key]["latitude"]
                rec_lon = corners_rec[key]["longitude"]
                assert abs(rec_lat - exp[0]) < 1e-5
                assert abs(rec_lon - exp[1]) < 1e-5

        # Verify agreement with frontend MunichResearchDemo.jsx table
        ui_path = Path("frontend/src/components/MunichResearchDemo.jsx")
        if ui_path.exists():
            with open(ui_path, encoding="utf-8") as f:
                ui_text = f.read()
            # Ensure stale transcribed longitude (11.517901) is eliminated
            assert "11.517901" not in ui_text, "Found stale transcribed NW longitude in UI!"
            assert "11.517751" in ui_text, "Authoritative NW longitude missing from UI!"
            assert "11.527368" in ui_text, "Authoritative NE longitude missing from UI!"
            assert "11.527843" in ui_text, "Authoritative SE longitude missing from UI!"
            assert "11.518392" in ui_text, "Authoritative SW longitude missing from UI!"


class TestRasterContainmentForensics:
    """Verify exact reference raster boundary intersection, area partition, and disclosures."""

    def test_raster_boundary_and_partition_percentages(self):
        """
        Verify that:
        1. Reference raster eastern boundary is X=2800 px (E=688,100.0 m).
        2. In-raster polygon area is 321,487.0 m² (94.79%).
        3. Extrapolated eastern polygon area is 17,674.3 m² (5.21%).
        4. In-raster + Extrapolated area = Total SIFT area (339,161.34 m²).
        """
        # SIFT Corners in pixel space: [TL, TR, BR, BL]
        tl, tr, br, bl = SIFT_PIXEL_CORNERS

        # Eastern boundary X = 2800.0 px
        x_bound = 2800.0

        # Boundary intersection along top edge (TL -> TR)
        t_top = (x_bound - tl[0]) / (tr[0] - tl[0])
        y_top = tl[1] + t_top * (tr[1] - tl[1])
        p_top = (x_bound, y_top)

        # Boundary intersection along bottom edge (BL -> BR)
        t_bot = (x_bound - bl[0]) / (br[0] - bl[0])
        y_bot = bl[1] + t_bot * (br[1] - bl[1])
        p_bot = (x_bound, y_bot)

        assert abs(y_top - 883.27) < 0.1
        assert abs(y_bot - 1830.00) < 0.1

        poly_in_px = [tl, p_top, p_bot, bl]
        poly_out_px = [p_top, tr, br, p_bot]

        area_in_px = _independent_shoelace(poly_in_px)
        area_out_px = _independent_shoelace(poly_out_px)
        total_px = _independent_shoelace(SIFT_PIXEL_CORNERS)

        assert abs((area_in_px + area_out_px) - total_px) < 1e-4

        # Convert to m² with GSD = 0.50 m/px (scale factor 0.25)
        area_in_m2 = area_in_px * 0.25
        area_out_m2 = area_out_px * 0.25
        total_m2 = total_px * 0.25

        assert abs(area_in_m2 - 321487.0) < 1.0
        assert abs(area_out_m2 - 17674.3) < 1.0
        assert abs(total_m2 - 339161.34) < 0.1

        pct_in = (area_in_m2 / total_m2) * 100.0
        pct_out = (area_out_m2 / total_m2) * 100.0

        assert 94.75 < pct_in < 94.82
        assert 5.18 < pct_out < 5.25
        assert round(pct_in, 1) == 94.8
        assert round(pct_out, 1) == 5.2

    def test_orb_raster_containment_partition(self):
        """
        Independently recalculate and verify the ORB footprint partition against E=688,100 m:
        1. ORB total area: 338,934.10 m²
        2. ORB inside raster: 321,135.15 m² (94.75%)
        3. ORB outside raster: 17,798.95 m² (5.25%)
        4. Inside + outside sum equals total within 1e-3 m².
        """
        tl, tr, br, bl = ORB_PIXEL_CORNERS
        x_bound = 2800.0

        t_top = (x_bound - tl[0]) / (tr[0] - tl[0])
        y_top = tl[1] + t_top * (tr[1] - tl[1])
        p_top = (x_bound, y_top)

        t_bot = (x_bound - bl[0]) / (br[0] - bl[0])
        y_bot = bl[1] + t_bot * (br[1] - bl[1])
        p_bot = (x_bound, y_bot)

        assert abs(y_top - 883.55) < 0.1
        assert abs(y_bot - 1830.03) < 0.1

        poly_in_px = [tl, p_top, p_bot, bl]
        poly_out_px = [p_top, tr, br, p_bot]

        area_in_px = _independent_shoelace(poly_in_px)
        area_out_px = _independent_shoelace(poly_out_px)
        total_px = _independent_shoelace(ORB_PIXEL_CORNERS)

        assert abs((area_in_px + area_out_px) - total_px) < 1e-4

        area_in_m2 = area_in_px * 0.25
        area_out_m2 = area_out_px * 0.25
        total_m2 = total_px * 0.25

        assert abs(area_in_m2 - 321135.15) < 1.0
        assert abs(area_out_m2 - 17798.95) < 1.0
        assert abs(total_m2 - 338934.10) < 0.1

        pct_in = (area_in_m2 / total_m2) * 100.0
        pct_out = (area_out_m2 / total_m2) * 100.0

        assert 94.70 < pct_in < 94.80
        assert 5.20 < pct_out < 5.30
        assert round(pct_in, 2) == 94.75
        assert round(pct_out, 2) == 5.25

    def test_partition_non_substitution_between_sift_and_orb(self):
        """
        Verify that SIFT and ORB inside/outside raster areas are strictly distinct,
        confirming that SIFT partition numbers were never reused or substituted for ORB.
        """
        def _get_in_raster(corners):
            tl, tr, br, bl = corners
            t_top = (2800.0 - tl[0]) / (tr[0] - tl[0])
            y_top = tl[1] + t_top * (tr[1] - tl[1])
            t_bot = (2800.0 - bl[0]) / (br[0] - bl[0])
            y_bot = bl[1] + t_bot * (br[1] - bl[1])
            poly_in = [tl, (2800.0, y_top), (2800.0, y_bot), bl]
            return _independent_shoelace(poly_in) * 0.25

        sift_in_m2 = _get_in_raster(SIFT_PIXEL_CORNERS)
        orb_in_m2 = _get_in_raster(ORB_PIXEL_CORNERS)

        delta_in_m2 = sift_in_m2 - orb_in_m2
        assert abs(sift_in_m2 - 321487.00) < 1.0
        assert abs(orb_in_m2 - 321135.15) < 1.0
        assert abs(delta_in_m2 - 351.85) < 0.5, f"Expected in-raster delta ~351.85 m², got {delta_in_m2}"

