"""
SceneNav AI — Configuration
All tunable parameters are read from environment variables with documented defaults.
"""
from __future__ import annotations

import os
from pathlib import Path
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    # Server
    host: str = "127.0.0.1"
    port: int = 8000
    reload: bool = True
    log_level: str = "info"

    # CORS
    cors_origins: list[str] = ["http://localhost:5173"]

    # Storage — paths are resolved relative to the project root
    results_dir: Path = Path("results")
    data_dir: Path = Path("data")

    # Upload limits
    max_upload_mb: int = 50
    max_image_dim: int = 8192  # pixels per side

    # Algorithm defaults
    orb_max_features: int = 5000
    ratio_threshold: float = 0.75        # Lowe's ratio test
    ransac_reproj_threshold: float = 4.0  # pixels
    min_inliers: int = 10
    min_matches_before_geometry: int = 8  # minimum filtered matches needed

    # Version
    app_version: str = "0.1.0"
    algorithm_version: str = "ORB-v1"

    model_config = {"env_prefix": "SCENAV_", "env_file": ".env", "extra": "ignore"}


# Singleton — imported throughout the app
settings = Settings()

# Ensure storage directories exist at startup
settings.results_dir.mkdir(parents=True, exist_ok=True)
(settings.data_dir / "references").mkdir(parents=True, exist_ok=True)
(settings.data_dir / "queries").mkdir(parents=True, exist_ok=True)
(settings.data_dir / "manifests").mkdir(parents=True, exist_ok=True)
