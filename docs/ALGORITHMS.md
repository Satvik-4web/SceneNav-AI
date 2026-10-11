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

## 1.1 SIFT — Scale-Invariant Feature Transform (Alternative Baseline)

**Reference:** D.G. Lowe, "Distinctive Image Features from Scale-Invariant Keypoints," IJCV 2004.

### Detection (Difference-of-Gaussians / Scale-Space Octaves)
SIFT searches for extrema across scale space using Difference-of-Gaussians (DoG). Keypoint locations and scales are localized via 3D quadratic fitting, eliminating edge responses via the Hessian matrix. Dominant orientations are computed from local gradient histograms.

### Description (Gradient Orientation Histograms)
A 128-dimensional floating point vector is computed from 4×4 spatial sub-regions with 8 gradient orientation bins. Normalized to unit length and thresholded to illuminate nonlinear illumination changes.

### Comparison: SIFT vs ORB
- **Scale Space:** SIFT's continuous DoG pyramid handles multi-scale changes (e.g. altitude changes in aerial observation) significantly better than ORB's discrete octave subsampling.
- **Precision:** Sub-pixel localization in SIFT yields lower reprojection and corner transfer errors on planar scenes.
- **Computational Cost:** ORB is binary and operates using Hamming popcounts, making it ~1.5× faster on CPU than SIFT's Euclidean distance computations.

---

## 2. Descriptor Matching — BFMatcher (Hamming vs L2)

- For **ORB**: A brute-force matcher computes the **Hamming distance** (bitwise XOR popcount) between 256-bit binary descriptors.
- For **SIFT**: A brute-force matcher computes the **Euclidean ($L_2$) distance** between 128-dimensional floating point vectors.

In both cases, we use **k-NN matching with k=2** to support Lowe's ratio test.

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

## 7. Corner Transfer Error (Planar Ground-Truth Evaluation)

For pairs with a mathematically verified ground-truth homography `H_true` (synthetic transforms or controlled planar orthophoto crops):

```
corner_error = (1 / 4) * sum_{i=1}^4 || H_est · c_i - H_true · c_i ||₂
```

where `c_i` are the four corners of the query image in homogeneous coordinates.

**Important:** This metric is evaluated **strictly** when `H_true` is known a priori. For uncalibrated real-world observations or negative pairs, corner transfer error is explicitly undefined and reported as `None` (never fabricated). Furthermore, this is a 2D pixel-space alignment metric; it does **not** characterize real-world geographic latitude/longitude navigation accuracy.

---

## 7.1 False Acceptance and Negative Pair Metrics

When evaluating unrelated image pairs (cross-scene pairs):
- **False Acceptance (FA):** A negative pair incorrectly declared as `status=success` (i.e. passing the inlier threshold and producing an accepted homography).
- **False Acceptance Rate (FAR):**
  $$\text{FAR} = \frac{\text{False Acceptances}}{\text{Total Negative Pairs}}$$
  *(Ideal: 0.0%)*
- **True Negative Rate (TNR / Specificity):**
  $$\text{TNR} = \frac{\text{Correctly Rejected Negatives}}{\text{Total Negative Pairs}} = 1.0 - \text{FAR}$$
  *(Ideal: 100.0%)*

---

## 8. Metric Definitions

| Metric | Definition | Valid when |
| :--- | :--- | :--- |
| `reference_keypoints` | Keypoints detected in reference image (ORB or SIFT) | Always |
| `query_keypoints` | Keypoints detected in query image (ORB or SIFT) | Always |
| `tentative_matches` | Matches returned by k-NN before ratio test | Always |
| `filtered_matches` | Matches surviving Lowe's ratio test | Always |
| `geometric_inliers` | RANSAC-consistent correspondences | Geometry succeeds |
| `inlier_ratio` | `geometric_inliers / filtered_matches` | Geometry succeeds |
| `mean_reproj_error_px` | Mean reprojection error on inliers | Geometry succeeds |
| `corner_error_px` | Mean Euclidean corner transfer error vs known $H_{true}$ | Verified GT pairs only |
| `false_acceptance_rate` | Ratio of negative pairs incorrectly marked as success | Negative evaluation sets |
| `true_negative_rate` | Ratio of negative pairs correctly rejected | Negative evaluation sets |
| `processing_time_s` | Wall-clock execution time for feature matching + geometry | Always |
| `success_rate` | Fraction of pairs reaching `status=success` | Evaluation sets |

**Crucial Disclaimers:**
- `inlier_ratio` is not a calibrated probability of geographic localization.
- `mean_reproj_error_px` is not a physical position error in meters.
- `corner_error_px` measures 2D raster plane alignment only, not geodetic navigation accuracy.
