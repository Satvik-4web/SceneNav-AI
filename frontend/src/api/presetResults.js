/**
 * SceneNav AI — Preset Fallback Results Registry
 *
 * Provides pre-audited verification results for preset benchmark pairs and manual test cases
 * when running in Standalone / Cloud Demo mode (e.g. Vercel deployment without backend).
 */

export const PRESET_JOBS_MAP = {
  // 4 Positive Manual Test Cases (Harris Hill NAIP Aerial Orthophoto)
  'real_usgs_harrishill_ref.png+real_usgs_harrishill_ref.png': '3524fa46-0859-4cd0-a43f-612e00fc13fa',
  'real_usgs_harrishill_ref.png+manual_crop.png': 'f5fc50e3-ce18-438d-a7a0-71a9b447d69c',
  'real_usgs_harrishill_ref.png+manual_dim.png': 'c53f3c62-346e-45ec-b419-1cf9de750575',
  'real_usgs_harrishill_ref.png+manual_occluded.png': '67c10cba-10bf-49f2-8f00-4d380a8da7e0',

  // Real-world airport benchmark positive crop
  'real_usgs_greenwood_ref.png+real_greenwood_query_crop_runway.png': '0160b52b-ec18-4869-b06b-8a1deaaf73be',

  // Georeferenced GeoTIFF with UTM / WGS-84 metric localization
  'georef_usgs_chico.tif+georef_chico_crop_runway.tif': '028b71cc-f3ce-4d69-8b63-bba176dbaa94',
};

export const REJECTED_CASES = {
  'real_usgs_harrishill_ref.png+manual_blank.png': {
    job_id: '1cc09266-5af2-4e83-959b-7f03ab8c1658',
    status: 'insufficient_features',
    reference_image: { filename: 'real_usgs_harrishill_ref.png', width: 1024, height: 1024, channels: 3 },
    query_image: { filename: 'manual_blank.png', width: 540, height: 520, channels: 3 },
    reference_keypoints: 3752,
    query_keypoints: 0,
    tentative_matches: 0,
    filtered_matches: 0,
    geometric_inliers: 0,
    inlier_ratio: 0.0,
    reprojection_error: null,
    homography_matrix: null,
    estimated_region: null,
    geographic_footprint: null,
    reliability_assessment: {
      confidence_index: 0.0,
      verification_passed: false,
      reasons: ['Insufficient keypoints extracted (threshold: 15, query: 0)'],
    },
    failure_reason: 'Insufficient keypoints extracted (threshold: 15, query: 0)',
    warnings: ['Synthetic blank query contains zero distinct gradient features. Rejection is expected and verified.'],
  },
  'real_usgs_harrishill_ref.png+real_usgs_greenwood_ref.png': {
    job_id: '96e85699-8c93-4b29-9b36-4ff5c597a86b',
    status: 'geometry_failed',
    reference_image: { filename: 'real_usgs_harrishill_ref.png', width: 1024, height: 1024, channels: 3 },
    query_image: { filename: 'real_usgs_greenwood_ref.png', width: 1024, height: 1024, channels: 3 },
    reference_keypoints: 3752,
    query_keypoints: 2980,
    tentative_matches: 41,
    filtered_matches: 8,
    geometric_inliers: 4,
    inlier_ratio: 0.097,
    reprojection_error: null,
    homography_matrix: null,
    estimated_region: null,
    geographic_footprint: null,
    reliability_assessment: {
      confidence_index: 0.04,
      verification_passed: false,
      reasons: ['RANSAC consensus failed: insufficient geometric inliers (4 < min 15)'],
    },
    failure_reason: 'RANSAC failed: insufficient inlier consensus (< 15 inliers)',
    warnings: ['Cross-scene distractor candidate rejected under RANSAC. No false acceptance occurred.'],
  },
};

/**
 * Attempt to retrieve a verified precomputed result for known test pairs.
 */
export async function getPresetFallbackResult(refFilename, queryFilename) {
  const key = `${refFilename}+${queryFilename}`;
  if (REJECTED_CASES[key]) {
    return REJECTED_CASES[key];
  }
  const jobId = PRESET_JOBS_MAP[key];
  if (jobId) {
    try {
      const resp = await fetch(`/data/jobs/${jobId}/result.json`);
      if (resp.ok && !resp.headers.get('content-type')?.includes('text/html')) {
        return await resp.json();
      }
    } catch {
      // Ignore network errors and continue
    }
  }
  return null;
}
