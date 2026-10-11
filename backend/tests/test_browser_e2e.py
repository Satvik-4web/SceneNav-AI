"""
SceneNav AI — End-to-End Browser Automation Tests using Playwright

Validates the full user journey in a real browser:
1. Application loading & UI component rendering.
2. ORB feature matching workflow on sample image pairs.
3. SIFT feature matching workflow on sample image pairs.
4. Interactive visualization and zoom lightbox modal.
5. Rejection of unrelated negative image pairs (0 false acceptances).
6. Reset and error handling states.
7. Captures screenshot evidence for all evaluated states.
"""
from __future__ import annotations

import os
import subprocess
import sys
import time
import urllib.request
from pathlib import Path
from typing import Generator

import pytest
from playwright.sync_api import Page, sync_playwright, expect

PROJECT_ROOT = Path(__file__).resolve().parent.parent.parent
SCREENSHOT_DIR = PROJECT_ROOT / "results" / "e2e_screenshots"
SCREENSHOT_DIR.mkdir(parents=True, exist_ok=True)

BACKEND_URL = "http://127.0.0.1:8000"
FRONTEND_URL = "http://localhost:5173"


def _is_url_reachable(url: str, timeout: float = 1.0) -> bool:
    try:
        req = urllib.request.Request(url, headers={"User-Agent": "HealthCheck"})
        with urllib.request.urlopen(req, timeout=timeout) as resp:
            return resp.status in (200, 304)
    except Exception:
        return False


@pytest.fixture(scope="session")
def live_servers() -> Generator[dict, None, None]:
    """Ensure backend and frontend servers are running; spin them up if needed."""
    procs = []

    # 1. Backend server
    backend_up = _is_url_reachable(f"{BACKEND_URL}/health")
    if not backend_up:
        backend_proc = subprocess.Popen(
            [sys.executable, "-m", "uvicorn", "app.main:app", "--app-dir", "backend", "--host", "127.0.0.1", "--port", "8000"],
            cwd=str(PROJECT_ROOT),
            stdout=subprocess.DEVNULL,
            stderr=subprocess.DEVNULL,
        )
        procs.append(backend_proc)

        # Wait for backend
        start = time.time()
        while time.time() - start < 15:
            if _is_url_reachable(f"{BACKEND_URL}/health"):
                backend_up = True
                break
            time.sleep(0.5)

        if not backend_up:
            for p in procs:
                p.terminate()
            pytest.fail("Backend server failed to start on http://127.0.0.1:8000")

    # 2. Frontend server
    frontend_up = _is_url_reachable(FRONTEND_URL)
    if not frontend_up:
        frontend_proc = subprocess.Popen(
            "npm run dev -- --port 5173",
            shell=True,
            cwd=str(PROJECT_ROOT / "frontend"),
            stdout=subprocess.DEVNULL,
            stderr=subprocess.DEVNULL,
        )
        procs.append(frontend_proc)

        # Wait for frontend
        start = time.time()
        while time.time() - start < 20:
            if _is_url_reachable(FRONTEND_URL):
                frontend_up = True
                break
            time.sleep(0.5)

        if not frontend_up:
            for p in procs:
                p.terminate()
            pytest.fail("Frontend dev server failed to start on http://localhost:5173")

    yield {"backend": BACKEND_URL, "frontend": FRONTEND_URL}

    # Teardown processes started by this fixture
    for p in procs:
        try:
            if sys.platform == "win32":
                subprocess.run(f"taskkill /F /T /PID {p.pid}", shell=True, capture_output=True)
            else:
                p.terminate()
        except Exception:
            pass


@pytest.fixture(scope="session")
def browser_context():
    """Launch native Chrome headlessly via Playwright."""
    with sync_playwright() as p:
        browser = p.chromium.launch(
            channel="chrome",
            headless=True,
            args=["--disable-web-security", "--no-sandbox"],
        )
        context = browser.new_context(viewport={"width": 1440, "height": 900})
        yield context
        context.close()
        browser.close()


