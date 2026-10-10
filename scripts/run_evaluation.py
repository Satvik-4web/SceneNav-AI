#!/usr/bin/env python3
"""
SceneNav AI — Evaluation Script

Runs the matching pipeline over a dataset manifest and reports honest,
reproducible metrics.

Usage:
    python scripts/run_evaluation.py --manifest synthetic_pairs.json
    python scripts/run_evaluation.py --manifest synthetic_pairs.json --output results/eval_run1/

Results are saved as:
    <output>/summary.json
    <output>/pairs.csv

IMPORTANT:
  - Metrics reported here are image-matching metrics on the named dataset.
  - For synthetic pairs, corner error reflects pixel-level accuracy only.
  - No geographic localization accuracy claims are made.
"""
from __future__ import annotations

import argparse
import json
import sys
import time
import uuid
from pathlib import Path

PROJECT_ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(PROJECT_ROOT))

from app.config import settings
from app.services.image_loader import load_image_from_path, ImageLoadError
from app.services.pipeline import run_matching_pipeline
from app.services.evaluation import (
    SinglePairMetrics, aggregate_metrics,
    save_results_csv, save_results_json,
    compute_corner_error,
)
from app.schemas import MatchParams

import cv2
import numpy as np


def parse_args() -> argparse.Namespace:
    p = argparse.ArgumentParser(description="SceneNav AI — Batch Evaluation")
    p.add_argument(
        "--manifest", required=True,
        help="Manifest filename in data/manifests/ (e.g. synthetic_pairs.json)"
    )
    p.add_argument(
        "--output", default=None,
        help="Output directory for results (default: results/eval_<timestamp>/)"
    )
    p.add_argument("--orb-max-features", type=int, default=5000)
    p.add_argument("--ratio-threshold", type=float, default=0.75)
    p.add_argument("--ransac-reproj-threshold", type=float, default=4.0)
    p.add_argument("--min-inliers", type=int, default=10)
    p.add_argument("--max-pairs", type=int, default=None, help="Cap number of pairs.")
    return p.parse_args()


