"""Reproducible custom perturbations of real photos; not independent acquisitions."""
from pathlib import Path
import sys, json
import cv2
import numpy as np
ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / 'backend'))
from app.services.pipeline import run_matching_pipeline
from app.services.image_loader import load_image_from_path
from app.services.evaluation import compute_corner_error
from app.schemas import MatchParams
out = ROOT / 'results/validation_20261114/custom'
out.mkdir(parents=True, exist_ok=True)
ref_path = ROOT / 'data/references/real_usgs_harrishill_ref.png'
ref = cv2.imread(str(ref_path))
crop = ref[180:700, 220:760].copy()
H = np.array([[1.,0,220],[0,1.,180],[0,0,1.]])
rng = np.random.default_rng(14)
noisy = np.clip(crop.astype(float)*0.65 + 24 + rng.normal(0,9,crop.shape),0,255).astype('uint8')
occluded = crop.copy(); occluded[100:300,180:400] = 60
small = cv2.resize(crop,None,fx=.5,fy=.5)
_, jpeg = cv2.imencode('.jpg',noisy,[cv2.IMWRITE_JPEG_QUALITY,35])
cases = [('noisy_compressed',cv2.imdecode(jpeg,1),H,False),('occluded',occluded,H,False),('half_resolution',small,H @ np.array([[2.,0,.5],[0,2.,.5],[0,0,1.]]),False),('blank',np.full_like(crop,127),None,True),('unrelated',cv2.imread(str(ROOT/'data/references/real_usgs_greenwood_ref.png')),None,True)]
rows=[]
for name,img,gt,negative in cases:
    path=out/f'{name}.png'; cv2.imwrite(str(path),img)
    for algorithm in ('ORB','SIFT'):
        r=run_matching_pipeline(load_image_from_path(ref_path),load_image_from_path(path),MatchParams(algorithm=algorithm))
        error=compute_corner_error(np.array(r.homography_matrix),gt,img.shape[1],img.shape[0]) if gt is not None and r.homography_matrix else None
        row=dict(case=name,algorithm=algorithm,status=r.status.value,inliers=r.geometric_inliers,corner_error_px=error,negative=negative,passes=(r.status.value!='success' if negative else r.status.value=='success' and error is not None and error<3),job_id=r.job_id)
        rows.append(row);print(json.dumps(row),flush=True)
(out/'summary.json').write_text(json.dumps({'scope':'New controlled perturbations of existing real photos, NOT independent camera captures. Positive tolerance: mean corner error <3 reference pixels.', 'results':rows},indent=2))
