"""
SceneNav AI — Tests for geometric_verification service.

Uses synthetic homographies with known ground truth.
Coordinate conventions are tested explicitly.
"""
from __future__ import annotations

import numpy as np
import pytest
import cv2

from app.services.geometric_verification import (
    verify_geometry,
    _validate_homography,
    _compute_reprojection_error,
    RANSAC_MIN_POINTS,
)


def _make_synthetic_homography(
    tx: float = 20.0,
    ty: float = 15.0,
    scale: float = 1.0,
    angle_deg: float = 0.0,
) -> np.ndarray:
    """Create a simple similarity transform as a 3×3 homography."""
    angle_rad = np.deg2rad(angle_deg)
    cos_a, sin_a = np.cos(angle_rad), np.sin(angle_rad)
    H = np.array([
        [scale * cos_a, -scale * sin_a, tx],
        [scale * sin_a,  scale * cos_a, ty],
        [0,              0,              1 ],
    ], dtype=np.float64)
    return H


def _make_synthetic_correspondences(
    H: np.ndarray,
    n: int = 100,
    noise_px: float = 0.5,
    seed: int = 42,
) -> tuple[np.ndarray, np.ndarray]:
    """
    Generate synthetic point correspondences from a known homography H.
    Adds Gaussian noise to simulate real detector responses.
    Convention: H maps query_pts → ref_pts.
    """
    rng = np.random.default_rng(seed)
    query_pts = rng.uniform(10, 490, (n, 2)).astype(np.float32)
    src = query_pts.reshape(-1, 1, 2)
    ref_pts = cv2.perspectiveTransform(src, H).reshape(-1, 2)
    noise = rng.normal(0, noise_px, ref_pts.shape).astype(np.float32)
    ref_pts += noise
    return query_pts, ref_pts


class TestVerifyGeometry:
    def test_clean_correspondences_succeed(self):
        H_true = _make_synthetic_homography(tx=30, ty=20)
        q_pts, r_pts = _make_synthetic_correspondences(H_true, n=80, noise_px=0.3)
        result = verify_geometry(q_pts, r_pts, ransac_reproj_threshold=4.0, min_inliers=10)
        assert result.success, f"Expected success, got: {result.failure_reason}"
        assert result.inlier_count >= 10
        assert result.inlier_ratio > 0.5

    def test_too_few_points_fails(self):
        q = np.float32([[0, 0], [1, 0], [0, 1]])  # 3 points < RANSAC_MIN_POINTS
        r = np.float32([[5, 5], [6, 5], [5, 6]])
        result = verify_geometry(q, r)
        assert not result.success
        assert "Insufficient" in result.failure_reason

    def test_reprojection_error_computed(self):
        H_true = _make_synthetic_homography(tx=10, ty=10)
        q_pts, r_pts = _make_synthetic_correspondences(H_true, n=60, noise_px=0.1)
        result = verify_geometry(q_pts, r_pts, ransac_reproj_threshold=3.0, min_inliers=10)
        if result.success:
            assert result.mean_reproj_error is not None
            assert result.mean_reproj_error >= 0
            assert result.median_reproj_error is not None
            assert result.max_reproj_error is not None

    def test_inlier_ratio_below_min_fails(self):
        H_true = _make_synthetic_homography()
        q_pts, r_pts = _make_synthetic_correspondences(H_true, n=20, noise_px=0.1)
        # Require 100 inliers but only have 20 points
        result = verify_geometry(q_pts, r_pts, min_inliers=100)
        assert not result.success

    def test_random_points_geometry_fails_or_low_inliers(self):
        """Random unstructured points should not produce a reliable homography."""
        rng = np.random.default_rng(123)
        q_pts = rng.uniform(0, 500, (50, 2)).astype(np.float32)
        r_pts = rng.uniform(0, 500, (50, 2)).astype(np.float32)
        result = verify_geometry(q_pts, r_pts, ransac_reproj_threshold=4.0, min_inliers=20)
        # With random points, geometry should either fail or produce very few inliers
        if result.success:
            assert result.inlier_ratio < 0.5

    def test_coordinate_convention(self):
        """
        H must map query coordinates to reference coordinates.
        Verify by projecting a known query point and checking proximity
        to the corresponding reference point.
        """
        H_true = _make_synthetic_homography(tx=50, ty=50)
        q_pts, r_pts = _make_synthetic_correspondences(H_true, n=80, noise_px=0.2)
        result = verify_geometry(q_pts, r_pts, ransac_reproj_threshold=5.0, min_inliers=10)
        if result.success and result.homography is not None:
            # Project first query point through estimated H
            test_pt = q_pts[0:1].reshape(-1, 1, 2).astype(np.float32)
            projected = cv2.perspectiveTransform(test_pt, result.homography).reshape(2)
            # The projected point should be close to the known reference point
            error = np.linalg.norm(projected - r_pts[0])
            assert error < 10.0, f"Coordinate convention violation: error={error:.2f}px"


