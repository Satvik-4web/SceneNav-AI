/**
 * SceneNav AI — Central API client.
 *
 * All backend communication goes through this module.
 * The base URL is intentionally empty so that Vite's dev proxy handles
 * routing; in production set VITE_API_BASE_URL.
 *
 * Fully equipped with static cloud demo fallback guards to ensure smooth
 * execution on static hosts (e.g. Vercel) even when the Python server is offline.
 */

import { getPresetFallbackResult, generateClientSideSimulation } from './presetResults';

const BASE_URL = import.meta.env.VITE_API_BASE_URL || '';

/**
 * Check backend health.
 * @returns {Promise<{status: string, version: string, algorithm_version: string}>}
 */
export async function fetchHealth() {
  const resp = await fetch(`${BASE_URL}/health`);
  const contentType = resp.headers?.get ? (resp.headers.get('content-type') || '') : '';
  if (contentType.includes('text/html') || contentType.includes('text/plain')) {
    throw new Error('Health check failed: Non-JSON returned (backend offline)');
  }
  if (!resp.ok) {
    throw new Error(`Health check failed: ${resp.status}`);
  }
  return resp.json();
}

/**
 * Fetch backend capabilities.
 */
export async function fetchCapabilities() {
  try {
    const resp = await fetch(`${BASE_URL}/api/v1/capabilities`);
    const contentType = resp.headers?.get ? (resp.headers.get('content-type') || '') : '';
    if (resp.ok && contentType.includes('application/json')) {
      return await resp.json();
    }
  } catch {
    // Fallback to static capabilities
  }
  return {
    algorithms: ['ORB', 'SIFT'],
    supported_formats: ['JPEG', 'PNG', 'TIFF', 'image/png', 'image/jpeg', 'image/tiff'],
    georeferencing_supported: true,
    mode: 'cloud_demo',
  };
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
export async function submitMatch(referenceFile, queryFile, params = {}, signal) {
  const form = new FormData();
  form.append('reference_image', referenceFile);
  form.append('query_image', queryFile);
  form.append('algorithm', params.algorithm || 'ORB');
  form.append('orb_max_features', String(params.orb_max_features ?? 5000));
  form.append('ratio_threshold', String(params.ratio_threshold ?? 0.75));
  form.append('ransac_reproj_threshold', String(params.ransac_reproj_threshold ?? 4.0));
  form.append('min_inliers', String(params.min_inliers ?? 10));
  form.append('mutual_consistency', String(Boolean(params.mutual_consistency)));

  let backendFailed = false;
  try {
    const resp = await fetch(`${BASE_URL}/api/v1/match`, {
      method: 'POST',
      body: form,
      signal,
    });

    const contentType = resp.headers?.get ? (resp.headers.get('content-type') || '') : '';
    const isJson = contentType.includes('application/json');

    if (resp.ok && isJson) {
      return await resp.json();
    }
    if (!resp.ok && isJson) {
      const err = await resp.json().catch(() => ({}));
      throw new Error(err.detail || `Server error (${resp.status})`);
    }
    backendFailed = true;
  } catch (err) {
    if (err.name === 'AbortError') throw err;
    if (err.message && err.message.startsWith('Server error')) {
      throw err;
    }
    backendFailed = true;
  }

  if (backendFailed) {
    // 1. Check for verified benchmark pair / manual case result
    const fallbackResult = await getPresetFallbackResult(referenceFile.name, queryFile.name, params);
    if (fallbackResult) {
      return fallbackResult;
    }

    // 2. Client-side simulation for custom uploaded images
    return await generateClientSideSimulation(referenceFile, queryFile, params);
  }
}

/**
 * Fetch available sample pairs from manifest.
 * @param {string} [manifest] - Optional manifest filename (e.g. 'georeferenced_pairs.json')
 */
export async function fetchSamples(manifest) {
  const safeManifest = manifest || 'synthetic_pairs.json';
  try {
    const url = manifest ? `${BASE_URL}/api/v1/samples?manifest=${encodeURIComponent(safeManifest)}` : `${BASE_URL}/api/v1/samples`;
    const resp = await fetch(url);
    const contentType = resp.headers?.get ? (resp.headers.get('content-type') || '') : '';
    if (resp.ok && contentType.includes('application/json')) {
      return await resp.json();
    }
  } catch {
    // Backend unreachable, fallback to static manifests
  }

  // Static fallback from /data/manifests/${safeManifest}
  const staticResp = await fetch(`/data/manifests/${safeManifest}`);
  const staticContentType = staticResp.headers?.get ? (staticResp.headers.get('content-type') || '') : '';
  if (!staticResp.ok || staticContentType.includes('text/html')) {
    throw new Error(`Failed to load preset pairs from '${safeManifest}'.`);
  }
  const data = await staticResp.json();
  const pairsOut = (data.pairs || []).map((p) => {
    const tx = p.transform || {};
    const tx_type = tx.type || (p.is_negative ? 'negative' : 'uncalibrated');
    const pair_id = p.id || 'pair';
    const label = `${pair_id.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())} (${tx_type})`;
    return {
      id: pair_id,
      label,
      reference_path: p.reference || p.reference_path || '',
      query_path: p.query || p.query_path || '',
      transform_type: tx_type,
      description: p.description || p.note || 'Evaluation pair.',
      ground_truth_type: p.ground_truth_type || 'synthetic_homography',
      is_negative: Boolean(p.is_negative),
      transform: tx,
      georeferenced: Boolean(p.georeferenced || p.crs),
      crs: p.crs,
    };
  });
  return {
    manifest_name: data.name || safeManifest,
    description: data.description || 'Benchmark pairs',
    pairs: pairsOut,
  };
}

/**
 * Fetch a sample image as a File object for dropzone loading.
 */
export async function fetchSampleImageFile(category, filename) {
  let blob = null;
  try {
    const resp = await fetch(`${BASE_URL}/api/v1/samples/image/${category}/${filename}`);
    const contentType = resp.headers?.get ? (resp.headers.get('content-type') || '') : '';
    if (resp.ok && !contentType.includes('text/html') && !contentType.includes('text/plain')) {
      blob = await resp.blob();
    }
  } catch {
    // Backend unreachable, fallback to static assets
  }

  if (!blob) {
    const staticResp = await fetch(`/data/${category}/${filename}`);
    const staticContentType = staticResp.headers?.get ? (staticResp.headers.get('content-type') || '') : '';
    if (!staticResp.ok || staticContentType.includes('text/html')) {
      throw new Error(`Failed to load sample image '${filename}'.`);
    }
    blob = await staticResp.blob();
  }

  const isTiff = filename.toLowerCase().endsWith('.tif') || filename.toLowerCase().endsWith('.tiff');
  const mimeType = isTiff ? 'image/tiff' : (blob.type || 'image/png');
  return new File([blob], filename, { type: mimeType });
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
  try {
    const resp = await fetch(`${BASE_URL}/api/v1/jobs/${jobId}`);
    const contentType = resp.headers?.get ? (resp.headers.get('content-type') || '') : '';
    if (resp.ok && contentType.includes('application/json')) {
      return await resp.json();
    }
  } catch {
    // Fallback to static job data
  }
  const staticResp = await fetch(`/data/jobs/${jobId}/result.json`);
  const staticContentType = staticResp.headers?.get ? (staticResp.headers.get('content-type') || '') : '';
  if (staticResp.ok && staticContentType.includes('application/json')) {
    return await staticResp.json();
  }
  throw new Error(`Job fetch failed: ${jobId}`);
}

/**
 * Fetch the audited Munich Research Demonstration record.
 */
export async function fetchResearchDemonstration() {
  try {
    const resp = await fetch(`${BASE_URL}/api/v1/research/demonstration`);
    const contentType = resp.headers?.get ? (resp.headers.get('content-type') || '') : '';
    if (resp.ok && contentType.includes('application/json')) {
      return await resp.json();
    }
  } catch {
    // Fallback
  }
  const staticResp = await fetch(`/data/research/experiment_record.json`);
  const staticContentType = staticResp.headers?.get ? (staticResp.headers.get('content-type') || '') : '';
  if (!staticResp.ok || staticContentType.includes('text/html')) {
    throw new Error('Research demonstration record not available.');
  }
  return staticResp.json();
}

/**
 * Get research demonstration artifact URL.
 */
export function researchArtifactUrl(filename) {
  if (BASE_URL) {
    return `${BASE_URL}/api/v1/research/artifacts/${filename}`;
  }
  return `/data/research/${filename}`;
}

/**
 * Get job PDF research report URL.
 */
export function jobReportPdfUrl(jobId) {
  return `${BASE_URL}/api/v1/jobs/${jobId}/report.pdf`;
}
