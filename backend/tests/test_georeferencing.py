"""
SceneNav AI — Georeferencing & Visual Localization Test Suite

Rigorous tests for:
1. Geospatial metadata extraction from GeoTIFF rasters and graceful degradation for standard imagery.
2. Pixel-to-Projected and Projected-to-WGS84 transformations with inverse consistency.
3. Query footprint calculation in projected CRS and WGS84 lat/lon.
4. Honest coordinate policy: NO coordinate hallucination for unreferenced images.
5. Bounds-checking and out-of-bounds footprint warnings.
6. Quantitative geodesic and Euclidean metric error computations.
7. Pipeline integration across LOCALIZED, IMAGE_MATCH_ONLY, and REJECTED states.
"""
import math
from pathlib import Path

import numpy as np
import pytest
import rasterio
from rasterio.transform import Affine, from_origin
from rasterio.io import MemoryFile

from app.config import settings
from app.schemas import (
    GeographicFootprint,
    GeoreferenceInfo,
    LatLonPoint,
    LocalizationStatus,
    MatchParams,
    MatchStatus,
    ProjectedFootprint,
    ProjectedPoint,
)
from app.services.georeferencing import (
    compute_corner_error_m,
    compute_geodesic_distance_m,
    compute_geographic_footprint,
    compute_projected_distance_m,
    extract_georeference_metadata,
    pixel_to_projected,
    projected_to_pixel,
    projected_to_wgs84,
    wgs84_to_projected,
)
from app.services.image_loader import load_image_from_bytes, load_image_from_path
from app.services.pipeline import run_matching_pipeline


@pytest.fixture
def sample_geotiff_bytes() -> bytes:
    """Generate in-memory valid GeoTIFF in EPSG:32616 (UTM 16N) with 1m resolution."""
    transform = from_origin(770500.0, 3709500.0, 1.0, 1.0)
    data = (np.random.default_rng(42).random((3, 100, 100)) * 255).astype(np.uint8)
    with MemoryFile() as memfile:
        with memfile.open(
            driver="GTiff",
            height=100,
            width=100,
            count=3,
            dtype="uint8",
            crs="EPSG:32616",
            transform=transform,
        ) as dst:
            dst.write(data)
        return memfile.read()


@pytest.fixture
def sample_png_bytes() -> bytes:
    """Generate in-memory standard unreferenced PNG."""
    from PIL import Image
    import io
    img = Image.new("RGB", (64, 64), color=(100, 150, 200))
    buf = io.BytesIO()
    img.save(buf, format="PNG")
    return buf.getvalue()


# ---------------------------------------------------------------------------
# Metadata Extraction Tests
# ---------------------------------------------------------------------------

class TestMetadataExtraction:
    def test_extract_valid_geotiff(self, sample_geotiff_bytes):
        georef = extract_georeference_metadata(sample_geotiff_bytes)
        assert georef.is_georeferenced is True
        assert georef.crs == "EPSG:32616"
        assert georef.crs_epsg == 32616
        assert georef.gsd_x == 1.0
        assert georef.gsd_y == 1.0
        assert georef.affine_transform is not None
        assert georef.affine_transform[0] == 1.0
        assert georef.affine_transform[2] == 770500.0
        assert georef.affine_transform[5] == 3709500.0

    def test_extract_png_is_not_georeferenced(self, sample_png_bytes):
        georef = extract_georeference_metadata(sample_png_bytes)
        assert georef.is_georeferenced is False
        assert georef.crs is None
        assert georef.affine_transform is None
        assert georef.bounds_projected is None

    def test_extract_corrupted_data_returns_unreferenced(self):
        corrupted = b"not a real image header at all"
        georef = extract_georeference_metadata(corrupted)
        assert georef.is_georeferenced is False

    def test_extract_nonexistent_file_returns_unreferenced(self, tmp_path):
        missing = tmp_path / "nonexistent.tif"
        georef = extract_georeference_metadata(missing)
        assert georef.is_georeferenced is False


# ---------------------------------------------------------------------------
# Coordinate Transformation Tests
# ---------------------------------------------------------------------------

