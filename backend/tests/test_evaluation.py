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
