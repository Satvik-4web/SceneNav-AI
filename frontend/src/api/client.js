/**
 * SceneNav AI — Central API client.
 *
 * All backend communication goes through this module.
 * The base URL is intentionally empty so that Vite's dev proxy handles
 * routing; in production set VITE_API_BASE_URL.
 */

const BASE_URL = import.meta.env.VITE_API_BASE_URL || '';

/**
 * Check backend health.
 * @returns {Promise<{status: string, version: string, algorithm_version: string}>}
 */
export async function fetchHealth() {
  const resp = await fetch(`${BASE_URL}/health`);
  if (!resp.ok) throw new Error(`Health check failed: ${resp.status}`);
  return resp.json();
}

/**
 * Fetch backend capabilities.
 */
export async function fetchCapabilities() {
  const resp = await fetch(`${BASE_URL}/api/v1/capabilities`);
  if (!resp.ok) throw new Error(`Capabilities failed: ${resp.status}`);
  return resp.json();
}

/**
 * Submit a matching request.
 *
 * @param {File} referenceFile
 * @param {File} queryFile
 * @param {Object} params - { orb_max_features, ratio_threshold, ransac_reproj_threshold, min_inliers }
 * @param {AbortSignal} [signal]
 * @returns {Promise<Object>} MatchResult
 */
export async function submitMatch(referenceFile, queryFile, params, signal) {
  const form = new FormData();
  form.append('reference_image', referenceFile);
  form.append('query_image', queryFile);
  form.append('orb_max_features', String(params.orb_max_features));
  form.append('ratio_threshold', String(params.ratio_threshold));
  form.append('ransac_reproj_threshold', String(params.ransac_reproj_threshold));
  form.append('min_inliers', String(params.min_inliers));

  const resp = await fetch(`${BASE_URL}/api/v1/match`, {
    method: 'POST',
    body: form,
    signal,
  });

  if (!resp.ok) {
    let detail = `Server error (${resp.status})`;
    try {
      const err = await resp.json();
      detail = err.detail || detail;
    } catch { /* ignore */ }
    throw new Error(detail);
  }
  return resp.json();
}

/**
 * Get artifact URL for a job.
 */
export function artifactUrl(jobId, filename) {
  return `${BASE_URL}/api/v1/artifacts/${jobId}/${filename}`;
}

/**
 * Fetch a specific job result.
 */
export async function fetchJob(jobId) {
  const resp = await fetch(`${BASE_URL}/api/v1/jobs/${jobId}`);
  if (!resp.ok) throw new Error(`Job fetch failed: ${resp.status}`);
  return resp.json();
}
