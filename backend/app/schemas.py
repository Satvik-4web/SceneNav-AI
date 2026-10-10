"""
SceneNav AI — Pydantic request/response schemas.

All public API types are defined here to keep routes.py clean.
"""
from __future__ import annotations

from enum import Enum
from typing import Optional
from pydantic import BaseModel, Field, field_validator


# ---------------------------------------------------------------------------
# Enumerations
# ---------------------------------------------------------------------------

class MatchStatus(str, Enum):
    """Outcome categories for a matching attempt."""
    SUCCESS = "success"
    INSUFFICIENT_FEATURES = "insufficient_features"
    INSUFFICIENT_MATCHES = "insufficient_matches"
    GEOMETRY_FAILED = "geometry_failed"
    INVALID_IMAGE = "invalid_image"
    PROCESSING_ERROR = "processing_error"


# ---------------------------------------------------------------------------
# Request models
# ---------------------------------------------------------------------------

class MatchParams(BaseModel):
    """User-supplied matching parameters validated before processing."""
    orb_max_features: int = Field(
        default=5000, ge=100, le=20000,
        description="Maximum ORB keypoints to detect per image."
    )
    ratio_threshold: float = Field(
        default=0.75, ge=0.5, le=0.95,
        description="Lowe's ratio-test threshold. Lower = stricter filtering."
    )
    ransac_reproj_threshold: float = Field(
        default=4.0, ge=1.0, le=20.0,
        description="RANSAC reprojection-error tolerance in pixels."
    )
    min_inliers: int = Field(
        default=10, ge=4, le=500,
        description="Minimum geometric inliers required for a valid homography."
    )


class EvaluateRequest(BaseModel):
    """Request to run an evaluation over a named dataset manifest."""
    manifest_name: str = Field(
        description="Filename (without path) of a manifest in data/manifests/."
    )
    params: MatchParams = Field(default_factory=MatchParams)

    @field_validator("manifest_name")
    @classmethod
    def safe_manifest_name(cls, v: str) -> str:
        # Prevent path traversal: only bare filenames allowed.
        from pathlib import PurePosixPath
        name = PurePosixPath(v).name
        if name != v or "/" in v or "\\" in v or ".." in v:
            raise ValueError("manifest_name must be a plain filename, not a path.")
        return name


# ---------------------------------------------------------------------------
# Image-level sub-schemas
# ---------------------------------------------------------------------------

class ImageInfo(BaseModel):
    filename: str
    width: int
    height: int
    channels: int
    file_size_bytes: int


class ReprojectionStats(BaseModel):
    mean_px: float
    median_px: float
    max_px: float


class RegionCoordinates(BaseModel):
    """
    The four corners of the query image projected into reference-image
    pixel coordinates via the estimated homography.

    Convention: corners are listed clockwise from top-left.
    Units are reference-image pixels.  These are image coordinates, NOT
    geographic coordinates — do not interpret as lat/lon without valid
    georeferencing data.
    """
    top_left: tuple[float, float]
    top_right: tuple[float, float]
    bottom_right: tuple[float, float]
    bottom_left: tuple[float, float]


# ---------------------------------------------------------------------------
# Main result schema
# ---------------------------------------------------------------------------

class MatchResult(BaseModel):
    """Complete structured result returned by the matching pipeline."""

    # Identity
    job_id: str
    status: MatchStatus

    # Input metadata
    reference_image: ImageInfo
    query_image: ImageInfo

    # Feature statistics
    reference_keypoints: int
    query_keypoints: int
    tentative_matches: int
    filtered_matches: int

    # Geometry statistics (present only when geometry succeeds)
    geometric_inliers: Optional[int] = None
    inlier_ratio: Optional[float] = None
    reprojection_error: Optional[ReprojectionStats] = None

    # Transformation (3×3 homography matrix as nested list)
    homography_matrix: Optional[list[list[float]]] = None

    # Region estimation
    estimated_region: Optional[RegionCoordinates] = None
    region_warnings: list[str] = Field(default_factory=list)

    # Diagnostics
    warnings: list[str] = Field(default_factory=list)
    failure_reason: Optional[str] = None

    # Timing
    processing_time_s: float

    # Reproducibility record
    algorithm_params: MatchParams
    algorithm_version: str
    software_versions: dict[str, str]

    # Artifact paths (relative to results/)
    artifacts: dict[str, str] = Field(default_factory=dict)


class JobStatusResponse(BaseModel):
    job_id: str
    status: str
    result: Optional[MatchResult] = None


class HealthResponse(BaseModel):
    status: str
    version: str
    algorithm_version: str


class CapabilitiesResponse(BaseModel):
    supported_formats: list[str]
    algorithms: list[str]
    max_upload_mb: int
    max_image_dim: int
    features: list[str]
