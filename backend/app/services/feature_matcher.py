"""
SceneNav AI — Feature Matching Service

Algorithm: ORB (Oriented FAST and Rotated BRIEF)
Matcher:   BFMatcher with Hamming distance
Filtering: Lowe's ratio test on k-NN matches (k=2)

Why ORB?
  ORB is a patent-free, CPU-efficient detector+descriptor pair that performs
  well on textured scenes.  It is deliberately chosen as the baseline because
  it ships with OpenCV, requires no learned weights, and runs offline.

Limitations (see docs/ALGORITHMS.md):
  - ORB degrades on texture-poor images, extreme scale changes (>~4x),
    and large viewpoint/perspective differences.
  - The ratio test reduces false matches but does not eliminate them.
  - Match count alone does NOT prove geographic co-location.
"""
from __future__ import annotations

import logging
import time
from dataclasses import dataclass, field
from typing import Optional

import cv2
import numpy as np

from app.services.image_loader import LoadedImage, to_grayscale

logger = logging.getLogger(__name__)


@dataclass
class MatchingResult:
    """All outputs of the feature-matching stage."""
    # Statistics
    reference_keypoints: int = 0
    query_keypoints: int = 0
    tentative_matches: int = 0
    filtered_matches: int = 0
    processing_time_s: float = 0.0

    # Corresponding point arrays (Nx2 float32) for verified matches
    reference_pts: Optional[np.ndarray] = None  # shape (N,2)
    query_pts: Optional[np.ndarray] = None       # shape (N,2)

    # Raw keypoint objects (retained for visualisation)
    reference_keypoints_list: list = field(default_factory=list)
    query_keypoints_list: list = field(default_factory=list)

    # All tentative DMatch objects (for visualisation)
    all_matches: list = field(default_factory=list)
    # Filtered DMatch objects
    good_matches: list = field(default_factory=list)

    # Failure
    success: bool = True
    failure_reason: Optional[str] = None
    warnings: list[str] = field(default_factory=list)

    # Parameters record
    params: dict = field(default_factory=dict)


def detect_and_match(
    reference: LoadedImage,
    query: LoadedImage,
    *,
    orb_max_features: int = 5000,
    ratio_threshold: float = 0.75,
    mutual_consistency: bool = False,
) -> MatchingResult:
    """
    Detect ORB keypoints in both images and return filtered matches.

    Args:
        reference:          Reference (map/database) image.
        query:              Query (scene to locate) image.
        orb_max_features:   Maximum ORB keypoints per image.
        ratio_threshold:    Lowe's ratio-test threshold.
        mutual_consistency: If True, keep only matches that agree in both directions.

    Returns:
        MatchingResult with statistics and matched point arrays.
    """
    t0 = time.perf_counter()
    result = MatchingResult(
        params={
            "orb_max_features": orb_max_features,
            "ratio_threshold": ratio_threshold,
            "mutual_consistency": mutual_consistency,
        }
    )

    # Convert to grayscale for detection
    gray_ref = to_grayscale(reference)
    gray_qry = to_grayscale(query)

    # ORB detector + descriptor
    orb = cv2.ORB_create(nfeatures=orb_max_features)

    kp_ref, des_ref = orb.detectAndCompute(gray_ref, None)
    kp_qry, des_qry = orb.detectAndCompute(gray_qry, None)

    result.reference_keypoints = len(kp_ref) if kp_ref else 0
    result.query_keypoints = len(kp_qry) if kp_qry else 0
    result.reference_keypoints_list = list(kp_ref) if kp_ref else []
    result.query_keypoints_list = list(kp_qry) if kp_qry else []

    logger.info(
        "ORB keypoints — reference: %d, query: %d",
        result.reference_keypoints, result.query_keypoints
    )

    # Guard: no descriptors
    if des_ref is None or len(des_ref) == 0:
        result.success = False
        result.failure_reason = (
            "No descriptors extracted from the reference image. "
            "The image may be too small, texture-poor, or uniformly coloured."
        )
        result.processing_time_s = time.perf_counter() - t0
        return result

    if des_qry is None or len(des_qry) == 0:
        result.success = False
        result.failure_reason = (
            "No descriptors extracted from the query image. "
            "The image may be too small, texture-poor, or uniformly coloured."
        )
        result.processing_time_s = time.perf_counter() - t0
        return result

    # Warn on sparse keypoints (not a hard failure)
    if result.reference_keypoints < 50:
        result.warnings.append(
            f"Reference image has only {result.reference_keypoints} keypoints — "
            "matching reliability will be low."
        )
    if result.query_keypoints < 50:
        result.warnings.append(
            f"Query image has only {result.query_keypoints} keypoints — "
            "matching reliability will be low."
        )

    # BFMatcher with Hamming distance (appropriate for binary ORB descriptors)
    bf = cv2.BFMatcher(cv2.NORM_HAMMING, crossCheck=False)

    # k-NN matching with k=2 for ratio test
    # We need at least 2 training descriptors for knnMatch(k=2)
    if len(des_ref) < 2:
        result.success = False
        result.failure_reason = (
            "Too few reference descriptors for ratio-test matching (need ≥ 2)."
        )
        result.processing_time_s = time.perf_counter() - t0
        return result

    raw_matches = bf.knnMatch(des_qry, des_ref, k=2)
    result.tentative_matches = len(raw_matches)

    # Lowe's ratio test
    # Reference: D.G. Lowe, "Distinctive Image Features from Scale-Invariant
    # Keypoints," IJCV 2004.
    good = []
    for match_pair in raw_matches:
        if len(match_pair) < 2:
            continue
        m, n = match_pair
        if m.distance < ratio_threshold * n.distance:
            good.append(m)

    # Optional mutual consistency (cross-check) filtering
    if mutual_consistency and len(good) > 0 and len(des_qry) > 0:
        back_matches = bf.match(des_ref, des_qry)
        back_map = {bm.queryIdx: bm.trainIdx for bm in back_matches}
        consistent = [m for m in good if back_map.get(m.trainIdx) == m.queryIdx]
        logger.info(
            "Mutual consistency: %d matches → %d consistent matches",
            len(good), len(consistent)
        )
        good = consistent

    result.good_matches = good
    result.filtered_matches = len(good)
    result.all_matches = [pair[0] for pair in raw_matches if len(pair) >= 1]

    logger.info(
        "Ratio test (threshold=%.2f): %d tentative → %d filtered",
        ratio_threshold, result.tentative_matches, result.filtered_matches
    )

    if result.filtered_matches == 0:
        result.success = False
        result.failure_reason = (
            "No matches survived the ratio test. "
            "The images may show different scenes, or image quality may be insufficient."
        )
        result.processing_time_s = time.perf_counter() - t0
        return result

    # Extract matched point coordinates
    # Convention: query_pts[i] ↔ reference_pts[i]
    query_pts = np.float32(
        [kp_qry[m.queryIdx].pt for m in good]
    ).reshape(-1, 1, 2)
    ref_pts = np.float32(
        [kp_ref[m.trainIdx].pt for m in good]
    ).reshape(-1, 1, 2)

    result.reference_pts = ref_pts.reshape(-1, 2)
    result.query_pts = query_pts.reshape(-1, 2)
    result.processing_time_s = time.perf_counter() - t0

    return result
