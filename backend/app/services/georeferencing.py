"""
SceneNav AI — Georeferencing Service

Provides rigorous geospatial coordinate transformations and metadata extraction
for satellite and aerial reference rasters.

Key guarantees:
1. Strict adherence to CRS and Affine transform specifications.
2. Honest integrity policy: NEVER fabricates coordinates for unreferenced imagery
   (e.g., PNG/JPEG without georeferencing).
3. Standard continuous pixel convention:
   (0, 0) is the outer top-left corner of the raster.
   x_proj = a * px_x + b * px_y + c
   y_proj = d * px_x + e * px_y + f
4. pyproj transformer uses always_xy=True to guarantee (x, y) / (lon, lat) parameter
   order, preventing axis-ordering confusion between EPSG:4326 and projected CRSs.
5. Geodesic ellipsoidal distance (WGS-84) for rigorous metric error evaluation.
"""
from __future__ import annotations

import io
import logging
import math
import warnings
from pathlib import Path
from typing import Optional, Union

import numpy as np
import pyproj
import rasterio
from rasterio.errors import NotGeoreferencedWarning, RasterioIOError
from rasterio.transform import Affine

from app.schemas import (
    GeographicFootprint,
    GeoreferenceInfo,
    LatLonPoint,
    LocalizationResult,
    LocalizationStatus,
    ProjectedFootprint,
    ProjectedPoint,
)

logger = logging.getLogger(__name__)

# Reusable WGS84 Geod instance for geodesic calculations
_WGS84_GEOD = pyproj.Geod(ellps="WGS84")


def extract_georeference_metadata(
    source: Union[bytes, Path, str]
) -> GeoreferenceInfo:
    """
    Extract CRS, Affine transform, GSD, and projected bounds from image bytes or a file path.

    Returns GeoreferenceInfo with is_georeferenced=True if valid geospatial metadata exists,
    or is_georeferenced=False if missing, corrupted, or standard unreferenced raster.
    Never throws an exception — always degrades gracefully to unreferenced state.
    """
    try:
        with warnings.catch_warnings():
            warnings.simplefilter("ignore", category=NotGeoreferencedWarning)
            if isinstance(source, bytes):
                with rasterio.io.MemoryFile(source) as memfile:
                    with memfile.open() as src:
                        return _parse_dataset_georef(src)
            else:
                path = Path(source)
                if not path.is_file():
                    return GeoreferenceInfo(is_georeferenced=False)
                with rasterio.open(path) as src:
                    return _parse_dataset_georef(src)
    except Exception as exc:
        logger.debug("Failed to extract georeference metadata: %s", exc)
        return GeoreferenceInfo(is_georeferenced=False)


def _parse_dataset_georef(src: rasterio.DatasetReader) -> GeoreferenceInfo:
    """Internal helper to parse a rasterio DatasetReader into GeoreferenceInfo."""
    if src.crs is None:
        return GeoreferenceInfo(is_georeferenced=False)

    transform = src.transform
    if transform is None or transform.is_identity:
        return GeoreferenceInfo(is_georeferenced=False)

    # Check determinant for non-invertible/degenerate transform
    det = transform.a * transform.e - transform.b * transform.d
    if abs(det) < 1e-12:
        return GeoreferenceInfo(is_georeferenced=False)

    crs_str = src.crs.to_string()
    crs_epsg = src.crs.to_epsg()
    crs_name = getattr(src.crs, "name", None) or crs_str

    # Units
    linear_units = getattr(src.crs, "linear_units", None)
    if not linear_units:
        linear_units = "degree" if src.crs.is_geographic else "metre"

    # Ground Sample Distance (pixel size)
    gsd_x = abs(float(transform.a))
    gsd_y = abs(float(transform.e))

    # Projected bounds
    b = src.bounds
    bounds_dict = {
        "left": float(b.left),
        "bottom": float(b.bottom),
        "right": float(b.right),
        "top": float(b.top),
    }

    # Affine transform coefficients [a, b, c, d, e, f]
    affine_list = [
        float(transform.a),
        float(transform.b),
        float(transform.c),
        float(transform.d),
        float(transform.e),
        float(transform.f),
    ]

    return GeoreferenceInfo(
        is_georeferenced=True,
        crs=crs_str,
        crs_epsg=crs_epsg,
        crs_name=crs_name,
        units=linear_units,
        gsd_x=gsd_x,
        gsd_y=gsd_y,
        bounds_projected=bounds_dict,
        affine_transform=affine_list,
    )