@pytest.fixture
def page(browser_context) -> Generator[Page, None, None]:
    p = browser_context.new_page()
    yield p
    p.close()


class TestBrowserEndToEnd:
    """Rigorous end-to-end browser tests verifying UI and matching workflows."""

    def test_01_app_page_loads_and_displays_header(self, page: Page, live_servers: dict):
        page.goto(live_servers["frontend"], wait_until="networkidle")

        # Check title and header branding
        expect(page.locator("h1")).to_contain_text("SceneNav AI")
        expect(page.locator(".subtitle")).to_contain_text("Scene Aided Navigation Research Prototype")

        # Check main panels
        expect(page.locator(".left-sidebar")).to_be_visible()
        expect(page.locator("text=Image Inputs")).to_be_visible()
        expect(page.locator("text=Matching Parameters")).to_be_visible()

        # Capture screenshot
        page.screenshot(path=str(SCREENSHOT_DIR / "01_initial_dashboard_load.png"))

    def test_02_orb_matching_workflow(self, page: Page, live_servers: dict):
        page.goto(live_servers["frontend"], wait_until="networkidle")

        # Select a known positive sample pair
        select_loc = page.locator("select").first
        select_loc.wait_for(state="visible", timeout=10000)

        # Select scene_00_identity or real_greenwood_01_crop
        options = select_loc.locator("option").all_inner_texts()
        target_value = ""
        for val in select_loc.locator("option").all():
            v = val.get_attribute("value")
            if v and ("identity" in v or "crop" in v):
                target_value = v
                break

        assert target_value, f"No suitable test pair found in options: {options}"
        select_loc.select_option(value=target_value)

        # Wait for images to be loaded into preview
        page.wait_for_selector(".image-drop-zone.has-image", timeout=10000)

        # Ensure Algorithm is set to ORB
        algo_select = page.locator("#algorithm-select")
        if algo_select.is_visible():
            algo_select.select_option("ORB")

        # Click Run Matching
        match_btn = page.locator("button:has-text('Run Matching')")
        expect(match_btn).to_be_enabled()
        match_btn.click()

        # Wait for match completion (status banner)
        success_banner = page.locator(".status-banner.success")
        success_banner.wait_for(state="visible", timeout=20000)
        expect(success_banner).to_contain_text("Match Successful")

        # Verify feature metrics
        expect(page.locator(".metric-card .metric-label:text-is('Ref. Keypoints')")).to_be_visible()
        expect(page.locator(".metric-card .metric-label:text-is('Qry. Keypoints')")).to_be_visible()
        expect(page.locator(".metric-card .metric-label:text-is('Inliers')")).to_be_visible()
        expect(page.locator("text=Geometric Verification")).to_be_visible()

        # Verify visualizations
        expect(page.locator("text=Visualizations & Corresponding Footprint")).to_be_visible()
        expect(page.locator(".result-image-card")).to_have_count(4)

        # Capture screenshot
        page.screenshot(path=str(SCREENSHOT_DIR / "02_orb_match_success.png"))

    def test_03_sift_matching_workflow(self, page: Page, live_servers: dict):
        page.goto(live_servers["frontend"], wait_until="networkidle")

        # Select a sample pair
        select_loc = page.locator("select").first
        select_loc.wait_for(state="visible", timeout=10000)

        for val in select_loc.locator("option").all():
            v = val.get_attribute("value")
            if v and ("identity" in v or "crop" in v):
                select_loc.select_option(value=v)
                break

        page.wait_for_selector(".image-drop-zone.has-image", timeout=10000)

        # Switch Algorithm to SIFT
        algo_select = page.locator("#algorithm-select")
        algo_select.wait_for(state="visible")
        algo_select.select_option("SIFT")

        # Click Run Matching
        match_btn = page.locator("button:has-text('Run Matching')")
        match_btn.click()

        # Wait for SIFT completion
        success_banner = page.locator(".status-banner.success")
        success_banner.wait_for(state="visible", timeout=25000)
        expect(success_banner).to_contain_text("Match Successful")

        # Verify inlier metrics
        expect(page.locator(".metric-card .metric-label:text-is('Inliers')")).to_be_visible()
        expect(page.locator("text=Geometric Verification")).to_be_visible()

        # Capture screenshot
        page.screenshot(path=str(SCREENSHOT_DIR / "03_sift_match_success.png"))

    def test_04_interactive_lightbox_modal(self, page: Page, live_servers: dict):
        page.goto(live_servers["frontend"], wait_until="networkidle")

        # Load and run matching
        select_loc = page.locator("select").first
        select_loc.wait_for(state="visible", timeout=10000)
        for val in select_loc.locator("option").all():
            v = val.get_attribute("value")
            if v and ("identity" in v or "crop" in v):
                select_loc.select_option(value=v)
                break

        page.wait_for_selector(".image-drop-zone.has-image", timeout=10000)
        page.locator("button:has-text('Run Matching')").click()
        page.locator(".status-banner.success").wait_for(state="visible", timeout=20000)

        # Click on zoom link
        zoom_btn = page.locator(".result-image-card .card-title span:has-text('Zoom')").first
        zoom_btn.click()

        # Check lightbox is displayed
        expect(page.locator("text=Scroll to zoom • Click & drag to pan • Press Esc to close")).to_be_visible()
        zoom_in_btn = page.locator("button[title='Zoom In']")
        expect(zoom_in_btn).to_be_visible()

        # Click Zoom In
        zoom_in_btn.click()

        # Capture screenshot of open lightbox
        page.screenshot(path=str(SCREENSHOT_DIR / "04_lightbox_modal_open.png"))

        # Close lightbox via Escape key
        page.keyboard.press("Escape")
        expect(page.locator("text=Scroll to zoom • Click & drag to pan • Press Esc to close")).not_to_be_visible()

    def test_05_unrelated_negative_pair_rejection(self, page: Page, live_servers: dict):
        page.goto(live_servers["frontend"], wait_until="networkidle")

        select_loc = page.locator("select").first
        select_loc.wait_for(state="visible", timeout=10000)

        # Find an unrelated negative pair
        neg_value = ""
        for val in select_loc.locator("option").all():
            v = val.get_attribute("value")
            if v and ("unrelated" in v or "negative" in v):
                neg_value = v
                break

        assert neg_value, "No negative pair found in sample dropdown"
        select_loc.select_option(value=neg_value)

        page.wait_for_selector(".image-drop-zone.has-image", timeout=10000)

        # Run matching on negative pair
        page.locator("button:has-text('Run Matching')").click()

        # Expect failure banner
        failure_banner = page.locator(".status-banner.failure")
        failure_banner.wait_for(state="visible", timeout=20000)

        # Verify failure state text
        banner_text = failure_banner.inner_text().lower()
        assert "insufficient" in banner_text or "failed" in banner_text, f"Unexpected banner text: {banner_text}"

        # Verify empty state for visualizations (no false positive footprint)
        expect(page.locator("text=No geometric visualizations available — matching did not succeed.")).to_be_visible()

        # Capture screenshot
        page.screenshot(path=str(SCREENSHOT_DIR / "05_negative_pair_rejected.png"))

    def test_06_reset_functionality(self, page: Page, live_servers: dict):
        page.goto(live_servers["frontend"], wait_until="networkidle")

        select_loc = page.locator("select").first
        select_loc.wait_for(state="visible", timeout=10000)
        for val in select_loc.locator("option").all():
            v = val.get_attribute("value")
            if v and "identity" in v:
                select_loc.select_option(value=v)
                break

        page.wait_for_selector(".image-drop-zone.has-image", timeout=10000)

        # Click Reset
        reset_btn = page.get_by_role("button", name="Reset", exact=True)
        reset_btn.click()

        # Drop zones should be cleared
        expect(page.locator(".image-drop-zone.has-image")).to_have_count(0)
        expect(page.locator("button:has-text('Run Matching')")).to_be_disabled()

        # Capture screenshot
        page.screenshot(path=str(SCREENSHOT_DIR / "06_reset_state.png"))
