/**
 * SceneNav AI — MetricsPanel
 *
 * Diagnostic Metrics & Scientific Interpretation Panel.
 * Organized into 5 distinct diagnostic categories with technical tooltips,
 * explicit missing value handling, and a dynamic "How to Interpret This Result" engine.
 */
import { useState } from 'react';

const STATUS_CONFIG = {
  success: { cls: 'success', icon: '✓', label: 'Match Successful' },
  insufficient_features: { cls: 'failure', icon: '✗', label: 'Insufficient Features' },
  insufficient_matches: { cls: 'failure', icon: '✗', label: 'Insufficient Matches' },
  geometry_failed: { cls: 'failure', icon: '✗', label: 'Geometric Verification Failed' },
  invalid_image: { cls: 'failure', icon: '✗', label: 'Invalid Image' },
  processing_error: { cls: 'failure', icon: '✗', label: 'Processing Error' },
};

const LOCALIZATION_CONFIG = {
  localized: { cls: 'badge-success', label: 'LOCALIZED (WGS-84)', desc: 'Georeferenced raster with verified coordinates' },
  image_match_only: { cls: 'badge-info', label: 'IMAGE MATCH ONLY', desc: 'Unreferenced raster (pixel space only)' },
  rejected: { cls: 'badge-warn', label: 'REJECTED', desc: 'Localization rejected / unverified geometry' },
};

function CopyCoordinateButton({ textToCopy, label = 'Copy' }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = (e) => {
    e.stopPropagation();
    navigator.clipboard?.writeText(textToCopy);
    setCopied(true);
    setTimeout(() => setCopied(false), 1600);
  };

  return (
    <button
      type="button"
      className="btn-secondary small"
      onClick={handleCopy}
      title={`Copy ${label} to clipboard`}
      style={{
        padding: '1px 5px',
        fontSize: 9.5,
        height: 18,
        marginLeft: 6,
        color: copied ? 'var(--accent-green)' : 'var(--text-muted)',
        border: copied ? '1px solid var(--accent-green)' : '1px solid var(--border)',
        cursor: 'pointer',
      }}
    >
      {copied ? '✓' : 'Copy'}
    </button>
  );
}

function DiagnosticCard({ label, value, unit, tooltip, highlight, subtitle }) {
  return (
    <div
      className="metric-card"
      style={{
        background: 'var(--bg-secondary)',
        border: '1px solid var(--border)',
        borderRadius: 'var(--radius)',
        padding: '10px 12px',
        ...(highlight ? { borderColor: highlight } : {}),
      }}
      title={tooltip}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
        <span className="metric-label" style={{ fontSize: 10, textTransform: 'uppercase', color: 'var(--text-muted)', letterSpacing: '0.05em' }}>
          {label}
        </span>
        {tooltip && (
          <span style={{ cursor: 'help', fontSize: 11, color: 'var(--text-muted)' }}>ℹ</span>
        )}
      </div>
      <div className="metric-value" style={{ fontSize: 18, fontWeight: 700, fontFamily: 'var(--font-mono)', color: highlight || 'var(--text-primary)' }}>
        {value ?? '—'}
        {unit && <span className="metric-unit" style={{ fontSize: 11, color: 'var(--text-secondary)', marginLeft: 3 }}>{unit}</span>}
      </div>
      {subtitle && (
        <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 2 }}>{subtitle}</div>
      )}
    </div>
  );
}

function SectionCollapsible({ title, defaultOpen = true, children }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div style={{ marginBottom: 14, border: '1px solid var(--border)', borderRadius: 'var(--radius)', overflow: 'hidden' }}>
      <button
        onClick={() => setOpen(!open)}
        style={{
          width: '100%',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '10px 14px',
          background: 'var(--bg-secondary)',
          border: 'none',
          color: 'var(--text-primary)',
          fontSize: 12,
          fontWeight: 600,
          textTransform: 'uppercase',
          letterSpacing: '0.05em',
          cursor: 'pointer',
        }}
      >
        <span>{title}</span>
        <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{open ? '▼' : '▶'}</span>
      </button>
      {open && (
        <div style={{ padding: '12px 14px', background: 'var(--bg-primary)' }}>
          {children}
        </div>
      )}
    </div>
  );
}

