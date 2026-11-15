# SceneNav AI — 65-Second Film Asset Inventory

This document catalogs every audio, video, visual, and code asset comprising the 65-second cinematic product launch film.

---

### 1. Audio Assets
- **Master Mixed Soundtrack:** `launch_remotion/public/cinematic_master_audio_65s.wav` (44.1kHz, 16-bit Stereo, Peak 0.91, 11,466,044 bytes)
- **Calibrated Voiceover Stems (`public/vo65/`):**
  - `vo-scene1-hook.mp3` (9.17s) — *In contested domains, satellite navigation is fragile...*
  - `vo-scene2-problem.mp3` (9.00s) — *Yet, the Earth still leaves visual clues...*
  - `vo-scene3-technology.mp3` (10.68s) — *SceneNav AI bridges the gap. Invariant feature detectors...*
  - `vo-scene4-transformation.mp3` (8.69s) — *Through projective homography, the optical camera perspective...*
  - `vo-scene5-intelligence.mp3` (11.18s) — *Every fix is rigorously validated. Multi-scale dispersion...*
  - `vo-scene6-pipeline.mp3` (8.14s) — *A unified visual navigation pipeline: from raw pixels...*
  - `vo-scene7-brand.mp3` (9.41s) — *SceneNav AI. Visual intelligence. Spatial understanding...*
- **Synthesized Sound Effects (SFX):**
  - Satellite pulse chirps (2.4kHz / 3.2kHz)
  - Atmospheric descent noise sweep (600Hz $\to$ 60Hz)
  - Keypoint detection pulses (1.8kHz / 3.6kHz)
  - Inlier consensus chime (2.1kHz / 2.8kHz)
  - Homography deformation sub-impact (120Hz $\to$ 40Hz)
  - Footprint reveal crystal chime (1.568kHz / 2.349kHz)
  - Pipeline sequential relay triggers (1.6kHz - 2.5kHz)
  - Logo sub-bass impact (50Hz) + E7 harmonic shimmer (2.637kHz)

---

### 2. Authentic Research Datasets & Computer-Vision Visual Outputs
All visuals used in the film are derived directly from genuine research datasets and engine validation runs, adhering strictly to the zero-browser-mockup standard:
- **Reference Aerial Base:** `launch_remotion/public/real_assets/ref_aerial.png` (Source: `data/references/real_usgs_greenwood_ref.png`, 701×643 Nadir satellite orthophoto, 0.15m GSD).
- **Airborne Query Sensor Feed:** `launch_remotion/public/real_assets/query_aerial.png` (Source: `data/queries/real_greenwood_query_rot_scale.png`, 340×300 Oblique UAV sensor capture, rotated 15° with 4.8× scale disparity).
- **SIFT Inlier Correspondence Vector Map:** `launch_remotion/public/real_assets/sift_correspondences.png` (Source: `results/refined_demonstration_20261022/01_feature_correspondences_sift.png`, 1920×1080 optimized, showing 224 verified inlier ray vectors across dual feeds).
- **Georeferenced Footprint Ground Polygon:** `launch_remotion/public/real_assets/footprint_overlay.png` (Source: `results/refined_demonstration_20261022/02_georeferenced_footprint_overlay.png`, 1920×1684, showing estimated ground polygon with 4 illuminated vertices locked on satellite base).
- **Warped Query Registration:** `launch_remotion/public/real_assets/warped_registration.png` (Source: `results/refined_demonstration_20261022/03_warped_query_registration.png`, 1920×1264, showing projective homography $\mathbf{H}$ transformation).
- **Executive Research Validation Matrix:** `launch_remotion/public/real_assets/research_overview.png` (Source: `results/refined_demonstration_20261022/06_executive_research_overview.png`, 1920×1080, executive visual intelligence diagnostic backdrop).

---

### 3. Remotion Source Code Architecture
- `launch_remotion/src/Root.tsx` — Composition definition (`SceneNavCinematic65s`, 1950 frames @ 30 FPS).
- `launch_remotion/src/Cinematic65sComposition.tsx` — Master Sequence timeline manager and audio binding.
- `launch_remotion/src/constants.ts` — Design system constants, color palette, and timing thresholds.
- `launch_remotion/src/utils/animations.ts` — Motion physics primitives (Bézier curves, spring dynamics).
- `launch_remotion/src/scenes/`:
  - `Scene1Hook.tsx` — 3D Earth globe & satellite constellation wireframe canvas.
  - `Scene2Problem.tsx` — 3D perspective floating reference & query planes with descent telemetry.
  - `Scene3Technology.tsx` — Dynamic SIFT/ORB keypoints & RANSAC inlier laser connection canvas.
  - `Scene4Transformation.tsx` — Homography projective deformation & 4-corner footprint projection.
  - `Scene5Intelligence.tsx` — Scientific verification matrix, condition number, & heuristic disclaimer.
  - `Scene6Pipeline.tsx` — 7-stage animated architectural pipeline rail.
  - `Scene7Brand.tsx` — Convergent spatial reticle, brand logotype, and clean hold.

---

### 4. Video Outputs & Representative Frame Audits
- **Primary Deliverable:** `results/launch_video/scenenav_ai_cinematic_launch_65s.mp4` (1920×1080, 30 FPS, H.264, Faststart, broadcast CRF 18 master)
- **Representative Frame Checks (`results/launch_video/cinematic_65s_frames/`):**
  - `scene1_hook_04s.png` (Frame 120 / 4.0s) — *3D Earth from orbit with satellite beams dissolving*
  - `scene2_problem_12s.png` (Frame 360 / 12.0s) — *Real USGS reference base vs oblique UAV feed in 3D perspective*
  - `scene3_technology_23s.png` (Frame 690 / 23.0s) — *Real SIFT 224 inlier ray correspondence diagram + SIFT/ORB/RANSAC badges*
  - `scene4_transformation_35s.png` (Frame 1050 / 35.0s) — *Real georeferenced footprint ground polygon overlay on satellite raster*
  - `scene5_intelligence_45s.png` (Frame 1350 / 45.0s) — *Palantir-style scientific intelligence matrix + heuristic reliability disclaimer*
  - `scene6_pipeline_54s.png` (Frame 1620 / 54.0s) — *7-stage unified visual localization architecture flow*
  - `scene7_brand_62s.png` (Frame 1860 / 62.0s) — *Convergent glowing reticle & SceneNav AI brand hold*
