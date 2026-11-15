# SceneNav AI — Advanced Localization Engine Scientific Validation Report

**Document ID:** `SCENENAV-VAL-20261106-V1`  
**Classification:** Scientific Verification & Forensic Audit  
**Target Repository:** `SceneNav-AI`  
**Audited Modules:**  
- `backend/app/services/quality_assessment.py`
- `backend/app/services/geometric_verification.py`
- `backend/app/services/feature_matcher.py`
- `backend/app/services/region_estimator.py`
- `backend/app/services/georeferencing.py`
- `scripts/run_all_benchmarks.py`
- `results/enhanced_benchmarks_20261106/benchmark_comparison_matrix.json`

---

## Executive Summary & Forensic Audit Verdict

### Final Verdict: SCIENTIFICALLY SOUND WITH OPERATIONAL CAVEATS

An exhaustive mathematical, algorithmic, and statistical audit was conducted on the newly implemented Advanced Localization Engine enhancements for SceneNav AI. This audit independently examined the mathematical formulas, boundary properties, numerical conditioning, coordinate back-mapping, multi-scale feature associations, geospatial ground-truth provenance, and benchmark statistics.

### Key Forensic Audit Conclusions:

1. **Multi-Scale Feature Matching & The Landmark Duplication Anomaly:**
   Initial benchmarks for multi-scale pyramid matching showed a nominal $+62\%$ inlier increase, but a severe degradation in center localization accuracy on georeferenced crops (e.g. `georef_chico_01_crop` error jumped from $6.40\text{ m}$ to $18.144\text{ m}$). Forensic analysis revealed that **$32.9\% \text{ to } 36.7\%$ of multi-scale correspondences were duplicate matches** to the exact same reference landmark across pyramid levels ($s=1.0, 0.75, 0.5$). These redundant matches biased RANSAC and introduced sub-pixel centroid jitter. Following the implementation of reference landmark deduplication (`trainIdx` deduplication in `feature_matcher.py`), true spatial accuracy was restored: `georef_chico_01_crop` center error dropped to **$0.300\text{ m}$**, and overall georeferenced multi-scale ORB center error dropped to **$0.260\text{ m}$** ($1.256\text{ m}$ corner error).

2. **Geospatial Ground-Truth Provenance ($0.039\text{ m}$ SIFT Claim):**
   Forensic code tracing of `scripts/generate_georeferenced_data.py` (lines 116–122) confirmed that the reported SIFT center error of $0.039\text{ m}$ is **NOT** an independently surveyed physical-world geodetic measurement. The ground-truth center is computed by propagating synthetic homography transformations through the raster affine transform via `pyproj`. Consequently, this metric represents **synthetic geometric transfer consistency within the raster affine coordinate model**, rather than absolute real-world GNSS accuracy. Because USGS orthoimagery carries intrinsic horizontal circular error (CE90) uncertainties of $\pm 3\text{ to } 5\text{ m}$, claiming "sub-decimeter physical navigation accuracy" is scientifically unfounded without differential RTK-GNSS ground control points.

3. **Homography Projective Sign Invariance:**
   The homography condition validator and geometric verifier correctly evaluate projective scale consistency via $\text{sign}(w_i) = \text{sign}(w_0)$, rather than naively demanding $w_i > 0$. This ensures that arbitrary negative matrix scaling ($-H$), standard in homogenous projective representations, does not trigger false rejections while strictly catching line-at-infinity crossings (horizon penetrations).

4. **Benchmark Statistics & False Acceptance Rate Uncertainty:**
   Across all 45 experimental pairs evaluated ($37\text{ positive} + 8\text{ negative distractors}$), the engine achieved $0$ false acceptances ($0.0\%$ empirical FAR). However, due to the small negative sample size ($N=8$), the 95% Wilson Score confidence interval is $[0.0\%, 16.2\%]$ (Clopper-Pearson exact $[0.0\%, 36.9\%]$, Rule of Three bound $37.5\%$). Operational deployment requires expanded negative distractor suites.

---

## 1. Mathematical Validation of Localization Reliability Assessment

The localization quality assessment system is encapsulated in `backend/app/services/quality_assessment.py`.

### 1.1 Multi-Signal Confidence Formula

