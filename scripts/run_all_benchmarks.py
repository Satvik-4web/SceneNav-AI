#!/usr/bin/env python3
"""
SceneNav AI — Comprehensive Benchmark & Ablation Study Runner

Runs baseline vs improved configurations across:
1. synthetic_pairs.json (ORB vs SIFT)
2. real_world_pairs.json (ORB vs SIFT)
3. georeferenced_pairs.json (Single ORB vs Multi-Scale ORB vs SIFT)

Collects metrics:
- Success rate on positive pairs (%)
- False acceptance rate on negative pairs (%)
- True negative rate (%)
- Mean feature keypoints
- Mean filtered matches
- Mean geometric inliers
- Mean inlier ratio (%)
- Mean reprojection error (px)
- Mean corner error (px / m)
- Mean processing time (s)
- Quality Assessment status breakdown (ACCEPTED / LOW_CONFIDENCE / REJECTED)
- Spatial spread scores & condition numbers
"""
from __future__ import annotations

import json
import logging
import sys
import time
from pathlib import Path

PROJECT_ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(PROJECT_ROOT))
sys.path.insert(0, str(PROJECT_ROOT / "backend"))

from app.config import settings
from app.schemas import MatchParams, MatchStatus, ReliabilityStatus
from app.services.image_loader import load_image_from_path
from app.services.pipeline import run_matching_pipeline
from app.services.evaluation import (
    SinglePairMetrics, aggregate_metrics,
    compute_corner_error, save_results_json, save_results_csv
)
from app.services.georeferencing import compute_geodesic_distance_m
import numpy as np

logging.basicConfig(level=logging.WARNING)


def run_benchmark_configuration(
    manifest_name: str,
    algorithm: str,
    multi_scale: bool = False,
    output_dir: Path = None,
) -> dict:
    manifest_path = settings.data_dir / "manifests" / manifest_name
    with open(manifest_path, encoding="utf-8") as f:
        manifest_data = json.load(f)

    pairs = manifest_data.get("pairs", [])
    params = MatchParams(
        algorithm=algorithm,
        orb_max_features=5000,
        ratio_threshold=0.75,
        ransac_reproj_threshold=4.0,
        min_inliers=10,
        multi_scale=multi_scale,
    )

    pair_metrics: list[SinglePairMetrics] = []
    qa_breakdown = {"ACCEPTED": 0, "LOW_CONFIDENCE": 0, "REJECTED": 0}
    spatial_spreads = []
    condition_numbers = []
    confidence_scores = []

    t_start = time.perf_counter()
    for pair in pairs:
        pair_id = pair.get("id", "unknown")
        is_neg = bool(
            pair.get("is_negative", False)
            or pair.get("is_negative_pair", False)
            or "negative" in pair.get("ground_truth_type", "")
            or "unrelated" in pair.get("id", "")
        )
        ref_path = settings.data_dir / pair["reference"]
        qry_path = settings.data_dir / pair["query"]

        ref_img = load_image_from_path(ref_path)
        qry_img = load_image_from_path(qry_path)

        res = run_matching_pipeline(ref_img, qry_img, params)

        # Track QA
        if res.quality_assessment:
            qa_status = res.quality_assessment.status.value
            qa_breakdown[qa_status] = qa_breakdown.get(qa_status, 0) + 1
            confidence_scores.append(res.quality_assessment.confidence_score)
            if res.quality_assessment.spatial_metrics:
                spatial_spreads.append(res.quality_assessment.spatial_metrics.spatial_spread_score)
            if res.quality_assessment.conditioning_metrics:
                condition_numbers.append(res.quality_assessment.conditioning_metrics.canonical_condition_number)

        # Compute corner transfer error if GT homography exists
        corner_err_px = None
        gt_h = pair.get("transform", {}).get("homography_3x3") if pair.get("transform") else None
        if not is_neg and gt_h and res.status == MatchStatus.SUCCESS and res.homography_matrix:
            try:
                corner_err_px = compute_corner_error(
                    np.array(res.homography_matrix),
                    np.array(gt_h),
                    qry_img.width,
                    qry_img.height,
                )
            except Exception:
                pass

        # Compute geodesic distance error if GT geographic center/footprint exists
        center_err_m = None
        corner_err_m = None
        gt_center = pair.get("ground_truth_center_wgs84")
        if (
            not is_neg
            and gt_center
            and res.status == MatchStatus.SUCCESS
            and res.geographic_footprint
            and res.geographic_footprint.center
        ):
            center_err_m = compute_geodesic_distance_m(
                res.geographic_footprint.center,
                (gt_center[0], gt_center[1]),
            )

        gt_fp = pair.get("ground_truth_footprint_geographic")
        if not is_neg and gt_fp and res.status == MatchStatus.SUCCESS and res.geographic_footprint:
            c_errs = [
                compute_geodesic_distance_m(res.geographic_footprint.top_left, (gt_fp["top_left"]["lat"], gt_fp["top_left"]["lon"])),
                compute_geodesic_distance_m(res.geographic_footprint.top_right, (gt_fp["top_right"]["lat"], gt_fp["top_right"]["lon"])),
                compute_geodesic_distance_m(res.geographic_footprint.bottom_right, (gt_fp["bottom_right"]["lat"], gt_fp["bottom_right"]["lon"])),
                compute_geodesic_distance_m(res.geographic_footprint.bottom_left, (gt_fp["bottom_left"]["lat"], gt_fp["bottom_left"]["lon"])),
            ]
            corner_err_m = float(np.mean(c_errs))

        pm = SinglePairMetrics(
            pair_id=pair_id,
            status=res.status.value,
            reference_keypoints=res.reference_keypoints,
            query_keypoints=res.query_keypoints,
            tentative_matches=res.tentative_matches,
            filtered_matches=res.filtered_matches,
            geometric_inliers=res.geometric_inliers or 0,
            inlier_ratio=res.inlier_ratio or 0.0,
            mean_reproj_error_px=(
                res.reprojection_error.mean_px
                if res.reprojection_error else None
            ),
            processing_time_s=res.processing_time_s,
            corner_error_px=corner_err_px,
            center_error_m=center_err_m,
            corner_error_m=corner_err_m,
            localization_status=res.localization_status.value,
            ground_truth_type=pair.get("ground_truth_type", "synthetic_homography"),
            is_negative=is_neg,
            false_acceptance=bool(is_neg and res.status == MatchStatus.SUCCESS),
            failure_reason=res.failure_reason,
            warnings=res.warnings,
        )
        pair_metrics.append(pm)

    summary = aggregate_metrics(pair_metrics)
    total_time = time.perf_counter() - t_start

    if output_dir:
        output_dir.mkdir(parents=True, exist_ok=True)
        save_results_json(summary, output_dir / "summary.json")
        save_results_csv(pair_metrics, output_dir / "pairs.csv")

    return {
        "manifest": manifest_name,
        "algorithm": algorithm,
        "multi_scale": multi_scale,
        "total_pairs": summary.total_pairs,
        "positive_pairs": summary.positive_pairs,
        "negative_pairs": summary.negative_pairs,
        "successful_positive_pairs": summary.successful_positive_pairs,
        "positive_success_rate": summary.positive_success_rate,
        "false_acceptances": summary.false_acceptances,
        "false_acceptance_rate": summary.false_acceptance_rate,
        "true_negative_rate": summary.true_negative_rate,
        "mean_inliers": summary.mean_inliers,
        "mean_inlier_ratio": summary.mean_inlier_ratio,
        "mean_reproj_error_px": summary.mean_reproj_error_px,
        "mean_corner_error_px": summary.mean_corner_error_px,
        "mean_center_error_m": summary.mean_center_error_m,
        "mean_corner_error_m": summary.mean_corner_error_m,
        "mean_processing_time_s": summary.mean_processing_time_s,
        "total_elapsed_time_s": total_time,
        "qa_breakdown": qa_breakdown,
        "mean_confidence_score": float(np.mean(confidence_scores)) if confidence_scores else 0.0,
        "mean_spatial_spread": float(np.mean(spatial_spreads)) if spatial_spreads else 0.0,
        "mean_canonical_condition": float(np.mean(condition_numbers)) if condition_numbers else 0.0,
        "failure_breakdown": summary.failure_breakdown,
    }