class TestCoordinateTransformations:
    def test_pixel_to_projected_and_inverse(self):
        aff = [0.5, 0.0, 500000.0, 0.0, -0.5, 3000000.0]
        col, row = 25.5, 42.0

        xp, yp = pixel_to_projected(col, row, aff)
        assert xp == pytest.approx(500000.0 + 25.5 * 0.5)
        assert yp == pytest.approx(3000000.0 - 42.0 * 0.5)

        inv_col, inv_row = projected_to_pixel(xp, yp, aff)
        assert inv_col == pytest.approx(col, abs=1e-5)
        assert inv_row == pytest.approx(row, abs=1e-5)

    def test_projected_to_wgs84_roundtrip(self):
        crs = "EPSG:32616"
        x_orig, y_orig = 770500.0, 3709500.0

        lat, lon = projected_to_wgs84(x_orig, y_orig, crs)
        # Lat/Lon for UTM 16N Easting 770500 Northing 3709500
        assert 30.0 < lat < 36.0
        assert -86.0 < lon < -82.0


        x_back, y_back = wgs84_to_projected(lat, lon, crs)
        assert x_back == pytest.approx(x_orig, abs=1e-2)
        assert y_back == pytest.approx(y_orig, abs=1e-2)

    def test_projected_to_wgs84_invalid_crs_raises(self):
        with pytest.raises(Exception):
            projected_to_wgs84(100.0, 200.0, "EPSG:99999999")


# ---------------------------------------------------------------------------
# Footprint & Bounds Tests
# ---------------------------------------------------------------------------

class TestFootprintAndBounds:
    def test_footprint_within_bounds(self, sample_geotiff_bytes):
        georef = extract_georeference_metadata(sample_geotiff_bytes)
        corners = {
            "top_left": (10.0, 10.0),
            "top_right": (50.0, 10.0),
            "bottom_right": (50.0, 50.0),
            "bottom_left": (10.0, 50.0),
        }
        center = (30.0, 30.0)

        proj_fp, geo_fp, warnings = compute_geographic_footprint(
            corners, center, georef, ref_width=100, ref_height=100
        )
        assert proj_fp is not None
        assert geo_fp is not None
        assert len(warnings) == 0
        assert proj_fp.center.x == pytest.approx(770530.0)
        assert proj_fp.center.y == pytest.approx(3709470.0)

    def test_footprint_outside_bounds_warns(self, sample_geotiff_bytes):
        georef = extract_georeference_metadata(sample_geotiff_bytes)
        corners = {
            "top_left": (-20.0, 10.0),
            "top_right": (150.0, 10.0),
            "bottom_right": (150.0, 120.0),
            "bottom_left": (-20.0, 120.0),
        }
        center = (65.0, 65.0)

        proj_fp, geo_fp, warnings = compute_geographic_footprint(
            corners, center, georef, ref_width=100, ref_height=100
        )
        assert proj_fp is not None
        assert geo_fp is not None
        assert len(warnings) > 0
        assert any("falls outside reference raster bounds" in w for w in warnings)

    def test_unreferenced_raster_produces_none_footprints(self, sample_png_bytes):
        georef = extract_georeference_metadata(sample_png_bytes)
        corners = {
            "top_left": (10.0, 10.0),
            "top_right": (40.0, 10.0),
            "bottom_right": (40.0, 40.0),
            "bottom_left": (10.0, 40.0),
        }
        proj_fp, geo_fp, warnings = compute_geographic_footprint(
            corners, (25.0, 25.0), georef, 64, 64
        )
        assert proj_fp is None
        assert geo_fp is None


# ---------------------------------------------------------------------------
# Metric Distance and Error Calculation Tests
# ---------------------------------------------------------------------------