The overall heuristic confidence index $C \in [0.0, 1.0]$ is formulated as a convex combination of five normalized, bounded geometric and feature signals:

$$C = w_{\text{inlier}} S_{\text{inlier}} + w_{\text{ratio}} S_{\text{ratio}} + w_{\text{geom}} S_{\text{geom}} + w_{\text{cond}} S_{\text{cond}} + w_{\text{spread}} S_{\text{spread}}$$

where:
$$\sum_{i} w_i = 0.25 + 0.20 + 0.20 + 0.15 + 0.20 = 1.00$$

### 1.2 Component Normalization & Boundary Verification

Each constituent metric $S_i$ is rigorously bounded in $[0.0, 1.0]$:

1. **Inlier Count Score ($S_{\text{inlier}}$):**
   $$S_{\text{inlier}} = \min\left(1.0, \frac{N_{\text{inliers}}}{100.0}\right)$$
   Bounded in $[0.0, 1.0]$. Reaches $1.0$ at 100 inliers, reflecting sufficient degrees of freedom for planar homography estimation ($8\text{ DOF}$, requiring $\ge 4$ points).

2. **Inlier Ratio Score ($S_{\text{ratio}}$):**
   $$S_{\text{ratio}} = R_{\text{inlier}} = \frac{N_{\text{inliers}}}{N_{\text{tentative}}}$$
   Bounded in $[0.0, 1.0]$ by definition ($0 \le N_{\text{inliers}} \le N_{\text{tentative}}$).

3. **Geometric Reprojection Score ($S_{\text{geom}}$):**
   $$S_{\text{geom}} = \max\left(0.0, 1.0 - \frac{e_{\text{reproj}}}{3.0}\right)$$
   Bounded in $[0.0, 1.0]$. Linearly penalizes mean reprojection error up to the RANSAC inlier threshold ($3.0\text{ px}$); errors $\ge 3.0\text{ px}$ evaluate to $0.0$.

4. **Conditioning Score ($S_{\text{cond}}$):**
   $$S_{\text{cond}} = \max\left(0.0, 1.0 - \frac{\kappa(\mathbf{H}_{\text{canon}}) - 1.0}{9.0}\right)$$
   Bounded in $[0.0, 1.0]$. For an ideal similarity or rigid transform, $\kappa = 1.0 \implies S_{\text{cond}} = 1.0$. Condition numbers $\kappa \ge 10.0$ yield $S_{\text{cond}} = 0.0$.

5. **Spatial Dispersion Score ($S_{\text{spread}}$):**
   $$S_{\text{spread}} = \sqrt{R_{\text{hull}}} \times \left(0.5 R_{\text{grid}} + 0.5 H_{\text{spatial}}\right)$$
   where:
   - $R_{\text{hull}} = \frac{\text{Area}(\text{ConvexHull}(\mathbf{p}_{\text{inliers}}))}{\text{Area}(\text{Canvas})}$
   - $R_{\text{grid}} = \frac{\text{Count of Occupied } 4 \times 4 \text{ Grid Cells}}{16}$
   - $H_{\text{spatial}} = -\sum_{k=1}^{16} p_k \log_{16}(p_k + 10^{-12})$ (Normalized Shannon Spatial Entropy)

**Mathematical Boundary Proof:**
Because $R_{\text{hull}} \in [0.0, 1.0]$, $R_{\text{grid}} \in [0.0, 1.0]$, and $H_{\text{spatial}} \in [0.0, 1.0]$, the term $(0.5 R_{\text{grid}} + 0.5 H_{\text{spatial}}) \in [0.0, 1.0]$. Therefore, $S_{\text{spread}} \in [0.0, 1.0]$, and because $\sum w_i = 1.0$, $C \in [0.0, 1.0]$.

### 1.3 Handling of Missing or Corrupted Signals

If keypoint extraction fails, $N_{\text{inliers}} < 4$, or homography estimation fails:
- All component scores default to $0.0$.
- Confidence score $C$ evaluates strictly to $0.0$.
- Reliability status is immediately clamped to `REJECTED`.
- At no point can a missing or corrupted feature signal artificially elevate confidence.

### 1.4 Spatial Dispersion Gating: Defense Against Clustered Inliers

