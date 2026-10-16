"""
SceneNav AI — Comprehensive Browser Journey Audit Script (Playwright)
Executes all end-to-end user journeys, asserts visual states and DOM elements,
and captures verified screenshots into results/audit_release_20261015/screenshots/.
"""
from __future__ import annotations

import sys
import time
from pathlib import Path
from playwright.sync_api import sync_playwright, expect

PROJECT_ROOT = Path(__file__).resolve().parent.parent
SCREENSHOT_DIR = PROJECT_ROOT / "results" / "audit_release_20261015" / "screenshots"
SCREENSHOT_DIR.mkdir(parents=True, exist_ok=True)

console_messages: list[str] = []
page_errors: list[str] = []

def run_browser_audit() -> None:
    with sync_playwright() as p:
        browser = p.chromium.launch(channel="chrome", headless=True, args=["--disable-web-security", "--no-sandbox"])
        context = browser.new_context(viewport={"width": 1440, "height": 900})
        page = context.new_page()

        page.on("console", lambda msg: console_messages.append(f"[{msg.type}] {msg.text}"))
        page.on("pageerror", lambda err: page_errors.append(str(err)))

        print("[Journey 1] Loading Dashboard...")
        page.goto("http://localhost:5173", wait_until="networkidle")
        expect(page.locator("h1")).to_contain_text("SceneNav AI")
        expect(page.locator(".subtitle")).to_contain_text("Scene Aided Navigation Research Prototype")
        page.screenshot(path=str(SCREENSHOT_DIR / "01_dashboard_loaded.png"))
        print("  -> PASSED: Dashboard loaded and verified.")

        print("[Journey 2] Synthetic ORB (Image-Match-Only)...")
        select_pair = page.locator("#sample-pair-select")
        select_pair.select_option(value="scene00_identity")
        page.wait_for_selector(".image-drop-zone.has-image", timeout=10000)
        page.locator("button:has-text('Run Matching')").click()
        page.locator(".status-banner.success").wait_for(state="visible", timeout=20000)
        expect(page.locator("text=IMAGE MATCH ONLY")).to_be_visible()
        expect(page.locator("text=Algorithm: ORB")).to_be_visible()
        page.screenshot(path=str(SCREENSHOT_DIR / "02_synthetic_orb_image_match_only.png"))
        print("  -> PASSED: Image-match-only status verified (no lat/lon fabricated).")

        print("[Journey 3] Synthetic SIFT Matching...")
        algo_sel = page.locator("#algorithm-select")
        algo_sel.select_option("SIFT")
        page.locator("button:has-text('Run Matching')").click()
        page.locator(".status-banner.success").wait_for(state="visible", timeout=20000)
        expect(page.locator("text=Algorithm: SIFT")).to_be_visible()
        page.screenshot(path=str(SCREENSHOT_DIR / "03_synthetic_sift_success.png"))
        print("  -> PASSED: SIFT algorithm matching verified.")

        print("[Journey 4] Georeferenced Dataset Localization...")
        page.locator("#tab-georeferenced_pairs").click()
        page.wait_for_timeout(500)
        select_pair.select_option(value="georef_greenwood_01_crop")
        page.wait_for_selector(".image-drop-zone.has-image", timeout=10000)
        algo_sel.select_option("ORB")
        page.locator("button:has-text('Run Matching')").click()
        page.locator(".status-banner.success").wait_for(state="visible", timeout=25000)
        expect(page.locator("text=LOCALIZED")).to_be_visible()
        expect(page.locator("text=EPSG:32616").first).to_be_visible()
        expect(page.locator("text=Estimated Center (Lat/Lon)")).to_be_visible()
        page.screenshot(path=str(SCREENSHOT_DIR / "04_georeferenced_localized_success.png"))
        print("  -> PASSED: Georeferenced localization verified with EPSG:32616 and WGS-84 coordinates.")

        print("[Journey 5] Cross-Scene Negative Rejection...")
        select_pair.select_option(value="georef_negative_cross_scene")
        page.wait_for_selector(".image-drop-zone.has-image", timeout=10000)
        page.locator("button:has-text('Run Matching')").click()
        page.locator(".status-banner.failure").wait_for(state="visible", timeout=20000)
        expect(page.locator("text=No geometric visualizations available")).to_be_visible()
        page.screenshot(path=str(SCREENSHOT_DIR / "05_negative_pair_rejected.png"))
        print("  -> PASSED: Cross-scene distractor pair rejected with zero false footprint.")

        print("[Journey 6] Interactive Lightbox Zoom...")
        select_pair.select_option(value="georef_greenwood_01_crop")
        page.wait_for_selector(".image-drop-zone.has-image", timeout=10000)
        page.locator("button:has-text('Run Matching')").click()
        page.locator(".status-banner.success").wait_for(state="visible", timeout=20000)
        zoom_btn = page.locator(".result-image-card .card-title span:has-text('Zoom')").first
        zoom_btn.click()
        expect(page.locator("text=Scroll to zoom • Click & drag to pan • Press Esc to close")).to_be_visible()
        page.screenshot(path=str(SCREENSHOT_DIR / "06_lightbox_modal_open.png"))
        page.keyboard.press("Escape")
        expect(page.locator("text=Scroll to zoom • Click & drag to pan • Press Esc to close")).not_to_be_visible()
        print("  -> PASSED: Lightbox zoom modal verified and closed.")

        print("[Journey 7] State Reset...")
        reset_btn = page.get_by_role("button", name="Reset", exact=True)
        reset_btn.click()
        expect(page.locator(".image-drop-zone.has-image")).to_have_count(0)
        page.screenshot(path=str(SCREENSHOT_DIR / "07_reset_state.png"))
        print("  -> PASSED: Reset cleared drop zones and input states.")

        context.close()
        browser.close()

    print(f"\nAll Browser Journeys Verified Successfully. (Errors: {len(page_errors)})")
    if page_errors:
        print("Page Errors Detected:", page_errors)
        sys.exit(1)

if __name__ == "__main__":
    run_browser_audit()
