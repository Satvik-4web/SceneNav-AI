# SceneNav AI — Research Demo Reproducibility Guide
**Package Directory:** `results/demo_readiness_release_20261022/`  
**Experiment Identifier:** `EXP-MUNICH-GEOREF-20261022-RELEASE`  
**Target Architecture:** Windows 10/11 / Linux x86_64 / macOS  

---

## 1. Prerequisites & System Requirements

### Python Environment
- Python 3.10, 3.11, or 3.12
- GDAL / Rasterio compatible environment (or OpenCV + PIL fallback)
- Key libraries: `opencv-python>=4.8`, `numpy>=1.24`, `pillow>=10.0`, `pyproj>=3.5`, `fastapi>=0.104`, `uvicorn>=0.24`, `pydantic>=2.0`

### Frontend Environment
- Node.js 18.x or 20.x
- npm 9.x or 10.x
- Vite + React 18

---

## 2. Setup & Installation

### Step A: Clone & Backend Dependencies
```bash
git clone https://github.com/Satvik-4web/SceneNav-AI.git
cd SceneNav-AI

# Create and activate virtual environment
python -m venv venv
# Windows:
.\venv\Scripts\activate
# Linux/macOS:
source venv/bin/activate

# Install backend dependencies
pip install -r backend/requirements.txt
```

### Step B: Frontend Dependencies
```bash
cd frontend
npm install
cd ..
```

---

## 3. Deterministic Artifact Generation

To regenerate all 7 publication-quality visual figures, the canonical `experiment_record.json`, and cryptographic `manifest.json`:

```bash
python scripts/generate_demo_readiness_artifacts.py
```

### Expected Output Files in `results/demo_readiness_release_20261022/`:
1. `01_feature_correspondences_orb.png` — ORB feature matches (79 inliers / 83.2% ratio)
2. `01_feature_correspondences_sift.png` — SIFT feature matches (138 inliers / 79.8% ratio)
3. `02_georeferenced_footprint_overlay.png` — Two-tone footprint with explicit raster boundary
4. `03_warped_query_registration.png` — 4-panel warped projective registration
5. `04_orb_vs_sift_comparison.png` — Quantitative benchmark table
6. `05_temporal_urban_transformation.png` — 2012 vs 2024 temporal transformation comparison
7. `06_executive_research_overview.png` — 16:9 executive briefing slide
8. `experiment_record.json` — Canonical machine-readable metrics record
9. `manifest.json` — Cryptographic SHA-256 manifest of all artifacts

---

## 4. Running the Research Demonstration

### Start Backend API Server
```bash
python -m uvicorn app.main:app --app-dir backend --host 127.0.0.1 --port 8000
```
- Health Check: `http://127.0.0.1:8000/api/v1/health`
- Research Demonstration Record: `http://127.0.0.1:8000/api/v1/research/demonstration`
- Research Artifacts Endpoint: `http://127.0.0.1:8000/api/v1/research/artifacts/{filename}`

### Start Frontend Dev Server
```bash
cd frontend
npm run dev -- --host 127.0.0.1 --port 5173
```
- Access the demo in your browser at `http://127.0.0.1:5173/`

---

## 5. Automated Verification Checklist

### Verification Commands

1. **Verify Backend Pytest Suite:**
   ```bash
   pytest backend/tests/ -v
   ```
   *Expected: All tests PASS with zero regressions.*

2. **Verify Frontend Unit / Component Tests:**
   ```bash
   cd frontend
   npm test -- --run
   cd ..
   ```
   *Expected: All Vitest suites PASS.*

3. **Verify Production Frontend Build:**
   ```bash
   cd frontend
   npm run build
   cd ..
   ```
   *Expected: Clean Vite production build in `frontend/dist/`.*

4. **Verify Cryptographic Manifest:**
   ```bash
   python -c "
   import json, hashlib, sys
   from pathlib import Path

   pkg = Path('results/demo_readiness_release_20261022')
   with open(pkg / 'manifest.json') as f:
       manifest = json.load(f)

   all_ok = True
   for item in manifest['artifacts']:
       p = pkg / item['filename']
       digest = hashlib.sha256(p.read_bytes()).hexdigest()
       match = (digest == item['sha256'])
       status = 'OK' if match else 'FAIL'
       print(f'[{status}] {item[\"filename\"]}: {digest[:12]}...')
       if not match: all_ok = False

   if not all_ok: sys.exit(1)
   print('All digests match manifest.')
   "
   ```

---

## 6. Troubleshooting Common Issues

| Issue | Root Cause | Solution |
| :--- | :--- | :--- |
| `OpenCV perspectiveTransform error` | Point array shape is `(N, 2)` instead of `(N, 1, 2)`. | Ensure points passed to `cv2.perspectiveTransform` are reshaped with `.reshape(-1, 1, 2)`. |
| `Artifacts 404 in UI` | Backend is pointing to a legacy results folder. | Ensure `_get_research_dir()` in `backend/app/api/routes.py` has `demo_readiness_release_20261022` at highest priority. |
| `Raster Boundary Easting Misalignment` | Reference raster affine origin changed. | Authoritative geotransform origin is `(686700.0, 5332380.0)` with `0.50 m/px` pixel size; East boundary is exactly `686700.0 + 2800 * 0.50 = 688100.0 m`. |
| `Vite Port Collision` | Port 5173 is occupied by a background process. | Specify a custom port via `npm run dev -- --port 5174` or kill the zombie process. |
