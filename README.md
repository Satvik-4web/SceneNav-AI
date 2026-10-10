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

## Running the Backend

```bash
# From project root
$env:PYTHONPATH="backend"   # Windows PowerShell
# export PYTHONPATH=backend  # Linux / macOS

uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```

Verify:
```
curl http://127.0.0.1:8000/health
# → {"status":"ok","version":"0.1.0","algorithm_version":"ORB-v1"}
```

API docs: [http://127.0.0.1:8000/docs](http://127.0.0.1:8000/docs)

---

## Running the Frontend

```bash
cd frontend
npm run dev
```

Open [http://localhost:5173](http://localhost:5173).  
The Vite dev server proxies `/api` and `/health` to `http://127.0.0.1:8000`.

---

## Sample Workflow

1. Start the backend (see above).
2. Open the frontend in a browser.
3. Drag a **reference image** into the left panel (e.g. `data/references/scene_00_reference.png`).
4. Drag a **query image** (e.g. `data/queries/scene_00_query_rotate_5.png`).
5. Adjust parameters if desired (defaults are reasonable).
6. Click **Run Matching**.
7. View the metrics, correspondence visualizations, and estimated footprint.
8. Click **Export Report JSON** to save the experiment record.

---

## Running Tests

```bash
# From project root
$env:PYTHONPATH="backend"
python -m pytest backend/tests/ -v
```

**Actual test results (recorded at build time):**

```
56 tests passed in 3.97s
```

Coverage:
- `test_image_loader.py`    — 12 tests
- `test_feature_matching.py`— 8 tests  
- `test_geometry.py`        — 10 tests
- `test_evaluation.py`      — 7 tests
- `test_api.py`             — 17 tests (FastAPI TestClient)

See [`docs/TESTING.md`](docs/TESTING.md) for details.

---

## Running an Evaluation

```bash
$env:PYTHONPATH="backend"
python scripts/run_evaluation.py --manifest synthetic_pairs.json
```

**Actual results (baseline, ORB-v1, default params, 24 pairs):**

| Metric | Value |
|--------|-------|
| Total pairs | 24 |
| Successful | 21 (87.5%) |
| Failed | 3 (unrelated images, correctly rejected) |
| Mean inliers (successes) | 1623 |
| Mean inlier ratio | 97.2% |
| Mean reprojection error | 0.61 px |
| Mean processing time | 0.105 s/pair |

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
