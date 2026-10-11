"""
SceneNav AI — FastAPI integration tests.

Uses TestClient (synchronous) — no live server needed.
"""
from __future__ import annotations

import io
import json
import numpy as np
import pytest
from PIL import Image
from fastapi.testclient import TestClient

from app.main import app

client = TestClient(app)


def _make_png_bytes(width: int = 200, height: int = 200, seed: int = 0) -> bytes:
    rng = np.random.default_rng(seed)
    arr = rng.integers(0, 256, (height, width, 3), dtype=np.uint8)
    # Add structure so ORB can find keypoints
    for i in range(0, height, 15):
        arr[i, :] = 0
    for j in range(0, width, 15):
        arr[:, j] = 255
    img = Image.fromarray(arr)
    buf = io.BytesIO()
    img.save(buf, format="PNG")
    return buf.getvalue()


class TestHealth:
    def test_health_returns_ok(self):
        resp = client.get("/health")
        assert resp.status_code == 200
        data = resp.json()
        assert data["status"] == "ok"
        assert "version" in data
        assert "algorithm_version" in data


class TestCapabilities:
    def test_capabilities_returns_formats(self):
        resp = client.get("/api/v1/capabilities")
        assert resp.status_code == 200
        data = resp.json()
        assert "supported_formats" in data
        assert "JPEG" in data["supported_formats"]
        assert "PNG" in data["supported_formats"]
        assert "max_upload_mb" in data


class TestMatchEndpoint:
    def test_valid_images_return_result(self):
        ref_bytes = _make_png_bytes(seed=1)
        qry_bytes = _make_png_bytes(seed=1)  # identical → good match
        resp = client.post(
            "/api/v1/match",
            files={
                "reference_image": ("ref.png", ref_bytes, "image/png"),
                "query_image": ("qry.png", qry_bytes, "image/png"),
            },
        )
        assert resp.status_code == 200
        data = resp.json()
        assert "status" in data
        assert "reference_keypoints" in data
        assert "query_keypoints" in data
        assert "tentative_matches" in data
        assert "filtered_matches" in data
        assert "processing_time_s" in data
        assert data["processing_time_s"] > 0

    def test_identical_images_succeed(self):
        img_bytes = _make_png_bytes(seed=5)
        resp = client.post(
            "/api/v1/match",
            files={
                "reference_image": ("ref.png", img_bytes, "image/png"),
                "query_image": ("qry.png", img_bytes, "image/png"),
            },
        )
        assert resp.status_code == 200
        data = resp.json()
        assert data["status"] == "success"
        assert data["geometric_inliers"] is not None
        assert data["geometric_inliers"] > 0

    def test_corrupted_reference_returns_400(self):
        qry_bytes = _make_png_bytes(seed=2)
        resp = client.post(
            "/api/v1/match",
            files={
                "reference_image": ("bad.png", b"NOTANIMAGE", "image/png"),
                "query_image": ("qry.png", qry_bytes, "image/png"),
            },
        )
        assert resp.status_code == 400

    def test_corrupted_query_returns_400(self):
        ref_bytes = _make_png_bytes(seed=3)
        resp = client.post(
            "/api/v1/match",
            files={
                "reference_image": ("ref.png", ref_bytes, "image/png"),
                "query_image": ("bad.png", b"NOTANIMAGE", "image/png"),
            },
        )
        assert resp.status_code == 400

    def test_invalid_params_returns_error(self):
        ref_bytes = _make_png_bytes(seed=4)
        qry_bytes = _make_png_bytes(seed=4)
        resp = client.post(
            "/api/v1/match",
            files={
                "reference_image": ("ref.png", ref_bytes, "image/png"),
                "query_image": ("qry.png", qry_bytes, "image/png"),
            },
            data={"ratio_threshold": "99.0"},  # Out of range
        )
        assert resp.status_code in (400, 422)

    def test_result_has_job_id(self):
        img_bytes = _make_png_bytes(seed=6)
        resp = client.post(
            "/api/v1/match",
            files={
                "reference_image": ("r.png", img_bytes, "image/png"),
                "query_image": ("q.png", img_bytes, "image/png"),
            },
        )
        assert resp.status_code == 200
        assert "job_id" in resp.json()

    def test_algorithm_params_in_result(self):
        img_bytes = _make_png_bytes(seed=7)
        resp = client.post(
            "/api/v1/match",
            files={
                "reference_image": ("r.png", img_bytes, "image/png"),
                "query_image": ("q.png", img_bytes, "image/png"),
            },
            data={"orb_max_features": "1000"},
        )
        assert resp.status_code == 200
        data = resp.json()
        assert data["algorithm_params"]["orb_max_features"] == 1000


