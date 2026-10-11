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
- **Lowe's Ratio-Test & Mutual Consistency:** Dual-direction cross-check filtering for match ambiguity suppression.
- **RANSAC Homography Estimation:** Robust planar projective transformation estimation with degenerate model rejection.
- **Query Footprint Projection:** Projects sensor observation boundaries onto reference coordinate space with area validation.
- **Real-World Aerial Benchmark:** 15 authentic USGS/USDA NAIP aerial orthophoto pairs with verified planar ground truth, uncalibrated observations, and cross-scene negatives.
- **False Acceptance Evaluation:** Rigorous negative pair evaluation with explicit False Acceptance Rate and True Negative Rate tracking.
- **Baseline Comparison Evaluator:** Side-by-side ORB vs SIFT evaluation with automated Markdown, CSV, and JSON report generation.
- **FastAPI Backend:** Fully validated endpoints, streaming upload guards, strict resolved-path containment, and artifact serving.
- **React + Vite Dashboard:** Interactive image matching, parameter controls, zoom & pan viewer, and report exporter.
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
- **Backend (pytest):** 88 passed in 18.57s (100% pass)
  - Unit, Service & Geometry: 35 tests
  - Evaluation & Audit Regressions: 19 tests
  - Security & Endpoints: 28 tests
  - Browser End-to-End (Playwright Chrome): 6 tests
- **Frontend (vitest):** 7 passed in 1.01s (100% pass)
- **Production Build:** Vite production build succeeded in 138ms
- **All-in-One Runner (`run_tests.bat`):** 95 tests passed with exit code 0

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