class TestMetricDistanceCalculations:
    def test_geodesic_distance_known_meridian(self):
        # 1 degree of latitude is approximately 111 km
        pt1 = LatLonPoint(lat=0.0, lon=0.0)
        pt2 = LatLonPoint(lat=1.0, lon=0.0)
        dist = compute_geodesic_distance_m(pt1, pt2)
        assert 110000.0 < dist < 111500.0

    def test_geodesic_distance_zero_for_identical(self):
        pt = LatLonPoint(lat=33.5, lon=-90.0)
        dist = compute_geodesic_distance_m(pt, pt)
        assert dist == pytest.approx(0.0, abs=1e-5)

    def test_corner_error_m(self):
        fp1 = GeographicFootprint(
            top_left=LatLonPoint(lat=33.0, lon=-90.0),
            top_right=LatLonPoint(lat=33.0, lon=-89.9),
            bottom_right=LatLonPoint(lat=32.9, lon=-89.9),
            bottom_left=LatLonPoint(lat=32.9, lon=-90.0),
            center=LatLonPoint(lat=32.95, lon=-89.95),
        )
        # Identical footprint has 0 error
        assert compute_corner_error_m(fp1, fp1) == pytest.approx(0.0, abs=1e-4)


# ---------------------------------------------------------------------------
# End-to-End Pipeline Integration Tests
# ---------------------------------------------------------------------------

class TestPipelineLocalizationIntegration:
    def test_georeferenced_match_yields_localized_status(self):
        manifest_path = settings.data_dir / "manifests" / "georeferenced_pairs.json"
        if not manifest_path.exists():
            pytest.skip("georeferenced_pairs.json manifest not found.")

        import json
        with open(manifest_path, encoding="utf-8") as f:
            manifest = json.load(f)

        pair = manifest["pairs"][0]  # georef_greenwood_01_crop
        ref_path = (settings.data_dir / pair["reference"]).resolve()
        qry_path = (settings.data_dir / pair["query"]).resolve()

        ref = load_image_from_path(ref_path)
        qry = load_image_from_path(qry_path)

        assert ref.georeference.is_georeferenced is True
        result = run_matching_pipeline(ref, qry, MatchParams(algorithm="ORB"))

        assert result.status == MatchStatus.SUCCESS
        assert result.localization_status == LocalizationStatus.LOCALIZED
        assert result.geographic_footprint is not None
        assert result.projected_footprint is not None
        assert result.localization is not None
        assert result.localization.status == LocalizationStatus.LOCALIZED

        # Verify center coordinate matches ground truth within 2 metres
        gt_center = pair["ground_truth_center_wgs84"]
        err_m = compute_geodesic_distance_m(
            result.geographic_footprint.center, (gt_center[0], gt_center[1])
        )
        assert err_m < 2.0

    def test_standard_png_yields_image_match_only(self):
        manifest_path = settings.data_dir / "manifests" / "synthetic_pairs.json"
        if not manifest_path.exists():
            pytest.skip("synthetic_pairs.json manifest not found.")

        import json
        with open(manifest_path, encoding="utf-8") as f:
            manifest = json.load(f)

        pair = manifest["pairs"][0]
        ref = load_image_from_path(settings.data_dir / pair["reference"])
        qry = load_image_from_path(settings.data_dir / pair["query"])

        assert ref.georeference.is_georeferenced is False
        result = run_matching_pipeline(ref, qry, MatchParams(algorithm="ORB"))

        assert result.status == MatchStatus.SUCCESS
        assert result.localization_status == LocalizationStatus.IMAGE_MATCH_ONLY
        assert result.geographic_footprint is None
        assert result.projected_footprint is None
        assert result.localization.status == LocalizationStatus.IMAGE_MATCH_ONLY

    def test_negative_pair_yields_rejected_status(self):
        manifest_path = settings.data_dir / "manifests" / "georeferenced_pairs.json"
        if not manifest_path.exists():
            pytest.skip("georeferenced_pairs.json manifest not found.")

        import json
        with open(manifest_path, encoding="utf-8") as f:
            manifest = json.load(f)

        neg_pair = next(p for p in manifest["pairs"] if p.get("is_negative"))
        ref = load_image_from_path(settings.data_dir / neg_pair["reference"])
        qry = load_image_from_path(settings.data_dir / neg_pair["query"])

        result = run_matching_pipeline(ref, qry, MatchParams(algorithm="ORB"))
        assert result.localization_status == LocalizationStatus.REJECTED
        assert result.geographic_footprint is None
