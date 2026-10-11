# SceneNav AI — Evaluation Report: `real_world_pairs.json` (SIFT)

**Date/Time:** 2026-10-11 13:22:26 UTC  
**Algorithm:** SIFT + Lowe Ratio Test + RANSAC Homography  
**Manifest:** `real_world_pairs.json`  
**Description:** SceneNav AI Real-World Aerial Benchmark composed of authentic USGS/USDA NAIP public domain aerial orthophotos. Distinguishes verified planar ground truth, uncalibrated real observations with unavailable ground truth, and unrelated cross-scene negative pairs.  

## Executive Summary

| Metric | Value | Note |
| :--- | :--- | :--- |
| **Total Evaluated Pairs** | 15 | Positive + Negative test cases |
| **Positive Pairs** | 11 | Genuine co-located imagery pairs |
| **Negative Pairs** | 4 | Unrelated cross-scene negative pairs |
| **Overall Success Count** | 11/15 (73.3%) | RANSAC verified matches |
| **False Acceptances (Negatives)** | 0/4 (0.0%) | Lower is better (ideal: 0.0%) |
| **True Negative Rate** | 100.0% | Rejection of unrelated pairs |
| **Mean Inlier Count** | 687.4 | Average RANSAC geometric inliers |
| **Mean Inlier Ratio** | 99.4% | Inliers / filtered matches |
| **Mean Reprojection Error** | 0.11 px | Inlier fit error |
| **Mean Corner Transfer Error** | 0.05 px | Evaluated strictly on 8 ground-truth pairs |
| **Mean Processing Time** | 190.8 ms | Per image pair |
| **Total Wall Time** | 3.14 s | Batch evaluation runtime |

## Detailed Per-Pair Results

| Pair ID | Status | GT Type | Negative? | Inliers | Inlier Ratio | Reproj Err (px) | Corner Err (px) | Time (s) |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `real_greenwood_01_crop` | `success` | `planar_homography_gt` | No | 1164 | 100.0% | 0.01 | 0.01 | 0.208 |
| `real_greenwood_02_rot_scale` | `success` | `planar_homography_gt` | No | 683 | 99.3% | 0.13 | 0.05 | 0.168 |
| `real_greenwood_03_photometric` | `success` | `planar_homography_gt` | No | 666 | 99.4% | 0.19 | 0.05 | 0.166 |
| `real_greenwood_04_uncalibrated_obs` | `success` | `unavailable` | No | 878 | 99.5% | 0.14 | — | 0.180 |
| `real_chico_01_crop` | `success` | `planar_homography_gt` | No | 1246 | 100.0% | 0.01 | 0.00 | 0.219 |
| `real_chico_02_rot_10` | `success` | `planar_homography_gt` | No | 527 | 99.4% | 0.16 | 0.09 | 0.208 |
| `real_chico_03_scale_08` | `success` | `planar_homography_gt` | No | 353 | 98.1% | 0.15 | 0.07 | 0.213 |
| `real_chico_04_uncalibrated_obs` | `success` | `unavailable` | No | 598 | 98.8% | 0.14 | — | 0.207 |
| `real_harrishill_01_crop` | `success` | `planar_homography_gt` | No | 831 | 100.0% | 0.01 | 0.01 | 0.303 |
| `real_harrishill_02_rot_14` | `success` | `planar_homography_gt` | No | 252 | 99.6% | 0.11 | 0.10 | 0.284 |
| `real_harrishill_03_uncalibrated_obs` | `success` | `unavailable` | No | 363 | 98.9% | 0.12 | — | 0.283 |
| `real_negative_01_chico_on_greenwood` | `insufficient_matches` | `negative_unrelated_pair` | Yes | 0 | 0.0% | — | — | 0.090 |
| `real_negative_02_harrishill_on_greenwood` | `insufficient_matches` | `negative_unrelated_pair` | Yes | 0 | 0.0% | — | — | 0.090 |
| `real_negative_03_greenwood_on_chico` | `geometry_failed` | `negative_unrelated_pair` | Yes | 4 | 50.0% | — | — | 0.105 |
| `real_negative_04_greenwood_on_harrishill` | `insufficient_matches` | `negative_unrelated_pair` | Yes | 0 | 0.0% | — | — | 0.137 |

## Academic Integrity & Limitations

1. **Planar-Scene Assumption:** Homography estimation models planar surfaces or purely rotational camera motion. Complex 3D elevation variation requires epipolar geometry or orthorectification.
2. **Pixel-Space vs Geographic Accuracy:** Corner transfer error measures pixel registration quality against the reference image. It does **not** equal GPS/GNSS navigation error without rigorous georeferencing metadata (GCPs / sensor pose).
3. **Reproducibility:** All imagery is sourced from US Government public domain repositories (USGS / NAIP, 17 U.S.C. § 105). Checksums and scripts are checked into the repository.
