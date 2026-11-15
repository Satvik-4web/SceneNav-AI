"""Generate and verify the six image pairs exposed by ManualTestLab."""
from pathlib import Path
import sys,json
import cv2,numpy as np
ROOT=Path(__file__).resolve().parents[1]
sys.path.insert(0,str(ROOT/'backend'))
from app.services.pipeline import run_matching_pipeline
from app.services.image_loader import load_image_from_path
from app.schemas import MatchParams
ref_path=ROOT/'data/references/real_usgs_harrishill_ref.png'
ref=cv2.imread(str(ref_path));crop=ref[180:700,220:760].copy()
occ=crop.copy();occ[100:300,180:400]=60
for name,img in [('crop',crop),('dim',cv2.convertScaleAbs(crop,alpha=.65,beta=20)),('occluded',occ),('blank',np.full_like(crop,127))]:
 cv2.imwrite(str(ROOT/f'data/queries/manual_{name}.png'),img)
corners=np.array([[220,180],[759,180],[759,699],[220,699]])
cases=[('identity',ref_path,np.array([[0,0],[1023,0],[1023,1023],[0,1023]]))]+[(n,ROOT/f'data/queries/manual_{n}.png',corners) for n in ['crop','dim','occluded']]+[('blank',ROOT/'data/queries/manual_blank.png',None),('unrelated',ROOT/'data/references/real_usgs_greenwood_ref.png',None)]
rows=[]
for name,path,expected in cases:
 r=run_matching_pipeline(load_image_from_path(ref_path),load_image_from_path(path),MatchParams(algorithm='SIFT'))
 error=None
 if expected is not None and r.estimated_region:
  points=np.array([getattr(r.estimated_region,k) for k in ['top_left','top_right','bottom_right','bottom_left']])
  error=float(np.linalg.norm(points-expected,axis=1).mean())
 passed=(r.status.value in ['insufficient_features','insufficient_matches','geometry_failed'] and r.estimated_region is None and r.geographic_footprint is None) if expected is None else (r.status.value=='success' and error is not None and error<3 and r.geographic_footprint is None)
 row=dict(case=name,status=r.status.value,mean_corner_error_px=error,passed=passed,job_id=r.job_id)
 rows.append(row);print(json.dumps(row),flush=True)
out=ROOT/'results/manual_lab';out.mkdir(exist_ok=True)
(out/'verification.json').write_text(json.dumps(rows,indent=2))
assert all(r['passed'] for r in rows),'Manual case did not meet its expected result'
