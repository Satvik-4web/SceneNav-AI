const REF = 'real_usgs_harrishill_ref.png';
const cropCorners = [[220,180],[759,180],[759,699],[220,699]];
export const MANUAL_CASES = [
  {id:'identity',name:'Same image',icon:'01',detail:'The simplest sanity check',category:'references',file:REF,corners:[[0,0],[1023,0],[1023,1023],[0,1023]],expect:'Footprint covers the whole reference. Corner error below 3 px.'},
  {id:'crop',name:'Find the crop',icon:'02',detail:'A location with a known answer',file:'manual_crop.png',corners:cropCorners,expect:'Footprint corners: (220,180), (759,180), (759,699), (220,699). Mean corner error below 3 px.'},
  {id:'dim',name:'Change the light',icon:'03',detail:'Same location, darker scene',file:'manual_dim.png',corners:cropCorners,expect:'Same footprint as the crop despite reduced brightness. Mean corner error below 3 px.'},
  {id:'occlusion',name:'Hide part of it',icon:'04',detail:'A section of the image is covered',file:'manual_occluded.png',corners:cropCorners,expect:'Same crop footprint using the visible features. Mean corner error below 3 px.'},
  {id:'blank',name:'No visual clues',icon:'05',detail:'A uniform grey query',file:'manual_blank.png',negative:true,expect:'Reject: insufficient features or another explicit matching failure. No estimated region or coordinates.'},
  {id:'unrelated',name:'Wrong location',icon:'06',detail:'A different aerial scene',category:'references',file:'real_usgs_greenwood_ref.png',negative:true,expect:'Reject the pair. Do not return a footprint or geographic position.'},
];
export function assessManualResult(test, result) {
  if (!test || !result) return null;
  if (result.reference_image?.filename !== REF || result.query_image?.filename !== test.file) return null;
  if (test.negative) {
    const rejected = ['insufficient_features','insufficient_matches','geometry_failed'].includes(result.status);
    return {pass:rejected && !result.estimated_region && !result.geographic_footprint, text:rejected ? 'Pair rejected; checking that no footprint was returned.' : 'Expected a matching rejection, not an accepted result or unrelated processing error.'};
  }
  const r=result.estimated_region;
  const points=r && [r.top_left,r.top_right,r.bottom_right,r.bottom_left];
  if (result.status !== 'success' || !points?.every(p=>Array.isArray(p)&&p.length===2&&p.every(Number.isFinite))) return {pass:false,text:'Expected a successful match with four finite footprint corners.'};
  const error=points.reduce((sum,p,i)=>sum+Math.hypot(p[0]-test.corners[i][0],p[1]-test.corners[i][1]),0)/4;
  return {pass:error<3 && !result.geographic_footprint,text:`Mean corner error: ${error.toFixed(3)} px / target: below 3 px. PNG test: no geographic coordinates expected.`};
}
