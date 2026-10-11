"""
SceneNav AI — Tests for evaluation service.
"""
from __future__ import annotations

import pytest
from app.services.evaluation import (
    SinglePairMetrics,
    aggregate_metrics,
    EvaluationSummary,
    compute_corner_error,
)
import numpy as np


def _make_pair(pair_id: str, status: str, **kwargs) -> SinglePairMetrics:
    defaults = dict(
        reference_keypoints=500, query_keypoints=480,
        tentative_matches=100, filtered_matches=60,
        geometric_inliers=40, inlier_ratio=0.67,
        mean_reproj_error_px=1.5, processing_time_s=0.3,
    )
    defaults.update(kwargs)
    return SinglePairMetrics(pair_id=pair_id, status=status, **defaults)


class TestAggregateMetrics:
    def test_empty_returns_zero(self):
        summary = aggregate_metrics([])
        assert summary.total_pairs == 0
        assert summary.success_rate == 0.0

    def test_all_success(self):
        pairs = [_make_pair(f"p{i}", "success") for i in range(5)]
        summary = aggregate_metrics(pairs)
        assert summary.total_pairs == 5
        assert summary.successful_pairs == 5
        assert summary.failed_pairs == 0
        assert summary.success_rate == 1.0

    def test_mixed_success_failure(self):
        pairs = [
            _make_pair("p1", "success"),
            _make_pair("p2", "geometry_failed", geometric_inliers=0),
            _make_pair("p3", "insufficient_features", reference_keypoints=0),
        ]
        summary = aggregate_metrics(pairs)
        assert summary.total_pairs == 3
        assert summary.successful_pairs == 1
        assert summary.failed_pairs == 2
        assert abs(summary.success_rate - 1/3) < 1e-6

    def test_failure_breakdown(self):
        pairs = [
            _make_pair("p1", "geometry_failed"),
            _make_pair("p2", "geometry_failed"),
            _make_pair("p3", "insufficient_features"),
        ]
        summary = aggregate_metrics(pairs)
        assert summary.failure_breakdown["geometry_failed"] == 2
        assert summary.failure_breakdown["insufficient_features"] == 1

    def test_mean_reproj_error_only_from_successes(self):
        pairs = [
            _make_pair("p1", "success", mean_reproj_error_px=2.0),
            _make_pair("p2", "geometry_failed", mean_reproj_error_px=None),
        ]
        summary = aggregate_metrics(pairs)
        assert summary.mean_reproj_error_px == pytest.approx(2.0)


class TestCornerError:
    def test_identical_homographies_zero_error(self):
        H = np.eye(3, dtype=np.float64)
        error = compute_corner_error(H, H, 640, 480)
        assert error < 1e-6

    def test_translated_homography_error(self):
        H_est = np.array([[1, 0, 10], [0, 1, 10], [0, 0, 1]], dtype=np.float64)
        H_true = np.eye(3, dtype=np.float64)
        error = compute_corner_error(H_est, H_true, 640, 480)
        # Translation of 10px in both axes → Euclidean error of ~14.14px per corner
        assert abs(error - np.sqrt(200)) < 0.1


class TestNegativePairsAndFalseAcceptance:
    def test_clean_negative_rejection(self):
        pairs = [
            _make_pair("pos1", "success", is_negative=False),
            _make_pair("pos2", "success", is_negative=False),
            _make_pair("neg1", "insufficient_matches", is_negative=True, geometric_inliers=0),
            _make_pair("neg2", "geometry_failed", is_negative=True, geometric_inliers=3),
        ]
        summary = aggregate_metrics(pairs)
        assert summary.total_pairs == 4
        assert summary.positive_pairs == 2
        assert summary.negative_pairs == 2
        assert summary.false_acceptances == 0
        assert summary.false_acceptance_rate == 0.0
        assert summary.true_negative_rate == 1.0

    def test_false_acceptance_detected(self):
        pairs = [
            _make_pair("pos1", "success", is_negative=False),
            _make_pair("neg1", "insufficient_matches", is_negative=True, geometric_inliers=0),
            # Spurious match on negative pair
            _make_pair("neg2", "success", is_negative=True, false_acceptance=True, geometric_inliers=15),
        ]
        summary = aggregate_metrics(pairs)
        assert summary.negative_pairs == 2
        assert summary.false_acceptances == 1
        assert summary.false_acceptance_rate == pytest.approx(0.5)
        assert summary.true_negative_rate == pytest.approx(0.5)


class TestUnavailableGroundTruth:
    def test_unavailable_ground_truth_does_not_fabricate_error(self):
        pairs = [
            _make_pair("p_gt", "success", corner_error_px=2.5, ground_truth_type="planar_homography_gt"),
            _make_pair("p_no_gt", "success", corner_error_px=None, ground_truth_type="unavailable"),
        ]
        summary = aggregate_metrics(pairs)
        assert summary.pairs_with_gt == 1
        # Corner error should only average over pairs where it is defined
        assert summary.mean_corner_error_px == pytest.approx(2.5)

    def test_all_unavailable_returns_none(self):
        pairs = [
            _make_pair("p_obs1", "success", corner_error_px=None, ground_truth_type="unavailable"),
            _make_pair("p_obs2", "success", corner_error_px=None, ground_truth_type="unavailable"),
        ]
        summary = aggregate_metrics(pairs)
        assert summary.pairs_with_gt == 0
        assert summary.mean_corner_error_px is None


class TestEvaluationMissingFilesAndInvalidPairs:
    def test_missing_files_recorded_as_invalid(self, tmp_path):
        from app.services.image_loader import ImageLoadError
        pairs = [
            SinglePairMetrics(
                pair_id="missing_ref",
                status="invalid_image",
                failure_reason="Image file not found: non_existent_ref.png",
                is_negative=False,
            ),
            SinglePairMetrics(
                pair_id="traversal_qry",
                status="processing_error",
                failure_reason="Path traversal blocked.",
                is_negative=False,
            ),
        ]
        summary = aggregate_metrics(pairs)
        assert summary.total_pairs == 2
        assert summary.successful_pairs == 0
        assert summary.failed_pairs == 2
        assert summary.failure_breakdown["invalid_image"] == 1
        assert summary.failure_breakdown["processing_error"] == 1


class TestEvaluationReproducibility:
    def test_reproducible_aggregation_metrics(self):
        raw_data = [
            ("p1", "success", 500, 480, 40, 0.67, 1.2, 0.5, False),
            ("p2", "success", 400, 390, 30, 0.60, 1.8, 1.1, False),
            ("neg1", "geometry_failed", 200, 180, 4, 0.05, None, None, True),
        ]

        def run_eval():
            return [
                SinglePairMetrics(
                    pair_id=d[0], status=d[1],
                    reference_keypoints=d[2], query_keypoints=d[3],
                    geometric_inliers=d[4], inlier_ratio=d[5],
                    mean_reproj_error_px=d[6], corner_error_px=d[7],
                    is_negative=d[8],
                )
                for d in raw_data
            ]

        run1 = aggregate_metrics(run_eval())
        run2 = aggregate_metrics(run_eval())

        assert run1.total_pairs == run2.total_pairs
        assert run1.successful_pairs == run2.successful_pairs
        assert run1.success_rate == run2.success_rate
        assert run1.mean_inliers == run2.mean_inliers
        assert run1.mean_reproj_error_px == run2.mean_reproj_error_px
        assert run1.mean_corner_error_px == run2.mean_corner_error_px
        assert run1.false_acceptance_rate == run2.false_acceptance_rate

