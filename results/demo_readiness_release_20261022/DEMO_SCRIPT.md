# SceneNav AI — Research Demonstration Walkthrough Script
**Demonstration Reference:** `EXP-MUNICH-GEOREF-20261022-RELEASE`  
**Duration:** 3–5 Minutes  
**Audience:** Research Reviewers, Geospatial Engineers, Project Stakeholders  
**Target URL:** `http://127.0.0.1:5173/` (Munich Cadastral Demonstration Tab)

---

## Overview & Demo Narrative
SceneNav AI is an offline, GPS-denied visual localization system that estimates the geodetic position and ground footprint of an airborne camera by matching its imagery against georeferenced cadastral orthophotos.

This walkthrough demonstrates the end-to-end localization of a high-resolution aerial photograph over Munich, Germany, achieving sub-meter cross-algorithmic agreement against Bavarian land-survey reference data.

---

## 3–5 Minute Step-by-Step Walkthrough

### 0:00 – 0:45 | Scene Setting & The Visual Localization Problem
- **Action:** Open the dashboard at `http://127.0.0.1:5173/` and navigate to the **Munich Cadastral Demo** panel.
- **Narrative:**
  > "In GPS-denied or electronic-warfare environments, aerial platforms cannot rely on satellite navigation for positioning. SceneNav AI solves this by matching visual features from downward-looking aerial cameras directly against pre-ingested, georeferenced orthophoto maps.
  >
  > Here, our query image is an oblique-to-nadir aerial photograph captured by the German Aerospace Center (DLR) 3K sensor system over Munich at 1,076 m altitude above ground level. Our reference is a 0.50 m/px cadastral orthophoto tile from the Bavarian State Surveying Office (EPSG:25832 UTM Zone 32N)."

---

### 0:45 – 1:30 | Feature Matching: SIFT vs. ORB
- **Action:** Click the **SIFT Correspondences (138 Inliers)** tab, then briefly switch to the **ORB Correspondences (79 Inliers)** tab. Open lightbox (click image) to zoom into building rooftops.
- **Narrative:**
  > "First, we extract invariant features across both query and reference rasters.
  >
  > SIFT extracts 5,000 keypoints across a scale-space pyramid. Following Lowe's ratio test (0.75 threshold) and RANSAC geometric consensus, SIFT confirms 138 spatial inliers with a 79.8% inlier ratio.
  >
  > When we evaluate ORB—our fast binary alternative—it achieves 79 inliers at an 83.2% ratio in just 3.7 seconds. Both algorithms easily exceed our 10-inlier safety gate, establishing solid geometric consensus across building roofs, intersections, and rail infrastructure."

---

### 1:30 – 2:30 | Georeferenced Footprint & Raster Boundary Containment
- **Action:** Select the **Cadastral Footprint (94.8% / 5.2% Split)** tab. Highlight the two-tone polygon and the dashed gold boundary line.
- **Narrative:**
  > "Next, we project the camera's full image frame onto the Earth's surface using the verified homography matrix.
  >
  > Notice the two distinct zones of the ground footprint:
  > - **Solid Cyan Zone (94.79% / 32.15 ha):** This portion lies fully within our Bavarian reference tile. Every feature supporting the registration was observed and verified here.
  > - **Dashed Amber Zone (5.21% / 1.77 ha):** The query's eastern edge extends past Easting 688,100 m. Because our reference tile ends here, this eastern wedge is a rigorous projective extrapolation.
  >
  > Unlike typical visual systems that silently draw an entire box as if confirmed, SceneNav AI explicitly demarcates the tile boundary at Easting 688,100 m. We never claim visual confirmation for land outside the ingested tile."

---

### 2:30 – 3:15 | Cross-Algorithm Agreement & Centroid Consistency
- **Action:** Scroll down to the **Audited Coordinates & Repeatability Table**.
- **Narrative:**
  > "To verify that the computed position does not depend on an idiosyncratic descriptor, we compare independent ORB and SIFT estimates:
  > - SIFT Centroid: `E = 687,788.70 m, N = 5,331,662.71 m`
  > - ORB Centroid:  `E = 687,789.11 m, N = 5,331,662.79 m`
  > - Inter-algorithm displacement: **0.42 m (42 cm)**.
  >
  > Under identical reference geometry, two completely different mathematical detectors agree to within 42 cm. In the coordinates tab, we also document that the 227 m² area difference between ORB (338,934 m²) and SIFT (339,161 m²) is simply the slight polygon expansion from SIFT's wider peripheral feature matches—a difference of just 0.067%."

---

### 3:15 – 4:00 | Temporal Transformation & False-Lock Prevention
- **Action:** Switch to the **Temporal Transformation (2012 vs 2024)** tab.
- **Narrative:**
  > "A mission-critical visual system must know when NOT to localize.
  >
  > When we test the identical query image against modern 2024 municipal orthophotos of the same coordinates, SIFT produces only 6 inliers and ORB produces 5 inliers.
  >
  > Why? Between 2012 and 2024, Munich constructed the €398M Heckenstaller-Tunnel. The surface highway visible in 2011 was moved underground, replaced by 2.7 hectares of parkland and acoustic barriers.
  >
  > Because inliers fell well below our 10-inlier safety threshold, SceneNav AI automatically rejected the run. This proves that our geometric consensus filter rejects obsolete reference maps rather than producing catastrophic false locks."

---

### 4:00 – 4:45 | Scientific Integrity & Operational Boundaries
- **Action:** Open the **Disclosures** tab and highlight the five core caveats.
- **Narrative:**
  > "In scientific reporting, precision and honesty are paramount:
  > 1. **Repeatability vs. Accuracy:** The 0.42 m delta measures inter-algorithm repeatability; it is not surveyed ground accuracy.
  > 2. **Reference GSD:** 0.50 m/px is the raster Ground Sampling Distance, not an RMS error.
  > 3. **Camera Pitch:** The 2.90° pitch angle is an inferred geometric estimate; no gyro/IMU was present in the camera EXIF.
  > 4. **No Surveyed GCPs:** Coordinate transformations are purely digital affine mappings from the Bavarian state cadastral system.
  > 5. **Prototype Readiness:** This is an offline research prototype designed for algorithmic validation, not certified flight avionics."

---

### 4:45 – 5:00 | Conclusion & Artifact Export
- **Action:** Click **Export experiment_record.json** to demonstrate export capability.
- **Narrative:**
  > "All metrics, figures, and matrices are deterministically reproducible and exportable in machine-readable JSON with SHA-256 cryptographic manifests. This concludes the SceneNav AI demonstration."