class TestValidateHomography:
    def test_identity_is_valid(self):
        H = np.eye(3, dtype=np.float64)
        assert _validate_homography(H) is None

    def test_nan_detected(self):
        H = np.eye(3, dtype=np.float64)
        H[0, 0] = np.nan
        assert _validate_homography(H) is not None

    def test_inf_detected(self):
        H = np.eye(3, dtype=np.float64)
        H[1, 1] = np.inf
        assert _validate_homography(H) is not None

    def test_singular_detected(self):
        H = np.zeros((3, 3), dtype=np.float64)
        H[2, 2] = 1.0
        assert _validate_homography(H) is not None

    def test_reflection_detected(self):
        H = np.array([[-1, 0, 100], [0, 1, 0], [0, 0, 1]], dtype=np.float64)
        msg = _validate_homography(H)
        # det of 2x2 upper-left is -1 → reflection
        assert msg is not None

    def test_extreme_scale_detected(self):
        H = np.array([[200, 0, 0], [0, 200, 0], [0, 0, 1]], dtype=np.float64)
        msg = _validate_homography(H)
        assert msg is not None


class TestReprojectionError:
    def test_exact_homography_zero_error(self):
        H = _make_synthetic_homography(tx=10, ty=5)
        q_pts = np.float32([[100, 100], [200, 100], [100, 200]])
        src = q_pts.reshape(-1, 1, 2)
        r_pts = cv2.perspectiveTransform(src, H).reshape(-1, 2)
        stats = _compute_reprojection_error(q_pts, r_pts, H)
        assert stats["mean"] < 0.01
        assert stats["max"] < 0.01

    def test_perspective_homography_valid(self):
        """A valid perspective camera view with non-zero H[2,0] and H[2,1] must validate."""
        H = np.array([
            [0.8, 0.05, 450.0],
            [-0.04, 0.78, 850.0],
            [1.2e-5, 6.5e-6, 1.0]
        ], dtype=np.float64)
        msg = _validate_homography(H)
        assert msg is None, f"Expected valid perspective homography, got: {msg}"

    def test_reflected_homography_rejected(self):
        """Reflection across an axis reverses polygon winding order and must be rejected."""
        H = np.array([
            [-0.8, 0.05, 450.0],
            [-0.04, 0.78, 850.0],
            [1.2e-5, 6.5e-6, 1.0]
        ], dtype=np.float64)
        msg = _validate_homography(H)
        assert msg is not None
        assert "reverses polygon orientation" in msg or "reflection" in msg

    def test_insufficient_inliers_reports_inlier_count_not_determinant(self):
        """
        When RANSAC fails to find sufficient inliers, the failure reason must report
        the exact inlier count and threshold, rather than diagnosing an unconverged sample.
        """
        rng = np.random.default_rng(999)
        # Create 30 random noisy points where only 4-5 align accidentally
        q_pts = rng.uniform(0, 1000, (30, 2)).astype(np.float32)
        r_pts = rng.uniform(0, 1000, (30, 2)).astype(np.float32)

        result = verify_geometry(q_pts, r_pts, ransac_reproj_threshold=4.0, min_inliers=15)
        assert not result.success
        assert result.inlier_count < 15
        assert "Geometric verification produced only" in result.failure_reason
        assert "inliers (threshold: 15)" in result.failure_reason
