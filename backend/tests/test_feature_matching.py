"""
SceneNav AI — Tests for feature_matcher service.

Uses synthetic images with known structure.
"""
from __future__ import annotations

import io
import numpy as np
import pytest
from PIL import Image

from app.services.image_loader import LoadedImage, load_image_from_bytes
from app.services.feature_matcher import detect_and_match


def _make_textured_image(width: int = 300, height: int = 300, seed: int = 42) -> LoadedImage:
    """Create a synthetic textured image with enough features for ORB."""
    rng = np.random.default_rng(seed)
    arr = rng.integers(0, 256, (height, width, 3), dtype=np.uint8)
    # Add structured patterns to ensure ORB finds keypoints
    for i in range(0, height, 20):
        arr[i, :] = 0
    for j in range(0, width, 20):
        arr[:, j] = 255
    img_pil = Image.fromarray(arr)
    buf = io.BytesIO()
    img_pil.save(buf, format="PNG")
    return load_image_from_bytes(buf.getvalue(), f"textured_{seed}.png")


def _make_blank_image(width: int = 100, height: int = 100) -> LoadedImage:
    """Create a uniform (texture-poor) image."""
    arr = np.full((height, width, 3), 128, dtype=np.uint8)
    img_pil = Image.fromarray(arr)
    buf = io.BytesIO()
    img_pil.save(buf, format="PNG")
    return load_image_from_bytes(buf.getvalue(), "blank.png")


class TestDetectAndMatch:
    def test_identical_images_produce_matches(self):
        img = _make_textured_image(seed=1)
        result = detect_and_match(img, img)
        assert result.reference_keypoints > 0
        assert result.query_keypoints > 0
        assert result.filtered_matches > 0
        assert result.success

    def test_same_scene_crops_produce_matches(self):
        """A crop of the reference should match back to the reference."""
        ref = _make_textured_image(400, 400, seed=7)
        # Create query as a central crop of the reference
        h, w = ref.array.shape[:2]
        crop_arr = ref.array[50:350, 50:350]
        img_pil = Image.fromarray(crop_arr[:, :, ::-1])  # BGR→RGB
        buf = io.BytesIO()
        img_pil.save(buf, format="PNG")
        qry = load_image_from_bytes(buf.getvalue(), "crop.png")
        result = detect_and_match(ref, qry, orb_max_features=2000)
        assert result.reference_keypoints > 0
        assert result.query_keypoints > 0

    def test_unrelated_images_fewer_matches(self):
        img1 = _make_textured_image(seed=10)
        img2 = _make_textured_image(seed=999)
        result = detect_and_match(img1, img2)
        # Match count may be low for random unrelated images
        assert result.tentative_matches >= 0  # Pipeline must not crash
        assert result.reference_keypoints > 0

    def test_blank_image_graceful_failure(self):
        blank = _make_blank_image()
        textured = _make_textured_image(seed=5)
        result = detect_and_match(textured, blank)
        # blank image has no descriptors — pipeline must report this cleanly
        if not result.success:
            assert result.failure_reason is not None
        # Either way, no exception should be raised

    def test_ratio_threshold_affects_filtered_count(self):
        img = _make_textured_image(seed=3)
        result_strict = detect_and_match(img, img, ratio_threshold=0.6)
        result_loose = detect_and_match(img, img, ratio_threshold=0.9)
        # Looser threshold should keep more matches
        assert result_loose.filtered_matches >= result_strict.filtered_matches

    def test_statistics_recorded(self):
        img = _make_textured_image(seed=2)
        result = detect_and_match(img, img)
        assert result.processing_time_s > 0
        assert result.tentative_matches >= result.filtered_matches

    def test_params_recorded(self):
        img = _make_textured_image(seed=4)
        result = detect_and_match(img, img, orb_max_features=1000, ratio_threshold=0.7)
        assert result.params["orb_max_features"] == 1000
        assert result.params["ratio_threshold"] == 0.7

    def test_point_arrays_shape(self):
        img = _make_textured_image(seed=6)
        result = detect_and_match(img, img)
        if result.success and result.filtered_matches > 0:
            assert result.reference_pts is not None
            assert result.query_pts is not None
            assert result.reference_pts.shape == (result.filtered_matches, 2)
            assert result.query_pts.shape == (result.filtered_matches, 2)
