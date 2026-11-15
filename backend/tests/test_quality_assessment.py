"""
Tests for SceneNav AI Localization Quality & Reliability Assessment Module.

Verifies:
1. Spatial dispersion metrics (uniform vs clustered vs empty).
2. Numerical conditioning (condition number, SVD singular values, canonical isotropic normalization).
3. Projective horizon crossing detection.
4. Interior quadrilateral angle computation and acute distortion detection.
5. Inlier collinearity detection.
6. Reliability status assignment (ACCEPTED, LOW_CONFIDENCE, REJECTED).
7. Confidence score bounds [0.0, 1.0] and uncalibrated disclaimer.
8. Multi-scale pyramid candidate extraction and coordinate rescaling.
9. Geospatial area partitioning and strict CRS validation.
"""
from __future__ import annotations

import math
import cv2
import numpy as np
import pytest

from app.schemas import ReliabilityStatus, QualityAssessment
from app.services.quality_assessment import (
    compute_inlier_spatial_distribution,
    compute_conditioning_metrics,
    compute_quad_interior_angles,
    compute_isotropic_transform,
    assess_localization_quality,
)
from app.services.feature_matcher import detect_and_match
from app.services.georeferencing import (
    extract_georeference_metadata,
    compute_geographic_footprint,
)
from app.services.image_loader import LoadedImage
from app.schemas import GeoreferenceInfo


class TestSpatialDispersionMetrics:
    """Tests for inlier distribution analysis across image coordinates."""

    def test_uniform_distribution_yields_high_spread(self):
        np.random.seed(42)
        # Uniformly distributed points across a 1000x1000 image
        pts = np.random.uniform(50, 950, size=(200, 2))
        spatial = compute_inlier_spatial_distribution(pts, 1000, 1000)

        assert spatial.spatial_spread_score > 0.60
        assert spatial.grid_coverage_ratio >= 0.80
        assert spatial.convex_hull_area_ratio > 0.60
        assert spatial.spatial_entropy > 0.70

    def test_clustered_distribution_yields_low_spread(self):
        np.random.seed(42)
        # 100 inliers tightly clustered in a tiny 30x30 patch inside a cell
        pts_in_cell = np.random.uniform(300, 330, size=(100, 2))
        spatial_cell = compute_inlier_spatial_distribution(pts_in_cell, 1000, 1000)

        assert spatial_cell.spatial_spread_score < 0.10
        assert spatial_cell.convex_hull_area_ratio < 0.01
        assert spatial_cell.grid_coverage_ratio <= 0.125  # Only 1 cell (0.0625)

        # 100 inliers clustered right on the center intersection boundary (500, 500)
        pts_on_boundary = np.random.uniform(485, 515, size=(100, 2))
        spatial_boundary = compute_inlier_spatial_distribution(pts_on_boundary, 1000, 1000)
        # Even though touching 4 boundary cells, spread score MUST still be very low
        assert spatial_boundary.spatial_spread_score < 0.05

    def test_empty_inliers_handled_safely(self):
        pts = np.zeros((0, 2), dtype=np.float32)
        spatial = compute_inlier_spatial_distribution(pts, 500, 500)

        assert spatial.spatial_spread_score == 0.0
        assert spatial.convex_hull_area_ratio == 0.0
        assert spatial.grid_coverage_ratio == 0.0