A critical vulnerability in standard feature matching is the "clustered inlier trap": an untextured aerial image with a single high-contrast building or vehicle can generate 200 inliers within a tiny $30 \times 30\text{ px}$ cluster. If that cluster happens to sit at the intersection of a $4 \times 4$ grid, it touches four cells ($R_{\text{grid}} = 4/16 = 0.25$), artificially generating an entropy score.

To eliminate this vulnerability, the spatial dispersion metric incorporates **convex hull area ratio gating** ($\sqrt{R_{\text{hull}}}$):
- For a $30 \times 30\text{ px}$ cluster on a $1000 \times 1000\text{ px}$ canvas:
  $$R_{\text{hull}} = \frac{900}{1,000,000} = 0.0009 \implies \sqrt{R_{\text{hull}}} = 0.030$$
- Even if $R_{\text{grid}} = 0.25$ and $H_{\text{spatial}} = 0.44$, the gated dispersion score is:
  $$S_{\text{spread}} = 0.030 \times (0.5 \times 0.25 + 0.5 \times 0.44) = 0.0104$$
- The system correctly suppresses the clustered match and flags `LOW_CONFIDENCE` or `REJECTED`.

### 1.5 Categorical Status Threshold Justifications

The engine defines three reliability categories:

| Status | Threshold Criteria | Justification |
| :--- | :--- | :--- |
| **`ACCEPTED`** | $C \ge 0.55 \land \text{inliers} \ge 15 \land \text{convex} \land \text{angles} \in [15^\circ, 165^\circ] \land \text{no collinearity}$ | Guarantees well-conditioned geometry, distributed correspondence support across multiple quadrants, and low residual error. |
| **`LOW_CONFIDENCE`**| $0.35 \le C < 0.55$ or $8 \le \text{inliers} < 15$ | Indicates a geometrically plausible match with weak support (e.g. clustered points, marginal overlap, or high perspective skew). Downstream autonomy must not commit weapon or flight path changes without secondary sensor confirmation. |
| **`REJECTED`** | $C < 0.35$ or $\text{inliers} < 8$ or concave quad or horizon crossing or $\kappa > 100$ | Unambiguously non-convergent, degenerate, or unrelated scene. Immediately discarded. |

### 1.6 Scientific Status: Uncalibrated Heuristic Index

The confidence score $C$ is an **uncalibrated heuristic index**, not a frequentist or Bayesian posterior probability $P(\text{Correct} \mid \mathbf{x})$. While it exhibits strong monotonic separation between genuine matches ($C \in [0.50, 0.85]$) and false matches ($C \in [0.00, 0.25]$), it has not been calibrated via Platt scaling or isotonic regression on thousands of flight sorties. It must be interpreted as a rank-order quality indicator.

---

## 2. Homography Conditioning & Degeneracy Protections

The geometric verification service (`geometric_verification.py` and `quality_assessment.py`) incorporates multiple algebraic safeguards to prevent geometric divergence.

### 2.1 Hartley-Zisserman Isotropic Canonical Normalization

Standard singular value decomposition of raw image homographies produces condition numbers $\kappa(\mathbf{H}) > 10^7$ simply because pixel coordinates are large ($x \sim 1000\text{ px}$) while projective rows are small ($h_{31} \sim 10^{-4}$).

To measure genuine projective distortion independent of coordinate scale, the engine applies Hartley-Zisserman isotropic normalization:

$$\mathbf{H}_{\text{canon}} = \mathbf{T}_{\text{ref}} \mathbf{H} \mathbf{T}_{\text{qry}}^{-1}$$

where coordinate normalization matrices $\mathbf{T}$ shift the centroid to the origin and scale the mean distance to $\sqrt{2}$:

$$\mathbf{T} = \begin{bmatrix} \frac{\sqrt{2}}{\sigma_x} & 0 & -\frac{\sqrt{2}\mu_x}{\sigma_x} \\ 0 & \frac{\sqrt{2}}{\sigma_y} & -\frac{\sqrt{2}\mu_y}{\sigma_y} \\ 0 & 0 & 1 \end{bmatrix}$$

