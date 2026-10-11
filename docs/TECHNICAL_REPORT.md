# SceneNav AI — Technical Research & Verification Report

**Project Title:** SceneNav AI (Scene-Aided Navigation Research Prototype)  
**Repository:** [https://github.com/Satvik-4web/SceneNav-AI](https://github.com/Satvik-4web/SceneNav-AI)  
**Version:** 1.0 (Release-Ready)  
**Report Date:** October 2026  
**License:** MIT (Code) / Public Domain 17 U.S.C. § 105 (USGS & NAIP Aerial Imagery)

---

## 1. Executive Summary

SceneNav AI is a reproducible computer vision and academic research prototype that investigates 2D visual scene registration for aerial and satellite imagery. The system matches query camera observations against stored reference orthophoto maps, estimates the projective transformation (homography matrix) when geometrically consistent, projects the corresponding query ground footprint, visualizes feature correspondences, and evaluates registration accuracy honestly.

### Key Accomplishments
- **Dual Matching Paradigms:** Implemented both **ORB** (Oriented FAST and Rotated BRIEF, CPU-optimized binary pipeline) and **SIFT** (Scale-Invariant Feature Transform, Difference-of-Gaussians scale-space pyramid with L2 distance matching).
- **Geometric Verification & Negative Rejection:** Integrated Lowe's ratio test, bidirectional mutual consistency cross-checking, and RANSAC homography estimation with strict degenerate matrix rejection.
- **Reconciled Real-World Benchmark:** Benchmarked on 15 authentic USGS aerial orthophoto pairs across three flight sites (Greenwood-Leflore Airport, Chico Municipal Airport, Harris Hill Raceway).
- **Zero False Acceptances:** Correctly rejected 100.0% (4/4) of cross-scene negative distractor pairs ($0.0\%$ False Acceptance Rate).
- **100% Test Pass Rate:** Verified with 88 automated backend pytest tests, 7 frontend vitest tests, and 6 Playwright browser end-to-end automation tests across Chrome headless.

---

## 2. System Architecture

The project adheres to a clean decoupled architecture designed for local, offline execution without cloud dependencies:

```text
SceneNav-AI/
├── backend/
│   ├── app/
│   │   ├── api/routes.py              # REST API (bounded streaming, path safety, artifacts)
│   │   ├── config.py                  # Pydantic v2 settings & path resolution
│   │   ├── schemas.py                 # Strict Pydantic contracts & coordinate structures
│   │   └── services/
│   │       ├── image_loader.py        # Magic-byte validation, size caps, EXIF normalization
│   │       ├── feature_matcher.py     # ORB / SIFT feature detection & ratio / mutual filtering
│   │       ├── geometric_verification.py # RANSAC homography & degeneracy checks
│   │       ├── region_estimator.py    # Corner projection, convex hull & bounds check
│   │       ├── visualization.py       # High-contrast side-by-side, matches & footprint plots
│   │       ├── pipeline.py            # End-to-end orchestration & reproducibility provenance
│   │       └── evaluation.py          # Batch evaluation & metrics aggregation
│   └── tests/                         # 88 automated pytest suites + Playwright E2E browser tests
├── frontend/                          # React 19 + Vite 8 Single-Page Dashboard
│   ├── src/
│   │   ├── api/client.js              # Central API client with FormData & abort controller
│   │   ├── components/                # Drop zones, preset selector, controls, metrics, modal viewer
│   │   └── pages/DashboardPage.jsx    # Split-view matching dashboard & experiment history
├── data/
│   ├── manifests/                     # JSON manifests (real_world_pairs.json, synthetic_pairs.json)
│   ├── references/                    # Base reference orthophoto rasters
│   └── queries/                       # Query crops, rotations, zooms, and distractors
└── scripts/
    ├── demo.py                        # Standalone live technical demonstration script
    ├── compare_baselines.py           # Head-to-head ORB vs SIFT evaluation runner
    ├── run_evaluation.py              # Manifest evaluation runner with Markdown/CSV/JSON exports
    └── download_real_world_data.py    # Public domain USGS data acquisition & preparation
```

---

## 3. Mathematical Formulation & Algorithmic Foundations

### 3.1 Feature Extraction & Description
1. **ORB (Oriented FAST and Rotated BRIEF):**
   - *Detector:* FAST corner detector across an octave pyramid, oriented via the intensity centroid vector $\theta = \operatorname{atan2}(m_{01}, m_{10})$.
   - *Descriptor:* 256-bit steered binary string compared using bitwise XOR Hamming distance popcounts.
2. **SIFT (Scale-Invariant Feature Transform):**
   - *Detector:* Extrema in Difference-of-Gaussians (DoG) scale-space octaves, localized to sub-pixel precision via 3D quadratic Taylor expansion; edge responses pruned via the Hessian trace/determinant ratio.
   - *Descriptor:* 128-dimensional floating-point gradient orientation histograms normalized to unit L2 length.

### 3.2 Correspondence Filtering
- **Lowe's Ratio Test:** Discards ambiguous matches where the nearest-neighbor distance $d_1$ is not significantly lower than the second-nearest neighbor distance $d_2$:
  $$d_1 < \tau_{\text{ratio}} \cdot d_2, \quad \tau_{\text{ratio}} \in [0.50, 0.95] \text{ (default: } 0.75\text{)}$$
- **Bidirectional Mutual Consistency:** When enabled, verifies that candidate $(q_i, r_j)$ satisfies:
  $$\operatorname{NN}(q_i) = r_j \quad \text{and} \quad \operatorname{NN}(r_j) = q_i$$
  Eliminates asymmetric clutter matches before geometric verification.

### 3.3 Geometric Verification & Homography Estimation
Points on a planar scene viewed from two camera perspectives are related by a 2D projective transformation (homography matrix $H \in \mathbb{R}^{3 \times 3}$):
$$\begin{bmatrix} x_r \\ y_r \\ 1 \end{bmatrix} \propto \begin{bmatrix} h_{11} & h_{12} & h_{13} \\ h_{21} & h_{22} & h_{23} \\ h_{31} & h_{32} & h_{33} \end{bmatrix} \begin{bmatrix} x_q \\ y_q \\ 1 \end{bmatrix}$$

- **RANSAC Estimation:** RANSAC iteratively selects minimal subsets of 4 point correspondences to solve the Direct Linear Transformation (DLT) system, maximizing inliers whose Euclidean transfer error is under $\tau_{\text{reproj}} = 4.0\text{ px}$.
- **Degenerate Model Rejection:** A candidate homography is rejected if:
  - Any coefficient is non-finite ($\text{NaN}$ or $\pm\infty$).
  - $\det(H_{2 \times 2}) \le 0$ (implying a reflection or degenerate line collapse).
  - Condition number or singular values imply extreme scale expansion ($>100\times$) or contraction ($<0.01\times$).
  - Total geometric inlier count is below $\tau_{\text{inliers}} = 10$.

### 3.4 Accuracy Metrics
- **Mean Reprojection Error:**
  $$\epsilon_{\text{reproj}} = \frac{1}{|I|} \sum_{i \in I} \left\| \frac{H [x_q^{(i)}, y_q^{(i)}, 1]^T}{(H [x_q^{(i)}, y_q^{(i)}, 1]^T)_3} - \begin{bmatrix} x_r^{(i)} \\ y_r^{(i)} \end{bmatrix} \right\|_2$$
- **Corner Transfer Error (Planar GT Only):** Evaluated strictly on pairs where mathematical ground-truth $H_{\text{true}}$ is verified:
  $$\epsilon_{\text{corner}} = \frac{1}{4} \sum_{k=1}^4 \left\| \frac{H_{\text{est}} c_k}{(H_{\text{est}} c_k)_3} - \frac{H_{\text{true}} c_k}{(H_{\text{true}} c_k)_3} \right\|_2$$

---

## 4. Benchmark Composition & Provenance

The primary evaluation suite comprises 15 pairs constructed from USGS DOQ and USDA NAIP orthophotos:

| Category | Pairs | Description | Ground Truth Status |
| :--- | :---: | :--- | :--- |
| **Planar Homography GT** | 8 | Crops, in-plane rotations ($8^\circ, 10^\circ, 14^\circ$), scale changes ($0.82\times, 0.92\times$), atmospheric photometric noise. | Exact $H_{\text{true}}$ recorded in manifest. Corner error evaluated. |
| **Simulated Perspective Observations** | 3 | Perspective-distorted query observations derived from orthophotos (multi-axis tilt, contrast variation, noise) simulating uncalibrated platform views. | Homography unavailable. Corner error strictly `None` (not fabricated). |
| **Cross-Scene Negative Pairs** | 4 | Chico query on Greenwood ref, Harris Hill query on Greenwood ref, Greenwood query on Chico ref, Greenwood query on Harris Hill ref. | Unrelated distractor pairs (`is_negative: true`). Evaluates false acceptance. |

---

## 5. Experimental Results & Comparative Analysis

Evaluation executed via `python scripts/compare_baselines.py --manifest real_world_pairs.json`. Figures match committed summaries in `results/real_world_eval/`:

| Metric | ORB Baseline | SIFT Alternative | Comparative Finding |
| :--- | :---: | :---: | :--- |
| **Total Evaluated Pairs** | 15 | 15 | Identical test suite |
| **Positive Pairs ($N=11$)** | 11 | 11 | 8 planar GT + 3 simulated distortions |
| **Negative Pairs ($N=4$)** | 4 | 4 | Unrelated cross-scene distractors |
| **Positive Success Rate (Recall)** | **11/11 (100.0%)** | **11/11 (100.0%)** | Both algorithms matched all genuine positive scenes |
| **Overall Success Rate** | **11/15 (73.3%)** | **11/15 (73.3%)** | 11 matches accepted across all 15 evaluated pairs |
| **False Acceptance Rate** | **0/4 (0.0%)** | **0/4 (0.0%)** | Zero spurious acceptances on negative pairs |
| **True Negative Rate** | **100.0%** | **100.0%** | 100% rejection of cross-scene distractors |
| **Mean Inlier Count (Positives)** | 442.4 | 689.2 | **SIFT yielded +55.8% more inliers** |
| **Mean Inlier Ratio** | 97.1% | 99.4% | SIFT: 99.4% vs ORB: 97.1% |
| **Mean Reprojection Error** | 0.91 px | 0.11 px | SIFT achieves tighter sub-pixel fit |
| **Mean Corner Transfer Error** | 5.33 px | 0.05 px | Evaluated strictly on 8 verified planar GT pairs |
| **Mean CPU Runtime** | **155.1 ms** | **207.3 ms** | ORB is ~1.3× faster on CPU |

### Algorithmic Takeaways
1. **Scale Resilience:** Under scale compression (`real_chico_03_scale_08`, 0.82× zoom), ORB inliers dropped to 33, while SIFT maintained 353 inliers. This demonstrates SIFT's scale-space octave pyramid superiority over ORB's discrete scale pyramid.
2. **Sub-Pixel Fidelity:** SIFT's 3D quadratic interpolation produced near-perfect corner transfer error (0.05 px vs 5.33 px for ORB).
3. **Efficiency:** ORB's binary descriptor matching (Hamming popcounts) delivers high speed (155 ms/pair) suitable for embedded or edge microcontrollers.

---

## 6. Academic Integrity & Scientific Limitations

1. **Planar-Scene Assumption:** Homography assumes scenes are approximately flat relative to flight altitude. Oblique camera angles observing tall vertical structures or rugged mountains induce parallax that violates the 2D homography model.
2. **Pixel Registration $\neq$ Geographic Localization:**
   - The estimated region outputs 2D pixel coordinates on the reference raster.
   - Converting pixel coordinates to geographic coordinates (WGS-84 Latitude, Longitude, Altitude) requires exterior camera orientation ($X, Y, Z, \omega, \phi, \kappa$), sensor interior calibration (focal length, principal point, radial lens distortion), digital surface models (DSM/DEM), and georeferenced ground control points (GCPs).
   - SceneNav AI does **not** make geographic navigation claims.
3. **Negative Sample Size Limitation:** The 4 negative pairs verify that unrelated cross-scene imagery is rejected by RANSAC and ratio test thresholds. However, $N=4$ is an integration sanity test and does **not** establish an operational false-alarm rate across planetary terrain variations or seasonal shifts.

---

## 7. Setup & Reproduction Guide

### Clean Installation
```bash
git clone https://github.com/Satvik-4web/SceneNav-AI.git
cd SceneNav-AI

# Python dependencies
pip install -r requirements.txt

# Frontend dependencies
cd frontend
npm install
cd ..
```

### Running Automated Test Suites
```bash
# Automated batch test runner (backend + frontend)
run_tests.bat

# Or run pytest suite individually (88 tests)
python -m pytest backend/tests/ -v

# Run frontend tests (7 tests)
cd frontend && npm test

# Run frontend production build
cd frontend && npm run build
```

### Running Technical Demonstration
```bash
# Live CLI demonstration (ORB, SIFT, negative rejection, and limitations)
python scripts/demo.py

# Comparative benchmark re-run
python scripts/compare_baselines.py --manifest real_world_pairs.json
```

### Starting Interactive Web Dashboard
```bash
start_all.bat
# Opens backend on http://127.0.0.1:8000 and frontend on http://localhost:5173
```

---

## 8. Future Roadmap

1. **Learned Feature Matchers:** Benchmark deep feature matchers (SuperPoint + LightGlue, LoFTR, DKM) against ORB and SIFT under extreme illumination and seasonal shifts.
2. **3D Epipolar Geometry:** Implement Fundamental and Essential matrix estimation with 5-point/8-point RANSAC to handle non-planar oblique camera observations.
3. **Georeferencing Pipeline:** Integrate GDAL/Rasterio to project image footprints to UTM and geodetic WGS-84 coordinates when GeoTIFF metadata is provided.
