# Results Directory

Generated matching artifacts are stored here, organized by job ID.

Each job directory contains:
- `01_side_by_side.png`    — Reference and query images side by side
- `02_tentative_matches.png` — All ratio-test matches
- `03_inlier_matches.png`  — Geometric inliers only (when geometry succeeds)
- `04_footprint.png`       — Estimated query footprint on reference (when valid)
- `result.json`            — Full machine-readable result

This directory is **not** tracked by git (see `.gitignore`).
