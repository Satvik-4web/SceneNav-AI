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
```bash
# From project root (Windows)
run_tests.bat
```

---

## Actual Test Results (Verified)

### Backend: 62 passed in 2.38s (100% pass)
- `test_image_loader.py` — 14 tests (dimensions, formats, error limits, corrupted bytes)
- `test_feature_matching.py` — 9 tests (ORB matching, ratio filtering, mutual consistency)
- `test_geometry.py` — 10 tests (RANSAC homography, singularity, reflection, reprojection errors)
- `test_evaluation.py` — 7 tests (metrics aggregation, corner error, failure categorization)
- `test_api.py` — 22 tests (endpoints, validation, traversal security, samples catalog, mutual consistency flag)

### Frontend: 7 passed in 2 test files (100% pass)
- `src/tests/client.test.js` — 4 tests (API error handling, health endpoints, capabilities)
- `src/tests/components.test.jsx` — 3 tests (MetricsPanel rendering, success state, failure breakdown)

---

## Backend Test Log Details:

```
========================== 56 passed in 3.97s ==========================

PASSED  test_image_loader.py::TestLoadImageFromBytes::test_valid_rgb_png
PASSED  test_image_loader.py::TestLoadImageFromBytes::test_valid_jpeg
PASSED  test_image_loader.py::TestLoadImageFromBytes::test_grayscale_converted_to_rgb_bgr
PASSED  test_image_loader.py::TestLoadImageFromBytes::test_empty_bytes_raises
PASSED  test_image_loader.py::TestLoadImageFromBytes::test_unsupported_extension_raises
PASSED  test_image_loader.py::TestLoadImageFromBytes::test_corrupted_data_raises
PASSED  test_image_loader.py::TestLoadImageFromBytes::test_too_large_raises
PASSED  test_image_loader.py::TestLoadImageFromBytes::test_max_dim_enforced
PASSED  test_image_loader.py::TestLoadImageFromBytes::test_too_small_raises
PASSED  test_image_loader.py::TestLoadImageFromBytes::test_filename_stored
PASSED  test_image_loader.py::TestLoadImageFromBytes::test_file_size_stored
PASSED  test_image_loader.py::TestToGrayscale::test_produces_2d_array
PASSED  test_image_loader.py::TestLoadFromPath::test_missing_file_raises
PASSED  test_image_loader.py::TestLoadFromPath::test_valid_file

PASSED  test_feature_matching.py::TestDetectAndMatch::test_identical_images_produce_matches
PASSED  test_feature_matching.py::TestDetectAndMatch::test_same_scene_crops_produce_matches
PASSED  test_feature_matching.py::TestDetectAndMatch::test_unrelated_images_fewer_matches
PASSED  test_feature_matching.py::TestDetectAndMatch::test_blank_image_graceful_failure
PASSED  test_feature_matching.py::TestDetectAndMatch::test_ratio_threshold_affects_filtered_count
PASSED  test_feature_matching.py::TestDetectAndMatch::test_statistics_recorded
PASSED  test_feature_matching.py::TestDetectAndMatch::test_params_recorded
PASSED  test_feature_matching.py::TestDetectAndMatch::test_point_arrays_shape

PASSED  test_geometry.py::TestVerifyGeometry::test_clean_correspondences_succeed
PASSED  test_geometry.py::TestVerifyGeometry::test_too_few_points_fails
PASSED  test_geometry.py::TestVerifyGeometry::test_reprojection_error_computed
PASSED  test_geometry.py::TestVerifyGeometry::test_inlier_ratio_below_min_fails
PASSED  test_geometry.py::TestVerifyGeometry::test_random_points_geometry_fails_or_low_inliers
PASSED  test_geometry.py::TestVerifyGeometry::test_coordinate_convention
PASSED  test_geometry.py::TestValidateHomography::test_identity_is_valid
PASSED  test_geometry.py::TestValidateHomography::test_nan_detected
PASSED  test_geometry.py::TestValidateHomography::test_inf_detected
PASSED  test_geometry.py::TestValidateHomography::test_singular_detected
PASSED  test_geometry.py::TestValidateHomography::test_reflection_detected
PASSED  test_geometry.py::TestValidateHomography::test_extreme_scale_detected
PASSED  test_geometry.py::TestReprojectionError::test_exact_homography_zero_error

PASSED  test_evaluation.py::TestAggregateMetrics::test_empty_returns_zero
PASSED  test_evaluation.py::TestAggregateMetrics::test_all_success
PASSED  test_evaluation.py::TestAggregateMetrics::test_mixed_success_failure
PASSED  test_evaluation.py::TestAggregateMetrics::test_failure_breakdown
PASSED  test_evaluation.py::TestAggregateMetrics::test_mean_reproj_error_only_from_successes
PASSED  test_evaluation.py::TestCornerError::test_identical_homographies_zero_error
PASSED  test_evaluation.py::TestCornerError::test_translated_homography_error

PASSED  test_api.py::TestHealth::test_health_returns_ok
PASSED  test_api.py::TestCapabilities::test_capabilities_returns_formats
PASSED  test_api.py::TestMatchEndpoint::test_valid_images_return_result
PASSED  test_api.py::TestMatchEndpoint::test_identical_images_succeed
PASSED  test_api.py::TestMatchEndpoint::test_corrupted_reference_returns_400
PASSED  test_api.py::TestMatchEndpoint::test_corrupted_query_returns_400
PASSED  test_api.py::TestMatchEndpoint::test_invalid_params_returns_error
PASSED  test_api.py::TestMatchEndpoint::test_result_has_job_id
PASSED  test_api.py::TestMatchEndpoint::test_algorithm_params_in_result
PASSED  test_api.py::TestJobEndpoint::test_existing_job_returned
PASSED  test_api.py::TestJobEndpoint::test_nonexistent_job_returns_404
PASSED  test_api.py::TestArtifactEndpoint::test_valid_artifact_served
PASSED  test_api.py::TestArtifactEndpoint::test_nonexistent_job_artifact_404
PASSED  test_api.py::TestArtifactEndpoint::test_path_traversal_blocked
```

---

## Reproducibility

All tests use:
- Deterministic synthetic images generated via `numpy.random.default_rng(seed)`.
- Known synthetic homographies for geometric tests.
- No internet access required.
- No GPU dependency.

The tests should produce identical results on any machine with the same Python and OpenCV versions.

---

## Known Untested Areas

| Area | Reason |
|------|--------|
| Frontend component logic | No JS test framework configured in MVP. React components are manually tested via browser. |
| Very large images (>4K) | Integration test skipped to avoid slow CI. Dimension limits enforced by image_loader. |
| Concurrent requests | Single-threaded pytest TestClient. Concurrency is a future concern. |
| Windows filesystem path edge cases | Tested on Windows only; Linux/macOS untested. |
| TIFF multi-page files | Format accepted; multi-page handling not explicitly tested. |

---

## Adding New Tests

Place new test files in `backend/tests/`. Follow the naming convention `test_*.py`.  
Use `numpy.random.default_rng(seed)` for all random data to ensure reproducibility.  
Never use real external images in automated tests.
