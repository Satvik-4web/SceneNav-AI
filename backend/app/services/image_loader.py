"""
SceneNav AI — Image Loader Service

Responsibilities:
- Validate uploaded image files before any processing.
- Normalise channel order and orientation.
- Enforce dimension and file-size limits.
- Never accept arbitrary filesystem paths from API callers.

Security note: all path handling uses validated Path objects.
File content is decoded only with Pillow/OpenCV — no execution.
"""
from __future__ import annotations

import io
import logging
from dataclasses import dataclass
from pathlib import Path
from typing import Optional

import cv2
import numpy as np
from PIL import Image, UnidentifiedImageError

from app.config import settings

logger = logging.getLogger(__name__)

# Formats explicitly supported and tested.
SUPPORTED_EXTENSIONS = frozenset({".jpg", ".jpeg", ".png", ".tif", ".tiff", ".bmp", ".webp"})
SUPPORTED_PIL_FORMATS = frozenset({"JPEG", "PNG", "TIFF", "BMP", "WEBP"})


@dataclass
class LoadedImage:
    """Container for a validated, normalised image."""
    array: np.ndarray          # HxW or HxWxC, dtype uint8, BGR channel order
    width: int
    height: int
    channels: int
    filename: str
    file_size_bytes: int
    original_format: str


class ImageLoadError(Exception):
    """Raised for any image validation or loading failure."""


def load_image_from_bytes(
    data: bytes,
    filename: str,
    *,
    max_dim: Optional[int] = None,
    max_bytes: Optional[int] = None,
) -> LoadedImage:
    """
    Load and validate an image from raw bytes.

    Args:
        data:       Raw file bytes.
        filename:   Original filename (used only for extension check and logging).
        max_dim:    Maximum allowed width or height in pixels.
        max_bytes:  Maximum allowed file size in bytes.

    Returns:
        LoadedImage with a normalised BGR NumPy array.

    Raises:
        ImageLoadError: on any validation or decoding failure.
    """
    max_dim = max_dim or settings.max_image_dim
    max_bytes = max_bytes or (settings.max_upload_mb * 1024 * 1024)

    # 1. File-size check (fast, before decoding)
    if len(data) == 0:
        raise ImageLoadError("File is empty.")
    if len(data) > max_bytes:
        raise ImageLoadError(
            f"File size {len(data) / 1024 / 1024:.1f} MB exceeds the "
            f"{max_bytes / 1024 / 1024:.0f} MB limit."
        )

    # 2. Extension check
    suffix = Path(filename).suffix.lower()
    if suffix not in SUPPORTED_EXTENSIONS:
        raise ImageLoadError(
            f"Unsupported file extension '{suffix}'. "
            f"Supported: {sorted(SUPPORTED_EXTENSIONS)}"
        )

    # 3. Decode with Pillow first (catches corruption, validates format)
    try:
        pil_image = Image.open(io.BytesIO(data))
        pil_format = pil_image.format or "UNKNOWN"
        if pil_format not in SUPPORTED_PIL_FORMATS:
            raise ImageLoadError(
                f"File claims extension '{suffix}' but Pillow detected format "
                f"'{pil_format}', which is not in the supported set."
            )
        # Apply EXIF orientation so coordinates are consistent
        pil_image = _apply_exif_orientation(pil_image)
        pil_image.load()  # Force decode — catches truncated files
    except ImageLoadError:
        raise
    except UnidentifiedImageError:
        raise ImageLoadError(
            f"'{filename}' could not be decoded as an image. "
            "The file may be corrupted or not an image."
        )
    except Exception as exc:
        raise ImageLoadError(f"Failed to open '{filename}': {exc}") from exc

    # 4. Dimension check
    w, h = pil_image.size
    if w > max_dim or h > max_dim:
        raise ImageLoadError(
            f"Image dimensions {w}×{h} px exceed the {max_dim} px per-side limit."
        )
    if w < 8 or h < 8:
        raise ImageLoadError(
            f"Image dimensions {w}×{h} px are too small for feature detection (minimum 8×8)."
        )

    # 5. Convert to RGB then to OpenCV BGR
    try:
        rgb = pil_image.convert("RGB")
        bgr = cv2.cvtColor(np.array(rgb, dtype=np.uint8), cv2.COLOR_RGB2BGR)
    except Exception as exc:
        raise ImageLoadError(f"Color conversion failed for '{filename}': {exc}") from exc

    channels = bgr.shape[2] if bgr.ndim == 3 else 1
    logger.info(
        "Loaded '%s': %dx%d px, %d ch, %.1f KB, format=%s",
        filename, bgr.shape[1], bgr.shape[0], channels, len(data) / 1024, pil_format
    )

    return LoadedImage(
        array=bgr,
        width=bgr.shape[1],
        height=bgr.shape[0],
        channels=channels,
        filename=filename,
        file_size_bytes=len(data),
        original_format=pil_format,
    )


def load_image_from_path(
    path: Path,
    *,
    max_dim: Optional[int] = None,
    max_bytes: Optional[int] = None,
) -> LoadedImage:
    """
    Load an image from a trusted filesystem path (server-side use only).

    This function must NOT be called with paths derived from user input.
    """
    if not path.exists():
        raise ImageLoadError(f"File not found: {path}")
    if not path.is_file():
        raise ImageLoadError(f"Path is not a regular file: {path}")

    try:
        data = path.read_bytes()
    except PermissionError:
        raise ImageLoadError(f"Permission denied reading: {path}")
    except OSError as exc:
        raise ImageLoadError(f"Cannot read '{path}': {exc}") from exc

    return load_image_from_bytes(data, path.name, max_dim=max_dim, max_bytes=max_bytes)


def to_grayscale(image: LoadedImage) -> np.ndarray:
    """Return a grayscale uint8 array from a LoadedImage (BGR input)."""
    return cv2.cvtColor(image.array, cv2.COLOR_BGR2GRAY)


# ---------------------------------------------------------------------------
# Internal helpers
# ---------------------------------------------------------------------------

def _apply_exif_orientation(img: Image.Image) -> Image.Image:
    """
    Apply EXIF orientation tag so spatial coordinates are consistent.
    Silently skips if no EXIF data is present.
    """
    try:
        from PIL.ExifTags import TAGS
        exif = img.getexif()
        if exif is None:
            return img
        orientation_key = next(
            (k for k, v in TAGS.items() if v == "Orientation"), None
        )
        if orientation_key is None:
            return img
        orientation = exif.get(orientation_key)
        rotations = {
            3: Image.ROTATE_180,
            6: Image.ROTATE_270,
            8: Image.ROTATE_90,
        }
        if orientation in rotations:
            img = img.transpose(rotations[orientation])
    except Exception:
        pass  # Non-fatal — proceed without EXIF correction
    return img