class TestJobEndpoint:
    def test_existing_job_returned(self):
        img_bytes = _make_png_bytes(seed=8)
        match_resp = client.post(
            "/api/v1/match",
            files={
                "reference_image": ("r.png", img_bytes, "image/png"),
                "query_image": ("q.png", img_bytes, "image/png"),
            },
        )
        assert match_resp.status_code == 200
        job_id = match_resp.json()["job_id"]

        job_resp = client.get(f"/api/v1/jobs/{job_id}")
        assert job_resp.status_code == 200
        assert job_resp.json()["job_id"] == job_id

    def test_nonexistent_job_returns_404(self):
        resp = client.get("/api/v1/jobs/nonexistent-job-id-xyz")
        assert resp.status_code == 404


class TestArtifactEndpoint:
    def test_valid_artifact_served(self):
        img_bytes = _make_png_bytes(seed=9)
        match_resp = client.post(
            "/api/v1/match",
            files={
                "reference_image": ("r.png", img_bytes, "image/png"),
                "query_image": ("q.png", img_bytes, "image/png"),
            },
        )
        assert match_resp.status_code == 200
        data = match_resp.json()
        job_id = data["job_id"]
        artifacts = data.get("artifacts", {})
        if "side_by_side" in artifacts:
            filename = artifacts["side_by_side"].split("/")[-1]
            art_resp = client.get(f"/api/v1/artifacts/{job_id}/{filename}")
            assert art_resp.status_code == 200

    def test_nonexistent_job_artifact_404(self):
        resp = client.get("/api/v1/artifacts/bad-job-id/file.png")
        assert resp.status_code == 404

    def test_path_traversal_blocked(self):
        img_bytes = _make_png_bytes(seed=10)
        match_resp = client.post(
            "/api/v1/match",
            files={
                "reference_image": ("r.png", img_bytes, "image/png"),
                "query_image": ("q.png", img_bytes, "image/png"),
            },
        )
        job_id = match_resp.json()["job_id"]
        # Attempt path traversal
        resp = client.get(f"/api/v1/artifacts/{job_id}/../../etc/passwd")
        assert resp.status_code in (400, 404)


class TestSamplesEndpoint:
    def test_list_samples_returns_data(self):
        resp = client.get("/api/v1/samples")
        assert resp.status_code == 200
        data = resp.json()
        assert "pairs" in data
        assert len(data["pairs"]) > 0
        first = data["pairs"][0]
        assert "id" in first
        assert "reference_path" in first
        assert "query_path" in first

    def test_serve_sample_image(self):
        resp_list = client.get("/api/v1/samples")
        assert resp_list.status_code == 200
        pairs = resp_list.json()["pairs"]
        first_ref = pairs[0]["reference_path"].replace("references/", "")
        resp_img = client.get(f"/api/v1/samples/image/references/{first_ref}")
        assert resp_img.status_code == 200
        assert len(resp_img.content) > 0

    def test_sample_image_invalid_category(self):
        resp = client.get("/api/v1/samples/image/secret_dir/image.png")
        assert resp.status_code == 400

    def test_sample_image_path_traversal(self):
        resp = client.get("/api/v1/samples/image/references/..%2F..%2Fmain.py")
        assert resp.status_code in (400, 404)


class TestMutualConsistency:
    def test_match_with_mutual_consistency_flag(self):
        img_bytes = _make_png_bytes(seed=12)
        resp = client.post(
            "/api/v1/match",
            files={
                "reference_image": ("r.png", img_bytes, "image/png"),
                "query_image": ("q.png", img_bytes, "image/png"),
            },
            data={"mutual_consistency": "true"},
        )
        assert resp.status_code == 200
        data = resp.json()
        assert data["status"] == "success"
        assert data["algorithm_params"]["mutual_consistency"] is True