export default function MetricsPanel({ result }) {
  if (!result) return null;

  const cfg = STATUS_CONFIG[result.status] || { cls: 'info', icon: '?', label: result.status };
  const locStatus = result.localization_status || (result.status === 'success' ? 'image_match_only' : 'rejected');
  const locCfg = LOCALIZATION_CONFIG[locStatus] || LOCALIZATION_CONFIG.rejected;

  const qa = result.quality_assessment;
  const isGeoreferenced = locStatus === 'localized';
  const inliers = result.geometric_inliers;
  const filteredMatches = result.filtered_matches ?? 0;
  const inlierRatioPct = result.inlier_ratio != null ? (result.inlier_ratio * 100).toFixed(1) : null;
  const reprojMean = result.reprojection_error?.mean_px?.toFixed(2);
  const reprojMedian = result.reprojection_error?.median_px?.toFixed(2);
  const outliers = inliers != null ? Math.max(0, filteredMatches - inliers) : null;

  // Dynamic Algorithmic Interpretation Generation
  const generateDynamicInterpretation = () => {
    const points = [];
    if (result.status === 'success') {
      if (inliers > 100 && (result.inlier_ratio || 0) > 0.85) {
        points.push({
          type: 'positive',
          title: 'Strong Geometric Convergence',
          body: `High inlier consensus (${inlierRatioPct}%) with ${inliers} verified correspondences. The estimated transformation exhibits robust planar agreement with mean reprojection error of ${reprojMean} px.`,
        });
      } else if (inliers > 15) {
        points.push({
          type: 'neutral',
          title: 'Moderate Geometric Convergence',
          body: `${inliers} inliers (${inlierRatioPct}%) confirm correspondence, though lower consensus suggests localized perspective distortion or repetitive patterns.`,
        });
      } else {
        points.push({
          type: 'warning',
          title: 'Marginal Geometric Consensus',
          body: `Only ${inliers} inliers detected. While mathematically solvable (>= 4 points), homography stability is fragile and susceptible to boundary drift.`,
        });
      }

      if (qa?.spatial_metrics) {
        const spread = qa.spatial_metrics.spatial_spread_score;
        const gridCov = Math.round(qa.spatial_metrics.grid_coverage_ratio * 16);
        if (spread >= 0.6) {
          points.push({
            type: 'positive',
            title: 'Uniform Spatial Dispersion',
            body: `Inliers are well-distributed across ${gridCov}/16 quadrants (spread score: ${(spread * 100).toFixed(1)}%), providing balanced anchor points across the field of view.`,
          });
        } else if (spread >= 0.35) {
          points.push({
            type: 'neutral',
            title: 'Moderate Spatial Distribution',
            body: `Inliers occupy ${gridCov}/16 quadrants (spread score: ${(spread * 100).toFixed(1)}%). Points are slightly concentrated toward prominent visual structures.`,
          });
        } else {
          points.push({
            type: 'warning',
            title: 'Localized Inlier Clustering Warning',
            body: `Inliers are tightly concentrated (spread score: ${(spread * 100).toFixed(1)}%). Footprint extrapolation beyond the inlier cluster is geometrically unconstrained.`,
          });
        }
      }

      if (qa?.conditioning_metrics) {
        const condNum = qa.conditioning_metrics.canonical_condition_number;
        if (condNum <= 5.0) {
          points.push({
            type: 'positive',
            title: 'Stable Homography Conditioning',
            body: `Hartley-Zisserman isotropic condition number κ(H) is ${condNum.toFixed(2)}, indicating minimal perspective shear and high numerical stability.`,
          });
        } else if (condNum <= 15.0) {
          points.push({
            type: 'neutral',
            title: 'Moderate Perspective Distortion',
            body: `Condition number κ(H) is ${condNum.toFixed(2)}, indicating noticeable perspective skew or oblique viewing angle between query and reference.`,
          });
        } else {
          points.push({
            type: 'warning',
            title: 'High Numerical Conditioning Warning',
            body: `Condition number κ(H) is ${condNum.toFixed(2)}. Homography exhibits extreme projective compression; edge coordinates may be sensitive to noise.`,
          });
        }
      }

      if (isGeoreferenced && result.geographic_footprint) {
        const gf = result.geographic_footprint;
        const inHa = ((gf.in_raster_area_m2 || 0) / 10000).toFixed(2);
        const outHa = ((gf.extrapolated_area_m2 || 0) / 10000).toFixed(2);
        points.push({
          type: 'positive',
          title: 'Geographically Anchored Localization',
          body: `Reference raster metadata allows real-world coordinate mapping. Footprint covers ${inHa} ha inside reference tile (${gf.overlap_percentage?.toFixed(1) || 100}% overlap) with ${outHa} ha extrapolated outside.`,
        });
      } else {
        points.push({
          type: 'neutral',
          title: 'Unreferenced Pixel Coordinates Only',
          body: `Reference raster lacks embedded geodetic tags (GeoTIFF tags / CRS). Estimated footprint is computed in 2D image pixels. No geographical lat/lon coordinates are fabricated.`,
        });
      }

      if (qa?.diagnostic_flags?.length > 0) {
        points.push({
          type: 'warning',
          title: 'Diagnostic Warnings Active',
          body: `Flags triggered: ${qa.diagnostic_flags.join(', ').replace(/_/g, ' ')}. Inspect corresponding panels before committing operational decisions.`,
        });
      }
    } else {
      points.push({
        type: 'warning',
        title: 'Localization Terminated',
        body: 'Correspondences failed to satisfy geometric constraints or minimum inlier thresholds.',
      });
    }

    return points;
  };

  const interpretationPoints = generateDynamicInterpretation();

  return (
    <div className="panel" style={{ marginTop: 14 }}>
      <div className="panel-title" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <span>Matching Metrics & Diagnostic Analysis</span>
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

      {/* ===== SECTION: HOW TO INTERPRET THIS RESULT ===== */}
      <div
        style={{
          background: 'rgba(10, 10, 12, 0.95)',
          border: '1px solid var(--border-light)',
          borderRadius: 'var(--radius)',
          padding: '14px 16px',
          marginBottom: 16,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
          <span style={{ fontWeight: 600, fontSize: 13, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-primary)' }}>
            How to Interpret This Result
          </span>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {interpretationPoints.map((item, idx) => (
            <div
              key={idx}
              style={{
                fontSize: 12,
                lineHeight: 1.5,
                padding: '6px 10px',
                borderRadius: 'var(--radius)',
                background:
                  item.type === 'positive'
                    ? 'rgba(16, 185, 129, 0.08)'
                    : item.type === 'warning'
                    ? 'rgba(239, 68, 68, 0.08)'
                    : 'rgba(56, 189, 248, 0.08)',
                borderLeft:
                  item.type === 'positive'
                    ? '3px solid var(--accent-green)'
                    : item.type === 'warning'
                    ? '3px solid var(--accent-red)'
                    : '3px solid var(--accent-blue)',
              }}
            >
              <strong style={{ color: item.type === 'positive' ? 'var(--accent-green)' : (item.type === 'warning' ? 'var(--accent-red)' : 'var(--accent-cyan)') }}>
                {item.title}:{' '}
              </strong>
              <span style={{ color: 'var(--text-primary)' }}>{item.body}</span>
            </div>
          ))}
        </div>
      </div>

      {/* ===== SECTION 1: FEATURE DETECTION ===== */}
      <SectionCollapsible title="1. Feature Detection & Keypoints">
        <div className="metrics-grid">
          <DiagnosticCard
            label="Ref. Keypoints"
            value={result.reference_keypoints}
            tooltip="Number of salient feature corners detected across the reference map"
          />
          <DiagnosticCard
            label="Qry. Keypoints"
            value={result.query_keypoints}
            tooltip="Number of salient feature corners detected across the query observation"
          />
          <DiagnosticCard
            label="Tentative Matches"
            value={result.tentative_matches}
            tooltip="Initial nearest-neighbor descriptor matches before ratio filtering"
          />
          <DiagnosticCard
            label="Filtered Matches"
            value={result.filtered_matches}
            tooltip="Matches passing Lowe's ratio test and reference landmark deduplication"
            highlight="var(--accent-cyan)"
          />
        </div>
      </SectionCollapsible>

      {/* ===== SECTION 2: GEOMETRIC VERIFICATION ===== */}
      <SectionCollapsible title="2. Geometric Verification & RANSAC">
        <div className="metrics-grid">
          <DiagnosticCard
            label="Inliers"
            value={inliers}
            highlight={inliers > 15 ? 'var(--accent-green)' : (inliers > 0 ? 'var(--accent-orange)' : 'var(--accent-red)')}
            tooltip="Correspondences satisfying planar homography H within tolerance"
          />
          <DiagnosticCard
            label="Inlier Outliers"
            value={outliers}
            tooltip="Filtered correspondences rejected by RANSAC as geometric outliers"
          />
          <DiagnosticCard
            label="Inlier Consensus Ratio"
            value={inlierRatioPct}
            unit="%"
            tooltip="Percentage of filtered matches retained as geometric inliers (higher indicates cleaner agreement)"
          />
          <DiagnosticCard
            label="Mean Reproj. Error"
            value={reprojMean}
            unit="px"
            tooltip="Mean Euclidean distance in pixels between warped query points and reference points"
          />
          <DiagnosticCard
            label="Median Reproj. Error"
            value={reprojMedian}
            unit="px"
            tooltip="Median reprojection residual (more robust against residual outliers)"
          />
          <DiagnosticCard
            label="RANSAC Tolerance"
            value={result.algorithm_params?.ransac_reproj_threshold}
            unit="px"
            tooltip="Maximum reprojection distance threshold configured for RANSAC"
          />
        </div>
      </SectionCollapsible>

      {/* ===== SECTION 3: RELIABILITY ASSESSMENT ===== */}
      <SectionCollapsible title="3. Multi-Signal Reliability & Quality Assessment">
        {qa ? (
          <>
            <div className="metrics-grid" style={{ marginBottom: 10 }}>
              <DiagnosticCard
                label="Categorical Status"
                value={qa.status}
                highlight={qa.status === 'ACCEPTED' ? 'var(--accent-green)' : (qa.status === 'LOW_CONFIDENCE' ? 'var(--accent-orange)' : 'var(--accent-red)')}
                tooltip="Reliability status: ACCEPTED (safe for tracking), LOW_CONFIDENCE (marginal), or REJECTED"
              />
              <DiagnosticCard
                label="Heuristic Confidence"
                value={(qa.confidence_score * 100).toFixed(1)}
                unit="%"
                highlight={qa.confidence_score >= 0.55 ? 'var(--accent-green)' : (qa.confidence_score >= 0.35 ? 'var(--accent-orange)' : 'var(--accent-red)')}
                tooltip="Multi-signal weighted confidence index in [0, 1]. Not an absolute Bayesian probability."
              />
              <DiagnosticCard
                label="Spatial Dispersion Spread"
                value={qa.spatial_metrics ? (qa.spatial_metrics.spatial_spread_score * 100).toFixed(1) : '—'}
                unit="%"
                tooltip="Gated convex hull and spatial entropy score. High spread indicates points cover multiple quadrants."
              />
              <DiagnosticCard
                label="Grid Quadrant Coverage"
                value={qa.spatial_metrics ? `${Math.round(qa.spatial_metrics.grid_coverage_ratio * 16)}/16` : '—'}
                tooltip="Fraction of 4x4 spatial image quadrants occupied by verified inliers"
              />
              <DiagnosticCard
                label="Condition Number κ(H)"
                value={qa.conditioning_metrics ? qa.conditioning_metrics.canonical_condition_number.toFixed(2) : '—'}
                tooltip="Hartley-Zisserman isotropic condition number of homography matrix. < 10 indicates high stability."
              />
              <DiagnosticCard
                label="Horizon Crossing"
                value={qa.conditioning_metrics?.horizon_crossing ? 'DETECTED' : 'CLEAN'}
                highlight={qa.conditioning_metrics?.horizon_crossing ? 'var(--accent-red)' : 'var(--accent-green)'}
                tooltip="Indicates whether the projected polygon crosses the line at infinity"
              />
            </div>

            {/* Diagnostic flags list if any */}
            {qa.diagnostic_flags?.length > 0 && (
              <div style={{ marginTop: 8, marginBottom: 8 }}>
                <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 4 }}>Diagnostic Warning Flags:</div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                  {qa.diagnostic_flags.map((flag) => (
                    <span key={flag} className="badge badge-warn mono" style={{ fontSize: 10 }}>
                      {flag.replace(/_/g, ' ')}
                    </span>
                  ))}
                </div>
              </div>
            )}

            <div className="disclaimer" style={{ fontSize: 11, marginTop: 6 }}>
              {qa.disclaimer || 'Heuristic multi-signal confidence metric; not an absolute calibrated Bayesian probability.'}
            </div>
          </>
        ) : (
          <div
            className="reliability-unassessed-panel"
            style={{
              padding: '16px 18px',
              background: 'linear-gradient(180deg, #141419 0%, #0d0d11 100%)',
              borderRadius: 'var(--radius)',
              border: '1px solid rgba(255, 255, 255, 0.08)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8, flexWrap: 'wrap' }}>
              <span className="badge badge-info" style={{ fontSize: 11 }}>Reliability Assessment: Not Assessed</span>
              <span style={{ fontSize: 11.5, color: 'var(--text-muted)' }}>Uncalibrated Pixel-Space Evaluation</span>
            </div>
            <p style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.55, margin: '0 0 12px 0' }}>
              Multi-signal heuristic quality assessment (spatial entropy spread, condition number κ(H), and horizon crossing) is <strong>not assessed</strong> for this run because it was evaluated on uncalibrated 2D pixel-space imagery without georeferencing metadata or camera matrix calibration.
              Geometric registration validity is governed deterministically by <strong>RANSAC consensus inliers ({inliers} verified inliers, {reprojMean} px mean reprojection residual)</strong>.
            </p>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 10 }}>
              <div className="metric-card" style={{ padding: '12px 14px' }}>
                <div className="metric-label" style={{ fontSize: 10, textTransform: 'uppercase', color: 'var(--text-muted)' }}>Geometric Verdict</div>
                <div style={{ fontSize: 15, fontWeight: 700, color: inliers >= 15 ? 'var(--accent-green)' : 'var(--accent-red)', fontFamily: 'var(--font-mono)', marginTop: 2 }}>
                  {inliers >= 15 ? 'ACCEPTED (GEOMETRIC)' : 'REJECTED (LOW CONSENSUS)'}
                </div>
                <div style={{ fontSize: 10.5, color: 'var(--text-muted)', marginTop: 4 }}>{inliers} inliers / 15 threshold</div>
              </div>
              <div className="metric-card" style={{ padding: '12px 14px' }}>
                <div className="metric-label" style={{ fontSize: 10, textTransform: 'uppercase', color: 'var(--text-muted)' }}>Full Multi-Signal QA Activation</div>
                <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--accent-cyan)', marginTop: 2 }}>
                  Georef GeoTIFF Required
                </div>
                <div style={{ fontSize: 10.5, color: 'var(--text-muted)', marginTop: 4 }}>Select a Georef GeoTIFF preset to view condition number & entropy</div>
              </div>
            </div>
          </div>
        )}
      </SectionCollapsible>

      {/* ===== SECTION 4: GEOSPATIAL INTELLIGENCE ===== */}
      <div id="section-geospatial">
        <SectionCollapsible title="4. Geospatial Intelligence & Footprint Containment">
          {isGeoreferenced && result.geographic_footprint && result.georeference ? (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
              <span style={{ fontWeight: 600, fontSize: 12, color: 'var(--text-primary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Geographic Footprint (WGS-84)
              </span>
              {result.georeference?.crs_epsg && (
                <span className="mono small badge badge-info">
                  EPSG:{result.georeference.crs_epsg}
                </span>
              )}
            </div>

            <div className="metrics-grid" style={{ marginBottom: 12 }}>
              <DiagnosticCard
                label="Coordinate System (CRS)"
                value={result.georeference.crs_name || result.georeference.crs}
                subtitle={result.georeference.crs_epsg ? `Authority: EPSG` : undefined}
                tooltip="Projected or geographic Coordinate Reference System"
              />
              <DiagnosticCard
                label="Ground Sample Distance"
                value={result.georeference.gsd_x?.toFixed(2)}
                unit="m/px"
                tooltip="Physical ground resolution represented by each raster pixel"
              />
              <DiagnosticCard
                label="In-Raster Footprint Area"
                value={((result.geographic_footprint.in_raster_area_m2 || 0) / 10000).toFixed(2)}
                unit="ha"
                subtitle={`${result.geographic_footprint.overlap_percentage?.toFixed(1) || 100}% inside raster`}
                highlight="var(--accent-cyan)"
                tooltip="Ground area of query footprint situated completely inside the reference raster"
              />
              <DiagnosticCard
                label="Extrapolated Area"
                value={((result.geographic_footprint.extrapolated_area_m2 || 0) / 10000).toFixed(2)}
                unit="ha"
                subtitle="Outside raster extent"
                highlight={result.geographic_footprint.extrapolated_area_m2 > 0 ? 'var(--accent-orange)' : undefined}
                tooltip="Ground area extrapolated beyond reference boundaries into unmapped terrain"
              />
            </div>

            {/* Geographic Coordinates Display */}
            <div style={{ background: 'var(--bg-secondary)', padding: '10px 12px', borderRadius: 'var(--radius)', border: '1px solid var(--border)', marginBottom: 10 }}>
              <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--accent-cyan)', marginBottom: 6 }}>
                Estimated Center (Lat/Lon):
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 8 }}>
                <div style={{ display: 'flex', alignItems: 'center' }}>
                  <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>WGS-84 (Lat / Lon): </span>
                  <span className="mono" style={{ fontWeight: 600, color: 'var(--accent-green)', marginLeft: 4 }}>
                    {result.geographic_footprint.center.lat.toFixed(6)}° N, {result.geographic_footprint.center.lon.toFixed(6)}° E
                  </span>
                  <CopyCoordinateButton
                    textToCopy={`${result.geographic_footprint.center.lat.toFixed(6)}, ${result.geographic_footprint.center.lon.toFixed(6)}`}
                    label="WGS-84 Center"
                  />
                </div>
                {result.projected_footprint && (
                  <div style={{ display: 'flex', alignItems: 'center' }}>
                    <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>UTM Projected (E / N): </span>
                    <span className="mono" style={{ fontWeight: 600, marginLeft: 4 }}>
                      E {result.projected_footprint.center.x.toFixed(1)} m, N {result.projected_footprint.center.y.toFixed(1)} m
                    </span>
                    <CopyCoordinateButton
                      textToCopy={`E=${result.projected_footprint.center.x.toFixed(1)}, N=${result.projected_footprint.center.y.toFixed(1)}`}
                      label="UTM Center"
                    />
                  </div>
                )}
              </div>
            </div>

            {/* Corner Coordinates Table */}
            <div style={{ fontSize: 11, fontWeight: 600, marginBottom: 6 }}>Footprint Boundary Corners (WGS-84):</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 6 }}>
              {[
                { key: 'top_left', label: 'Northwest (NW)' },
                { key: 'top_right', label: 'Northeast (NE)' },
                { key: 'bottom_right', label: 'Southeast (SE)' },
                { key: 'bottom_left', label: 'Southwest (SW)' },
              ].map(({ key, label }) => (
                <div key={key} className="mono" style={{ background: 'var(--bg-secondary)', padding: '6px 8px', borderRadius: 4, fontSize: 11, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <span style={{ color: 'var(--text-muted)' }}>{label}: </span>
                    <span style={{ fontWeight: 600 }}>
                      {result.geographic_footprint[key].lat.toFixed(5)}°N, {result.geographic_footprint[key].lon.toFixed(5)}°E
                    </span>
                  </div>
                  <CopyCoordinateButton
                    textToCopy={`${result.geographic_footprint[key].lat.toFixed(6)}, ${result.geographic_footprint[key].lon.toFixed(6)}`}
                    label={label}
                  />
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div>
            <div className="disclaimer" style={{ marginBottom: 10 }}>
              Unreferenced Imagery: Reference image lacks embedded geospatial tags (GeoTIFF tags / EPSG). Coordinates remain strictly in 2D image-plane pixels. No GPS/GNSS coordinates are fabricated.
            </div>
            {result.estimated_region && (
              <div>
                <div style={{ fontSize: 11, fontWeight: 600, marginBottom: 6 }}>Footprint Boundary Corners (Raster Pixels):</div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 6 }}>
                  {[
                    { key: 'top_left', label: 'Northwest (NW)' },
                    { key: 'top_right', label: 'Northeast (NE)' },
                    { key: 'bottom_right', label: 'Southeast (SE)' },
                    { key: 'bottom_left', label: 'Southwest (SW)' },
                  ].map(({ key, label }) => (
                    <div key={key} className="mono" style={{ background: 'var(--bg-secondary)', padding: '6px 8px', borderRadius: 4, fontSize: 11 }}>
                      <span style={{ color: 'var(--text-muted)' }}>{label}: </span>
                      <span style={{ fontWeight: 600 }}>
                        ({result.estimated_region[key][0].toFixed(1)}, {result.estimated_region[key][1].toFixed(1)}) px
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </SectionCollapsible>
      </div>

      {/* ===== SECTION 5: PERFORMANCE & SOFTWARE ===== */}
      <SectionCollapsible title="5. System Performance & Reproducibility Record" defaultOpen={false}>
        <div className="metrics-grid">
          <DiagnosticCard
            label="Total Pipeline Time"
            value={result.processing_time_s?.toFixed(3)}
            unit="s"
            tooltip="End-to-end latency for feature detection, matching, RANSAC, and artifact generation"
          />
          <DiagnosticCard
            label="Feature Algorithm"
            value={result.algorithm_params?.algorithm || 'ORB'}
            subtitle={result.algorithm_version}
            tooltip="Configured feature detection and descriptor matching pipeline"
          />
          <DiagnosticCard
            label="OpenCV Core Version"
            value={result.software_versions?.opencv}
            tooltip="OpenCV computer vision library runtime version"
          />
          <DiagnosticCard
            label="Application Build"
            value={result.software_versions?.app || 'v0.1.0'}
            tooltip="SceneNav AI core application release build"
          />
        </div>
      </SectionCollapsible>

      {/* Algorithm record */}
      <div style={{ marginTop: 14, fontSize: 11, color: 'var(--text-muted)' }}>
        Algorithm: <strong style={{ color: 'var(--accent-cyan)' }}>{result.algorithm_params?.algorithm || 'ORB'}</strong> ({result.algorithm_version}) · OpenCV {result.software_versions?.opencv}
      </div>
    </div>
  );
}
