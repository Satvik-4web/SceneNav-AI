# SceneNav AI — Testing Documentation

## Test Commands

### 1. Backend Tests (Python / Pytest)
```bash
# From project root
python -m pytest backend/tests/ -v
```

### 2. Frontend Tests (JavaScript / Vitest)
```bash
# From frontend directory
cd frontend
npm test
```

### 3. Automated All-in-One Test Runner
```cmd
# From project root (Windows)
run_tests.bat
```

---

## Latest Verification Run (Real-World Validation Phase — 2026-10-11)

### 1. Backend Suite (pytest)
- **Status:** **76 passed in 2.65s** (100% pass rate)
- **Command:** `python -m pytest backend/tests/ -v`
- **Breakdown:**
  - `backend/tests/test_image_loader.py` (14 tests): format validation, size caps, empty files, EXIF orientation, early dimension rejection.
  - `backend/tests/test_feature_matching.py` (11 tests): ORB detection, ratio filtering, parameter tracking, mutual consistency cross-checking, SIFT detection and matching, invalid algorithm rejection.
  - `backend/tests/test_geometry.py` (10 tests): RANSAC homography, degenerate transformation rejection (NaN/Inf, singularity, reflection, extreme scale), reprojection error.
  - `backend/tests/test_evaluation.py` (13 tests): metric aggregation, failure breakdown, corner transfer error, negative pairs, false acceptance tracking, unavailable ground truth handling, missing file safety, reproducibility of evaluation metrics.
  - `backend/tests/test_api.py` (28 tests): health, capabilities, matching, artifact serving, traversal prevention (`..`, encoded, backslash), bounded streaming limits (413), sample catalog, mutual consistency.

### 2. Frontend Suite (vitest)
- **Status:** **7 passed in 1.04s** (100% pass rate)
- **Command:** `cd frontend && npm test`
- **Breakdown:**
  - `frontend/src/tests/client.test.js` (4 tests): health check, capabilities, artifact URL generation, error throwing.
  - `frontend/src/tests/components.test.jsx` (3 tests): null rendering, success state metrics display, failure reason display.

### 3. Frontend Production Build (vite)
- **Status:** **Success in 140ms**
- **Command:** `cd frontend && npm run build`
- **Artifacts:** `dist/index.html` (0.62 kB), `dist/assets/index-B5_FQPkk.css` (8.04 kB), `dist/assets/index-BQgIVpuO.js` (242.91 kB).

### 4. Real-World USGS Aerial Benchmark Evaluation Run
- **Command:** `python scripts/compare_baselines.py --manifest real_world_pairs.json`
- **Dataset:** 15 authentic USGS aerial orthophoto pairs (8 planar ground truth, 3 uncalibrated observations, 4 cross-scene negatives).
- **ORB Baseline Outcomes:**
  - Positive Pairs Success: 11/11 (100.0%)
  - False Acceptance Count / Rate: **0/4 (0.0%)**
  - True Negative Rate: **100.0%**
  - Mean Inlier Count: **430.2**
  - Mean Inlier Ratio: **97.0%**
  - Mean Reprojection Error: **0.92 px**
  - Mean Ground-Truth Corner Transfer Error: **5.33 px** (evaluated on 8 verified GT pairs)
  - Mean Processing Time: **158.5 ms/pair**
- **SIFT Alternative Baseline Outcomes:**
  - Positive Pairs Success: 11/11 (100.0%)
  - False Acceptance Count / Rate: **0/4 (0.0%)**
  - True Negative Rate: **100.0%**
  - Mean Inlier Count: **687.4** (+59.8% more inliers than ORB)
  - Mean Inlier Ratio: **99.4%**
  - Mean Reprojection Error: **0.11 px**
  - Mean Ground-Truth Corner Transfer Error: **0.05 px** (evaluated on 8 verified GT pairs)
  - Mean Processing Time: **232.0 ms/pair**
- **Machine-Readable Artifacts:**
  - `results/real_world_eval/orb_summary.json`
  - `results/real_world_eval/orb_pairs.csv`
  - `results/real_world_eval/sift_summary.json`
  - `results/real_world_eval/sift_pairs.csv`
  - `results/real_world_eval/COMPARISON_REPORT.md`

---

## Historical Test Runs Archive

### Hardening Pass Run (Phase 5)
- **Date:** 2026-10-11 15:57
- **Result:** 68 passed in 2.47s (Backend) + 7 passed in 1.02s (Frontend).
- **Synthetic Benchmark:** 24 pairs, 87.5% success, 0.61 px reproj error, 0.34 px corner error.

### Implementation Baseline Run (Phase 1)
- **Date:** 2026-10-11 01:40
- **Result:** 56 passed in 3.97s (Backend only, initial baseline).
- **Artifacts:** Recorded in `results/eval_20261011_013945/`.

### Refinement Run (Phase 5)
- **Date:** 2026-10-11 15:34
- **Result:** 62 passed in 2.38s (Backend) + 7 passed in 0.98s (Frontend).
- **Added:** Mutual consistency check, sample pairs endpoints.

---

## Security & Robustness Regression Matrix

| Vulnerability Vector | Test Name | Mitigation Implemented | Verified Status |
| :--- | :--- | :--- | :--- |
| **Path Traversal in Artifacts** | `test_artifact_traversal_in_job_id` | Alphanumeric job ID regex + `Path.is_relative_to(results_root)` | PASS (400/404) |
| **Path Traversal via Backslash**| `test_sample_image_traversal_backslashes` | `Path.name` check + `is_relative_to(data_root)` | PASS (400/404) |
| **Manifest Path Traversal** | `test_evaluation_manifest_path_traversal` | Pydantic field validator + `is_relative_to(manifests_root)` | PASS (422) |
| **Streaming Memory Exhaustion**| `test_upload_streaming_limit` | Bounded streaming reader (`_read_upload_file_bounded`) | PASS (413) |
| **Decompression Bomb Risk** | `test_too_large_raises`, `test_max_dim_enforced` | Early `pil_image.size` check before decode + `MAX_IMAGE_PIXELS` cap | PASS (ImageLoadError) |
| **Symlink Breakout** | Path containment checks | `path.resolve(strict=False).is_relative_to(root)` resolves symlinks before testing containment | PASS |
