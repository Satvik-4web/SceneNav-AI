"""
SceneNav AI — Evaluation Metrics Service

Computes image-matching metrics from result collections.
All metrics are defined in docs/ALGORITHMS.md.

This module does NOT compute geographic localization accuracy unless valid
georeferencing data is provided — which it currently is not for the
synthetic test pairs.
"""
from __future__ import annotations

import csv
import json
import logging
from dataclasses import dataclass, field
from pathlib import Path
from typing import Optional

import numpy as np

logger = logging.getLogger(__name__)


@dataclass
class PairGroundTruth:
    """
    Ground truth for a single image pair (synthetic transformations only).

    corner_displacement_px:
        For synthetically transformed pairs, the expected displacement of
        each projected corner from the true position (pixels).  Only
        meaningful when the transformation parameters are known exactly.

    This is a pixel-level geometric accuracy metric for synthetic test
    pairs.  It does NOT represent real-world geographic localization error.
    """
    pair_id: str
    expected_homography: Optional[list[list[float]]] = None  # 3×3
    note: str = "Synthetic test pair — pixel metric only, not geographic accuracy."


@dataclass
class SinglePairMetrics:
    """All metrics for one reference/query pair."""
    pair_id: str
    status: str
    reference_keypoints: int = 0
    query_keypoints: int = 0
    tentative_matches: int = 0
    filtered_matches: int = 0
    geometric_inliers: int = 0
    inlier_ratio: float = 0.0
    mean_reproj_error_px: Optional[float] = None
    processing_time_s: float = 0.0
    corner_error_px: Optional[float] = None  # Only when valid ground-truth homography exists
    ground_truth_type: str = "unknown"
    is_negative: bool = False
    false_acceptance: bool = False
    failure_reason: Optional[str] = None
    warnings: list[str] = field(default_factory=list)


@dataclass
class EvaluationSummary:
    """Aggregate metrics over a set of pairs."""
    total_pairs: int = 0
    successful_pairs: int = 0
    failed_pairs: int = 0
    positive_pairs: int = 0
    negative_pairs: int = 0
    false_acceptances: int = 0
    false_acceptance_rate: float = 0.0
    true_negative_rate: float = 1.0
    pairs_with_gt: int = 0
    failure_breakdown: dict[str, int] = field(default_factory=dict)

    mean_keypoints_ref: float = 0.0
    mean_keypoints_qry: float = 0.0
    mean_filtered_matches: float = 0.0
    mean_inliers: float = 0.0
    mean_inlier_ratio: float = 0.0
    mean_reproj_error_px: Optional[float] = None
    mean_corner_error_px: Optional[float] = None
    mean_processing_time_s: float = 0.0

    success_rate: float = 0.0
    per_pair: list[SinglePairMetrics] = field(default_factory=list)


def compute_corner_error(
    estimated_h: np.ndarray,
    true_h: np.ndarray,
    query_width: int,
    query_height: int,
) -> float:
    """
    Compute the mean corner transfer error between two homographies.

    Projects the four corners of the query image using both homographies
    and returns the mean Euclidean distance (pixels) between corresponding
    projected points.

    This metric is only valid for pairs where the true homography is known exactly.
    """
    qw, qh = query_width - 1, query_height - 1
    corners = np.float32([
        [0, 0], [qw, 0], [qw, qh], [0, qh]
    ]).reshape(-1, 1, 2)

    import cv2
    proj_est = cv2.perspectiveTransform(corners, estimated_h).reshape(-1, 2)
    proj_true = cv2.perspectiveTransform(corners, true_h).reshape(-1, 2)

    errors = np.linalg.norm(proj_est - proj_true, axis=1)
    return float(np.mean(errors))