def main() -> None:
    args = parse_args()

    manifest_path = settings.data_dir / "manifests" / args.manifest
    if not manifest_path.exists():
        print(f"ERROR: Manifest not found: {manifest_path}", file=sys.stderr)
        sys.exit(1)

    with open(manifest_path) as f:
        manifest = json.load(f)

    pairs = manifest.get("pairs", [])
    if not pairs:
        print("ERROR: Manifest contains no pairs.", file=sys.stderr)
        sys.exit(1)

    if args.max_pairs:
        pairs = pairs[:args.max_pairs]

    params = MatchParams(
        orb_max_features=args.orb_max_features,
        ratio_threshold=args.ratio_threshold,
        ransac_reproj_threshold=args.ransac_reproj_threshold,
        min_inliers=args.min_inliers,
    )

    # Output directory
    if args.output:
        out_dir = Path(args.output)
    else:
        ts = time.strftime("%Y%m%d_%H%M%S")
        out_dir = settings.results_dir / f"eval_{ts}"
    out_dir.mkdir(parents=True, exist_ok=True)

    print(f"\nSceneNav AI — Evaluation")
    print(f"Manifest : {args.manifest}")
    print(f"Pairs    : {len(pairs)}")
    print(f"Params   : {params.model_dump()}")
    print(f"Output   : {out_dir}")
    print("-" * 60)

    pair_metrics: list[SinglePairMetrics] = []
    t_eval_start = time.perf_counter()

    for i, pair in enumerate(pairs):
        pair_id = pair.get("id", f"pair_{i:04d}")
        ref_path = (settings.data_dir / pair.get("reference", "")).resolve()
        qry_path = (settings.data_dir / pair.get("query", "")).resolve()
        data_root = settings.data_dir.resolve()

        print(f"[{i+1:3d}/{len(pairs)}] {pair_id} ... ", end="", flush=True)

        # Path safety check
        if not str(ref_path).startswith(str(data_root)) or \
           not str(qry_path).startswith(str(data_root)):
            print("SKIPPED (path traversal)")
            pair_metrics.append(SinglePairMetrics(
                pair_id=pair_id,
                status="processing_error",
                failure_reason="Path traversal blocked.",
            ))
            continue

        try:
            ref_img = load_image_from_path(ref_path)
            qry_img = load_image_from_path(qry_path)
        except ImageLoadError as exc:
            print(f"LOAD ERROR: {exc}")
            pair_metrics.append(SinglePairMetrics(
                pair_id=pair_id,
                status="invalid_image",
                failure_reason=str(exc),
            ))
            continue

        job_id = str(uuid.uuid4())
        result = run_matching_pipeline(ref_img, qry_img, params, job_id=job_id)

        # Compute corner error if synthetic ground truth is available
        corner_error = None
        gt_h = pair.get("transform", {}).get("homography_3x3")
        if gt_h and result.status.value == "success" and result.homography_matrix:
            try:
                corner_error = compute_corner_error(
                    np.array(result.homography_matrix),
                    np.array(gt_h),
                    qry_img.width, qry_img.height,
                )
            except Exception:
                pass

        pm = SinglePairMetrics(
            pair_id=pair_id,
            status=result.status.value,
            reference_keypoints=result.reference_keypoints,
            query_keypoints=result.query_keypoints,
            tentative_matches=result.tentative_matches,
            filtered_matches=result.filtered_matches,
            geometric_inliers=result.geometric_inliers or 0,
            inlier_ratio=result.inlier_ratio or 0.0,
            mean_reproj_error_px=(
                result.reprojection_error.mean_px
                if result.reprojection_error else None
            ),
            corner_error_px=corner_error,
            processing_time_s=result.processing_time_s,
            failure_reason=result.failure_reason,
            warnings=result.warnings,
        )
        pair_metrics.append(pm)

        status_str = result.status.value.upper()
        inliers_str = f"inliers={result.geometric_inliers}" if result.geometric_inliers else "no-geometry"
        print(f"{status_str} ({inliers_str}, {result.processing_time_s:.2f}s)")

    total_time = time.perf_counter() - t_eval_start
    summary = aggregate_metrics(pair_metrics)

    # Save results
    save_results_json(summary, out_dir / "summary.json")
    save_results_csv(pair_metrics, out_dir / "pairs.csv")

    # Record provenance
    provenance = {
        "manifest": args.manifest,
        "manifest_description": manifest.get("description", ""),
        "geographic_content": manifest.get("geographic_content", False),
        "params": params.model_dump(),
        "software_versions": {
            "opencv": cv2.__version__,
            "numpy": np.__version__,
        },
        "total_wall_time_s": total_time,
        "important_disclaimer": (
            "Metrics in this report reflect image-matching performance on the named dataset. "
            "For synthetic pairs, corner error is a pixel-level metric only. "
            "These results do NOT constitute evidence of real-world "
            "geographic navigation accuracy."
        ),
    }
    with open(out_dir / "provenance.json", "w") as f:
        json.dump(provenance, f, indent=2)

    # Print summary
    print()
    print("=" * 60)
    print(f"EVALUATION SUMMARY — {args.manifest}")
    print("=" * 60)
    print(f"Total pairs      : {summary.total_pairs}")
    print(f"Successful        : {summary.successful_pairs}")
    print(f"Failed            : {summary.failed_pairs}")
    print(f"Success rate      : {summary.success_rate:.1%}")
    if summary.mean_inliers:
        print(f"Mean inliers      : {summary.mean_inliers:.1f}")
    if summary.mean_inlier_ratio:
        print(f"Mean inlier ratio : {summary.mean_inlier_ratio:.1%}")
    if summary.mean_reproj_error_px:
        print(f"Mean reproj error : {summary.mean_reproj_error_px:.2f} px")
    if summary.mean_corner_error_px:
        print(f"Mean corner error : {summary.mean_corner_error_px:.2f} px (synthetic GT only)")
    print(f"Mean proc. time   : {summary.mean_processing_time_s:.3f} s/pair")
    print(f"Total wall time   : {total_time:.1f} s")
    print()
    if summary.failure_breakdown:
        print("Failure breakdown:")
        for k, v in summary.failure_breakdown.items():
            print(f"  {k}: {v}")
    print()
    print(f"Results saved to: {out_dir}")
    print()
    print("DISCLAIMER: No geographic localization accuracy claims are made.")


if __name__ == "__main__":
    main()
