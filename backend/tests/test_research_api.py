"""
SceneNav AI — Unit and integration tests for Research Demonstration endpoints.
"""
import pytest
from fastapi.testclient import TestClient

from app.main import app

client = TestClient(app)


def test_research_demonstration_endpoint():
    response = client.get("/api/v1/research/demonstration")
    assert response.status_code == 200
    data = response.json()

    assert data["experiment_id"].startswith("EXP-MUNICH-GEOREF-20261022")
    assert "input_imagery" in data
    assert "audited_coordinates" in data
    assert "camera_telemetry_analysis" in data
    assert "scenarios" in data
    assert "scientific_disclosures" in data

    # Verify audited coordinates
    coords = data["audited_coordinates"]
    assert coords["crs"] == "EPSG:25832"
    assert 687780 < coords["orb"]["projected_center_utm32n"]["easting"] < 687800
    assert 5331650 < coords["orb"]["projected_center_utm32n"]["northing"] < 5331670

    # Repeatability
    delta_m = coords["cross_algorithm_agreement"]["euclidean_distance_m"]
    assert 0.40 < delta_m < 0.45

    # Footprint area ~33.9 hectares
    area_ha = coords["footprint_geometry"]["area_hectares"]
    assert 33.0 < area_ha < 35.0

    # Area discrepancy analysis (resolving 338,934 vs 339,161 m²)
    if "area_discrepancy_analysis" in coords:
        ada = coords["area_discrepancy_analysis"]
        assert 338930 < ada["orb_area_m2"] < 338940
        assert 339155 < ada["sift_area_m2"] < 339165
        assert 226 < ada["delta_m2"] < 228
        assert ada["relative_difference_percent"] < 0.1


def test_research_artifact_serving():
    response = client.get("/api/v1/research/artifacts/06_executive_research_overview.png")
    assert response.status_code == 200
    assert response.headers["content-type"] in ["image/png", "application/octet-stream"]
    assert len(response.content) > 100000


def test_research_artifact_traversal_prevention():
    # Attempt path traversal
    response = client.get("/api/v1/research/artifacts/..%2F..%2Fconfig.py")
    assert response.status_code in [400, 404]

    response = client.get("/api/v1/research/artifacts/nonexistent_artifact.png")
    assert response.status_code == 404


def test_release_manifest_integrity_and_report_reconciliation():
    """Verify cryptographic manifest integrity and markdown report reconciliation."""
    import hashlib
    import json
    from pathlib import Path

    pkg_dir = Path("results/demo_readiness_release_20261022")
    manifest_path = pkg_dir / "manifest.json"
    report_path = pkg_dir / "FINAL_DEMO_READINESS_REPORT.md"

    assert manifest_path.exists(), "manifest.json must exist in release directory"
    assert report_path.exists(), "FINAL_DEMO_READINESS_REPORT.md must exist in release directory"

    with open(manifest_path, encoding="utf-8") as f:
        manifest = json.load(f)

    # 1. Verify manifest file count and acyclic property (no self-reference)
    artifact_filenames = [a["filename"] for a in manifest["artifacts"]]
    assert len(manifest["artifacts"]) == 11, f"Expected 11 items in manifest, got {len(manifest['artifacts'])}"
    assert "manifest.json" not in artifact_filenames, "manifest.json must not self-reference"

    # 2. Verify every manifest artifact against disk
    for item in manifest["artifacts"]:
        p = pkg_dir / item["filename"]
        assert p.exists(), f"Deliverable {item['filename']} missing on disk"
        disk_size = p.stat().st_size
        disk_hash = hashlib.sha256(p.read_bytes()).hexdigest()
        assert disk_size == item["size_bytes"], f"Size mismatch for {item['filename']}"
        assert disk_hash == item["sha256"], f"Hash mismatch for {item['filename']}"

    # 3. Verify report deliverables table against disk
    with open(report_path, encoding="utf-8") as f:
        report_text = f.read()

    backtick = chr(96)
    table_files_checked = 0
    for line in report_text.splitlines():
        if "| " + backtick in line and any(ext in line for ext in [".png", ".json", ".md"]):
            parts = [p.strip().replace(backtick, "") for p in line.split("|")[1:-1]]
            fname, sz_str, digest, status = parts[0], parts[1], parts[2], parts[3]
            p = pkg_dir / fname
            assert p.exists(), f"File {fname} in report table missing from disk"
            disk_hash = hashlib.sha256(p.read_bytes()).hexdigest()
            assert disk_hash == digest, f"Report digest mismatch for {fname}"
            table_files_checked += 1

    assert table_files_checked == 10, f"Expected 10 deliverables in report table, checked {table_files_checked}"