def aggregate_metrics(pair_metrics: list[SinglePairMetrics]) -> EvaluationSummary:
    """Compute summary statistics over a list of pair results."""
    summary = EvaluationSummary(
        total_pairs=len(pair_metrics),
        per_pair=pair_metrics,
    )

    if not pair_metrics:
        return summary

    pos_pairs = [p for p in pair_metrics if not p.is_negative]
    neg_pairs = [p for p in pair_metrics if p.is_negative]

    summary.positive_pairs = len(pos_pairs)
    summary.negative_pairs = len(neg_pairs)

    # General success / failure breakdown across all pairs
    successes = [p for p in pair_metrics if p.status == "success"]
    failures = [p for p in pair_metrics if p.status != "success"]

    summary.successful_pairs = len(successes)
    summary.failed_pairs = len(failures)
    summary.success_rate = len(successes) / len(pair_metrics)

    # Negative pair metrics (False Acceptance Analysis)
    if neg_pairs:
        false_acceptances = [p for p in neg_pairs if p.status == "success"]
        summary.false_acceptances = len(false_acceptances)
        summary.false_acceptance_rate = len(false_acceptances) / len(neg_pairs)
        summary.true_negative_rate = (len(neg_pairs) - len(false_acceptances)) / len(neg_pairs)
    else:
        summary.false_acceptances = 0
        summary.false_acceptance_rate = 0.0
        summary.true_negative_rate = 1.0

    # Failure breakdown
    for pm in failures:
        key = pm.status
        summary.failure_breakdown[key] = summary.failure_breakdown.get(key, 0) + 1

    # Compute feature extraction and timing averages over ALL pairs
    summary.mean_keypoints_ref = float(np.mean([p.reference_keypoints for p in pair_metrics]))
    summary.mean_keypoints_qry = float(np.mean([p.query_keypoints for p in pair_metrics]))
    summary.mean_filtered_matches = float(np.mean([p.filtered_matches for p in pair_metrics]))
    summary.mean_processing_time_s = float(np.mean([p.processing_time_s for p in pair_metrics]))

    # For geometric registration metrics (inliers, reprojection error), evaluate over positive successes
    pos_successes = [p for p in pos_pairs if p.status == "success"]
    if pos_successes:
        summary.mean_inliers = float(np.mean([p.geometric_inliers for p in pos_successes]))
        summary.mean_inlier_ratio = float(np.mean([p.inlier_ratio for p in pos_successes]))

        reproj_errors = [p.mean_reproj_error_px for p in pos_successes if p.mean_reproj_error_px is not None]
        if reproj_errors:
            summary.mean_reproj_error_px = float(np.mean(reproj_errors))

    # Corner transfer error: ONLY for positive pairs where valid ground truth homography actually exists
    gt_pairs = [p for p in pair_metrics if p.corner_error_px is not None]
    summary.pairs_with_gt = len(gt_pairs)
    if gt_pairs:
        summary.mean_corner_error_px = float(np.mean([p.corner_error_px for p in gt_pairs]))
    else:
        summary.mean_corner_error_px = None

    return summary


def save_results_csv(pairs: list[SinglePairMetrics], output_path: Path) -> None:
    """Write per-pair metrics to a CSV file."""
    if not pairs:
        return
    fieldnames = [
        "pair_id", "status", "ground_truth_type", "is_negative", "false_acceptance",
        "reference_keypoints", "query_keypoints", "tentative_matches", "filtered_matches",
        "geometric_inliers", "inlier_ratio", "mean_reproj_error_px", "corner_error_px",
        "processing_time_s", "failure_reason",
    ]
    with open(output_path, "w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        writer.writeheader()
        for p in pairs:
            writer.writerow({
                "pair_id": p.pair_id,
                "status": p.status,
                "ground_truth_type": p.ground_truth_type,
                "is_negative": p.is_negative,
                "false_acceptance": p.false_acceptance,
                "reference_keypoints": p.reference_keypoints,
                "query_keypoints": p.query_keypoints,
                "tentative_matches": p.tentative_matches,
                "filtered_matches": p.filtered_matches,
                "geometric_inliers": p.geometric_inliers,
                "inlier_ratio": f"{p.inlier_ratio:.4f}",
                "mean_reproj_error_px": f"{p.mean_reproj_error_px:.3f}" if p.mean_reproj_error_px is not None else "",
                "corner_error_px": f"{p.corner_error_px:.3f}" if p.corner_error_px is not None else "",
                "processing_time_s": f"{p.processing_time_s:.4f}",
                "failure_reason": p.failure_reason or "",
            })
    logger.info("Saved CSV to %s", output_path)


def save_results_json(summary: EvaluationSummary, output_path: Path) -> None:
    """Write evaluation summary to a JSON file."""
    import dataclasses
    data = dataclasses.asdict(summary)
    with open(output_path, "w", encoding="utf-8") as f:
        json.dump(data, f, indent=2, default=str)
    logger.info("Saved JSON to %s", output_path)

