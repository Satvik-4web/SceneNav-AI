"""
SceneNav AI — LinkedIn Launch Video Choreographer & Recorder
Uses Playwright to record a high-definition 1080p walkthrough of the application,
and FFmpeg to encode the final polished launch video.
"""
import time
import os
import shutil
import subprocess
from pathlib import Path
from playwright.sync_api import sync_playwright

BASE_URL = "http://127.0.0.1:5173"
OUT_DIR = Path("D:/drdo/SceneNav-AI/results/launch_video")
RAW_DIR = OUT_DIR / "raw"
FINAL_VIDEO = OUT_DIR / "scenenav_ai_linkedin_launch.mp4"

def smooth_mouse_move(page, start_x, start_y, end_x, end_y, steps=25, delay=0.015):
    for i in range(1, steps + 1):
        x = start_x + (end_x - start_x) * (i / steps)
        y = start_y + (end_y - start_y) * (i / steps)
        page.mouse.move(x, y)
        time.sleep(delay)

def record_choreography():
    if RAW_DIR.exists():
        shutil.rmtree(RAW_DIR)
    RAW_DIR.mkdir(parents=True, exist_ok=True)

    print("Launching browser with 1920x1080 recording context...")
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        context = browser.new_context(
            viewport={"width": 1920, "height": 1080},
            record_video_dir=str(RAW_DIR),
            record_video_size={"width": 1920, "height": 1080},
        )
        page = context.new_page()

        # SCENE 1: Initial Pitch-Black Tactical Dashboard Load (0:00 - 0:06)
        print("Scene 1: Loading application...")
        page.goto(BASE_URL, wait_until="networkidle")
        page.wait_for_timeout(2000)

        # Subtle mouse hover over header and brand
        smooth_mouse_move(page, 960, 500, 200, 35, steps=30)
        page.wait_for_timeout(1000)

        # Hover across navigation tabs
        smooth_mouse_move(page, 200, 35, 600, 35, steps=25)
        page.wait_for_timeout(500)
        smooth_mouse_move(page, 600, 35, 750, 35, steps=20)
        page.wait_for_timeout(500)
        smooth_mouse_move(page, 750, 35, 950, 35, steps=20)
        page.wait_for_timeout(1000)

        # SCENE 2: Select Georeferenced Benchmark Test Pair (0:06 - 0:14)
        print("Scene 2: Selecting georeferenced dataset...")
        smooth_mouse_move(page, 950, 35, 300, 150, steps=30)
        page.wait_for_timeout(500)

        # Click Georef GeoTIFF tab
        georef_tab = page.locator("#tab-georeferenced_pairs")
        if georef_tab.is_visible():
            box = georef_tab.bounding_box()
            if box:
                smooth_mouse_move(page, 300, 150, box["x"] + box["width"]/2, box["y"] + box["height"]/2, steps=20)
                georef_tab.click()
                page.wait_for_timeout(1000)

        # Select sample pair
        select_loc = page.locator("#sample-pair-select")
        select_loc.wait_for(state="visible", timeout=10000)
        box = select_loc.bounding_box()
        if box:
            smooth_mouse_move(page, 300, 180, box["x"] + box["width"]/2, box["y"] + box["height"]/2, steps=20)
        
        # Select first georef pair
        options = select_loc.locator("option").all()
        if len(options) > 1:
            val = options[1].get_attribute("value")
            select_loc.select_option(val)
            print(f"Selected pair: {val}")
        
        # Wait for images to load into dropzones
        page.wait_for_timeout(2000)

        # Hover over reference image dropzone then query image dropzone
        smooth_mouse_move(page, 200, 200, 200, 260, steps=25)
        page.wait_for_timeout(800)
        smooth_mouse_move(page, 200, 260, 200, 400, steps=25)
        page.wait_for_timeout(800)

        # SCENE 3: Run Matching & Live Pipeline Telemetry (0:14 - 0:24)
        print("Scene 3: Triggering Run Matching...")
        run_btn = page.locator("button:has-text('Run Matching')")
        box = run_btn.bounding_box()
        if box:
            smooth_mouse_move(page, 200, 400, box["x"] + box["width"]/2, box["y"] + box["height"]/2, steps=25)
            page.wait_for_timeout(600)
            run_btn.click()

        # Telemetry radar active state
        page.wait_for_timeout(2000)
        # Wait for matching results
        page.wait_for_selector(".results-summary-card", timeout=15000)
        print("Match complete!")
        page.wait_for_timeout(2500)

        # SCENE 4: Visualizing Results & Lightbox Zoom (0:24 - 0:34)
        print("Scene 4: Inspecting visual results...")
        # Smooth scroll down to examine metrics and visualizations
        for _ in range(6):
            page.mouse.wheel(0, 100)
            time.sleep(0.15)
        page.wait_for_timeout(1500)

        # Click Zoom on the first visualization card
        zoom_btn = page.locator(".result-image-card .card-title span:has-text('Zoom')").first
        if zoom_btn.is_visible():
            box = zoom_btn.bounding_box()
            if box:
                smooth_mouse_move(page, 960, 500, box["x"] + box["width"]/2, box["y"] + box["height"]/2, steps=25)
                page.wait_for_timeout(500)
                zoom_btn.click()
                page.wait_for_timeout(1500)

                # Zoom in inside Lightbox
                zoom_in = page.locator("button[title='Zoom In']")
                if zoom_in.is_visible():
                    zoom_in.click()
                    page.wait_for_timeout(500)
                    zoom_in.click()
                    page.wait_for_timeout(1000)

                # Close lightbox with Escape
                page.keyboard.press("Escape")
                page.wait_for_timeout(1200)

        # Scroll back up smoothly
        for _ in range(6):
            page.mouse.wheel(0, -100)
            time.sleep(0.12)
        page.wait_for_timeout(1000)

        # SCENE 5: Munich Cadastral Research Demo (0:34 - 0:46)
        print("Scene 5: Munich Cadastral Research Demo...")
        munich_tab = page.locator("#mode-research-demo-btn")
        box = munich_tab.bounding_box()
        if box:
            smooth_mouse_move(page, 500, 300, box["x"] + box["width"]/2, box["y"] + box["height"]/2, steps=30)
            page.wait_for_timeout(500)
            munich_tab.click()
            page.wait_for_timeout(2000)

        # Click Cadastral Footprint
        page.locator("button:has-text('Cadastral Footprint')").click()
        page.wait_for_timeout(1800)

        # Click SIFT Correspondences
        page.locator("button:has-text('SIFT Correspondences')").click()
        page.wait_for_timeout(1800)

        # Click Temporal Transformation
        page.locator("button:has-text('Temporal Transformation')").click()
        page.wait_for_timeout(1500)

        # Drag multi-temporal crossfade slider
        slider = page.locator("input[type='range']").first
        if slider.is_visible():
            slider_box = slider.bounding_box()
            if slider_box:
                # Move to start of slider
                smooth_mouse_move(page, 960, 500, slider_box["x"] + 10, slider_box["y"] + slider_box["height"]/2, steps=20)
                page.wait_for_timeout(400)
                # Sweep slider to 100%
                slider.fill("100")
                page.wait_for_timeout(1200)
                slider.fill("50")
                page.wait_for_timeout(1000)

        # Switch back to Executive 16:9 Overview
        page.locator("button:has-text('Executive 16:9 Overview')").click()
        page.wait_for_timeout(2000)

        # SCENE 6: Research Analytics Workspace (0:46 - 0:54)
        print("Scene 6: Research Analytics Workspace...")
        analytics_tab = page.locator("#header-nav-analytics-btn")
        box = analytics_tab.bounding_box()
        if box:
            smooth_mouse_move(page, 960, 500, box["x"] + box["width"]/2, box["y"] + box["height"]/2, steps=25)
            analytics_tab.click()
            page.wait_for_timeout(2500)

        # Smooth pan over analytics table and diagnostics
        for _ in range(4):
            page.mouse.wheel(0, 80)
            time.sleep(0.15)
        page.wait_for_timeout(2500)

        print("Recording finished. Closing context...")
        context.close()
        browser.close()

def postprocess_video():
    video_files = list(RAW_DIR.glob("*.webm"))
    if not video_files:
        print("No recorded webm found in raw directory!")
        return False
    
    raw_video = video_files[0]
    print(f"Found raw video: {raw_video} ({raw_video.stat().st_size} bytes)")

    # Use FFmpeg to transcode to pristine 1080p 60fps MP4 with high-profile H.264
    cmd = [
        "ffmpeg", "-y",
        "-i", str(raw_video),
        "-c:v", "libx264",
        "-preset", "medium",
        "-crf", "18",
        "-pix_fmt", "yuv420p",
        "-r", "60",
        "-movflags", "+faststart",
        str(FINAL_VIDEO),
    ]
    print(f"Running FFmpeg: {' '.join(cmd)}")
    res = subprocess.run(cmd, capture_output=True, text=True)
    if res.returncode == 0 and FINAL_VIDEO.exists():
        print(f"Final launch video generated successfully: {FINAL_VIDEO} ({FINAL_VIDEO.stat().st_size} bytes)")
        return True
    else:
        print(f"FFmpeg failed: {res.stderr}")
        return False

if __name__ == "__main__":
    record_choreography()
    postprocess_video()