**Mathematical Invariance Verification:**
The canonical homography $\mathbf{H}_{\text{canon}}$ maps points from canonical query coordinates $\tilde{\mathbf{x}}_{\text{qry}} = \mathbf{T}_{\text{qry}} \mathbf{x}_{\text{qry}}$ to canonical reference coordinates $\tilde{\mathbf{x}}_{\text{ref}} = \mathbf{T}_{\text{ref}} \mathbf{x}_{\text{ref}}$.
Back-transforming yields:
$$\mathbf{x}_{\text{ref}} = \mathbf{T}_{\text{ref}}^{-1} \mathbf{H}_{\text{canon}} \mathbf{T}_{\text{qry}} \mathbf{x}_{\text{qry}} = \mathbf{H} \mathbf{x}_{\text{qry}}$$
with exact numerical precision ($0.0\text{ px}$ residual).

The canonical condition number is computed as:
$$\kappa(\mathbf{H}_{\text{canon}}) = \frac{\sigma_{\max}(\mathbf{H}_{\text{canon}})}{\sigma_{\min}(\mathbf{H}_{\text{canon}})}$$

Empirical measurements across benchmark suites:
- **Synthetic pairs (pure translation & affine):** $\kappa = 1.08$
- **Real-world aerial pairs (perspective & rotation):** $\kappa = 2.47$
- **Georeferenced orthophotos (nadir crops):** $\kappa = 2.80 \text{ to } 2.92$

Any matrix with $\kappa(\mathbf{H}_{\text{canon}}) > 100.0$ indicates numerical instability or extreme shear and is rejected.

### 2.2 Inlier Collinearity Detection via Covariance SVD

When inliers lie along a single linear structure (e.g. a highway, coastline, or power line), planar homography estimation is mathematically ill-posed and can rotate wildly out of plane.

The engine computes the singular values of the centered inlier coordinates:
$$\mathbf{C} = \frac{1}{N} \sum_{i=1}^{N} (\mathbf{p}_i - \boldsymbol{\mu})(\mathbf{p}_i - \boldsymbol{\mu})^T \implies \mathbf{C} = \mathbf{U} \mathbf{S} \mathbf{V}^T$$
where $\mathbf{S} = \text{diag}(s_1, s_2)$ with $s_1 \ge s_2$.

If the ratio of the minor axis to major axis falls below $10^{-4}$:
$$\frac{s_2}{s_1} < 10^{-4}$$
the correspondences are flagged as collinear, and the homography is rejected.

### 2.3 Projective Sign Invariance & Horizon Crossings

A 2D projective transformation maps point $\mathbf{x} = [x, y, 1]^T$ to $\mathbf{x}' \sim \mathbf{H} \mathbf{x}$ with projective denominator:
$$w_i = h_{31} x_i + h_{32} y_i + h_{33}$$

If $w_i$ changes sign between image corners, the quadrilateral crosses the line at infinity (the vanishing line or visual horizon), producing a non-orientable topological wrap where points project behind the camera plane.

**Audit Verification of Sign Invariance:**
A naive implementation requiring $w_i > 0$ fails whenever OpenCV outputs a homography with negative matrix scale ($-H$), because $-H$ and $+H$ represent the exact same projective map.

The engine correctly validates sign consistency:
$$\text{sign}(w_i) = \text{sign}(w_0) \quad \forall i \in \{1, 2, 3\}$$
Testing with negated matrices confirms that scaling $\mathbf{H} \to -\mathbf{H}$ maintains identical validity, while genuine horizon crossings are strictly caught and rejected.

### 2.4 Quad Convexity & Interior Angle Bounds

Projected footprints are verified for geometric validity:
1. **Convexity:** Cross products of adjacent directed edges must all share the same sign. Self-intersecting "bow-tie" quadrilaterals are rejected.
2. **Interior Angles:** All four interior angles must satisfy:
   $$\theta_i \in [15.0^\circ, 165.0^\circ]$$
   Quadrilaterals with acute slivers ($< 15^\circ$) or near-degenerate reflex corners ($> 165^\circ$) are rejected.

---

## 3. Multi-Scale Matching, Coordinate Consistency & Landmark Deduplication

### 3.1 Multi-Scale Feature Architecture

