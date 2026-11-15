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

import { getPresetFallbackResult } from './presetResults';

const BASE_URL = import.meta.env.VITE_API_BASE_URL || '';

const PRESET_JOBS = new Set([
  '3524fa46-0859-4cd0-a43f-612e00fc13fa',
  'f5fc50e3-ce18-438d-a7a0-71a9b447d69c',
  'c53f3c62-346e-45ec-b419-1cf9de750575',
  '67c10cba-10bf-49f2-8f00-4d380a8da7e0',
  '0160b52b-ec18-4869-b06b-8a1deaaf73be',
  '028b71cc-f3ce-4d69-8b63-bba176dbaa94',
]);

/**
 * Check backend health.
 * @returns {Promise<{status: string, version: string, algorithm_version: string}>}
 */
export async function fetchHealth() {
  const resp = await fetch(`${BASE_URL}/health`);
  const contentType = resp.headers?.get ? (resp.headers.get('content-type') || '') : '';
  if (contentType.includes('text/html')) {
    throw new Error('Health check failed: HTML returned (backend offline)');
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
    if (contentType.includes('text/html')) {
      throw new Error('Offline');
    }
    if (resp.ok) {
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
export async function submitMatch(referenceFile, queryFile, params, signal) {
  const form = new FormData();
  form.append('reference_image', referenceFile);
  form.append('query_image', queryFile);
  form.append('algorithm', params.algorithm || 'ORB');
  form.append('orb_max_features', String(params.orb_max_features));
  form.append('ratio_threshold', String(params.ratio_threshold));
  form.append('ransac_reproj_threshold', String(params.ransac_reproj_threshold));
  form.append('min_inliers', String(params.min_inliers));
  form.append('mutual_consistency', String(Boolean(params.mutual_consistency)));

  let backendFailed = false;
  try {
    const resp = await fetch(`${BASE_URL}/api/v1/match`, {
      method: 'POST',
      body: form,
      signal,
    });

    const contentType = resp.headers?.get ? (resp.headers.get('content-type') || '') : '';
    if (resp.ok && !contentType.includes('text/html')) {
      return await resp.json();
    }
    if (!resp.ok && !contentType.includes('text/html')) {
      const err = await resp.json();
      throw new Error(err.detail || `Server error (${resp.status})`);
    }
    backendFailed = true;
  } catch (err) {
    if (err.name === 'AbortError') throw err;
    if (err.message && !err.message.includes('<!doctype') && !err.message.includes('fetch') && !err.message.includes('Server error')) {
      throw err;
    }
    backendFailed = true;
  }

  if (backendFailed) {
    // Check if this pair corresponds to a known manual case or preset pair
    const fallbackResult = await getPresetFallbackResult(referenceFile.name, queryFile.name);
    if (fallbackResult) {
      return fallbackResult;
    }

    throw new Error(
      'Backend offline: Live OpenCV/SIFT processing on custom images requires the SceneNav Python backend. Start the backend locally with `python -m uvicorn app.main:app --port 8005` or configure VITE_API_BASE_URL. Preset test pairs (Synthetic, Aerial crops, Georef GeoTIFF) and the Munich Demonstration are fully interactive in Cloud Demo mode.'
    );
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
    if (resp.ok && !contentType.includes('text/html')) {
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
    if (resp.ok && !contentType.includes('text/html')) {
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
  if (PRESET_JOBS.has(jobId)) {
    return `/data/jobs/${jobId}/${filename}`;
  }
  return `${BASE_URL}/api/v1/artifacts/${jobId}/${filename}`;
}

/**
 * Fetch a specific job result.
 */
export async function fetchJob(jobId) {
  try {
    const resp = await fetch(`${BASE_URL}/api/v1/jobs/${jobId}`);
    const contentType = resp.headers?.get ? (resp.headers.get('content-type') || '') : '';
    if (resp.ok && !contentType.includes('text/html')) {
      return await resp.json();
    }
  } catch {
    // Fallback to static job data
  }
  if (PRESET_JOBS.has(jobId)) {
    const staticResp = await fetch(`/data/jobs/${jobId}/result.json`);
    const staticContentType = staticResp.headers?.get ? (staticResp.headers.get('content-type') || '') : '';
    if (staticResp.ok && !staticContentType.includes('text/html')) {
      return await staticResp.json();
    }
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
    if (resp.ok && !contentType.includes('text/html')) {
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