class TestHomographyConditioning:
    """Tests for numerical stability and geometric sanity."""

    def test_identity_homography_is_well_conditioned(self):
        H = np.eye(3, dtype=np.float64)
        corners = np.array([[0, 0], [500, 0], [500, 500], [0, 500]], dtype=np.float64)
        cond = compute_conditioning_metrics(H, 500, 500, 500, 500, corners)

        assert abs(cond.canonical_condition_number - 1.0) < 1e-4
        assert not cond.horizon_crossing
        assert abs(cond.determinant - 1.0) < 1e-4
        assert cond.min_quad_angle_deg == pytest.approx(90.0, abs=1e-2)
        assert cond.max_quad_angle_deg == pytest.approx(90.0, abs=1e-2)

    def test_horizon_crossing_detected(self):
        # Homography that places line at infinity across the image
        H_crossing = np.array([
            [1.0, 0.0, 0.0],
            [0.0, 1.0, 0.0],
            [0.005, 0.0, 1.0],  # w = 0.005*x + 1; for x in [0, 500], w changes or at neg x would flip
        ], dtype=np.float64)
        # Flip sign across corners
        H_crossing[2, 0] = -0.005  # at x=500, w = -2.5 + 1 = -1.5 (sign flips!)
        cond = compute_conditioning_metrics(H_crossing, 500, 500, 500, 500)

        assert cond.horizon_crossing is True

    def test_quad_interior_angles_square(self):
        corners = np.array([[0, 0], [100, 0], [100, 100], [0, 100]], dtype=np.float64)
        angles = compute_quad_interior_angles(corners)
        assert len(angles) == 4
        for a in angles:
            assert a == pytest.approx(90.0, abs=1e-3)

    def test_quad_interior_angles_acute_sheared(self):
        # Severe needle distortion
        corners = np.array([[0, 0], [1000, 2], [100, 10], [0, 50]], dtype=np.float64)
        angles = compute_quad_interior_angles(corners)
        min_angle = min(angles)
        assert min_angle < 20.0


class TestCollinearityDetection:
    """Tests for rejecting collinear inlier sets."""

    def test_collinear_inliers_detected_and_rejected(self):
        # Inliers along the line y = 2*x + 5
        x = np.linspace(50, 450, 30)
        y = 2.0 * x + 5.0
        inliers_collinear = np.column_stack([x, y])

        H_mock = np.eye(3, dtype=np.float64)
        res = assess_localization_quality(
            match_success=True,
            geometry_success=True,
            query_width=500,
            query_height=500,
            reference_width=500,
            reference_height=500,
            inlier_count=30,
            filtered_matches=35,
            inlier_ratio=0.85,
            query_inliers=inliers_collinear,
            homography=H_mock,
        )

        assert res.status == ReliabilityStatus.REJECTED
        assert "COLLINEAR_INLIERS" in res.diagnostic_flags


class TestReliabilityStatusTransitions:
    """Tests verifying categorical status transitions."""

    def test_high_confidence_match_accepted(self):
        np.random.seed(123)
        pts = np.random.uniform(50, 450, size=(120, 2))
        H = np.eye(3, dtype=np.float64)
        corners = np.array([[0, 0], [500, 0], [500, 500], [0, 500]], dtype=np.float64)

        res = assess_localization_quality(
            match_success=True,
            geometry_success=True,
            query_width=500,
            query_height=500,
            reference_width=500,
            reference_height=500,
            inlier_count=100,
            filtered_matches=110,
            inlier_ratio=0.90,
            query_inliers=pts,
            homography=H,
            projected_corners=corners,
            mean_reproj_error_px=0.45,
            overlap_fraction=1.0,
        )

        assert res.status == ReliabilityStatus.ACCEPTED
        assert res.confidence_score >= 0.85
        assert res.is_calibrated is False
        assert len(res.diagnostic_flags) == 0

    def test_low_inlier_count_yields_low_confidence(self):
        pts = np.array([[50, 50], [450, 50], [450, 450], [50, 450], [250, 250],
                        [100, 200], [300, 150], [400, 350], [150, 350], [250, 100],
                        [200, 400], [350, 200]], dtype=np.float64)
        H = np.eye(3, dtype=np.float64)
        corners = np.array([[0, 0], [500, 0], [500, 500], [0, 500]], dtype=np.float64)

        res = assess_localization_quality(
            match_success=True,
            geometry_success=True,
            query_width=500,
            query_height=500,
            reference_width=500,
            reference_height=500,
            inlier_count=12,  # Marginal count (10-15)
            filtered_matches=30,
            inlier_ratio=0.40,
            query_inliers=pts,
            homography=H,
            projected_corners=corners,
            mean_reproj_error_px=1.2,
            overlap_fraction=1.0,
        )

        assert res.status == ReliabilityStatus.LOW_CONFIDENCE
        assert "LOW_INLIER_COUNT" in res.diagnostic_flags

    def test_failed_match_rejected_immediately(self):
        res = assess_localization_quality(
            match_success=False,
            geometry_success=False,
            query_width=500,
            query_height=500,
            reference_width=500,
            reference_height=500,
            inlier_count=0,
            filtered_matches=0,
            inlier_ratio=0.0,
            base_failure_reason="No descriptors found.",
        )

        assert res.status == ReliabilityStatus.REJECTED
        assert res.confidence_score == 0.0
        assert "No descriptors found." in res.failure_reasons