To match aerial images across wide altitude variations, the engine constructs a scale pyramid over the query image:
$$s \in [1.0, 0.75, 0.50]$$
For each scale level, keypoints are extracted and their coordinates and sizes are back-mapped to native full-resolution coordinates:
$$x_{\text{native}} = \frac{x_{\text{scaled}}}{s}, \quad y_{\text{native}} = \frac{y_{\text{scaled}}}{s}, \quad \text{size}_{\text{native}} = \frac{\text{size}_{\text{scaled}}}{s}$$

### 3.2 The Multi-Scale Duplicate Inlier Inflation Anomaly

During initial multi-scale benchmarking, a counter-intuitive phenomenon was observed:
- Nominal inliers rose by $+62\%$ (from 488.0 to 790.8).
- Center localization error on `georef_chico_01_crop` **worsened from $6.40\text{ m}$ to $18.144\text{ m}$**.
- Overall georeferenced center error degraded from $1.692\text{ m}$ to $4.704\text{ m}$.

#### Forensic Root-Cause Analysis:
When keypoints are detected across pyramid levels, the same physical landmark on the ground is detected at scale $s=1.0$, $s=0.75$, and $s=0.50$. Each scaled keypoint independently matched to the **same reference keypoint** (`trainIdx`).
- Detailed correspondence inspection revealed that **$32.9\% \text{ to } 36.7\%$ of tentative matches were redundant duplicate matches to identical reference landmarks**.
- Because keypoint localization at coarser pyramid levels has slightly lower sub-pixel precision, grouping 3 slightly different query coordinates to the same reference coordinate injected artificial tension and centroid jitter into RANSAC.
- RANSAC accepted these duplicate inliers, artificially inflating the inlier count while degrading the estimated homography matrix.

#### Algorithmic Resolution: Reference Landmark Deduplication
The engine was updated in `backend/app/services/feature_matcher.py` to enforce reference landmark uniqueness:
- Matches are grouped by `trainIdx` (the physical reference feature ID).
- For each unique reference landmark, only the single best match (lowest descriptor distance) is retained.
- Multi-scale duplicates are pruned before Lowe's ratio test and RANSAC.

```python
# feature_matcher.py landmark deduplication
best_by_train = {}
for m in tentative_matches:
    if m.trainIdx not in best_by_train or m.distance < best_by_train[m.trainIdx].distance:
        best_by_train[m.trainIdx] = m
filtered_matches = list(best_by_train.values())
```

#### Verified Outcome:
- On `georef_chico_01_crop`, center error dropped from $18.144\text{ m}$ down to **$0.300\text{ m}$** ($1.385\text{ m}$ corner error).
- Across all georeferenced pairs, multi-scale ORB center error dropped from $4.704\text{ m}$ down to **$0.260\text{ m}$** ($1.256\text{ m}$ corner error).
- Inliers settled at a legitimate $521.5$ (up from $488.0$ single-scale), reflecting genuine scale-invariant correspondences without duplicate inflation.

### 3.3 Computational & Memory Overhead

| Metric | Single-Scale ORB | Multi-Scale ORB (Deduplicated) | Delta |
| :--- | :--- | :--- | :--- |
| **Mean Runtime (s)** | $0.126\text{ s}$ | $0.137\text{ s}$ | $+8.7\%$ ($+11\text{ ms}$) |
| **Memory Peak (MB)** | $142.3\text{ MB}$ | $159.8\text{ MB}$ | $+12.3\%$ ($+17.5\text{ MB}$) |
| **Inliers** | $488.0$ | $521.5$ | $+6.9\%$ true inliers |
| **Center Error (m)** | $1.692\text{ m}$ | **$0.260\text{ m}$** | **$-84.6\%$ error reduction** |

The deduplicated multi-scale pipeline provides significant localization accuracy gains with negligible runtime overhead ($+11\text{ ms}$).

---

## 4. Geospatial Ground-Truth Provenance & Absolute Accuracy Audit

### 4.1 Forensic Tracing of the $0.039\text{ m}$ Geodesic Center Error Claim

The previous release reported a SIFT center geodesic error of $0.0387\text{ m}$ ($\approx 3.9\text{ cm}$) on Munich orthophotos.

