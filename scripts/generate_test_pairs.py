#!/usr/bin/env python3
"""
SceneNav AI — Sample Data Generator

Generates a small set of legally usable synthetic test image pairs from
built-in Python/NumPy sources (no internet access required).

These are SYNTHETIC test pairs. They are clearly labelled as such.
Do NOT interpret pixel-level matching accuracy on these pairs as evidence
of real-world geographic navigation accuracy.

Usage:
    python scripts/generate_test_pairs.py

Output:
    data/references/   — reference images
    data/queries/      — query images (synthetic transforms of references)
    data/manifests/synthetic_pairs.json  — manifest for evaluation
"""
from __future__ import annotations

import hashlib
import io
import json
import os
import sys
from pathlib import Path

import numpy as np
from PIL import Image, ImageFilter, ImageEnhance

# Resolve project root
PROJECT_ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(PROJECT_ROOT))

DATA_DIR = PROJECT_ROOT / "data"
REF_DIR  = DATA_DIR / "references"
QRY_DIR  = DATA_DIR / "queries"
MAN_DIR  = DATA_DIR / "manifests"

for d in [REF_DIR, QRY_DIR, MAN_DIR]:
    d.mkdir(parents=True, exist_ok=True)


def save_png(arr: np.ndarray, path: Path) -> str:
    """Save a uint8 numpy array as PNG and return its SHA-256 hex digest."""
    img = Image.fromarray(arr)
    buf = io.BytesIO()
    img.save(buf, format="PNG", optimize=False)
    data = buf.getvalue()
    sha256 = hashlib.sha256(data).hexdigest()
    path.write_bytes(data)
    return sha256


def make_aerial_texture(
    width: int = 512,
    height: int = 512,
    seed: int = 0,
) -> np.ndarray:
    """
    Generate a synthetic 'aerial texture' image with:
    - Grid-like road pattern
    - Random patches simulating buildings
    - Noise simulating vegetation/terrain variation

    This is a purely synthetic image. It is NOT real aerial imagery.
    """
    rng = np.random.default_rng(seed)
    canvas = np.full((height, width, 3), 150, dtype=np.uint8)

    # Background terrain (greens and browns)
    terrain = rng.integers(100, 180, (height, width, 3), dtype=np.uint8)
    canvas = terrain.copy()

    # Road grid (grey lines)
    road_color = np.array([100, 100, 100], dtype=np.uint8)
    for y in range(0, height, 60):
        canvas[max(0, y-3):min(height, y+3), :] = road_color
    for x in range(0, width, 80):
        canvas[:, max(0, x-3):min(width, x+3)] = road_color

    # Building blocks (darker rectangles)
    building_color_base = np.array([80, 80, 90], dtype=np.uint8)
    for _ in range(30):
        bx = int(rng.integers(10, width - 50))
        by = int(rng.integers(10, height - 50))
        bw = int(rng.integers(15, 45))
        bh = int(rng.integers(15, 45))
        shade = rng.integers(-20, 20)
        color = np.clip(building_color_base + shade, 0, 255).astype(np.uint8)
        canvas[by:by+bh, bx:bx+bw] = color

    # Vegetation patches (green blobs)
    for _ in range(20):
        vx = int(rng.integers(0, width))
        vy = int(rng.integers(0, height))
        vr = int(rng.integers(10, 30))
        y_grid, x_grid = np.ogrid[:height, :width]
        mask = (x_grid - vx)**2 + (y_grid - vy)**2 <= vr**2
        green_val = rng.integers(60, 130)
        canvas[mask, 0] = rng.integers(20, 60)
        canvas[mask, 1] = green_val
        canvas[mask, 2] = rng.integers(20, 60)

    return canvas