def pixel_to_projected(
    px_x: float,
    px_y: float,
    affine_transform: list[float] | Affine,
) -> tuple[float, float]:
    """
    Map reference raster pixel coordinates (px_x, px_y) to projected CRS coordinates (X, Y).
    Convention: Continuous raster coordinates where (0, 0) is the top-left outer corner.
    """
    if isinstance(affine_transform, Affine):
        a, b, c, d, e, f = (
            affine_transform.a,
            affine_transform.b,
            affine_transform.c,
            affine_transform.d,
            affine_transform.e,
            affine_transform.f,
        )
    else:
        a, b, c, d, e, f = affine_transform

    x_proj = a * px_x + b * px_y + c
    y_proj = d * px_x + e * px_y + f
    return float(x_proj), float(y_proj)


def projected_to_pixel(
    x_proj: float,
    y_proj: float,
    affine_transform: list[float] | Affine,
) -> tuple[float, float]:
    """
    Invert projected coordinates (X, Y) back into pixel coordinates (px_x, px_y).
    """
    if isinstance(affine_transform, Affine):
        aff = affine_transform
    else:
        aff = Affine(*affine_transform)

    inv = ~aff
    px_x = inv.a * x_proj + inv.b * y_proj + inv.c
    px_y = inv.d * x_proj + inv.e * y_proj + inv.f
    return float(px_x), float(px_y)



def projected_to_wgs84(
    x_proj: float,
    y_proj: float,
    src_crs: str,
) -> tuple[float, float]:
    """
    Convert projected coordinates (X, Y) to WGS84 (latitude, longitude).
    Always returns (lat, lon) within valid geographic bounds.
    """
    transformer = pyproj.Transformer.from_crs(src_crs, "EPSG:4326", always_xy=True)
    lon, lat = transformer.transform(x_proj, y_proj)

    # Sanity checks
    if math.isnan(lat) or math.isnan(lon) or math.isinf(lat) or math.isinf(lon):
        raise ValueError(f"Projected coordinates ({x_proj}, {y_proj}) produced non-finite lat/lon.")

    # Clamp minor numerical spillover
    lat = max(-90.0, min(90.0, float(lat)))
    lon = ((float(lon) + 180.0) % 360.0) - 180.0

    return lat, lon


def wgs84_to_projected(
    lat: float,
    lon: float,
    dst_crs: str,
) -> tuple[float, float]:
    """Convert WGS84 (latitude, longitude) to projected coordinates (X, Y)."""
    transformer = pyproj.Transformer.from_crs("EPSG:4326", dst_crs, always_xy=True)
    x_proj, y_proj = transformer.transform(lon, lat)
    return float(x_proj), float(y_proj)