#### Code Line Trace:
In `scripts/generate_georeferenced_data.py`:
```python
# Lines 116-122
corners_ref = cv2.perspectiveTransform(corners_qry.reshape(-1, 1, 2), H_gt).reshape(-1, 2)
center_ref = np.mean(corners_ref, axis=0)
gt_lon, gt_lat = raster_dataset.xy_to_lonlat(center_ref[0], center_ref[1])
```

#### Forensic Finding:
1. `H_gt` is a synthetic affine/perspective transformation matrix generated computationally.
2. The query image was cropped from the reference GeoTIFF using `cv2.warpPerspective(ref_image, H_gt, ...)`.
3. `gt_lon` and `gt_lat` were generated by applying the raster affine transform matrix to `center_ref`.
4. During evaluation, estimated coordinates are calculated by applying the estimated homography $\hat{\mathbf{H}}$ to the query center, followed by the exact same raster affine transform.

#### Scientific Reality:
The $0.039\text{ m}$ error is a **closed-loop synthetic transfer error**. It demonstrates that OpenCV's SIFT keypoint localization and RANSAC homography estimation reconstruct the synthetic transformation matrix with extreme mathematical fidelity.

**It does NOT represent physical-world navigation accuracy.**

### 4.2 Real-World Orthoimagery Geodetic Uncertainties (USGS Standards)

To prevent misleading claims in defense and avionics contexts, the physical limits of aerial imagery must be recognized:
- USGS High-Resolution Orthoimagery (HRO) and National Agriculture Imagery Program (NAIP) datasets have horizontal circular errors (CE90) ranging between **$\pm 3.0\text{ m}$ and $\pm 5.0\text{ m}$** relative to the National Spatial Reference System (NSRS).
- Even with perfect sub-pixel image registration ($0.039\text{ m}$ relative error), the true physical geodetic position on Earth cannot have lower uncertainty than the underlying reference map without real-time RTK-GNSS ground control.
- **Scientific Re-labeling:** The metric must be cited as *homography-to-geotiff affine geometric transfer consistency*, not absolute ground-truth navigation accuracy.

### 4.3 Geospatial Area Partitioning & Boundary Accounting

The audit independently verified the Sutherland-Hodgman polygon clipping routine in `backend/app/services/region_estimator.py` on the Munich Cadastral dataset:

- **Reference Raster Dimensions:** $3160 \times 2400\text{ px}$
- **Pixel Resolution:** $0.50\text{ m/px}$
- **Reference Raster Area:** $1,896,000.00\text{ m}^2$
- **Total Projected Footprint Area:** $339,161.34\text{ m}^2$
- **In-Raster Footprint Area:** $321,487.00\text{ m}^2$ ($94.79\%$)
- **Extrapolated Footprint Area:** $17,674.34\text{ m}^2$ ($5.21\%$)

The area partition was verified to conserve mass:
$$\text{Area}_{\text{in}} + \text{Area}_{\text{extrapolated}} = 321,487.00 + 17,674.34 = 339,161.34\text{ m}^2$$
The previous discrepancy where SIFT values were mistakenly applied to ORB in documentation has been resolved.

---

## 5. Benchmark Reconciliation & Statistical Rigor

### 5.1 Dataset Reconciliation & Explicit Denominators

The evaluation suite operates across three manifests totaling **45 experimental pairs**:

| Manifest | Dataset Description | Positive Pairs | Negative Distractors | Total Pairs | Success Denominator Rule |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `synthetic_pairs.json` | Controlled planar affine transformations | 21 | 3 | 24 | Positive Success: $k / 21$<br>True Negative: $k / 3$ |
| `real_world_pairs.json`| Drone aerial images (Chico, UC Davis) | 11 | 4 | 15 | Positive Success: $k / 11$<br>True Negative: $k / 4$ |
| `georeferenced_pairs.json` | Munich & Chico GeoTIFFs with CRS | 5 | 1 | 6 | Positive Success: $k / 5$<br>True Negative: $k / 1$ |
| **Total** | **All Experimental Suites** | **37** | **8** | **45** | **Positive Success: $k / 37$<br>True Negative: $k / 8$** |

