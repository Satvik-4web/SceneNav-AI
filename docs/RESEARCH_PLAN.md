# SceneNav AI — Research Plan

---

## Research Questions

### RQ1: Baseline Capability
What matching success rate and geometric accuracy does ORB + RANSAC achieve on synthetic aerial-texture image pairs with known transformations?

### RQ2: Robustness to Photometric Changes
How does match quality degrade under brightness changes, blur, and JPEG compression?

### RQ3: Robustness to Geometric Changes
What is the relationship between rotation angle and inlier count / reprojection error?

### RQ4: Failure Characterisation
Under what conditions does the pipeline correctly detect its own failure (report `geometry_failed` or `insufficient_matches`) rather than returning a wrong match?

### RQ5: Algorithm Comparison (Future)
How does ORB compare to SIFT, AKAZE, and deep-feature methods (SuperPoint, LoFTR) on the same test set?

---

## Current Baseline

**Algorithm:** ORB-v1 (5000 features, ratio=0.75, RANSAC reproj=4.0px, min_inliers=10)

**Dataset:** `synthetic_pairs` (24 pairs, 3 scenes × 8 transforms)

**Observed results:**

| Transform | Success | Mean Inliers | Notes |
|-----------|---------|-------------|-------|
| identity | 3/3 | ~3485 | Very high inlier count |
| crop_center | 3/3 | ~464 | Reduced overlap, fewer inliers |
| rotate_5 | 3/3 | ~1723 | Well within ORB rotation range |
| rotate_15 | 3/3 | ~1406 | Still well-matched |
| brightness | 3/3 | ~3223 | Minimal impact on ORB |
| blur | 3/3 | ~281 | Blur reduces detectable keypoints |
| scale_0.8 | 3/3 | ~780 | Scale change handled well |
| unrelated | 0/3 | N/A | Correctly rejected |

**Overall:** 21/24 success (87.5%). The 3 failures are correctly rejected unrelated pairs.

---

## Experimental Variables

### Already tested (synthetic baseline)
- Identity matching
- Photometric change (brightness, blur)
- In-plane rotation (5°, 15°)
- Scale change (0.8×)
- Unrelated images (rejection test)

### Planned experiments
- Larger rotation angles (30°, 45°, 90°)
- JPEG compression artefacts (Q=20, Q=50)
- Combined transforms (rotation + brightness)
- Very small images (64×64, 128×128)
- Texture-poor scenes (solid colour regions)
- Sensitivity to `ratio_threshold` parameter
- Sensitivity to `ransac_reproj_threshold` parameter

---

## Ablation Studies (Future)

1. **Ratio test impact:** Evaluate with ratio test disabled vs. thresholds 0.6, 0.7, 0.75, 0.8, 0.9.
2. **Feature count impact:** 500, 1000, 2000, 5000 features.
3. **RANSAC threshold impact:** 1.0, 2.0, 4.0, 8.0 px.
4. **Minimum inliers:** 4, 8, 10, 20, 50.

---

## Evaluation Metrics

All metrics are defined in `docs/ALGORITHMS.md`.

Primary:
- Success rate (fraction of pairs reaching `status=success`)
- Mean inlier count (successes only)
- Mean inlier ratio (successes only)

Secondary:
- Mean reprojection error (px)
- Corner transfer error (px) — synthetic GT pairs only
- Processing time (s/pair)

---

## Future Algorithm Work

1. **SIFT** — stronger descriptor, scale-invariant, patent expired.
2. **AKAZE** — non-linear scale space, better on local affine deformations.
3. **SuperPoint** — learned keypoints + descriptors, GPU-accelerated.
4. **SuperGlue / LightGlue** — learned matching with attention.
5. **LoFTR** — detector-free dense matching.
6. **Fundamental/essential matrix** — for non-planar scenes with parallax.
7. **Georeferencing pipeline** — integrating DEM + camera calibration for geographic output.

---

## Research Integrity Notes

- Do not tune algorithm parameters using the evaluation test set.
- Report success rates with denominators (e.g. "21/24 = 87.5%", not "21 successes").
- Always note whether ground truth is synthetic or real-world.
- Do not conflate pixel-level accuracy on synthetic pairs with real-world navigation accuracy.
- If a new algorithm is tested, report all results including failures.
