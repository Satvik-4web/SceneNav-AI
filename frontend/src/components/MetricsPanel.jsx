/**
 * SceneNav AI — MetricsPanel
 * Displays structured matching metrics with honest labelling.
 */

function MetricCard({ label, value, unit, highlight }) {
  return (
    <div className="metric-card" style={highlight ? { borderColor: highlight } : {}}>
      <div className="metric-label">{label}</div>
      <div className="metric-value" style={highlight ? { color: highlight } : {}}>
        {value ?? '—'}
        {unit && <span className="metric-unit">{unit}</span>}
      </div>
    </div>
  );
}

const STATUS_CONFIG = {
  success: { cls: 'success', icon: '✓', label: 'Match Successful' },
  insufficient_features: { cls: 'failure', icon: '✗', label: 'Insufficient Features' },
  insufficient_matches: { cls: 'failure', icon: '✗', label: 'Insufficient Matches' },
  geometry_failed: { cls: 'failure', icon: '✗', label: 'Geometric Verification Failed' },
  invalid_image: { cls: 'failure', icon: '✗', label: 'Invalid Image' },
  processing_error: { cls: 'failure', icon: '✗', label: 'Processing Error' },
};

export default function MetricsPanel({ result }) {
  if (!result) return null;

  const cfg = STATUS_CONFIG[result.status] || { cls: 'info', icon: '?', label: result.status };

  return (
    <div className="panel">
      <div className="panel-title">Matching Metrics</div>

      {/* Status banner */}
      <div className={`status-banner ${cfg.cls}`} style={{ marginBottom: 14 }}>
        <span className="status-icon">{cfg.icon}</span>
        <div className="status-body">
          <div className="status-title">{cfg.label}</div>
          {result.failure_reason && (
            <div className="status-detail">{result.failure_reason}</div>
          )}
        </div>
        <span className="badge badge-info mono small">{result.job_id?.slice(0, 8)}</span>
      </div>

      {/* Feature metrics */}
      <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
        Feature Detection
      </div>
      <div className="metrics-grid" style={{ marginBottom: 12 }}>
        <MetricCard label="Ref. Keypoints" value={result.reference_keypoints} />
        <MetricCard label="Qry. Keypoints" value={result.query_keypoints} />
        <MetricCard label="Tentative Matches" value={result.tentative_matches} />
        <MetricCard label="Filtered Matches" value={result.filtered_matches} />
      </div>

      {/* Geometry metrics */}
      {result.geometric_inliers != null && (
        <>
          <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
            Geometric Verification
          </div>
          <div className="metrics-grid" style={{ marginBottom: 12 }}>
            <MetricCard
              label="Inliers"
              value={result.geometric_inliers}
              highlight={result.geometric_inliers > 10 ? 'var(--accent-green)' : 'var(--accent-orange)'}
            />
            <MetricCard
              label="Inlier Ratio"
              value={result.inlier_ratio != null ? `${(result.inlier_ratio * 100).toFixed(1)}` : null}
              unit="%"
            />
            {result.reprojection_error && (
              <MetricCard
                label="Mean Reproj. Error"
                value={result.reprojection_error.mean_px.toFixed(2)}
                unit="px"
              />
            )}
            <MetricCard
              label="Proc. Time"
              value={result.processing_time_s?.toFixed(3)}
              unit="s"
            />
          </div>
        </>
      )}

      {/* Warnings */}
      {result.warnings?.length > 0 && (
        <ul className="warnings-list">
          {result.warnings.map((w, i) => <li key={i}>{w}</li>)}
        </ul>
      )}
      {result.region_warnings?.length > 0 && (
        <ul className="warnings-list">
          {result.region_warnings.map((w, i) => <li key={i}>{w}</li>)}
        </ul>
      )}

      {/* Region info */}
      {result.estimated_region && (
        <div style={{ marginTop: 10, padding: 10, background: 'var(--bg-secondary)', borderRadius: 'var(--radius)', fontSize: 12 }}>
          <div style={{ fontWeight: 600, marginBottom: 6 }}>Estimated Query Footprint (reference pixels)</div>
          {['top_left','top_right','bottom_right','bottom_left'].map(k => (
            <div key={k} className="mono small" style={{ color: 'var(--text-secondary)' }}>
              {k.replace('_',' ')}: ({result.estimated_region[k][0].toFixed(1)}, {result.estimated_region[k][1].toFixed(1)})
            </div>
          ))}
          <div className="disclaimer" style={{ marginTop: 6 }}>
            These are image-plane pixel coordinates, NOT geographic lat/lon.
          </div>
        </div>
      )}

      {/* Algorithm record */}
      <div style={{ marginTop: 10, fontSize: 11, color: 'var(--text-muted)' }}>
        Algorithm: <strong style={{ color: 'var(--accent-cyan)' }}>{result.algorithm_params?.algorithm || 'ORB'}</strong> ({result.algorithm_version}) · OpenCV {result.software_versions?.opencv}
      </div>
    </div>
  );
}
