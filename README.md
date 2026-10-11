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

- ORB keypoint detection and descriptor matching (Hamming BFMatcher)
- Lowe's ratio-test filtering
- RANSAC homography estimation with rigorous validation
- Query footprint projection into reference-image coordinates
- Correspondence visualization (tentative matches + inlier-only)
- FastAPI backend with structured error responses and artifact serving
- React + Vite research dashboard (dark scientific workstation aesthetic)
- Reproducible evaluation pipeline with CSV + JSON output
- Synthetic test pair generator for offline baseline evaluation

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
# Backend pytest (68 tests)
python -m pytest backend/tests/ -v

# Frontend vitest (7 tests)
cd frontend && npm test
```

**Actual test results (verified post-hardening run):**

- **Backend:** 68 passed in 2.47s (100% pass)
  - `test_image_loader.py` — 14 tests
  - `test_feature_matching.py` — 9 tests
  - `test_geometry.py` — 10 tests
  - `test_evaluation.py` — 7 tests
  - `test_api.py` — 28 tests (endpoints, validation, traversal security, bounded streaming, samples catalog)
- **Frontend:** 7 passed in 2 test files (100% pass)
  - `client.test.js` — 4 tests
  - `components.test.jsx` — 3 tests

See [`docs/TESTING.md`](docs/TESTING.md) for full historical archives and security matrix.

---

## Running an Evaluation

```bash
python scripts/run_evaluation.py --manifest synthetic_pairs.json --output results/evaluation_run_latest
```

**Actual results (ORB-v1 baseline, 24 pairs, verified run):**

| Metric | Value | Notes |
|--------|-------|-------|
| Total pairs | 24 | 3 base scenes × 8 conditions |
| Successful | 21 (87.5%) | Positive pairs (identity, crops, rotations, etc.) |
| Failed | 3 (12.5%) | Negative unrelated pairs correctly rejected |
| Mean inliers (successes) | 1623.0 | RANSAC verified correspondences |
| Mean inlier ratio | 97.2% | Inliers / filtered matches |
| Mean reproj. error | 0.61 px | Residual reprojection error on inliers |
| Mean corner error | 0.34 px | Transfer error vs exact synthetic ground-truth H |
| Mean processing time | 0.098 s/pair | CPU-based offline inference |

> These are **synthetic image-matching metrics only**.  
> They do not measure real-world geographic localization accuracy.

---

## Troubleshooting

**`ModuleNotFoundError: No module named 'app'`**  
→ Set `PYTHONPATH=backend` before running Python scripts.

**Backend shows 422 on match request**  
→ Check that both files are valid images and parameters are in range.

**Frontend shows "Backend offline"**  
→ Ensure the backend is running at port 8000. Check CORS settings in `.env`.

**No keypoints detected**  
→ The image may be too small, blurred, or uniformly coloured. Try a different image.

---

## Limitations

- ORB degrades on large viewpoint changes (>~30°), featureless textures, and severe blur.
- A homography is only valid for approximately planar scenes; parallax-heavy scenes require more complex models.
- No geographic coordinate output — pixel coordinates only without valid georeferencing.
- Single-algorithm baseline (ORB). SIFT, SuperPoint, LoFTR are future work.
- Job history is in-memory; restarts clear results.

See [`docs/LIMITATIONS.md`](docs/LIMITATIONS.md) for a full discussion.

---

## License

MIT — see `LICENSE`.

> Dataset images generated by `scripts/generate_test_pairs.py` are synthetic  
> and carry no copyright restrictions.
