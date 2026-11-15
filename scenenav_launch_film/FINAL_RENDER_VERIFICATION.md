# SceneNav AI Launch Film — Final Render Verification

**Status:** Passed

## Deliverable

- File: `out/scenenav-ai-launch-65s.mp4`
- Container: MP4
- Video: H.264, 1920 × 1080, 30 FPS
- Audio: AAC
- Duration: 65.003 seconds (1,950 frames at 30 FPS)
- Render quality: CRF 18

## Review frames inspected

| Scene | Time | Review outcome |
|---|---:|---|
| Orbital hook | 04s | Three.js Earth, title and satellite-path tension legible. |
| Problem pair | 12s | Reference/query image planes clearly differentiated by scale and orientation. |
| Technology | 23s | Keypoints, accepted correspondences, rejected candidates and image-space disclaimer legible. |
| Transformation | 36.2s | Homography/footprint scene repaired and rechecked: four-corner illuminated quadrilateral is clean and readable. |
| Intelligence | 45s | Four technical dimensions and the uncalibrated-heuristic disclaimer remain readable. |
| Pipeline | 54s | Seven workflow stages are legible and follow the moving evidence pulse. |
| Brand hold | 63s | Wordmark, research-prototype descriptor and tagline remain clean on the final hold. |

## Scientific-accuracy check

- No geographic accuracy, operational validation, benchmark performance, or calibrated-confidence claim is made.
- The film labels the core activity as image-space matching.
- The footprint is presented in reference-raster pixel space.
- The reliability index is explicitly identified as an uncalibrated heuristic, not a probability of correct geographical localization.

## Re-render

From this folder, first create a bundle and then render using a locally installed Chrome executable:

```powershell
npx remotion bundle src/index.tsx --out-dir out/bundle
npx remotion render out/bundle SceneNavLaunch65 out/scenenav-ai-launch-65s.mp4 --codec=h264 --crf=18 --browser-executable="C:\Program Files\Google\Chrome\Application\chrome.exe" --concurrency=4
```
