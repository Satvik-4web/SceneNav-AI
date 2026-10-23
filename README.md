# SceneNav AI

**Scene Aided Navigation Research Prototype**  
*Offline image matching, region estimation, and reproducible evaluation*

[![Python 3.10+](https://img.shields.io/badge/python-3.10+-blue)](https://python.org)
[![OpenCV 5.x](https://img.shields.io/badge/opencv-5.x-green)](https://opencv.org)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.14x-009688)](https://fastapi.tiangolo.com)
[![React + Vite](https://img.shields.io/badge/React-Vite-646CFF)](https://vitejs.dev)

---

## Overview

SceneNav AI matches a query aerial or satellite image against a stored reference image using classical computer vision (ORB + RANSAC homography). It estimates the corresponding image region, visualizes correspondences, and evaluates performance on documented test sets.

> **Important:** This system performs **image-plane feature matching only**.  
> It does **not** compute geographic latitude/longitude without valid georeferencing data.  
> Match count and inlier ratio are image-matching metrics — not evidence of real-world navigation accuracy.

---

## Features

- **Dual Vision Engines:** Classical ORB baseline (Hamming BFMatcher) and SIFT alternative baseline ($L_2$ BFMatcher).
- **Georeferenced Visual Localization MVP:** Ingests GeoTIFF reference rasters with embedded CRS (`EPSG:32616`, `EPSG:32610`, etc.) and affine transforms; maps query footprints to projected Easting/Northing and WGS-84 Latitude/Longitude with verified ellipsoidal geodesic error in physical metres.
- **Three-State Localization Classification:** Explicit classification into `localized` (georeferenced match), `image_match_only` (unreferenced 2D pixel match), and `rejected`. Coordinates are NEVER fabricated on unreferenced imagery.
- **Lowe's Ratio-Test & Mutual Consistency:** Dual-direction cross-check filtering for match ambiguity suppression.
- **RANSAC Homography Estimation:** Robust planar projective transformation estimation with degenerate model rejection.
- **Query Footprint Projection:** Projects sensor observation boundaries onto reference coordinate space with area validation.
- **Real-World Aerial Benchmark:** 15 authentic USGS/USDA NAIP aerial orthophoto pairs with verified planar ground truth, uncalibrated observations, and cross-scene negatives.
- **Georeferenced Benchmark Suite:** 6 GeoTIFF evaluation pairs with UTM/WGS-84 ground-truth coordinates measuring metric localization error.
- **False Acceptance Evaluation:** Rigorous negative pair evaluation with explicit False Acceptance Rate and True Negative Rate tracking.
- **Baseline Comparison Evaluator:** Side-by-side ORB vs SIFT evaluation with automated Markdown, CSV, and JSON report generation.
- **FastAPI Backend:** Fully validated endpoints, streaming upload guards, strict resolved-path containment, and artifact serving.
- **React + Vite Dashboard:** Interactive image matching, parameter controls, zoom & pan viewer, suite tabs, and report exporter.
- **Synthetic Test Pair Generator:** 100% offline procedural test generator for controlled transform benchmarking.

---

## Architecture

```
┌─────────────────────────────────────┐
│         React Frontend (Vite)       │
│  ImageDropZone · MatchControls      │
│  MetricsPanel · Visualizations      │
└──────────────┬──────────────────────┘
               │ HTTP (multipart/form-data)
               ▼
┌─────────────────────────────────────┐
│         FastAPI Backend             │
│  POST /api/v1/match                 │
│  GET  /api/v1/artifacts/{id}/{file} │
│  GET  /health                       │
└──────────────┬──────────────────────┘
               │
               ▼
┌─────────────────────────────────────┐
│         Vision Pipeline             │
│  image_loader → feature_matcher     │
│  → geometric_verification           │
│  → region_estimator                 │
│  → visualization                    │
└─────────────────────────────────────┘
               │
               ▼
┌─────────────────────────────────────┐
│         results/  (artifacts)       │
│  {job_id}/01_side_by_side.png       │
│  {job_id}/02_tentative_matches.png  │
│  {job_id}/03_inlier_matches.png     │
│  {job_id}/04_footprint.png          │
│  {job_id}/result.json               │
└─────────────────────────────────────┘
```

See [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) for full details.

---

## Prerequisites

| Tool | Minimum version | Notes |
|------|----------------|-------|
| Python | 3.10 | 3.11+ recommended |
| Node.js | 18 | 24.x used in development |
| npm | 9 | Bundled with Node |
| Git | Any | Optional |

GPU is optional — the pipeline runs fully on CPU.  
An NVIDIA RTX 3050 (CUDA 13.1) was present during development.

---

## Installation

### 1. Clone / download

```bash
git clone <repo-url>
cd SceneNav-AI
```

### 2. Install Python dependencies

```bash
pip install -r requirements.txt
```

Key packages installed: `opencv-contrib-python`, `fastapi`, `uvicorn`, `pydantic`, `scipy`.

### 3. Install frontend dependencies

```bash
cd frontend
npm install
cd ..
```

### 4. Configure environment (optional)

```bash
cp .env.example .env
# Edit .env to adjust ports, upload limits, etc.
```

### 5. Generate sample data

```bash
python scripts/generate_test_pairs.py
```

This creates synthetic test images in `data/references/` and `data/queries/`  
and a manifest at `data/manifests/synthetic_pairs.json`.

> The generated images are **procedurally synthetic**. They are not real aerial imagery.

---

## Quick Start (One-Click)

On Windows, simply run:
```cmd
start_all.bat
```
This automatically starts both the FastAPI backend (`http://127.0.0.1:8000`) and Vite frontend (`http://localhost:5173`) in dedicated windows.

Or start individually:
- `python scripts/demo.py` — Runs the reproducible live CLI technical demonstration
- `run_backend.bat` — Starts the backend server
- `run_frontend.bat` — Starts the frontend dashboard
- `run_tests.bat` — Runs the full automated test suite (backend + frontend)

---

## Running the Backend Manually

```bash
# From project root
python -m uvicorn app.main:app --app-dir backend --reload --host 127.0.0.1 --port 8000
```

Verify:
```
curl http://127.0.0.1:8000/health
# → {"status":"ok","version":"0.1.0","algorithm_version":"ORB-v1"}
```

API docs: [http://127.0.0.1:8000/docs](http://127.0.0.1:8000/docs)

---

## Running the Frontend Manually

```bash
cd frontend
npm run dev
```

Open [http://localhost:5173](http://localhost:5173).  
The Vite dev server proxies `/api` and `/health` to `http://127.0.0.1:8000`.

---

## Sample Workflow

1. Start both servers (`start_all.bat` or manually).
2. Open [http://localhost:5173](http://localhost:5173).
3. **One-Click Demo:** In the *Preset Test Pairs* dropdown, select any condition (e.g. *Scene 00 (Rotate 5)* or *Scene 00 (Crop Center)*). Both images load automatically!
4. Alternatively, drag and drop custom local images into the Reference and Query zones.
5. Adjust parameters if desired (e.g., enable **Mutual Consistency Check** for bidirectional verification).
6. Click **Run Matching**.
7. View metrics cards, honest failure diagnostics, and click any artifact to open the **interactive zoom & pan viewer**.
8. Click **Export Report JSON** to download the reproducible experiment record.

---

## Running Tests

Run the full automated test suite:
```cmd
run_tests.bat
```

Or manually:
```bash
# Backend pytest
python -m pytest backend/tests/ -v

# Frontend vitest
cd frontend && npm test
```

**Observed Test Suite Outcomes:**
- **Backend (pytest):** 105 passed in 13.56s (100% pass)
  - Unit, Service & Geometry: 35 tests
  - Georeferencing & Spatial Projections: 16 tests
  - Evaluation & Audit Regressions: 19 tests
  - Security & Endpoints: 28 tests
  - Browser End-to-End (Playwright Chrome): 7 tests
- **Frontend (vitest):** 8 passed in 1.04s (100% pass)
- **Production Build:** Vite production build succeeded in 120ms
- **All-in-One Runner (`run_tests.bat`):** 113 automated tests passed with exit code 0

---

## Real-World Aerial Benchmark Evaluation

### 1. Acquire Imagery and Generate Benchmark Manifest
```bash
python scripts/download_real_world_data.py --confirm-download
# Or: python scripts/download_sample_data.py --source real-world
```
Acquires authentic public domain USGS aerial orthophotos (Greenwood-Leflore Airport, Chico Municipal Airport, Harris Hill Raceway) and constructs `data/manifests/real_world_pairs.json`.

### 2. Compare ORB vs SIFT Baselines
```bash
python scripts/compare_baselines.py --manifest real_world_pairs.json
```
Runs both ORB and SIFT over the same 15 image pairs, outputting:
- `results/real_world_eval/orb_summary.json` & `orb_pairs.csv`
- `results/real_world_eval/sift_summary.json` & `sift_pairs.csv`
- `results/real_world_eval/COMPARISON_REPORT.md`

### Actual Observed Results on Real-World USGS Benchmark

| Metric | ORB Baseline | SIFT Alternative | Analysis / Observation |
| :--- | :---: | :---: | :--- |
| **Total Evaluated Pairs** | 15 | 15 | 8 Planar GT + 3 Simulated Distortions + 4 Cross Negatives |
| **Positive-Pair Success Rate** | **11/11 (100.0%)** | **11/11 (100.0%)** | Both reliably match genuine co-located aerial scenes |
| **Overall Success Rate** | **11/15 (73.3%)** | **11/15 (73.3%)** | Verified matches across all pairs including rejected negatives |
| **False Acceptance Rate** | **0/4 (0.0%)** | **0/4 (0.0%)** | Zero false acceptances across negative pairs ($N=4$ smoke test) |
| **True Negative Rate** | **100.0%** | **100.0%** | Rejection of cross-scene distractor queries (4/4) |
| **Mean Inliers (Positives)** | 442.4 | 689.2 | SIFT yields **+55.8% more inliers** |
| **Mean Inlier Ratio** | 97.1% | 99.4% | SIFT: 99.4% vs ORB: 97.1% |
| **Mean Reprojection Error** | 0.91 px | 0.11 px | SIFT achieves tighter sub-pixel correspondence |
| **Mean Corner Transfer Error** | 5.33 px | 0.05 px | Evaluated strictly on 8 verified planar GT pairs |
| **Mean Runtime** | **155.1 ms/pair** | **207.3 ms/pair** | ORB is ~1.3× faster on CPU |

> **Evaluation Methodology Notes:**
> 1. **Positive vs Overall Success:** 11 of 11 positive pairs succeeded (100.0% recall). Across all 15 evaluated pairs (including 4 negative pairs correctly rejected), 11 were accepted (73.3% overall match rate).
> 2. **Simulated Perspective Distortions:** The 3 warped query pairs (`real_greenwood_04_uncalibrated_obs`, `real_chico_04_uncalibrated_obs`, `real_harrishill_03_uncalibrated_obs`) are simulated perspective-distortion observations derived from source orthophotos, not independent physical oblique flight captures. Ground truth homography is intentionally unavailable and excluded from corner error calculation.
> 3. **Negative Sample-Size Limitation:** Four negative pairs ($N=4$) verify that cross-scene pairs fail RANSAC and ratio testing, but do not characterize an operational false-alarm rate across arbitrary global terrain or seasonal variations.
> 4. **Academic Integrity Notice:** These metrics reflect **2D image registration accuracy in pixel space**. They do **not** measure geographic latitude/longitude navigation accuracy without georeferencing metadata and camera calibration models.

---

## Georeferenced Visual Localization MVP Benchmark

### 1. Ingesting GeoTIFF Rasters with Coordinate Systems
The MVP includes authentic USGS NAIP georeferenced aerial rasters (`data/references/georef_usgs_greenwood.tif` in UTM Zone 16N EPSG:32616, and `data/references/georef_usgs_chico.tif` in UTM Zone 10N EPSG:32610, both 1.0 m/px GSD).

### 2. Comparative Benchmark Results (`georeferenced_pairs.json`)
```bash
python scripts/compare_baselines.py --manifest georeferenced_pairs.json --output results/georef_comparison
```

| Metric | ORB Baseline | SIFT Alternative | Analysis / Observation |
| :--- | :---: | :---: | :--- |
| **Total Evaluated Pairs** | 6 | 6 | 5 Positive Georeferenced + 1 Cross-Scene Negative |
| **Positive-Pair Success Rate** | **4/5 (80.0%)** | **5/5 (100.0%)** | SIFT successfully matches perspective-warped flight query |
| **Overall Success Rate** | **4/6 (66.7%)** | **5/6 (83.3%)** | Positive matches across full suite including negative |
| **False Acceptance Rate** | **0/1 (0.0%)** | **0/1 (0.0%)** | Chico query rejected against Greenwood raster (different CRS/terrain) |
| **True Negative Rate** | **100.0%** | **100.0%** | Cross-scene distractors reliably rejected without false localization |
| **Mean Inliers (Positives)** | 557.0 | 569.2 | SIFT yields denser correspondence |
| **Mean Inlier Ratio** | 98.7% | 99.8% | High geometric purity under RANSAC |
| **Mean Center Error** | **1.69 m** | **0.04 m** | Ellipsoidal geodesic error on 1.0 m/px ground sampling distance |
| **Mean Corner Error** | **2.67 m** | **0.04 m** | Mean 4-corner boundary error in physical ground metres |
| **Mean Runtime** | **114.6 ms/pair** | **151.8 ms/pair** | Fast offline execution on standard CPU |

> **Georeferencing Policy:** Coordinates and metric errors are computed exclusively when GeoTIFF raster metadata (CRS + Affine transform) is present. Standard PNG/JPEG reference imagery yields status `image_match_only` with 2D pixel coordinates; geographic coordinates are never fabricated.

### 3. Authentic Munich Aerial Localization Demonstration

SceneNav AI's geographic localization pipeline has been validated on authentic real-world aerial imagery over Munich, Germany (Sendling-Westpark / Heckenstallerstraße corridor):
- **Query Image:** DLR 3K Camera System campaign ($5616 \times 3744$ px, captured July 6, 2011).
- **Reference Raster:** Official Bavaria Open Data historical orthophoto `bavaria_2012_aligned_dop.tif` (Bayerische Vermessungsverwaltung, CC BY 4.0, `EPSG:25832`, $2800 \times 2400$ px, GSD $0.50\text{ m/px}$).
- **Observed Performance:**
  - **ORB:** 79 geometric inliers (83.2% inlier ratio), mean reprojection error $2.28\text{ px}$.
  - **SIFT:** 138 geometric inliers (79.8% inlier ratio), mean reprojection error $1.68\text{ px}$.
  - **Audited Footprint Center:** $E \approx 687,789.1\text{ m}, N \approx 5,331,662.8\text{ m}$ in UTM Zone 32N ($48.110518^\circ\text{N}, 11.522913^\circ\text{E}$).
  - **Footprint Area:** $\approx 338,934\text{ m}^2$ ($0.339\text{ km}^2$, $33.9\text{ ha}$), with a $1.500$ ground aspect ratio matching the $3:2$ full-frame sensor.
  - **Inter-Algorithmic Repeatability:** ORB and SIFT centers agree within **$0.42\text{ m}$** ($42.0\text{ cm}$) on the ground under identical reference geometry.
- **Academic Disclosures & Safeguards:**
  1. **Algorithmic Repeatability vs. Absolute Accuracy:** The $0.42\text{ m}$ metric measures consistency between ORB and SIFT against the same reference raster; it does **not** establish absolute ground-truth accuracy. Localization is referenced strictly to the Bavarian orthophoto coordinate framework, and no independent surveyed Ground Control Points (GCPs) or differential-GPS checkpoints were used.
  2. **Camera EXIF Offset & Inferred Pitch:** The camera GNSS fix ($1,611.5\text{ m}$ MSL) is offset $54.6\text{ m}$ south-southeast from the ground footprint center. Because EXIF contains no IMU attitude tags, the $2.90^\circ$ off-nadir tilt ($1.94^\circ$ if referenced to sea level) is an **inferred geometric estimate**, not a measured flight attitude.
  3. **Temporal Change Rejection:** When matched against current municipal imagery (Munich 2024 DOP), the pipeline correctly **rejected** localization ($<10$ inliers) because the 2011 surface highway was excavated into the Heckenstaller-Tunnel (opened 2015) and replaced by Heckenstallerpark.

---

## Limitations

- **Planar-Scene Assumption:** Homography estimation models planar terrain surfaces. Steep relief, tall structures, or low-altitude oblique camera angles create out-of-plane parallax that violates the planar assumption.
- **Pixel Accuracy != Navigation Accuracy:** Reprojection error and corner transfer error measure raster plane alignment against the reference image, not physical ground meters or GPS coordinates.
- **Texture Dependence:** Feature matching degrades on featureless expanses (dense uniform tree canopies, smooth water bodies, snow).
- **In-Memory Job Store:** Job history is held in-memory; server restart clears recent matching history.

See [`docs/TECHNICAL_REPORT.md`](docs/TECHNICAL_REPORT.md), [`docs/LIMITATIONS.md`](docs/LIMITATIONS.md), and [`docs/ALGORITHMS.md`](docs/ALGORITHMS.md) for complete technical analysis.

---

## License

MIT — see `LICENSE`.

> Authentic aerial imagery sourced from United States Geological Survey (USGS) and USDA Farm Service Agency is in the **Public Domain** (17 U.S.C. § 105). Procedural synthetic textures carry no copyright restrictions.