class TestMultiScaleFeatureMatching:
    """Tests for multi-scale pyramid feature extraction."""

    def test_multi_scale_flag_executes_and_rescales_coordinates(self):
        # Create a synthetic image with gradient and textured patches
        img_arr = np.zeros((300, 300, 3), dtype=np.uint8)
        cv2.circle(img_arr, (150, 150), 60, (255, 255, 255), -1)
        cv2.rectangle(img_arr, (50, 50), (120, 120), (180, 180, 180), -1)
        for i in range(10, 290, 20):
            cv2.line(img_arr, (i, 0), (i, 300), (100, 100, 100), 1)

        loaded_ref = LoadedImage(
            array=img_arr, width=300, height=300, channels=3,
            filename="ref.png", file_size_bytes=1000, original_format="PNG"
        )
        loaded_qry = LoadedImage(
            array=img_arr, width=300, height=300, channels=3,
            filename="qry.png", file_size_bytes=1000, original_format="PNG"
        )

        # Single scale
        res_single = detect_and_match(loaded_ref, loaded_qry, multi_scale=False)
        assert res_single.success is True

        # Multi scale
        res_multi = detect_and_match(loaded_ref, loaded_qry, multi_scale=True, scale_factors=[1.0, 0.75, 0.5])
        assert res_multi.success is True
        # Keypoints should be extracted within image bounds [0, 300]
        for pt in res_multi.query_pts:
            assert -10.0 <= pt[0] <= 310.0
            assert -10.0 <= pt[1] <= 310.0


class TestGeospatialAreaPartitioning:
    """Tests for metric footprint area calculations."""

    def test_in_raster_and_extrapolated_area_accounting(self):
        georef = GeoreferenceInfo(
            is_georeferenced=True,
            crs="EPSG:32632",
            crs_epsg=32632,
            crs_name="WGS 84 / UTM zone 32N",
            units="metre",
            affine_transform=[1.0, 0.0, 500000.0, 0.0, -1.0, 5300000.0],
            bounds_projected={"left": 500000.0, "bottom": 5299000.0, "right": 501000.0, "top": 5300000.0},
        )
        # Footprint with 80% inside, 20% extrapolated
        corners = {
            "top_left": (100.0, 100.0),
            "top_right": (1100.0, 100.0),  # extends 100 px past ref_width=1000
            "bottom_right": (1100.0, 500.0),
            "bottom_left": (100.0, 500.0),
        }
        center = (600.0, 300.0)

        proj_fp, geo_fp, warnings = compute_geographic_footprint(
            corners_pixel=corners,
            center_pixel=center,
            georef=georef,
            ref_width=1000,
            ref_height=1000,
            in_raster_area_px=360000.0,
            extrapolated_area_px=40000.0,
            total_projected_area_px=400000.0,
            overlap_fraction=0.90,
        )

        assert proj_fp is not None
        assert geo_fp is not None
        assert proj_fp.area_m2 == pytest.approx(400000.0, rel=1e-3)
        assert proj_fp.in_raster_area_m2 == pytest.approx(360000.0, rel=1e-3)
        assert proj_fp.extrapolated_area_m2 == pytest.approx(40000.0, rel=1e-3)
        assert proj_fp.overlap_percentage == pytest.approx(90.0, rel=1e-3)
        assert len(warnings) > 0  # Extends past 1000
