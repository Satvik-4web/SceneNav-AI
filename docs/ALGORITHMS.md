# SceneNav AI — Algorithm Documentation

All metrics used in evaluation are defined here.

---

## 1. ORB — Oriented FAST and Rotated BRIEF

**Reference:** E. Rublee et al., "ORB: An efficient alternative to SIFT or SURF," ICCV 2011.

### Detection (FAST corner detector + orientation)

ORB uses the FAST corner detector to locate candidate keypoints, then assigns each keypoint an orientation using the intensity centroid method. This makes ORB rotation-invariant up to roughly ±30°.

**Parameter:** `orb_max_features` — the maximum number of keypoints retained per image (ranked by response strength). Default: 5000.

### Description (BRIEF + steering)

The BRIEF binary descriptor is computed at each keypoint location, steered by the assigned orientation. Each descriptor is 256 bits. Hamming distance is the appropriate similarity measure.

### Limitations

- Performance degrades significantly on:
  - Texture-poor or uniformly coloured regions.
  - Scale changes greater than approximately 4×.
  - Viewpoint changes greater than approximately 30°.
  - Heavy blur or low contrast.
- ORB is not invariant to large affine distortions.

---

## 2. Descriptor Matching — BFMatcher (Hamming)

A brute-force matcher computes the Hamming distance between every query descriptor and every reference descriptor.

We use **k-NN matching with k=2** to support the ratio test.

---

## 3. Lowe's Ratio Test

**Reference:** D.G. Lowe, "Distinctive Image Features from Scale-Invariant Keypoints," IJCV 2004.

For each query descriptor, two nearest neighbours in the reference set are found: the closest (distance `d1`) and second-closest (`d2`). A match is kept only if:

```
d1 < ratio_threshold × d2
```

This rejects ambiguous matches where a query descriptor looks nearly equally like two different reference descriptors. 

**Parameter:** `ratio_threshold`. Default: 0.75. Range: [0.50, 0.95].
- Lower values → stricter filtering → fewer but more reliable matches.
- Higher values → more matches → higher false-positive rate.

**Important:** Filtered match count is a heuristic indicator of potential scene overlap. It is not a calibrated probability of correct match.

---

## 3.1 Mutual Consistency (Cross-Check) Filtering

When enabled (`mutual_consistency=True`), the pipeline enforces bidirectional agreement:
1. Matches are computed forward: $\text{Query} \to \text{Reference}$ (with ratio test).
2. Nearest neighbor matches are computed backward: $\text{Reference} \to \text{Query}$.
3. Only correspondences $(q, r)$ where $r$'s best match is $q$ and $q$'s best match is $r$ are preserved.

This suppresses asymmetric outlier correspondences, especially in repetitive or clutter-dense scenes.

---

## 4. RANSAC Homography Estimation

**Reference:** M.A. Fischler and R.C. Bolles, "Random sample consensus," CACM 1981.  
OpenCV: `cv2.findHomography` with `RANSAC` method.

### What a homography models

A homography (projective transformation, `H`, 3×3) maps one image plane to another. It is appropriate when:

- Both cameras observe the same approximately **planar surface** (e.g. flat terrain viewed from near-nadir).
- The camera undergoes **pure rotation** (no translation, arbitrary scene depth).

### When a homography is NOT appropriate

- **Non-planar 3-D scenes** with significant parallax (e.g. buildings viewed from oblique angles).
- **Large forward/backward translation** where depth relief becomes dominant.
- Scenes with independently moving objects.

In those cases, the fundamental or essential matrix is more principled, but requires camera calibration and does not directly support region projection.

### RANSAC procedure

1. Randomly sample 4 point correspondences.
2. Estimate a homography from the sample (DLT algorithm).
3. Count inliers: correspondences whose reprojection error is below the threshold.
4. Repeat many times; keep the hypothesis with the most inliers.

**Parameter:** `ransac_reproj_threshold` (pixels). Default: 4.0.

### Homography validation

A candidate homography is rejected if it:
- Contains non-finite values (NaN, Inf).
- Has a near-singular upper-left 2×2 submatrix.
- Implies a reflection (negative determinant).
- Implies an implausible scale change (>100× or <0.01×).

**Parameter:** `min_inliers`. Default: 10. The homography is rejected if fewer inliers are found.

---

## 5. Coordinate Conventions

- **Keypoint coordinates:** OpenCV pixel convention — origin at top-left, x rightward, y downward.
- **Homography direction:** H maps **query** pixel coordinates to **reference** pixel coordinates.
  - `[x_r, y_r, 1]^T ∝ H · [x_q, y_q, 1]^T`
- **Region coordinates:** The four corners of the query image, projected into reference-image pixels. Clockwise from top-left.
- **Not geographic:** These pixel coordinates are NOT latitude/longitude. No geographic claim is made without valid georeferencing.

---

## 6. Reprojection Error

For each inlier correspondence `(x_q, y_q) → (x_r, y_r)`:

```
error_i = ||H·[x_q, y_q, 1]^T / w - [x_r, y_r]^T||₂
```

where `w` is the homogeneous normalizer.

We report mean, median, and max reprojection error in pixels over all inliers.

**Interpretation:** Small reprojection error (< ~2 px) on synthetic pairs indicates a geometrically consistent homography. On real imagery it is a necessary but not sufficient condition for a correct match.

---

## 7. Corner Transfer Error (Synthetic Evaluation Only)

For pairs with a known ground-truth homography `H_true`:

```
corner_error = mean_i( ||H_est·c_i - H_true·c_i||₂ )
```

where `c_i` are the four corners of the query image.

**This metric is only meaningful for synthetic pairs where `H_true` is known exactly.** It measures pixel-level geometric accuracy, NOT real-world geographic localization accuracy.

---

## 8. Metric Definitions

| Metric | Definition | Valid when |
|--------|-----------|-----------|
| `reference_keypoints` | Number of ORB keypoints detected in reference image | Always |
| `query_keypoints` | Number of ORB keypoints detected in query image | Always |
| `tentative_matches` | Matches returned by k-NN before ratio test | Always |
| `filtered_matches` | Matches surviving the ratio test | Always |
| `geometric_inliers` | RANSAC-consistent correspondences | Geometry succeeds |
| `inlier_ratio` | `geometric_inliers / filtered_matches` | Geometry succeeds |
| `mean_reproj_error_px` | Mean reprojection error on inliers | Geometry succeeds |
| `corner_error_px` | Mean corner transfer error vs. known H | Synthetic GT pairs only |
| `processing_time_s` | Wall-clock time for the full pipeline | Always |
| `success_rate` | Fraction of pairs reaching `status=success` | Evaluation sets |

**What these metrics are not:**
- `inlier_ratio` is not a calibrated probability of correct geographic localization.
- `mean_reproj_error_px` is not a geographic position error in meters.
- `corner_error_px` on synthetic pairs does not characterize real-world nav error.
