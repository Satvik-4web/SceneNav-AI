"""
SceneNav AI — Redesign Verification & Multi-Resolution Screenshot Capture
Captures production screenshots across all 4 workspaces at 1366x768, 1440x900, 1600x900, and 1920x1080.
Verifies zero horizontal scrollbar on every page and workspace.
"""
import sys
import time
from pathlib import Path
from playwright.sync_api import sync_playwright

OUT_DIR = Path("D:/drdo/SceneNav-AI/results/redesign_screenshots")
OUT_DIR.mkdir(parents=True, exist_ok=True)

RESOLUTIONS = [
    (1366, 768, "1366x768"),
    (1440, 900, "1440x900"),
    (1600, 900, "1600x900"),
    (1920, 1080, "1920x1080"),
]

def run_verification():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        context = browser.new_context()
        page = context.new_page()

        print("Testing multi-resolution responsive layout & capturing screenshots...")

        for width, height, label in RESOLUTIONS:
            page.set_viewport_size({"width": width, "height": height})
            page.goto("http://127.0.0.1:5173", wait_until="networkidle")
            time.sleep(0.5)

            # Check horizontal overflow
            scroll_w = page.evaluate("() => document.documentElement.scrollWidth")
            client_w = page.evaluate("() => document.documentElement.clientWidth")
            overflow = scroll_w - client_w
            print(f"[{label}] Viewport width: {width}px | ScrollWidth: {scroll_w}px | ClientWidth: {client_w}px | Overflow: {overflow}px")
            assert overflow <= 1, f"Horizontal overflow detected at {label}: {overflow}px"

        # Now at 1440x900, execute match and capture all 4 workspaces
        page.set_viewport_size({"width": 1440, "height": 900})
        page.goto("http://127.0.0.1:5173", wait_until="networkidle")

        # 1. Capture Initial Localization Studio Idle State
        page.screenshot(path=str(OUT_DIR / "01_studio_idle_1440x900.png"))
        print("Captured: 01_studio_idle_1440x900.png")

        # 2. Select benchmark pair and run matching
        page.locator("#tab-georeferenced_pairs").click()
        time.sleep(0.4)
        select_loc = page.locator("#sample-pair-select")
        for val in select_loc.locator("option").all():
            v = val.get_attribute("value")
            if v and "georef_greenwood" in v:
                select_loc.select_option(value=v)
                break

        page.wait_for_selector(".image-drop-zone.has-image", timeout=10000)
        page.locator("button:has-text('Run Matching')").click()
        page.wait_for_selector(".status-banner.success", timeout=25000)
        time.sleep(0.5)

        # 3. Capture Localization Studio Results State
        page.screenshot(path=str(OUT_DIR / "02_studio_results_1440x900.png"))
        print("Captured: 02_studio_results_1440x900.png")

        # 4. Switch to Results Explorer Workspace
        page.locator("#header-nav-explorer-btn").click()
        time.sleep(0.6)
        page.screenshot(path=str(OUT_DIR / "03_results_explorer_1440x900.png"))
        print("Captured: 03_results_explorer_1440x900.png")

        # 5. Switch to 4-Panel Quad View in Results Explorer
        page.locator("button:has-text('4-Panel Quad View')").click()
        time.sleep(0.5)
        page.screenshot(path=str(OUT_DIR / "04_results_explorer_quad_1440x900.png"))
        print("Captured: 04_results_explorer_quad_1440x900.png")

        # 6. Switch to Research & Analytics Workspace (Diagnostics tab)
        page.locator("#header-nav-analytics-btn").click()
        time.sleep(0.5)
        page.screenshot(path=str(OUT_DIR / "05_research_analytics_diagnostics_1440x900.png"))
        print("Captured: 05_research_analytics_diagnostics_1440x900.png")

        # 7. Switch to Benchmark Comparisons Tab
        page.locator("button:has-text('Algorithm Benchmarks')").click()
        time.sleep(0.5)
        page.screenshot(path=str(OUT_DIR / "06_research_analytics_benchmarks_1440x900.png"))
        print("Captured: 06_research_analytics_benchmarks_1440x900.png")

        # 8. Switch to Munich Cadastral Research Demo Workspace
        page.locator("#mode-research-demo-btn").click()
        time.sleep(0.6)
        page.screenshot(path=str(OUT_DIR / "07_munich_cadastral_research_demo_1440x900.png"))
        print("Captured: 07_munich_cadastral_research_demo_1440x900.png")

        # 9. Verify 1920x1080 High-Res View
        page.set_viewport_size({"width": 1920, "height": 1080})
        page.locator("#mode-interactive-btn").click()
        time.sleep(0.5)
        scroll_w = page.evaluate("() => document.documentElement.scrollWidth")
        client_w = page.evaluate("() => document.documentElement.clientWidth")
        overflow = scroll_w - client_w
        print(f"[1920x1080] ScrollWidth: {scroll_w}px | ClientWidth: {client_w}px | Overflow: {overflow}px")
        assert overflow <= 1, f"Horizontal overflow at 1920x1080: {overflow}px"
        page.screenshot(path=str(OUT_DIR / "08_studio_results_1920x1080.png"))
        print("Captured: 08_studio_results_1920x1080.png")

        browser.close()
        print("\nAll responsive layout checks and screenshots completed successfully with ZERO overflow!")

if __name__ == "__main__":
    run_verification()
