# Manual testing SceneNav

## Launch
From the repository folder run `start_all.bat`. Open http://localhost:5173 and wait for **Backend connected**. If the custom test images are missing after a fresh checkout, run `python scripts/verify_manual_cases.py` first (requires the existing Harris Hill and Greenwood reference images).

## Guided known-answer checks
Open **Live Matching Studio > Try 6 test cases**. Select **SIFT**, keep default settings, click a case card and then **Run Matching**. The case card loads both images; the lab displays the expected result before running and checks the returned footprint afterwards.

| Case | Expected result | Measured SIFT corner error in this run |
|---|---|---:|
| Same image | Full reference footprint | approximately 0 px |
| Find the crop | Rectangle from (220,180) to (759,699) | 0.003 px |
| Change the light | Same crop rectangle | 0.027 px |
| Hide part of it | Same crop rectangle, despite covered patch | 0.002 px |
| No visual clues | Explicit matching rejection; no footprint | rejected |
| Wrong location | Explicit matching rejection; no footprint | rejected |

For positive cases the lab requires mean corner error below 3 reference pixels. Corners are clockwise: top-left, top-right, bottom-right, bottom-left. All images are PNG: no latitude/longitude should be returned. A network error or internal processing error is NOT a correct negative result.

Inspect Results Explorer as well: the footprint should cover the expected rectangle and inlier connections should join corresponding structures. Export JSON to record the actual parameters and result. Repeat with ORB to compare; do not assume a success label means the footprint is accurate.

## Your own photographs
1. Choose a textured overhead photograph with buildings, roads or other distinct details as the reference. Avoid uniform water, sky or blank paper for the positive test.
2. First upload that exact image in both fields: expect nearly identical alignment and a full-image footprint.
3. Crop a known rectangle without rescaling. Record the crop origin (x,y), width w and height h. Expected footprint is (x,y), (x+w-1,y), (x+w-1,y+h-1), (x,y+h-1).
4. Darken that same crop, or cover a modest section, without changing its size. The expected footprint stays the same.
5. Upload an unrelated photo or uniform image as the query: expect a matching rejection and no position.

The guided lab does not automatically score arbitrary uploads, because their ground truth is unknown. Compare exported `estimated_region` corners with your recorded coordinates. Mean corner error is the average Euclidean distance across the four corner pairs; use 3 reference pixels as a starting test tolerance, not a universal application accuracy requirement.

Separately captured views of the same location are a harder test. Differences in angle, season, parallax and resolution can cause failures. Establish ground truth independently before calling such outputs correct. Controlled crops test registration, not field navigation accuracy. Bundled GeoTIFF metadata is assigned by the generator, not independently surveyed.

## UI checks
- Toggle aerial/contour view and show/hide features. The hero is a labeled illustration, not a computed result.
- Pause/resume motion; enable system reduced-motion preference to suppress animation.
- Use keyboard Tab and Enter for uploads and case cards.
- Change/remove an input after a result: the old result and guided expectation should clear.
- Test a narrow window: controls should remain reachable and content should not overlap.

Production build and automated frontend checks pass. The six backend cases above were run directly. Live browser visual QA and a full upload-to-result UI journey remain unverified in this environment.