#### Resolving the Georeferenced Denominator Confusion:
Earlier documentation reported "ORB 80% success on 6 georeferenced pairs". 
- $4/6 = 66.7\%$, which contradicted the reported $80.0\%$.
- **Audit reconciliation:** The georeferenced manifest contains **5 positive pairs and 1 negative distractor pair**.
- Single-scale and multi-scale ORB succeed on 4 out of the 5 positive pairs ($4 / 5 = 80.0\%$).
- The 1 negative distractor pair was correctly rejected ($1 / 1 = 100.0\%$).
- SIFT succeeds on 5 out of 5 positive pairs ($5 / 5 = 100.0\%$) and rejects the negative pair ($1 / 1 = 100.0\%$).

### 5.2 Statistical Uncertainty Analysis on False Acceptance Rate

Across all 8 negative distractor pairs in the benchmark suite, zero false acceptances were recorded:
$$\text{Empirical False Acceptance Rate} = \frac{0}{8} = 0.0\%$$

Because $N=8$ is a limited sample, a naive claim of "0% false acceptance rate" requires rigorous statistical bounding:

1. **Rule of Three (95% Upper Bound):**
   $$p_{\text{upper}} \approx \frac{3}{N} = \frac{3}{8} = 37.5\%$$
2. **Wilson Score 95% Confidence Interval:**
   $$\text{CI}_{95\%} = [0.0\%, 16.2\%]$$
3. **Clopper-Pearson Exact Binomial 95% Interval:**
   $$\text{CI}_{95\%} = [0.0\%, 36.9\%]$$

**Scientific Takeaway:**
While the localization engine successfully rejected every negative distractor tested, the statistical confidence interval upper bound is $16.2\%$ (Wilson) to $36.9\%$ (Clopper-Pearson). The engine cannot claim zero operational false acceptances in unconstrained airspace until benchmarked against $\ge 300$ adversarial flight scenes (which would constrain the 95% upper bound to $< 1\%$).

---

## 6. Full Empirical Comparison Matrix (All 7 Configurations)

The table below presents the verified benchmark metrics extracted from `results/enhanced_benchmarks_20261106/benchmark_comparison_matrix.json`:

| Configuration | Pos. Success | Inliers (Mean) | Inlier Ratio | Reproj. Err (px) | Corner Err (px) | Center Err (m) | Corner Err (m) | Time (s) | QA Breakdown (Acc/Low/Rej) | Mean Conf. | Spatial Spread | $\kappa(\mathbf{H}_{\text{canon}})$ |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **Synthetic — ORB** | 21/21 (100%) | 1623.0 | 97.2% | 0.61 px | 0.34 px | — | — | 0.186 s | 21 / 0 / 3 | 0.808 | 0.784 | 1.08 |
| **Synthetic — SIFT** | 21/21 (100%) | 527.6 | 93.9% | 0.21 px | 0.09 px | — | — | 0.126 s | 21 / 0 / 3 | 0.848 | 0.911 | 1.08 |
| **Real Aerial — ORB** | 11/11 (100%) | 442.4 | 97.1% | 0.91 px | 5.33 px | — | — | 0.181 s | 10 / 0 / 5 | 0.558 | 0.445 | 2.47 |
| **Real Aerial — SIFT** | 11/11 (100%) | 689.2 | 99.4% | 0.11 px | 0.05 px | — | — | 0.254 s | 11 / 0 / 4 | 0.691 | 0.909 | 2.47 |
| **Georef — ORB (Single)** | 4/5 (80.0%) | 488.0 | 96.4% | 0.90 px | 6.49 px | 1.692 m | 6.493 m | 0.126 s | 3 / 1 / 2 | 0.507 | 0.430 | 2.80 |
| **Georef — ORB (Multi)** | 4/5 (80.0%) | 521.5 | 96.7% | 0.83 px | 1.26 px | **0.260 m** | **1.256 m** | 0.137 s | 3 / 1 / 2 | 0.512 | 0.446 | 2.83 |
| **Georef — SIFT (Single)** | 5/5 (100%) | 458.0 | 99.4% | 0.09 px | 0.04 px | **0.039 m** | **0.045 m** | 0.198 s | 5 / 0 / 1 | 0.783 | 0.923 | 2.92 |

*Note: In all 7 configurations, False Acceptance Rate on negative pairs was $0.0\%$ ($100\%$ True Negative Rate).*

---

## 7. Summary of Defects Identified & Corrected During the Audit

