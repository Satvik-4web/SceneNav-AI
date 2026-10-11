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

## Latest Verification Run (Benchmark Audit & End-to-End Validation Phase — 2026-10-11)

### 1. Backend Suite (pytest)
- **Status:** **88 passed in 18.57s** (100% pass rate)
- **Command:** `python -m pytest backend/tests/ -v`
- **Breakdown:**
  - `backend/tests/test_image_loader.py` (14 tests): format validation, size caps, empty files, EXIF orientation, early dimension rejection.
  - `backend/tests/test_feature_matching.py` (11 tests): ORB detection, ratio filtering, parameter tracking, mutual consistency cross-checking, SIFT detection and matching, invalid algorithm rejection.
  - `backend/tests/test_geometry.py` (10 tests): RANSAC homography, degenerate transformation rejection (NaN/Inf, singularity, reflection, extreme scale), reprojection error.
  - `backend/tests/test_evaluation.py` (19 tests): metric aggregation, failure breakdown, corner transfer error, negative pairs, false acceptance tracking, unavailable ground truth handling, missing file safety, reproducibility of evaluation metrics, and benchmark audit regression tests (overall success rate denominator, positive success rate denominator, negative false acceptance denominator, ground truth corner error exclusion, report text agreement, simulated transformation documentation verification).
  - `backend/tests/test_api.py` (28 tests): health, capabilities, matching, artifact serving, traversal prevention (`..`, encoded, backslash), bounded streaming limits (413), sample catalog, mutual consistency.
  - `backend/tests/test_browser_e2e.py` (6 tests): Playwright browser end-to-end automation in native headless Chrome:
    - `test_01_app_page_loads_and_displays_header`: initial dashboard load, branding, panel layout.
    - `test_02_orb_matching_workflow`: preset pair loading, ORB matching, metrics verification, 4 visualization cards.
    - `test_03_sift_matching_workflow`: algorithm switching to SIFT, execution, verified inliers.
    - `test_04_interactive_lightbox_modal`: zoom button interaction, pan stage, Esc key dismiss.
    - `test_05_unrelated_negative_pair_rejection`: cross-scene negative pair rejection, failure banner, no false footprint overlay.
    - `test_06_reset_functionality`: input and preview reset, button disabling.

### 2. Frontend Suite (vitest)
- **Status:** **7 passed in 1.01s** (100% pass rate)
- **Command:** `cd frontend && npm test`
- **Breakdown:**
  - `frontend/src/tests/client.test.js` (4 tests): health check, capabilities, artifact URL generation, error throwing.
  - `frontend/src/tests/components.test.jsx` (3 tests): null rendering, success state metrics display, failure reason display.

### 3. Frontend Production Build (vite)
- **Status:** **Success in 138ms**
- **Command:** `cd frontend && npm run build`
- **Artifacts:** `dist/index.html` (0.62 kB), `dist/assets/index-B5_FQPkk.css` (8.04 kB), `dist/assets/index-BXlLCptn.js` (243.73 kB).

### 4. Automated All-in-One Runner (`run_tests.bat`)
- **Status:** **Passed with exit code 0**
- **Command:** `run_tests.bat`
- **Total Tests Verified:** 95 automated tests (88 backend + 7 frontend).

### 5. Real-World USGS Aerial Benchmark Evaluation Run
- **Command:** `python scripts/compare_baselines.py --manifest real_world_pairs.json`
- **Dataset:** 15 authentic USGS aerial orthophoto pairs:
  - 8 planar ground-truth pairs (`planar_homography_gt`)
  - 3 simulated perspective-distortion observation pairs (`unavailable` GT, derived from source orthophotos)
  - 4 cross-scene negative pairs (`negative_unrelated_pair`)
- **ORB Baseline Outcomes:**
  - Positive-Pair Success Rate (Recall): **11/11 (100.0%)**
  - Overall Success Rate (All Pairs): **11/15 (73.3%)**
  - False Acceptance Count / Rate: **0/4 (0.0%)** (sample size $N=4$ smoke test)
  - True Negative Rate: **100.0%**
  - Mean Inlier Count (Positives): **442.4**
  - Mean Inlier Ratio: **97.1%**
  - Mean Reprojection Error: **0.91 px**
  - Mean Ground-Truth Corner Transfer Error: **5.33 px** (evaluated strictly on 8 verified planar GT pairs)
  - Mean Processing Time: **155.1 ms/pair**
- **SIFT Alternative Baseline Outcomes:**
  - Positive-Pair Success Rate (Recall): **11/11 (100.0%)**
  - Overall Success Rate (All Pairs): **11/15 (73.3%)**
  - False Acceptance Count / Rate: **0/4 (0.0%)** (sample size $N=4$ smoke test)
  - True Negative Rate: **100.0%**
  - Mean Inlier Count (Positives): **689.2** (+55.8% more inliers than ORB)
  - Mean Inlier Ratio: **99.4%**
  - Mean Reprojection Error: **0.11 px**
  - Mean Ground-Truth Corner Transfer Error: **0.05 px** (evaluated strictly on 8 verified planar GT pairs)
  - Mean Processing Time: **207.3 ms/pair**
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
