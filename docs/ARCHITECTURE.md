# SceneNav AI — System Architecture

## Component Overview

```
SceneNav-AI/
├── backend/app/
│   ├── main.py          # FastAPI application factory
│   ├── config.py        # Pydantic settings (env-driven)
│   ├── schemas.py       # All request/response types
│   ├── api/
│   │   └── routes.py    # All HTTP endpoint handlers
│   └── services/
│       ├── image_loader.py          # Validation + loading
│       ├── feature_matcher.py       # ORB + BFMatcher + ratio test
│       ├── geometric_verification.py# RANSAC homography
│       ├── region_estimator.py      # Footprint projection
│       ├── georeferencing.py        # CRS, WGS-84, UTM, and geodesic metrics
│       ├── visualization.py         # OpenCV artifact generation
│       ├── evaluation.py            # Metrics aggregation
│       └── pipeline.py              # End-to-end orchestrator
├── frontend/src/
│   ├── api/client.js               # Centralised API calls
│   ├── hooks/                      # useBackendStatus, useMatchHistory
│   ├── components/                 # Header, ImageDropZone, MatchControls,
│   │                               #   MetricsPanel, ResultVisualizations, History
│   └── pages/DashboardPage.jsx     # Main workspace
├── data/
│   ├── references/                 # Reference images
│   ├── queries/                    # Query images
│   └── manifests/                  # JSON evaluation manifests
├── results/
│   └── {job_id}/                   # Per-job artifact directories
└── scripts/
    ├── generate_test_pairs.py      # Synthetic pair generator
    └── run_evaluation.py           # Batch evaluation runner
```

---

## Data Flow

```
User selects images (browser)
        │
        ▼ multipart/form-data POST /api/v1/match
FastAPI routes.py
        │ validates params
        │ reads upload bytes
        │ calls image_loader.load_image_from_bytes()
        │
        ▼
image_loader.py
        │ extension check → PIL decode → EXIF correct → BGR convert
        │ returns LoadedImage(array, width, height, ...)
        │
        ▼
feature_matcher.detect_and_match()
        │ ORB detectAndCompute (both images)
        │ BFMatcher knnMatch (k=2)
        │ Lowe's ratio test → good_matches
        │ returns MatchingResult
        │
        ▼ (if filtered_matches ≥ min_matches_before_geometry)
geometric_verification.verify_geometry()
        │ cv2.findHomography + RANSAC
        │ validate H (finite, non-singular, non-reflective, scale check)
        │ compute reprojection error on inliers
        │ returns GeometryResult
        │
        ▼ (if geometry succeeds)
region_estimator.estimate_region()
        │ perspectiveTransform(query corners, H)
        │ check bounds + polygon area + overlap fraction
        │ returns RegionResult
        │
        ▼ (if reference raster has CRS / GeoTIFF metadata)
georeferencing.compute_geographic_footprint()
        │ pixel (col, row) → projected (X, Y) via Affine transform
        │ projected → WGS-84 (lat, lon) via PyProj (always_xy=True)
        │ sets status='localized' (or 'image_match_only' if unreferenced)
        │
        ▼
visualization.save_all_visualizations()
        │ writes PNG artifacts to results/{job_id}/
        │
        ▼
MatchResult (JSON response to frontend)
        │
        ▼
Frontend renders MetricsPanel + ResultVisualizations + GeographicFootprint
```

---

## API Boundaries

All API clients communicate exclusively via the documented HTTP endpoints.  
No direct filesystem access is granted to API callers.  
Artifact paths returned in responses are relative references; actual files are served only through `/api/v1/artifacts/{job_id}/{filename}`, which enforces:

1. Job must exist in the in-memory store.
2. Filename must be a plain basename (no path separators).
3. File must exist within the job's results directory.
4. Only `.png`, `.jpg`, `.jpeg`, `.json` extensions are served.

---

## Storage and Artifact Lifecycle

- **Upload data:** Never written to disk. Held in memory for the duration of the request.
- **Results:** Written to `results/{job_id}/` by the pipeline. Not automatically deleted.
- **Job store:** In-memory Python dict. Cleared on server restart. Not a database.
- **Manifests:** Read-only. Must reside in `data/manifests/`. Path traversal is blocked.

---

## Configuration

All tunable values live in `backend/app/config.py` (pydantic-settings).  
They can be overridden via environment variables prefixed `SCENAV_`:

```
SCENAV_PORT=8000
SCENAV_MAX_UPLOAD_MB=50
SCENAV_ORB_MAX_FEATURES=5000
SCENAV_CORS_ORIGINS=http://localhost:5173
```

See `.env.example` for the full list.

---

## Security Properties

- User-supplied filenames are used only for format extension checking — never as filesystem paths.
- Uploaded bytes are decoded by Pillow/OpenCV, never executed.
- All filesystem paths are resolved and validated against allowed directories.
- Stack traces are never returned to API clients.
- CORS is restricted to the configured frontend origin.
