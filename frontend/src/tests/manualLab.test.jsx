import { describe, it, expect } from 'vitest';
import { assessManualResult, MANUAL_CASES } from '../components/manualCases';
const crop=MANUAL_CASES.find(c=>c.id==='crop');
function result(overrides={}) {
 return {status:'success',reference_image:{filename:'real_usgs_harrishill_ref.png'},query_image:{filename:crop.file},estimated_region:{top_left:[220,180],top_right:[759,180],bottom_right:[759,699],bottom_left:[220,699]},...overrides};
}
describe('Known-answer manual validation',()=>{
 it('accepts the expected footprint',()=>expect(assessManualResult(crop,result()).pass).toBe(true));
 it('rejects success with the wrong location',()=>expect(assessManualResult(crop,result({estimated_region:{top_left:[250,180],top_right:[789,180],bottom_right:[789,699],bottom_left:[250,699]}})).pass).toBe(false));
 it('does not assess another image pair',()=>expect(assessManualResult(crop,result({query_image:{filename:'other.png'}}))).toBeNull());
 it('does not mistake a processing error for a correct rejection',()=>{
  const blank=MANUAL_CASES.find(c=>c.id==='blank');
  expect(assessManualResult(blank,result({query_image:{filename:blank.file},status:'processing_error',estimated_region:null})).pass).toBe(false);
  expect(assessManualResult(blank,result({query_image:{filename:blank.file},status:'insufficient_features',estimated_region:null})).pass).toBe(true);
 });
 it('rejects fabricated coordinates on PNG pairs',()=>expect(assessManualResult(crop,result({geographic_footprint:{center:{lat:1,lon:1}}})).pass).toBe(false));
});
