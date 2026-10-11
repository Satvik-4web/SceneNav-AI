# SceneNav AI — Evaluation Report: `real_world_pairs.json` (ORB)

**Date/Time:** 2026-10-11 13:22:17 UTC  
**Algorithm:** ORB + Lowe Ratio Test + RANSAC Homography  
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
| **Mean Inlier Count** | 430.2 | Average RANSAC geometric inliers |
| **Mean Inlier Ratio** | 97.0% | Inliers / filtered matches |
| **Mean Reprojection Error** | 0.92 px | Inlier fit error |
| **Mean Corner Transfer Error** | 5.33 px | Evaluated strictly on 8 ground-truth pairs |
| **Mean Processing Time** | 138.8 ms | Per image pair |
| **Total Wall Time** | 2.34 s | Batch evaluation runtime |

## Detailed Per-Pair Results

| Pair ID | Status | GT Type | Negative? | Inliers | Inlier Ratio | Reproj Err (px) | Corner Err (px) | Time (s) |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `real_greenwood_01_crop` | `success` | `planar_homography_gt` | No | 842 | 98.5% | 0.98 | 1.23 | 0.304 |
| `real_greenwood_02_rot_scale` | `success` | `planar_homography_gt` | No | 531 | 98.9% | 0.99 | 0.52 | 0.132 |
| `real_greenwood_03_photometric` | `success` | `planar_homography_gt` | No | 704 | 98.6% | 0.96 | 1.26 | 0.126 |
| `real_greenwood_04_uncalibrated_obs` | `success` | `unavailable` | No | 768 | 98.1% | 1.01 | — | 0.136 |
| `real_chico_01_crop` | `success` | `planar_homography_gt` | No | 481 | 96.2% | 1.13 | 4.26 | 0.163 |
| `real_chico_02_rot_10` | `success` | `planar_homography_gt` | No | 129 | 94.2% | 0.89 | 2.07 | 0.145 |
| `real_chico_03_scale_08` | `success` | `planar_homography_gt` | No | 33 | 89.2% | 0.83 | 32.63 | 0.134 |
| `real_chico_04_uncalibrated_obs` | `success` | `unavailable` | No | 196 | 94.7% | 1.10 | — | 0.145 |
| `real_harrishill_01_crop` | `success` | `planar_homography_gt` | No | 533 | 99.8% | 0.56 | 0.12 | 0.209 |
| `real_harrishill_02_rot_14` | `success` | `planar_homography_gt` | No | 168 | 98.8% | 0.78 | 0.52 | 0.193 |
| `real_harrishill_03_uncalibrated_obs` | `success` | `unavailable` | No | 347 | 99.7% | 0.90 | — | 0.195 |
| `real_negative_01_chico_on_greenwood` | `insufficient_matches` | `negative_unrelated_pair` | Yes | 0 | 0.0% | — | — | 0.051 |
| `real_negative_02_harrishill_on_greenwood` | `insufficient_matches` | `negative_unrelated_pair` | Yes | 0 | 0.0% | — | — | 0.032 |
| `real_negative_03_greenwood_on_chico` | `geometry_failed` | `negative_unrelated_pair` | Yes | 5 | 38.5% | — | — | 0.055 |
| `real_negative_04_greenwood_on_harrishill` | `geometry_failed` | `negative_unrelated_pair` | Yes | 4 | 30.8% | — | — | 0.061 |

## Academic Integrity & Limitations

1. **Planar-Scene Assumption:** Homography estimation models planar surfaces or purely rotational camera motion. Complex 3D elevation variation requires epipolar geometry or orthorectification.
2. **Pixel-Space vs Geographic Accuracy:** Corner transfer error measures pixel registration quality against the reference image. It does **not** equal GPS/GNSS navigation error without rigorous georeferencing metadata (GCPs / sensor pose).
3. **Reproducibility:** All imagery is sourced from US Government public domain repositories (USGS / NAIP, 17 U.S.C. § 105). Checksums and scripts are checked into the repository.
