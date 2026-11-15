# SceneNav UI and image validation audit

## Scope
Inspected the existing React/Vite frontend, FastAPI pipeline, evaluation code, dataset manifests and generation scripts. Preserved pre-existing working-tree edits. SceneNav performs ORB/SIFT feature matching, RANSAC planar registration, footprint projection and optional metadata-based coordinate conversion.

## Changes in this pass
- Terrain-inspired studio with interactive SVG feature overlay, animated scan, workflow guidance and responsive styling.
- Reduced-motion support and keyboard-accessible empty upload areas.
- Cleared stale results when inputs change or a new run starts; reset preview errors on file replacement.
- Removed timer-driven pseudo-progress stages; the synchronous API does not provide real stage telemetry.
- Default frontend engine changed to SIFT following the measured comparison below; ORB remains selectable.
- Clarified preset provenance and rejected-result labels; metadata presence does not certify geographic accuracy.

## Existing aerial benchmark: rerun results
15 pairs per algorithm: 11 positives, 4 cross-scene negatives. Eight positives have known homographies; three have no ground truth.

| Metric | ORB | SIFT |
|---|---:|---:|
| Positive pairs returning success | 11/11 | 11/11 |
| False accepts | 0/4 | 0/4 |
| Mean corner error, 8 known-transform pairs | 5.33 px | 0.05 px |
| Chico scale 0.8 corner error | 32.634 px | 0.070 px |

The ORB scale case is a material accuracy failure despite success status. This audit does not fix the underlying ORB estimator or prove that its quality assessment will always flag errors. SIFT performs better on this small dataset; that is not a universal guarantee. Three pairs without ground truth cannot establish localization correctness.

## Newly generated custom checks
Run `python scripts/validate_custom_images.py` from the repository root. This creates new test inputs from the existing Harris Hill real aerial image. Known transforms use query-to-reference pixel coordinates, including the resize pixel-center offset. Positive acceptance criterion: successful match and mean corner error below 3 reference pixels. Negative criterion: no successful match.

| Custom case | ORB corner error | SIFT corner error |
|---|---:|---:|
| Reduced brightness + noise + JPEG compression | 0.411 px | 0.267 px |
| Partial occlusion | 0.246 px | 0.002 px |
| Half-resolution crop | 2.277 px | 0.340 px |
| Blank image | Rejected | Rejected |
| Unrelated image | Rejected | Rejected |

All 10 algorithm/case combinations pass the stated criterion. Outputs and job IDs are in `results/validation_20261114/custom/summary.json`. Benchmark rows are in the sibling `orb` and `sift` directories.

## Provenance findings and remaining validation
These are controlled transforms of real source photographs, NOT independently acquired camera/reference pairs. The existing so-called uncalibrated observations are also generated from the same references (see `make_uncalibrated_observation_query`). No user-supplied independent imagery was available in this task.

The GeoTIFF generator assigns hard-coded map origins and 1 m/pixel transforms to ordinary raster images. Its ground truth is derived from those same assignments. This demonstrates coordinate-conversion consistency, not independently surveyed real-world position accuracy. Authoritative georeferenced references and independently acquired, ground-truthed queries remain necessary.

## Verification
- Production build passed after final changes.
- Frontend tests: 11 passed; a temporary directory outside the sandbox's special-character default path was needed for Vitest.
- Focused backend feature matching, geometry, evaluation and quality tests: 60 passed.
- Lint: no errors; five warnings in existing component patterns.
- Full backend API test invocation stalled at the first health test; no full-suite pass claimed.
- Live preview failed with a local connection timeout; headless browser initialization also stalled. Responsive CSS and animation implementation are present, but visual/layout and live upload-to-result browser verification remain unverified.
