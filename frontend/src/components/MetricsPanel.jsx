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

const LOCALIZATION_CONFIG = {
  localized: { cls: 'badge-success', label: '🌐 LOCALIZED (WGS-84)', desc: 'Georeferenced raster with verified coordinates' },
  image_match_only: { cls: 'badge-info', label: '🖼️ IMAGE MATCH ONLY', desc: 'Unreferenced raster (pixel space only)' },
  rejected: { cls: 'badge-warning', label: '✗ REJECTED', desc: 'Localization rejected / unverified geometry' },
};

export default function MetricsPanel({ result }) {
  if (!result) return null;

  const cfg = STATUS_CONFIG[result.status] || { cls: 'info', icon: '?', label: result.status };
  const locStatus = result.localization_status || (result.status === 'success' ? 'image_match_only' : 'rejected');
  const locCfg = LOCALIZATION_CONFIG[locStatus] || LOCALIZATION_CONFIG.rejected;

  return (
    <div className="panel">
      <div className="panel-title" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span>Matching Metrics</span>
        <span className={`badge ${locCfg.cls}`} style={{ fontSize: 11, padding: '4px 8px' }}>
          {locCfg.label}
        </span>
      </div>

      {/* Status banner */}
      <div className={`status-banner ${cfg.cls}`} style={{ marginBottom: 14 }}>
        <span className="status-icon">{cfg.icon}</span>
        <div className="status-body">
          <div className="status-title">{cfg.label}</div>
          {result.failure_reason && (
            <div className="status-detail">{result.failure_reason}</div>
          )}
          <div className="small muted" style={{ marginTop: 2 }}>{locCfg.desc}</div>
        </div>
        <span className="badge badge-info mono small">{result.job_id?.slice(0, 8)}</span>
      </div>

      {/* Georeferenced Visual Localization Result */}
      {result.geographic_footprint && (
        <div style={{ marginBottom: 14, padding: 12, background: 'rgba(0, 229, 255, 0.05)', border: '1px solid rgba(0, 229, 255, 0.25)', borderRadius: 'var(--radius)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
            <span style={{ fontWeight: 600, fontSize: 12, color: 'var(--accent-cyan)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              📍 Geographic Footprint (WGS-84)
            </span>
            {result.georeference?.crs_epsg && (
              <span className="mono small badge badge-info">
                EPSG:{result.georeference.crs_epsg}
              </span>
            )}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 8 }}>
            <div style={{ background: 'var(--bg-secondary)', padding: '8px 10px', borderRadius: 4 }}>
              <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Estimated Center (Lat/Lon)</div>
              <div className="mono" style={{ fontSize: 12, fontWeight: 600, color: 'var(--accent-green)' }}>
                {result.geographic_footprint.center.lat.toFixed(6)}°, {result.geographic_footprint.center.lon.toFixed(6)}°
              </div>
            </div>
            {result.projected_footprint && (
              <div style={{ background: 'var(--bg-secondary)', padding: '8px 10px', borderRadius: 4 }}>
                <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Projected Center (Easting/Northing)</div>
                <div className="mono" style={{ fontSize: 12, fontWeight: 600 }}>
                  E: {result.projected_footprint.center.x.toFixed(1)}m, N: {result.projected_footprint.center.y.toFixed(1)}m
                </div>
              </div>
            )}
          </div>

          {result.georeference && (
            <div className="mono small muted" style={{ fontSize: 11, marginBottom: 8 }}>
              CRS: {result.georeference.crs_name || result.georeference.crs} · GSD: {result.georeference.gsd_x?.toFixed(2)}m/px
            </div>
          )}

          {/* Footprint corners */}
          <div style={{ fontSize: 11, fontWeight: 600, marginBottom: 4 }}>Footprint Corners (Clockwise):</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 4 }}>
            {['top_left', 'top_right', 'bottom_right', 'bottom_left'].map((k) => (
              <div key={k} className="mono small" style={{ background: 'var(--bg-secondary)', padding: '4px 6px', borderRadius: 3, fontSize: 11 }}>
                <span style={{ color: 'var(--text-muted)' }}>{k.replace('_', ' ')}: </span>
                {result.geographic_footprint[k].lat.toFixed(6)}°, {result.geographic_footprint[k].lon.toFixed(6)}°
              </div>
            ))}
          </div>
        </div>
      )}

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
          <div style={{ fontWeight: 600, marginBottom: 6 }}>Estimated Query Footprint (reference raster pixels)</div>
          {['top_left','top_right','bottom_right','bottom_left'].map(k => (
            <div key={k} className="mono small" style={{ color: 'var(--text-secondary)' }}>
              {k.replace('_',' ')}: ({result.estimated_region[k][0].toFixed(1)}, {result.estimated_region[k][1].toFixed(1)})
            </div>
          ))}
          {!result.geographic_footprint && (
            <div className="disclaimer" style={{ marginTop: 6 }}>
              These are 2D raster pixel coordinates. No latitude/longitude coordinates are fabricated for unreferenced imagery.
            </div>
          )}
        </div>
      )}

      {/* Algorithm record */}
      <div style={{ marginTop: 10, fontSize: 11, color: 'var(--text-muted)' }}>
        Algorithm: <strong style={{ color: 'var(--accent-cyan)' }}>{result.algorithm_params?.algorithm || 'ORB'}</strong> ({result.algorithm_version}) · OpenCV {result.software_versions?.opencv}
      </div>
    </div>
  );
}