def apply_transform(
    img_arr: np.ndarray,
    transform_type: str,
    seed: int = 0,
) -> tuple[np.ndarray, dict]:
    """
    Apply a named synthetic transformation.
    Returns (transformed_array, transform_params).

    Transform types:
      identity      — no change (tests exact matching)
      crop_center   — central crop (known sub-region)
      rotate_5      — 5° rotation
      rotate_15     — 15° rotation
      brightness    — brightness adjustment
      blur          — Gaussian blur
      scale_0.8     — 80% scale crop
    """
    img = Image.fromarray(img_arr)
    params: dict = {"type": transform_type, "note": "SYNTHETIC — pixel metric only"}

    if transform_type == "identity":
        return img_arr.copy(), params

    elif transform_type == "crop_center":
        w, h = img.size
        margin = w // 8
        crop = img.crop((margin, margin, w - margin, h - margin))
        crop = crop.resize((w, h), Image.BILINEAR)
        params["margin_px"] = margin
        return np.array(crop), params

    elif transform_type == "rotate_5":
        rotated = img.rotate(5, expand=False, fillcolor=(128, 128, 128))
        params["angle_deg"] = 5
        return np.array(rotated), params

    elif transform_type == "rotate_15":
        rotated = img.rotate(15, expand=False, fillcolor=(128, 128, 128))
        params["angle_deg"] = 15
        return np.array(rotated), params

    elif transform_type == "brightness":
        enhancer = ImageEnhance.Brightness(img)
        bright = enhancer.enhance(1.4)
        params["brightness_factor"] = 1.4
        return np.array(bright), params

    elif transform_type == "blur":
        blurred = img.filter(ImageFilter.GaussianBlur(radius=2))
        params["blur_radius"] = 2
        return np.array(blurred), params

    elif transform_type == "scale_0.8":
        w, h = img.size
        small_w, small_h = int(w * 0.8), int(h * 0.8)
        ox = (w - small_w) // 2
        oy = (h - small_h) // 2
        crop = img.crop((ox, oy, ox + small_w, oy + small_h))
        scaled = crop.resize((w, h), Image.BILINEAR)
        params["scale"] = 0.8
        return np.array(scaled), params

    elif transform_type == "unrelated":
        rng = np.random.default_rng(seed + 9999)
        return rng.integers(0, 256, img_arr.shape, dtype=np.uint8), params

    else:
        raise ValueError(f"Unknown transform type: {transform_type}")


TRANSFORMS = [
    "identity",
    "crop_center",
    "rotate_5",
    "rotate_15",
    "brightness",
    "blur",
    "scale_0.8",
    "unrelated",
]

NUM_SCENES = 3  # Number of base scenes


def main() -> None:
    print("SceneNav AI — Synthetic Test Pair Generator")
    print("=" * 50)
    print("NOTE: All generated images are SYNTHETIC. They do not represent")
    print("real aerial imagery and must not be used for geographic claims.")
    print()

    pairs = []

    for scene_idx in range(NUM_SCENES):
        seed = scene_idx * 100
        print(f"Generating scene {scene_idx + 1}/{NUM_SCENES}...")

        ref_arr = make_aerial_texture(width=512, height=512, seed=seed)
        ref_filename = f"scene_{scene_idx:02d}_reference.png"
        ref_sha = save_png(ref_arr, REF_DIR / ref_filename)
        print(f"  Reference: {ref_filename}")

        for tx_type in TRANSFORMS:
            qry_arr, tx_params = apply_transform(ref_arr, tx_type, seed=seed)
            qry_filename = f"scene_{scene_idx:02d}_query_{tx_type}.png"
            qry_sha = save_png(qry_arr, QRY_DIR / qry_filename)

            pair_id = f"scene{scene_idx:02d}_{tx_type}"
            pairs.append({
                "id": pair_id,
                "reference": f"references/{ref_filename}",
                "query": f"queries/{qry_filename}",
                "transform": tx_params,
                "reference_sha256": ref_sha,
                "query_sha256": qry_sha,
                "ground_truth_type": "synthetic_pixel",
                "geographic_ground_truth": False,
                "note": (
                    "Synthetic pair. Pixel-level metrics only. "
                    "Not representative of real-world geographic localization accuracy."
                ),
            })
            print(f"  Query [{tx_type}]: {qry_filename}")

    # Write manifest
    manifest = {
        "name": "synthetic_pairs",
        "version": "1.0",
        "description": (
            "Synthetic test pairs for baseline evaluation of SceneNav AI. "
            "All images are procedurally generated — they are NOT real aerial imagery. "
            "Metrics on this dataset reflect pixel-level image matching performance, "
            "not real-world geographic localization capability."
        ),
        "license": "Generated by SceneNav AI — no copyright restrictions on synthetic content.",
        "geographic_content": False,
        "pairs": pairs,
    }

    manifest_path = MAN_DIR / "synthetic_pairs.json"
    with open(manifest_path, "w") as f:
        json.dump(manifest, f, indent=2)

    print()
    print(f"Generated {len(pairs)} pairs across {NUM_SCENES} scenes.")
    print(f"Manifest written to: {manifest_path}")
    print()
    print("To run evaluation:")
    print("  python scripts/run_evaluation.py --manifest synthetic_pairs.json")


if __name__ == "__main__":
    main()
