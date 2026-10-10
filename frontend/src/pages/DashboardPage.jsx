/**
 * SceneNav AI — Main Research Dashboard Page
 */
import { useState, useRef } from 'react';
import ImageDropZone from '../components/ImageDropZone';
import MatchControls, { DEFAULTS } from '../components/MatchControls';
import MetricsPanel from '../components/MetricsPanel';
import ResultVisualizations from '../components/ResultVisualizations';
import ExperimentHistory from '../components/ExperimentHistory';
import { submitMatch } from '../api/client';
import { useMatchHistory } from '../hooks/useMatchHistory';

export default function DashboardPage() {
  const [referenceFile, setReferenceFile] = useState(null);
  const [queryFile, setQueryFile] = useState(null);
  const [params, setParams] = useState({ ...DEFAULTS });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [result, setResult] = useState(null);
  const abortRef = useRef(null);
  const { history, addResult, clearHistory, exportJSON } = useMatchHistory();

  const canSubmit = referenceFile && queryFile && !loading;

  const handleSubmit = async () => {
    if (!canSubmit) return;
    setLoading(true);
    setError(null);
    abortRef.current = new AbortController();

    try {
      const res = await submitMatch(referenceFile, queryFile, params, abortRef.current.signal);
      setResult(res);
      addResult(res);
    } catch (err) {
      if (err.name === 'AbortError') {
        setError('Request cancelled.');
      } else {
        setError(err.message || 'An unexpected error occurred. Is the backend running?');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    abortRef.current?.abort();
    setLoading(false);
  };

  const handleReset = () => {
    setReferenceFile(null);
    setQueryFile(null);
    setResult(null);
    setError(null);
    setParams({ ...DEFAULTS });
  };

  const handleSelectHistory = (r) => setResult(r);

  const generateReport = () => {
    if (!result) return;
    const report = {
      title: 'SceneNav AI — Experiment Report',
      generated_at: new Date().toISOString(),
      reference_image: result.reference_image,
      query_image: result.query_image,
      algorithm_params: result.algorithm_params,
      algorithm_version: result.algorithm_version,
      software_versions: result.software_versions,
      status: result.status,
      metrics: {
        reference_keypoints: result.reference_keypoints,
        query_keypoints: result.query_keypoints,
        tentative_matches: result.tentative_matches,
        filtered_matches: result.filtered_matches,
        geometric_inliers: result.geometric_inliers,
        inlier_ratio: result.inlier_ratio,
        reprojection_error_px: result.reprojection_error,
        processing_time_s: result.processing_time_s,
      },
      estimated_region: result.estimated_region,
      warnings: result.warnings,
      failure_reason: result.failure_reason,
      important_disclaimer: (
        'Metrics in this report reflect image-matching performance only. ' +
        'No geographic localization accuracy is claimed or implied. ' +
        'Estimated region coordinates are image-plane pixel coordinates, not lat/lon.'
      ),
    };
    const blob = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `scenenav_report_${result.job_id?.slice(0,8)}_${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="main-content">
      {/* ===== LEFT SIDEBAR ===== */}
      <div className="left-sidebar">
        {/* Image Inputs */}
        <div className="panel">
          <div className="panel-title">Image Inputs</div>
          <ImageDropZone
            label="Reference Image (map/database)"
            file={referenceFile}
            onChange={setReferenceFile}
          />
          <div style={{ height: 12 }} />
          <ImageDropZone
            label="Query Image (scene to locate)"
            file={queryFile}
            onChange={setQueryFile}
          />
          <div style={{ marginTop: 14, display: 'flex', gap: 8 }}>
            <button
              className="btn-primary"
              style={{ flex: 2 }}
              onClick={handleSubmit}
              disabled={!canSubmit}
            >
              {loading ? (
                <span style={{ display: 'flex', alignItems: 'center', gap: 8, justifyContent: 'center' }}>
                  <span className="loading-spinner" />
                  Matching…
                </span>
              ) : 'Run Matching'}
            </button>
            {loading ? (
              <button className="btn-danger" style={{ flex: 1 }} onClick={handleCancel}>
                Cancel
              </button>
            ) : (
              <button className="btn-secondary" style={{ flex: 1 }} onClick={handleReset}>
                Reset
              </button>
            )}
          </div>
          {error && (
            <div style={{
              marginTop: 10, padding: 10,
              background: 'rgba(248,81,73,0.1)', border: '1px solid rgba(248,81,73,0.3)',
              borderRadius: 'var(--radius)', color: 'var(--accent-red)', fontSize: 12,
            }}>
              <strong>Error:</strong> {error}
            </div>
          )}
        </div>

        {/* Matching Controls */}
        <MatchControls params={params} onChange={setParams} />

        {/* History */}
        <ExperimentHistory
          history={history}
          onSelect={handleSelectHistory}
          onClear={clearHistory}
          onExport={exportJSON}
        />
      </div>

      {/* ===== MAIN RESULTS AREA ===== */}
      <div className="results-area">
        {!result && !loading && (
          <div className="panel">
            <div className="empty-state">
              <div className="icon">🛰</div>
              <h3 style={{ fontSize: 16, color: 'var(--text-secondary)' }}>SceneNav AI</h3>
              <p>
                Load a reference image and a query image, then click
                <strong> Run Matching</strong> to start the ORB feature matching pipeline.
              </p>
              <p style={{ marginTop: 4 }}>
                Results include feature correspondences, geometric verification,
                and an estimated query region.
              </p>
              <div className="disclaimer" style={{ maxWidth: 360 }}>
                This tool performs image-level feature matching only.
                It does not compute geographic latitude/longitude without
                valid georeferencing data.
              </div>
            </div>
          </div>
        )}

        {loading && (
          <div className="panel">
            <div className="empty-state">
              <div className="loading-spinner" style={{ width: 32, height: 32, borderWidth: 3 }} />
              <p>Running ORB detection + RANSAC verification…</p>
            </div>
          </div>
        )}

        {result && !loading && (
          <>
            <div style={{ display: 'flex', gap: 10, alignItems: 'center', justifyContent: 'flex-end' }}>
              <button className="btn-secondary small" style={{ fontSize: 12 }} onClick={generateReport}>
                Export Report JSON
              </button>
            </div>
            <MetricsPanel result={result} />
            <ResultVisualizations result={result} />
          </>
        )}
      </div>
    </div>
  );
}
