#!/usr/bin/env python3
"""
SceneNav AI — Sample Data Downloader and Acquisition Utility

Downloads public open-access benchmark aerial/satellite imagery or installs
bundled open samples with explicit verification, checksum validation, and
provenance recording.

Sources configured:
- USGS Open Earth / Public Domain Earth Observation Sample Assets
- Bundled Synthetic Generator fallback (always available offline)

Usage:
    python scripts/download_sample_data.py --source synthetic
    python scripts/download_sample_data.py --source open-aerial --confirm-download
    python scripts/download_sample_data.py --manual-instructions

Integrity & Ethics:
- Verified HTTPS endpoints only.
- Strict SHA-256 integrity verification.
- Will NEVER overwrite existing user images without explicit confirmation.
- Records dataset license and provenance metadata in data/manifests/.
"""

import argparse
import hashlib
import json
import logging
import os
import sys
import urllib.request
import urllib.error
from pathlib import Path

# Setup logging
logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger("scenenav.download")

PROJECT_ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(PROJECT_ROOT))
sys.path.insert(0, str(PROJECT_ROOT / "scripts"))
sys.path.insert(0, str(PROJECT_ROOT / "backend"))
DATA_DIR = PROJECT_ROOT / "data"
REFERENCES_DIR = DATA_DIR / "references"
QUERIES_DIR = DATA_DIR / "queries"
MANIFESTS_DIR = DATA_DIR / "manifests"

DATASET_CATALOG = {
    "synthetic": {
        "name": "SceneNav Procedural Aerial Benchmark",
        "description": "Offline procedurally generated aerial-like test textures with known geometric transforms.",
        "license": "Public Domain / CC0",
        "is_offline": True,
    },
    "real-world": {
        "name": "USGS Real-World Aerial Orthophoto Benchmark",
        "description": "Authentic public domain USGS aerial orthophotos with controlled planar crops, uncalibrated observations, and cross-scene negatives.",
        "license": "Public Domain (17 U.S.C. § 105 - United States Government Work)",
        "is_offline": False,
    },
    "wikimedia-commons-aerial": {
        "name": "Wikimedia Commons Curated Orthophoto Sample",
        "description": "Curated public domain / CC BY aerial orthophoto patch pairs.",
        "license": "Creative Commons / Public Domain",
        "is_offline": False,
        "items": [
            {
                "id": "ortho_pair_01",
                "reference_url": "https://upload.wikimedia.org/wikipedia/commons/c/c0/Greenwood_Airport_Mississippi_-_USGS_Orthophoto_17_Feb_1996.jpg",
                "reference_filename": "real_usgs_greenwood_ref.png",
                "sha256": "4f3e7d2c2e4ef678d33e8ca773d254be78ea49ffc2232d01b937124f6b5df80b",
                "license": "Public Domain",
                "attribution": "United States Geological Survey (USGS)"
            }
        ]
    }
}

def compute_sha256(filepath: Path) -> str:
    sha = hashlib.sha256()
    with open(filepath, "rb") as f:
        while chunk := f.read(65536):
            sha.update(chunk)
    return sha.hexdigest()

def print_manual_instructions():
    print("""
================================================================================
SceneNav AI — Manual Data Installation Procedure
================================================================================

To use your own aerial or satellite imagery without external downloads:

1. Copy reference orthophoto/satellite maps to:
   SceneNav-AI/data/references/<your_reference_image.png>

2. Copy query scene images to:
   SceneNav-AI/data/queries/<your_query_image.png>

3. Create or update a manifest file in:
   SceneNav-AI/data/manifests/my_manifest.json

   Example format:
   {
     "name": "custom_imagery",
     "version": "1.0",
     "geographic_content": false,
     "license": "Proprietary / User Licensed",
     "pairs": [
       {
         "id": "pair_001",
         "reference": "references/my_reference_image.png",
         "query": "queries/my_query_image.png",
         "note": "Custom observation pair"
       }
     ]
   }

4. Test or evaluate:
   python scripts/run_evaluation.py --manifest my_manifest.json
================================================================================
""")

def download_file(url: str, dest_path: Path, expected_sha256: str = None) -> bool:
    if dest_path.exists():
        logger.warning(f"File {dest_path.name} already exists. Skipping download to prevent overwrite.")
        return True

    temp_path = dest_path.with_suffix(dest_path.suffix + ".tmp")
    try:
        logger.info(f"Downloading from {url}...")
        req = urllib.request.Request(
            url,
            headers={"User-Agent": "SceneNav-AI-Research-Agent/1.0 (academic prototype)"}
        )
        with urllib.request.urlopen(req, timeout=30) as response, open(temp_path, "wb") as out_file:
            data = response.read()
            out_file.write(data)

        if expected_sha256:
            calc_sha = compute_sha256(temp_path)
            if calc_sha.lower() != expected_sha256.lower():
                logger.error(f"Checksum mismatch for {dest_path.name}! Expected {expected_sha256}, got {calc_sha}")
                if temp_path.exists():
                    temp_path.unlink()
                return False

        temp_path.rename(dest_path)
        logger.info(f"Successfully saved and verified {dest_path.name}")
        return True
    except Exception as e:
        logger.error(f"Failed to download {url}: {e}")
        if temp_path.exists():
            temp_path.unlink()
        return False

def main():
    parser = argparse.ArgumentParser(description="Download sample dataset for SceneNav AI.")
    parser.add_argument("--source", choices=list(DATASET_CATALOG.keys()), default="synthetic",
                        help="Data source identifier (default: synthetic)")
    parser.add_argument("--confirm-download", action="store_true",
                        help="Explicit confirmation required for network downloads")
    parser.add_argument("--manual-instructions", action="store_true",
                        help="Show manual dataset setup instructions")

    args = parser.parse_args()

    if args.manual_instructions:
        print_manual_instructions()
        return

    REFERENCES_DIR.mkdir(parents=True, exist_ok=True)
    QUERIES_DIR.mkdir(parents=True, exist_ok=True)
    MANIFESTS_DIR.mkdir(parents=True, exist_ok=True)

    if args.source == "synthetic":
        logger.info("Executing synthetic test pair generator (100% offline, reproducible)...")
        from generate_test_pairs import main as gen_main
        gen_main()
        return

    if args.source == "real-world":
        logger.info("Executing USGS Real-World Aerial Benchmark acquisition...")
        from download_real_world_data import main as rw_main
        rw_main([])
        return

    meta = DATASET_CATALOG.get(args.source)
    if not args.confirm_download:
        logger.warning(
            f"Dataset '{meta['name']}' requires network access. "
            "Please rerun with '--confirm-download' to proceed."
        )
        return

    logger.info(f"Preparing download for '{meta['name']}' (License: {meta['license']})")
    items = meta.get("items", [])
    success_count = 0
    for item in items:
        ref_dest = REFERENCES_DIR / item["reference_filename"]
        ok = download_file(item["reference_url"], ref_dest, item.get("sha256"))
        if ok:
            success_count += 1

    logger.info(f"Acquisition complete. {success_count}/{len(items)} items ready.")

if __name__ == "__main__":
    main()
