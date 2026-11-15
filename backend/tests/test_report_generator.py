"""
SceneNav AI — Automated tests for Research Report Generator & Report API
"""
import json
import pytest
from pathlib import Path
from httpx import AsyncClient, ASGITransport

from app.main import app
from app.schemas import MatchResult
from app.services.report_generator import generate_research_report_pdf


@pytest.fixture
def sample_match_result(tmp_path):
    # Find any existing result.json from results or generate a mock one
    results_dir = Path("results")
    for r_json in results_dir.glob("*/result.json"):
        try:
            with open(r_json, "r", encoding="utf-8") as f:
                data = json.load(f)
            return MatchResult.model_validate(data), r_json.parent
        except Exception:
            continue
    pytest.skip("No existing result.json found to test report generator")


def test_pdf_report_generation(sample_match_result, tmp_path):
    result, _ = sample_match_result
    pdf_path = generate_research_report_pdf(result, tmp_path)
    assert pdf_path.exists()
    assert pdf_path.stat().st_size > 1000
    assert pdf_path.name == "research_report.pdf"


@pytest.mark.asyncio
async def test_job_report_pdf_endpoint(sample_match_result):
    result, job_dir = sample_match_result
    job_id = job_dir.name
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        resp = await client.get(f"/api/v1/jobs/{job_id}/report.pdf")
        assert resp.status_code == 200
        assert resp.headers["content-type"] == "application/pdf"
        assert len(resp.content) > 1000


@pytest.mark.asyncio
async def test_job_report_pdf_invalid_job():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        resp = await client.get("/api/v1/jobs/nonexistent-job-1234/report.pdf")
        assert resp.status_code == 404
