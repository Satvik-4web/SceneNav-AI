import { useState, useRef } from 'react';
import ManualTestLab from '../components/ManualTestLab';
import StudioWelcome from '../components/StudioWelcome';
import ImageDropZone from '../components/ImageDropZone';
import SampleDataSelector from '../components/SampleDataSelector';
import MatchControls, { DEFAULTS } from '../components/MatchControls';
import ResultsSummaryHeader from '../components/ResultsSummaryHeader';
import MetricsPanel from '../components/MetricsPanel';
import ResultVisualizations from '../components/ResultVisualizations';
import ExperimentHistory from '../components/ExperimentHistory';
import MunichResearchDemo from '../components/MunichResearchDemo';
import ResearchAnalyticsWorkspace from '../components/ResearchAnalyticsWorkspace';
import { submitMatch } from '../api/client';
import { useMatchHistory } from '../hooks/useMatchHistory';

export default function DashboardPage({ activeWorkspace = 'studio', onSelectWorkspace = () => {} }) {
  const [referenceFile, setReferenceFile] = useState(null);
  const [queryFile, setQueryFile] = useState(null);
  const [params, setParams] = useState({ ...DEFAULTS });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [result, setResult] = useState(null);
  const [manualCase, setManualCase] = useState(null);
  const abortRef = useRef(null);
  const { history, addResult, clearHistory, exportJSON } = useMatchHistory();

  const handleSelectSample = (refFile, qryFile, test = null) => {
    setManualCase(test?.expect ? test : null);
    setReferenceFile(refFile);
    setQueryFile(qryFile);
    setResult(null);
    setError(null);
  };

  const canSubmit = referenceFile && queryFile && !loading;

  const handleSubmit = async () => {
    if (!canSubmit) return;
    setLoading(true);
    setResult(null);
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
    setManualCase(null);
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
      geographic_footprint: result.geographic_footprint,
      reliability_assessment: result.reliability_assessment,
      warnings: result.warnings,
      failure_reason: result.failure_reason,
      important_disclaimer: (
        'Metrics in this report reflect image-matching performance only. ' +
        'No geographic localization accuracy is claimed or implied without authoritative georeferencing metadata.'
      ),
    };
    const blob = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `scenenav_report_${result.job_id?.slice(0, 8)}_${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="workspace-container">
      {/* Workspace Sub-Header Context Strip */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 14,
          padding: '7px 16px',
          background: 'linear-gradient(90deg, rgba(16, 16, 22, 0.85) 0%, rgba(10, 10, 13, 0.85) 100%)',
          borderRadius: 'var(--radius)',
          border: '1px solid rgba(255, 255, 255, 0.08)',
          boxShadow: 'inset 0 1px 0 rgba(255, 255, 255, 0.05), 0 2px 8px rgba(0, 0, 0, 0.4)',
          flexWrap: 'wrap',
          gap: 10,
          fontSize: 11.5,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#22c55e', boxShadow: '0 0 6px #22c55e', display: 'inline-block' }} />
            <span style={{ color: 'var(--text-muted)', textTransform: 'uppercase', fontSize: 10, letterSpacing: '0.06em', fontWeight: 600 }}>Active Workspace</span>
          </div>
          <span className="mono" style={{ color: '#ffffff', fontWeight: 600 }}>
            {activeWorkspace === 'studio' && 'Live Matching Studio'}
            {activeWorkspace === 'explorer' && 'Results Explorer'}
            {activeWorkspace === 'analytics' && 'Research & Analytics'}
            {activeWorkspace === 'munich' && 'Munich Cadastral Research Demo (2026)'}
          </span>
          {result && (
            <span className="badge badge-success" style={{ fontSize: 9.5 }}>
              Result Ready ({result.geometric_inliers} inliers)
            </span>
          )}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 10, color: 'var(--text-muted)' }}>
          <span className="mono" style={{ fontSize: 11, color: 'var(--text-secondary)' }}>Image registration workspace</span>
          <span className="badge badge-info mono" style={{ fontSize: 9.5 }}>v0.1.0-release</span>
        </div>
      </div>

      {/* Render Workspace Based on Selection */}
      {activeWorkspace === 'munich' && (
        <MunichResearchDemo onSwitchToPipeline={() => onSelectWorkspace('studio')} />
      )}

      {activeWorkspace === 'explorer' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {result ? (
            <div className="results-wrapper">
              {/* Sticky Section Quick Navigation Bar */}
              <nav className="results-sticky-nav" aria-label="Explorer sections quick jump">
                <span className="results-sticky-nav-label">Jump to:</span>
                <button
                  type="button"
                  onClick={() => document.getElementById('explorer-summary')?.scrollIntoView({ behavior: 'smooth' })}
                >
                  <span>⌖</span> Summary
                </button>
                <button
                  type="button"
                  onClick={() => document.getElementById('explorer-visualizations')?.scrollIntoView({ behavior: 'smooth' })}
                >
                  <span>🖼</span> Visualizations
                </button>
                <button
                  type="button"
                  onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
                  style={{ marginLeft: 'auto', color: 'var(--text-muted)' }}
                  title="Scroll back to top"
                >
                  ↑ Top
                </button>
              </nav>

              <div id="explorer-summary">
                <ResultsSummaryHeader
                  result={result}
                  onExportJson={generateReport}
                  onOpenAnalytics={() => onSelectWorkspace('analytics')}
                />
              </div>
              <div id="explorer-visualizations">
                <ResultVisualizations result={result} />
              </div>
            </div>
          ) : (
            <div className="panel">
              <div className="empty-state">
                <div style={{
                  width: 48,
                  height: 48,
                  borderRadius: '50%',
                  background: 'var(--bg-elevated)',
                  border: '1px solid var(--border)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  margin: '0 auto 12px',
                  color: 'var(--text-secondary)'
                }}>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="11" cy="11" r="8" />
                    <line x1="21" y1="21" x2="16.65" y2="16.65" />
                  </svg>
                </div>
                <h3>Visual Inspection Stage Idle</h3>
                <p>
                  No localization run has been processed yet. Switch to the <strong>Live Matching Studio</strong> to select image pairs and compute visual registration.
                </p>
                <button
                  type="button"
                  className="btn-primary"
                  onClick={() => onSelectWorkspace('studio')}
                  style={{ marginTop: 12 }}
                >
                  Open Matching Studio
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {activeWorkspace === 'analytics' && (
        <ResearchAnalyticsWorkspace
          result={result}
          onSwitchToVisualizer={() => onSelectWorkspace('explorer')}
          onExportJson={generateReport}
        />
      )}

      {activeWorkspace === 'studio' && (
        <div className="main-content">
          {/* ===== LEFT SIDEBAR: EXPERIMENT CONFIGURATION ===== */}
          <div className="left-sidebar">
            {/* Image Inputs Panel */}
            <div className="panel">
              <div className="panel-title">Image Inputs</div>
              <SampleDataSelector onSelectSample={handleSelectSample} disabled={loading} />
              
              <ImageDropZone
                label="Reference Image (map/database)"
                file={referenceFile}
                onChange={(file) => { setReferenceFile(file); setResult(null); setManualCase(null); }}
              />
              <div style={{ height: 6 }} />
              <ImageDropZone
                label="Query Image (scene to locate)"
                file={queryFile}
                onChange={(file) => { setQueryFile(file); setResult(null); setManualCase(null); }}
              />

              <div style={{ marginTop: 12, display: 'flex', gap: 8 }}>
                <button
                  type="button"
                  className="btn-primary"
                  style={{
                    flex: 2,
                    padding: '8px 14px',
                    fontSize: 12.5,
                    fontWeight: 600,
                    letterSpacing: '0.02em',
                    boxShadow: canSubmit ? '0 0 16px rgba(59, 130, 246, 0.4)' : 'none',
                  }}
                  onClick={handleSubmit}
                  disabled={!canSubmit}
                >
                  {loading ? (
                    <span style={{ display: 'flex', alignItems: 'center', gap: 8, justifyContent: 'center' }}>
                      <span className="loading-spinner" />
                      Matching…
                    </span>
                  ) : (
                    <span>Run Matching</span>
                  )}
                </button>
                {loading ? (
                  <button type="button" className="btn-danger" style={{ flex: 1 }} onClick={handleCancel}>
                    Cancel
                  </button>
                ) : (
                  <button type="button" className="btn-secondary" style={{ flex: 1 }} onClick={handleReset}>
                    Reset
                  </button>
                )}
              </div>

              {loading && (
                <div style={{ marginTop: 8, padding: '6px 8px', background: 'var(--bg-input)', borderRadius: 4, border: '1px solid var(--border)' }}>
                  <div className="mono" style={{ fontSize: 10, color: 'var(--accent-cyan)' }}>
                    Matching images — waiting for verified results
                  </div>
                </div>
              )}

              {error && (
                <div style={{
                  marginTop: 10, padding: 10,
                  background: 'var(--accent-red-dim)', border: '1px solid rgba(239, 68, 68, 0.3)',
                  borderRadius: 'var(--radius)', color: 'var(--accent-red)', fontSize: 11.5,
                }}>
                  <strong>Error:</strong> {error}
                </div>
              )}
            </div>

            {/* Matching Parameter Controls */}
            <MatchControls params={params} onChange={setParams} />

            {/* Experiment History Drawer */}
            <ExperimentHistory
              history={history}
              onSelect={handleSelectHistory}
              onClear={clearHistory}
              onExport={exportJSON}
            />
          </div>

          {/* ===== RIGHT COLUMN: LIVE EXECUTION & RESULTS AREA ===== */}
          <div className="results-area">
            <ManualTestLab selected={manualCase} onSelect={handleSelectSample} disabled={loading} result={result} />
            {!result && !loading && (
              <StudioWelcome ready={Boolean(referenceFile && queryFile)} onRun={handleSubmit} />
            )}

            {loading && (
              <div className="panel">
                <div className="telemetry-radar-stage" style={{ padding: '36px 20px', textAlign: 'center' }}>
                  <div className="radar-circle" style={{ margin: '0 auto 16px' }}>
                    <div className="radar-sweep" />
                    <div style={{
                      width: 8,
                      height: 8,
                      borderRadius: '50%',
                      background: '#ffffff',
                      boxShadow: '0 0 8px rgba(255, 255, 255, 0.8)',
                      zIndex: 2,
                    }} />
                  </div>
                  <div>
                    <h3 style={{ fontSize: 15, color: 'var(--text-primary)', fontWeight: 600 }}>
                      Computing Spatial Localization Pipeline…
                    </h3>
                    <div className="mono" style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 8 }}>
                      Matching images — waiting for verified results
                    </div>
                    <p style={{ fontSize: 11.5, color: 'var(--text-muted)', marginTop: 6, maxWidth: 440, margin: '6px auto 0' }}>
                      Executing {params.algorithm || 'ORB'} keypoint detector, computing bidirectional nearest neighbors, and performing RANSAC geometric consensus.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {result && !loading && (
              <div className="results-wrapper">
                {/* Sticky Section Quick Navigation Bar */}
                <nav className="results-sticky-nav" aria-label="Results sections quick jump">
                  <span className="results-sticky-nav-label">Jump to:</span>
                  <button
                    type="button"
                    onClick={() => document.getElementById('section-summary')?.scrollIntoView({ behavior: 'smooth' })}
                  >
                    <span>⌖</span> Summary
                  </button>
                  <button
                    type="button"
                    onClick={() => document.getElementById('section-visualizations')?.scrollIntoView({ behavior: 'smooth' })}
                  >
                    <span>🖼</span> Visualizations
                  </button>
                  <button
                    type="button"
                    onClick={() => document.getElementById('section-metrics')?.scrollIntoView({ behavior: 'smooth' })}
                  >
                    <span>📊</span> Diagnostics & Metrics
                  </button>
                  {result.localization_status === 'localized' && (
                    <button
                      type="button"
                      onClick={() => document.getElementById('section-geospatial')?.scrollIntoView({ behavior: 'smooth' })}
                    >
                      <span>🌐</span> Geodetic Coordinates
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
                    style={{ marginLeft: 'auto', color: 'var(--text-muted)' }}
                    title="Scroll back to top"
                  >
                    ↑ Top
                  </button>
                </nav>

                <div id="section-summary">
                  <ResultsSummaryHeader
                    result={result}
                    onExportJson={generateReport}
                    onOpenExplorer={() => onSelectWorkspace('explorer')}
                    onOpenAnalytics={() => onSelectWorkspace('analytics')}
                  />
                </div>
                <div id="section-visualizations">
                  <ResultVisualizations result={result} />
                </div>
                <div id="section-metrics">
                  <MetricsPanel result={result} />
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
