# SceneNav AI — Baseline Comparison: ORB vs SIFT

**Benchmark Dataset:** `real_world_pairs.json`  
**Evaluation Timestamp:** 2026-10-11 13:22:53 UTC  
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
| **Positive Success Rate** | 11/15 (73.3%) | 11/15 (73.3%) | Both achieved 100% on genuine positive pairs |
| **False Acceptances (Negatives)** | 0/4 (0.0%) | 0/4 (0.0%) | Zero false acceptances across all negative pairs |
| **True Negative Rate** | 100.0% | 100.0% | Rejection of cross-scene imagery |
| **Mean Inlier Count (Positives)** | 430.2 | 687.4 | **SIFT yielded +59.8% more inliers** |
| **Mean Inlier Ratio** | 97.0% | 99.4% | SIFT: 99.4% vs ORB: 97.0% |
| **Mean Reprojection Error** | 0.92 px | 0.11 px | SIFT achieves sharper sub-pixel fitting |
| **Mean Corner Transfer Error** | 5.33 px | 0.05 px | Evaluated on 8 verified planar GT pairs |
| **Mean Processing Time** | 158.5 ms | 232.0 ms | ORB is ~1.5x faster |

## 2. Per-Pair Side-by-Side Breakdown

| Pair ID | Scene / Ground Truth | ORB Status (Inliers) | SIFT Status (Inliers) | ORB Corner Err | SIFT Corner Err |
| :--- | :--- | :---: | :---: | :---: | :---: |
| `real_greenwood_01_crop` | `planar_homography_gt` | success (842) | success (1164) | 1.23 px | 0.01 px |
| `real_greenwood_02_rot_scale` | `planar_homography_gt` | success (531) | success (683) | 0.52 px | 0.05 px |
| `real_greenwood_03_photometric` | `planar_homography_gt` | success (704) | success (666) | 1.26 px | 0.05 px |
| `real_greenwood_04_uncalibrated_obs` | `unavailable` | success (768) | success (878) | — | — |
| `real_chico_01_crop` | `planar_homography_gt` | success (481) | success (1246) | 4.26 px | 0.00 px |
| `real_chico_02_rot_10` | `planar_homography_gt` | success (129) | success (527) | 2.07 px | 0.09 px |
| `real_chico_03_scale_08` | `planar_homography_gt` | success (33) | success (353) | 32.63 px | 0.07 px |
| `real_chico_04_uncalibrated_obs` | `unavailable` | success (196) | success (598) | — | — |
| `real_harrishill_01_crop` | `planar_homography_gt` | success (533) | success (831) | 0.12 px | 0.01 px |
| `real_harrishill_02_rot_14` | `planar_homography_gt` | success (168) | success (252) | 0.52 px | 0.10 px |
| `real_harrishill_03_uncalibrated_obs` | `unavailable` | success (347) | success (363) | — | — |
| `real_negative_01_chico_on_greenwood` | `negative_unrelated_pair` | insufficient_matches (0) | insufficient_matches (0) | — | — |
| `real_negative_02_harrishill_on_greenwood` | `negative_unrelated_pair` | insufficient_matches (0) | insufficient_matches (0) | — | — |
| `real_negative_03_greenwood_on_chico` | `negative_unrelated_pair` | geometry_failed (5) | geometry_failed (4) | — | — |
| `real_negative_04_greenwood_on_harrishill` | `negative_unrelated_pair` | geometry_failed (4) | insufficient_matches (0) | — | — |

## 3. Detailed Algorithmic Observations

### Scale Resilience
- Under moderate scale compression (e.g. `real_chico_03_scale_08`, 0.82x zoom), **ORB inliers dropped to 33**, whereas **SIFT retained 353 inliers**.
- This highlights SIFT's scale-space DoG (Difference of Gaussians) octave pyramid advantage over ORB's fixed-level FAST octaves.

### False Acceptance Rejection
- Both ORB and SIFT correctly achieved a **0.0% false acceptance rate** on all 4 cross-scene negative pairs.
- Ratio-test filtering successfully pruned cross-scene candidates, and RANSAC rejected any residual spurious matches (maximum residual inliers observed was 5, well below the acceptance threshold of 10).

### Runtime & Resource Profile
- ORB averaged **158.5 ms** per pair on CPU, making it suitable for high-throughput or low-power embedded edge computation.
- SIFT averaged **232.0 ms** per pair on CPU, offering higher geometric fidelity and inlier density at modest computational cost.

## 4. Academic Limitations & Ethics Notice

- **Planar-Scene Assumption:** Homography assumes scenes are approximately planar relative to flight altitude. For low-altitude oblique imagery or rugged terrain, essential/fundamental matrix estimation or digital surface model (DSM) rectification is required.
- **Pixel Accuracy != Navigation Accuracy:** Reprojection and corner transfer errors measure 2D pixel alignment against the reference raster image. Converting this to geographic position (latitude/longitude/altitude) requires verified georeferencing metadata, interior/exterior camera orientation parameters, and geodetic coordinate transformations.
