# SceneNav AI — Known Limitations

This document describes the known limitations of the current system honestly.
Understanding limitations is as important as understanding capabilities.

---

## 1. Feature Matching Limitations

### Viewpoint changes

ORB is approximately rotation-invariant up to ±30° in-plane rotation and moderately scale-invariant (roughly ±4× scale change). It is not designed for large out-of-plane viewpoint changes (oblique vs. nadir imagery). Matching between images taken from very different angles will degrade severely.

### Parallax

A homography models the transformation of a flat plane. When the scene contains structures at different depths (buildings, terrain relief), parallax causes different parts of the scene to transform differently. A single homography cannot accurately describe such scenes. Matching may still succeed on flat regions but the estimated footprint will be inaccurate.

### Repeated textures

Scenes containing repetitive patterns (e.g. crops, regular building grids) create many ambiguous matches. RANSAC may find a consistent-but-wrong homography in such cases. The inlier count does not distinguish a correct match from a plausible-but-wrong one.

### Texture-poor images

Images of water, sand, snow, or uniform surfaces produce very few keypoints. The pipeline will correctly report `insufficient_features` or `insufficient_matches` and not produce a spurious result.

### Seasonal and illumination differences

ORB is not designed to handle large changes in vegetation state (seasonal difference) or large illumination differences (day vs. night, different sun angles). Match quality will degrade under these conditions.

### Resolution mismatch

If the reference and query images have very different ground sample distances (resolutions), the scale change may exceed what ORB handles reliably. Downsampling the higher-resolution image before matching may help, but this is not automatic.

---

## 2. Geometric Verification Limitations

### Homography model validity

A homography is only appropriate when the scene is approximately planar or when the camera undergoes pure rotation. For non-planar scenes with parallax, the homography will fit the most prominent planar region and treat other parts as outliers. The resulting footprint estimate will only be accurate for the surface the homography was fitted to.

### RANSAC is probabilistic

RANSAC finds a consistent solution but does not guarantee it is the globally optimal or geographically correct one. With few inliers or high noise, it may converge to a locally consistent but globally incorrect homography.

### Minimum inliers are necessary but not sufficient

Meeting the `min_inliers` threshold does not prove that the images show the same location. Sufficiently similar-looking scenes (e.g. identical buildings in different cities) could produce many consistent inliers for a geometrically correct but geographically wrong match.

---

## 3. Geographic Localization Limitations

**The most critical limitation:** SceneNav AI does **not** compute geographic coordinates.

Converting image-plane pixel coordinates to latitude and longitude requires:

1. A valid **georeferenced** reference image (with accurate, measured ground control points or GPS metadata).
2. An accurate **camera model** (focal length, sensor size, distortion parameters).
3. A **terrain model** to account for relief displacement.
4. Knowledge of the camera's **altitude and attitude** at the time of imaging.

None of these are present in this prototype. The "estimated region" output is in reference-image pixel coordinates only. Treating these as geographic coordinates would be incorrect and potentially dangerous in any application requiring navigation accuracy.

---

## 4. System Limitations

### In-memory job store

Job results are stored in a Python dictionary. They are lost when the server restarts. This is acceptable for an MVP research prototype but not for production use.

### Single algorithm

Only ORB is implemented. More modern approaches (SIFT, AKAZE, SuperPoint + SuperGlue, LoFTR, DKM) would offer better performance at the cost of additional dependencies or computational requirements.

### No GPU acceleration

The current pipeline runs on CPU only. ORB is fast enough for the prototype use case (< 0.3 s per pair at 512×512), but for high-resolution imagery or real-time use, GPU-accelerated feature extraction would be needed.

### No streaming or progress updates

The match endpoint is synchronous. For very large images or slow hardware, the HTTP connection is held open for the duration of processing.

---

## 5. What This System Is NOT

- Not a GPS replacement.
- Not a proven navigation system.
- Not validated on real aerial or satellite imagery.
- Not calibrated for geographic accuracy.
- Not suitable for safety-critical applications.

The system is a **research prototype** for exploring image-matching algorithms in an offline, reproducible setting.