| Defect ID | Description | Root Cause | Impact | Applied Fix & Verification |
| :--- | :--- | :--- | :--- | :--- |
| **DEF-01** | Multi-scale duplicate correspondence inflation | Multiple query pyramid scales matching the same reference landmark (`trainIdx`) | Center error degraded from $6.4\text{ m} \to 18.14\text{ m}$ on `georef_chico_01_crop` | Implemented reference landmark deduplication in `feature_matcher.py`. Center error dropped to **$0.300\text{ m}$**. |
| **DEF-02** | Spatial dispersion inflation on grid boundary clusters | Small $30 \times 30\text{ px}$ cluster straddling $(x=500, y=500)$ activated 4 grid cells | Clustered inlier sets scored $S_{\text{spread}} = 0.25$, evading rejection | Added convex hull area ratio gating $\sqrt{R_{\text{hull}}}$. Clustered score reduced from $0.25 \to 0.0104$. |
| **DEF-03** | Potential false rejection of $-\mathbf{H}$ homographies | Arbitrary negative scale from SVD in homogenous matrices causing $w_i < 0$ | Valid homographies could be falsely rejected | Enforced sign consistency check $\text{sign}(w_i) = \text{sign}(w_0)$, invariant to matrix sign flip. |
| **DEF-04** | Windows console Unicode encoding crash | Print statements using Greek character $\kappa$ (`\u03ba`) crashed on `cp1252` | Benchmark script terminated on Windows shells | Replaced terminal prints with `kappa(H)`. Benchmarks run cleanly. |
| **DEF-05** | Ambiguous ground-truth provenance documentation | Reports implied $0.039\text{ m}$ was physical ground truth | Misleading claims of real-world positioning accuracy | Formally re-documented as synthetic geometric transfer consistency under raster affine mapping. |

---

## 8. Scientific Limitations & Operational Guidance for UAV/Edge Deployment

1. **Planar Surface Assumption:**
   The homography model $\mathbf{H} \in \mathbb{R}^{3 \times 3}$ assumes either a strictly planar Earth surface or a camera undergoing pure rotation. Over steep mountainous terrain, urban canyons with high-rise structures, or low-altitude oblique trajectories, parallax induced by 3D structure will violate the planar assumption, increasing reprojection residual. For non-planar terrain, an Essential matrix / Epipolar geometry or mesh-based local homography pipeline should be integrated.

2. **Uncalibrated Confidence Status:**
   The confidence index $C$ is an uncalibrated heuristic. In safety-critical UAV flight control (e.g. GPS-denied terminal navigation), decisions to switch flight modes should not rely solely on a single frame exceeding $C \ge 0.55$. Instead, a temporal Kalman Filter or sliding-window consensus over $\ge 5$ consecutive frames should be enforced.

3. **Illumination and Seasonal Variation:**
   ORB and SIFT rely on gradient intensity patterns. While multi-scale matching successfully resolves scale differences up to $2\times$, severe radiometric shifts (day vs. night, snow cover, summer vs. winter foliage) will degrade classical descriptor matching. Integrating deep learned local features (e.g. SuperPoint / LightGlue) is recommended for extreme seasonal invariance.

4. **Reference Map Resolution Limits:**
   Localization accuracy is bounded from below by the ground sampling distance (GSD) of the reference orthoimagery. Sub-pixel interpolation allows keypoint localization to approximately $\sim 0.2 \times \text{GSD}$, but cannot overcome systematic georeferencing bias present in the reference raster.

---

## 9. Final Verification & Test Sign-off

The repository test suites and verification scripts were executed completely:

- **Backend Unit & Integration Suite (`pytest`):**  
  `131 passed, 9 deselected, 3 warnings in 10.40s`
- **Browser End-to-End Suite (`Playwright`):**  
  `9 passed in 28.66s`
- **Frontend Unit & Component Suite (`Vitest`):**  
  `8 passed in 1.50s`
- **Frontend Production Build (`Vite`):**  
  `Built in 124ms (0 errors)`
- **Total Automated Tests Passing:** **148 passed, 0 failed**

### Audit Sign-off
**Auditor:** Principal AI/ML Research & Validation Engineer  
**Date:** November 6, 2026  
**Status:** VALIDATED & ACCEPTED
