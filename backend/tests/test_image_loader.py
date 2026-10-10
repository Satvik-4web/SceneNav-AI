"""
SceneNav AI — Tests for image_loader service.

All tests use deterministic synthetic images — no internet required.
"""
from __future__ import annotations

import io
import struct

import numpy as np
import pytest
from PIL import Image

from app.services.image_loader import (
    ImageLoadError,
    load_image_from_bytes,
    load_image_from_path,
    to_grayscale,
    LoadedImage,
)


def _make_png_bytes(width: int = 100, height: int = 100, mode: str = "RGB") -> bytes:
    """Create a valid in-memory PNG image."""
    arr = np.random.randint(0, 255, (height, width, 3), dtype=np.uint8)
    img = Image.fromarray(arr, mode=mode if mode != "L" else "L")
    if mode == "L":
        arr = np.random.randint(0, 255, (height, width), dtype=np.uint8)
        img = Image.fromarray(arr, "L")
    buf = io.BytesIO()
    img.save(buf, format="PNG")
    return buf.getvalue()


def _make_jpeg_bytes(width: int = 100, height: int = 100) -> bytes:
    arr = np.random.randint(0, 255, (height, width, 3), dtype=np.uint8)
    img = Image.fromarray(arr)
    buf = io.BytesIO()
    img.save(buf, format="JPEG", quality=85)
    return buf.getvalue()


class TestLoadImageFromBytes:
    def test_valid_rgb_png(self):
        data = _make_png_bytes(200, 150)
        img = load_image_from_bytes(data, "test.png")
        assert img.width == 200
        assert img.height == 150
        assert img.channels == 3
        assert img.array.shape == (150, 200, 3)
        assert img.array.dtype == np.uint8

    def test_valid_jpeg(self):
        data = _make_jpeg_bytes(320, 240)
        img = load_image_from_bytes(data, "photo.jpg")
        assert img.width == 320
        assert img.height == 240

    def test_grayscale_converted_to_rgb_bgr(self):
        arr = np.random.randint(0, 255, (80, 80), dtype=np.uint8)
        img_pil = Image.fromarray(arr, "L")
        buf = io.BytesIO()
        img_pil.save(buf, format="PNG")
        data = buf.getvalue()
        img = load_image_from_bytes(data, "gray.png")
        # Grayscale input is converted to 3-channel BGR
        assert img.channels == 3

    def test_empty_bytes_raises(self):
        with pytest.raises(ImageLoadError, match="empty"):
            load_image_from_bytes(b"", "empty.png")

    def test_unsupported_extension_raises(self):
        data = _make_png_bytes()
        with pytest.raises(ImageLoadError, match="Unsupported file extension"):
            load_image_from_bytes(data, "image.gif")

    def test_corrupted_data_raises(self):
        with pytest.raises(ImageLoadError):
            load_image_from_bytes(b"\x89PNG\r\n\x1a\nGARBAGEDATA", "corrupt.png")

    def test_too_large_raises(self):
        data = _make_png_bytes()
        with pytest.raises(ImageLoadError, match="exceeds"):
            load_image_from_bytes(data, "big.png", max_bytes=10)

    def test_max_dim_enforced(self):
        # Create a 200x200 image but set max_dim=100
        data = _make_png_bytes(200, 200)
        with pytest.raises(ImageLoadError, match="exceed"):
            load_image_from_bytes(data, "big.png", max_dim=100)

    def test_too_small_raises(self):
        arr = np.zeros((4, 4, 3), dtype=np.uint8)
        img_pil = Image.fromarray(arr)
        buf = io.BytesIO()
        img_pil.save(buf, format="PNG")
        with pytest.raises(ImageLoadError, match="too small"):
            load_image_from_bytes(buf.getvalue(), "tiny.png")

    def test_filename_stored(self):
        data = _make_png_bytes()
        img = load_image_from_bytes(data, "myimage.png")
        assert img.filename == "myimage.png"

    def test_file_size_stored(self):
        data = _make_png_bytes()
        img = load_image_from_bytes(data, "test.png")
        assert img.file_size_bytes == len(data)


class TestToGrayscale:
    def test_produces_2d_array(self):
        data = _make_png_bytes(64, 64)
        img = load_image_from_bytes(data, "test.png")
        gray = to_grayscale(img)
        assert gray.ndim == 2
        assert gray.shape == (64, 64)
        assert gray.dtype == np.uint8


class TestLoadFromPath:
    def test_missing_file_raises(self, tmp_path):
        from pathlib import Path
        with pytest.raises(ImageLoadError, match="not found"):
            load_image_from_path(tmp_path / "nonexistent.png")

    def test_valid_file(self, tmp_path):
        data = _make_png_bytes(50, 50)
        p = tmp_path / "valid.png"
        p.write_bytes(data)
        img = load_image_from_path(p)
        assert img.width == 50