def main():
    bench_dir = settings.results_dir / "enhanced_benchmarks_20261106"
    bench_dir.mkdir(parents=True, exist_ok=True)

    experiments = [
        ("synthetic_pairs.json", "ORB", False, "synthetic_orb_single"),
        ("synthetic_pairs.json", "SIFT", False, "synthetic_sift_single"),
        ("real_world_pairs.json", "ORB", False, "real_world_orb_single"),
        ("real_world_pairs.json", "SIFT", False, "real_world_sift_single"),
        ("georeferenced_pairs.json", "ORB", False, "georef_orb_single"),
        ("georeferenced_pairs.json", "ORB", True, "georef_orb_multiscale"),
        ("georeferenced_pairs.json", "SIFT", False, "georef_sift_single"),
    ]

    all_results = []
    print("=" * 80)
    print("SCENENAV AI — ADVANCED LOCALIZATION BENCHMARK & ABLATION STUDY")
    print("=" * 80)

    for manifest, algo, multi_scale, label in experiments:
        out = bench_dir / label
        res = run_benchmark_configuration(manifest, algo, multi_scale, out)
        all_results.append(res)
        print(f"[{label.upper()}] Manifest={manifest} Algo={algo} MultiScale={multi_scale}")
        print(f"  Pos Success: {res['successful_positive_pairs']}/{res['positive_pairs']} ({res['positive_success_rate']*100:.1f}%) | "
              f"FA: {res['false_acceptances']}/{res['negative_pairs']} ({res['false_acceptance_rate']*100:.1f}%) | "
              f"TNR: {res['true_negative_rate']*100:.1f}%")
        print(f"  Inliers: {res['mean_inliers']:.1f} | Inlier Ratio: {res['mean_inlier_ratio']*100:.1f}% | "
              f"Reproj Err: {res['mean_reproj_error_px']:.2f} px")
        if res['mean_corner_error_px'] is not None:
            print(f"  Corner Error (px): {res['mean_corner_error_px']:.3f} px")
        if res['mean_center_error_m'] is not None:
            print(f"  Center Geodesic Error (m): {res['mean_center_error_m']:.3f} m | Corner Error: {res['mean_corner_error_m']:.3f} m")
        print(f"  QA Breakdown: {res['qa_breakdown']} | Mean Confidence: {res['mean_confidence_score']*100:.1f}% | "
              f"Mean Spread: {res['mean_spatial_spread']*100:.1f}% | Mean kappa(H): {res['mean_canonical_condition']:.2f}")
        print(f"  Mean Time: {res['mean_processing_time_s']*1000:.1f} ms | Total: {res['total_elapsed_time_s']:.2f} s")
        print("-" * 80)

    # Save consolidated benchmark comparison table
    comparison_file = bench_dir / "benchmark_comparison_matrix.json"
    with open(comparison_file, "w", encoding="utf-8") as f:
        json.dump(all_results, f, indent=2)

    print(f"Consolidated benchmark matrix written to: {comparison_file}")


if __name__ == "__main__":
    main()
