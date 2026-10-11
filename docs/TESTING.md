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

## Latest Verification Run (Post-Hardening Pass — 2026-10-11)

### 1. Backend Suite (pytest)
- **Status:** **68 passed in 2.47s** (100% pass rate)
- **Command:** `python -m pytest backend/tests/ -v`
- **Breakdown:**
  - `backend/tests/test_image_loader.py` (14 tests): format validation, size caps, empty files, EXIF orientation, early dimension rejection.
  - `backend/tests/test_feature_matching.py` (9 tests): ORB detection, ratio filtering, parameter tracking, mutual consistency cross-checking.
  - `backend/tests/test_geometry.py` (10 tests): RANSAC homography, degenerate transformation rejection (NaN/Inf, singularity, reflection, extreme scale), reprojection error.
  - `backend/tests/test_evaluation.py` (7 tests): metric aggregation, failure breakdown, corner transfer error.
  - `backend/tests/test_api.py` (28 tests): health, capabilities, matching, artifact serving, traversal prevention (`..`, encoded, backslash), bounded streaming limits (413), sample catalog, mutual consistency.

### 2. Frontend Suite (vitest)
- **Status:** **7 passed in 1.02s** (100% pass rate)
- **Command:** `cd frontend && npm test`
- **Breakdown:**
  - `frontend/src/tests/client.test.js` (4 tests): health check, capabilities, artifact URL generation, error throwing.
  - `frontend/src/tests/components.test.jsx` (3 tests): null rendering, success state metrics display, failure reason display.

### 3. Benchmark Dataset Evaluation Run
- **Command:** `python scripts/run_evaluation.py --manifest synthetic_pairs.json --output results/evaluation_run_latest`
- **Pairs Evaluated:** 24 pairs (3 scenes × 8 conditions)
- **Outcomes:**
  - Successful Matches: 21 pairs (87.5%)
  - Negative Pair Rejections: 3 pairs (12.5%) — correctly rejected with `insufficient_matches`
  - Mean Inliers: 1623.0
  - Mean Inlier Ratio: 97.2%
  - Mean Reprojection Error: 0.61 px
  - Mean Ground-Truth Corner Error: 0.34 px (computed against exact mathematical homographies)
  - Mean Processing Time: 0.098 s/pair

---

## Historical Test Runs Archive

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