def compute_geographic_footprint(
    corners_pixel: dict[str, tuple[float, float]],
    center_pixel: tuple[float, float],
    georef: GeoreferenceInfo,
    ref_width: int,
    ref_height: int,
) -> tuple[Optional[ProjectedFootprint], Optional[GeographicFootprint], list[str]]:
    """
    Convert estimated footprint pixel coordinates into projected and WGS84 footprints.

    Returns:
        (ProjectedFootprint, GeographicFootprint, list_of_warnings)
    """
    if not georef.is_georeferenced or not georef.crs or not georef.affine_transform:
        return None, None, []

    warnings_list: list[str] = []
    aff = georef.affine_transform

    # Check bounds
    for name, (px_x, px_y) in {**corners_pixel, "center": center_pixel}.items():
        if px_x < 0 or px_x > ref_width or px_y < 0 or px_y > ref_height:
            warnings_list.append(
                f"Footprint {name} ({px_x:.1f}, {px_y:.1f}) falls outside reference raster bounds (0..{ref_width}, 0..{ref_height})."
            )

    try:
        # 1. Projected coordinates
        proj_pts: dict[str, ProjectedPoint] = {}
        geo_pts: dict[str, LatLonPoint] = {}

        for k in ["top_left", "top_right", "bottom_right", "bottom_left"]:
            px_x, px_y = corners_pixel[k]
            xp, yp = pixel_to_projected(px_x, px_y, aff)
            proj_pts[k] = ProjectedPoint(x=xp, y=yp)

            lat, lon = projected_to_wgs84(xp, yp, georef.crs)
            geo_pts[k] = LatLonPoint(lat=lat, lon=lon)

        # Center point
        cx_p, cy_p = pixel_to_projected(center_pixel[0], center_pixel[1], aff)
        proj_pts["center"] = ProjectedPoint(x=cx_p, y=cy_p)
        c_lat, c_lon = projected_to_wgs84(cx_p, cy_p, georef.crs)
        geo_pts["center"] = LatLonPoint(lat=c_lat, lon=c_lon)

        projected_fp = ProjectedFootprint(
            top_left=proj_pts["top_left"],
            top_right=proj_pts["top_right"],
            bottom_right=proj_pts["bottom_right"],
            bottom_left=proj_pts["bottom_left"],
            center=proj_pts["center"],
            crs_name=georef.crs_name or georef.crs,
            units=georef.units or "metre",
        )

        geographic_fp = GeographicFootprint(
            top_left=geo_pts["top_left"],
            top_right=geo_pts["top_right"],
            bottom_right=geo_pts["bottom_right"],
            bottom_left=geo_pts["bottom_left"],
            center=geo_pts["center"],
        )

        return projected_fp, geographic_fp, warnings_list

    except Exception as exc:
        logger.error("Error transforming footprint coordinates: %s", exc)
        warnings_list.append(f"Georeferencing projection failed: {exc}")
        return None, None, warnings_list


def compute_geodesic_distance_m(
    pt1: Union[LatLonPoint, tuple[float, float]],
    pt2: Union[LatLonPoint, tuple[float, float]],
) -> float:
    """
    Compute geodesic distance in metres between two (lat, lon) points on the WGS84 ellipsoid.
    """
    lat1, lon1 = (pt1.lat, pt1.lon) if isinstance(pt1, LatLonPoint) else pt1
    lat2, lon2 = (pt2.lat, pt2.lon) if isinstance(pt2, LatLonPoint) else pt2

    _, _, distance_m = _WGS84_GEOD.inv(lon1, lat1, lon2, lat2)
    return float(distance_m)


def compute_projected_distance_m(
    pt1: Union[ProjectedPoint, tuple[float, float]],
    pt2: Union[ProjectedPoint, tuple[float, float]],
) -> float:
    """Compute 2D Euclidean distance between projected coordinates in metres."""
    x1, y1 = (pt1.x, pt1.y) if isinstance(pt1, ProjectedPoint) else pt1
    x2, y2 = (pt2.x, pt2.y) if isinstance(pt2, ProjectedPoint) else pt2
    return float(math.hypot(x2 - x1, y2 - y1))


def compute_corner_error_m(
    estimated_fp: GeographicFootprint,
    ground_truth_fp: GeographicFootprint,
) -> float:
    """
    Compute mean geodesic corner error in metres across all four footprint corners.
    """
    errors = [
        compute_geodesic_distance_m(estimated_fp.top_left, ground_truth_fp.top_left),
        compute_geodesic_distance_m(estimated_fp.top_right, ground_truth_fp.top_right),
        compute_geodesic_distance_m(estimated_fp.bottom_right, ground_truth_fp.bottom_right),
        compute_geodesic_distance_m(estimated_fp.bottom_left, ground_truth_fp.bottom_left),
    ]
    return float(np.mean(errors))
