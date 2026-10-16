# SceneNav AI — Baseline Comparison: ORB vs SIFT

**Benchmark Dataset:** `real_world_pairs.json`  
**Evaluation Timestamp:** 2026-10-15 09:34:28 UTC  
**Dataset License:** Public Domain (17 U.S.C. § 105 - United States Government Work)  
**Attribution:** United States Geological Survey (USGS) and USDA Farm Service Agency  

## 1. Executive Summary

This study evaluates and benchmarks two distinct feature-matching paradigms 
on authentic aerial orthophotos sourced from United States Geological Survey (USGS) 
and USDA NAIP public archives:
1. **ORB (Oriented FAST and Rotated BRIEF):** Binary descriptor, Hamming distance, CPU optimized.
2. **SIFT (Scale-Invariant Feature Transform):** Floating-point gradient orientation histograms, L2 distance, scale-space octave pyramid.

### Key Aggregate Metrics Comparison

| Metric | ORB Baseline | SIFT Alternative | Comparison / Analysis |
| :--- | :---: | :---: | :--- |
| **Total Evaluated Pairs** | 15 | 15 | Identical test pairs |
| **Positive Pairs** | 11 | 11 | Genuine co-located imagery pairs |
| **Negative Pairs** | 4 | 4 | Unrelated cross-scene pairs |
| **Positive Success Rate** | 11/11 (100.0%) | 11/11 (100.0%) | Genuine positive pairs (11/11 vs 11/11) |
| **Overall Success Rate** | 11/15 (73.3%) | 11/15 (73.3%) | All pairs including negatives (11/15 vs 11/15) |
| **False Acceptances (Negatives)** | 0/4 (0.0%) | 0/4 (0.0%) | False acceptances across negatives (0/4 vs 0/4) |
| **True Negative Rate** | 100.0% | 100.0% | Rejection of cross-scene distractors |
| **Mean Inlier Count (Positives)** | 442.4 | 689.2 | SIFT inlier delta: +55.8% |
| **Mean Inlier Ratio** | 97.1% | 99.4% | SIFT: 99.4% vs ORB: 97.1% |
| **Mean Reprojection Error** | 0.91 px | 0.11 px | Sub-pixel RANSAC inlier fit |
| **Mean Corner Transfer Error** | 5.33 px | 0.05 px | Evaluated strictly on verified ground-truth pairs |
| **Mean Processing Time** | 137.8 ms | 196.2 ms | ORB is ~1.4x faster |

## 2. Per-Pair Side-by-Side Breakdown

| Pair ID | Scene / Ground Truth | ORB Status (Inliers) | SIFT Status (Inliers) | ORB Corner Err | SIFT Corner Err |
| :--- | :--- | :---: | :---: | :---: | :---: |
| `real_greenwood_01_crop` | `planar_homography_gt` | success (842) | success (1164) | 1.23 px | 0.01 px |
| `real_greenwood_02_rot_scale` | `planar_homography_gt` | success (531) | success (683) | 0.52 px | 0.05 px |
| `real_greenwood_03_photometric` | `planar_homography_gt` | success (704) | success (666) | 1.26 px | 0.05 px |
| `real_greenwood_04_uncalibrated_obs` | `unavailable` | success (841) | success (877) | — | — |
| `real_chico_01_crop` | `planar_homography_gt` | success (481) | success (1246) | 4.26 px | 0.00 px |
| `real_chico_02_rot_10` | `planar_homography_gt` | success (129) | success (527) | 2.07 px | 0.09 px |
| `real_chico_03_scale_08` | `planar_homography_gt` | success (33) | success (353) | 32.63 px | 0.07 px |
| `real_chico_04_uncalibrated_obs` | `unavailable` | success (227) | success (627) | — | — |
| `real_harrishill_01_crop` | `planar_homography_gt` | success (533) | success (831) | 0.12 px | 0.01 px |
| `real_harrishill_02_rot_14` | `planar_homography_gt` | success (168) | success (252) | 0.52 px | 0.10 px |
| `real_harrishill_03_uncalibrated_obs` | `unavailable` | success (377) | success (355) | — | — |
| `real_negative_01_chico_on_greenwood` | `negative_unrelated_pair` | insufficient_matches (0) | insufficient_matches (0) | — | — |
| `real_negative_02_harrishill_on_greenwood` | `negative_unrelated_pair` | insufficient_matches (0) | insufficient_matches (0) | — | — |
| `real_negative_03_greenwood_on_chico` | `negative_unrelated_pair` | geometry_failed (5) | geometry_failed (4) | — | — |
| `real_negative_04_greenwood_on_harrishill` | `negative_unrelated_pair` | geometry_failed (4) | insufficient_matches (0) | — | — |

## 3. Detailed Algorithmic Observations

### Scale Resilience
- Under moderate scale compression (e.g. `real_chico_03_scale_08`, 0.82x zoom), **ORB inliers dropped to 33**, whereas **SIFT retained 353 inliers**.
- This highlights SIFT's scale-space DoG (Difference of Gaussians) octave pyramid advantage over ORB's fixed-level FAST octaves.

### False Acceptance Rejection & Sample Size Limitation
- Both ORB and SIFT achieved a **0.0% false acceptance rate** on all 4 cross-scene negative pairs (0/4 false acceptances, 100.0% true negative rate).
- Ratio-test filtering successfully pruned cross-scene candidates, and RANSAC rejected residual spurious matches (maximum residual inliers observed was 5, well below the acceptance threshold of 10).
- **Sample-Size Limitation:** Four negative pairs (N=4) serve as a sanity smoke test to verify rejection logic, but do not establish a statistically general operational false-alarm rate across diverse terrain types, seasons, or lighting conditions.

### Simulated Perspective-Distortion Observations
- The 3 warped query pairs (`real_greenwood_04_uncalibrated_obs`, `real_chico_04_uncalibrated_obs`, `real_harrishill_03_uncalibrated_obs`) are simulated perspective-distortion observations derived from source orthophotos, not independent real-world oblique camera captures.
- For these pairs, ground-truth homography is intentionally unavailable and excluded from corner error computation.

### Runtime & Resource Profile
- ORB averaged **137.8 ms** per pair on CPU, making it suitable for high-throughput or low-power embedded edge computation.
- SIFT averaged **196.2 ms** per pair on CPU, offering higher geometric fidelity and inlier density at modest computational cost.

## 4. Academic Limitations & Ethics Notice

- **Planar-Scene Assumption:** Homography assumes scenes are approximately planar relative to flight altitude. For low-altitude oblique imagery or rugged terrain, essential/fundamental matrix estimation or digital surface model (DSM) rectification is required.
- **Pixel Accuracy != Navigation Accuracy:** Reprojection and corner transfer errors measure 2D pixel alignment against the reference raster image. Converting this to geographic position (latitude/longitude/altitude) requires verified georeferencing metadata, interior/exterior camera orientation parameters, and geodetic coordinate transformations.
