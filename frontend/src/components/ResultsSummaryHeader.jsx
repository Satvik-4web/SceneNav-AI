/**
 * SceneNav AI — ResultsSummaryHeader
 *
 * Executive results summary at the top of the localization results section.
 * Clearly communicates:
 *  - Categorical Reliability Status (ACCEPTED, LOW_CONFIDENCE, REJECTED)
 *  - Georeferenced Status (WGS-84 / UTM vs Image-Plane Pixel Space)
 *  - Heuristic Confidence Index (with mandatory disclaimer)
 *  - Inlier Count & Inlier Consensus Ratio
 *  - Reprojection Error & Latency
 *  - PDF Research Report & JSON Export Actions
 */
import { useState } from 'react';
import { jobReportPdfUrl } from '../api/client';

export default function ResultsSummaryHeader({ result, onExportJson, onOpenExplorer, onOpenAnalytics }) {
  const [downloadingPdf, setDownloadingPdf] = useState(false);
  if (!result) return null;

  const qa = result.quality_assessment;
  const status = result.status;
  const isSuccess = status === 'success';

  // Categorical reliability status
  let qaStatus = 'REJECTED';
  let qaBadgeCls = 'badge-error';
  let qaIcon = '■';
  let qaLabel = 'REJECTED (UNRELIABLE)';

  if (qa) {
    qaStatus = qa.status;
    if (qaStatus === 'ACCEPTED') {
      qaBadgeCls = 'badge-success';
      qaIcon = '●';
      qaLabel = 'ACCEPTED (HIGH CONFIDENCE)';
    } else if (qaStatus === 'LOW_CONFIDENCE') {
      qaBadgeCls = 'badge-warn';
      qaIcon = '▲';
      qaLabel = 'LOW CONFIDENCE (MARGINAL)';
    }
  } else if (isSuccess) {
    qaStatus = 'ACCEPTED';
    qaBadgeCls = 'badge-success';
    qaIcon = '●';
    qaLabel = 'MATCH SUCCESSFUL';
  }

  // Geographic referencing status
  const isGeoreferenced = result.localization_status === 'localized';
  const geoBadgeCls = isGeoreferenced ? 'badge-info' : 'badge-warn';
  const geoLabel = isGeoreferenced
    ? 'GEOGRAPHICALLY REFERENCED (WGS-84 / UTM)'
    : isSuccess ? 'IMAGE MATCH ONLY (PIXEL SPACE)' : 'NO VERIFIED LOCALIZATION';
  const geoDesc = isGeoreferenced
    ? `Reference raster anchored to ${result.georeference?.crs_name || 'EPSG:4326'}; coordinates depend on the accuracy of the supplied metadata.`
    : isSuccess ? 'Image-space result only; no geographic accuracy is established.' : 'Matching was rejected. No verified position is available.';

  const inliers = result.geometric_inliers ?? 0;
  const totalFiltered = result.filtered_matches ?? 0;
  const inlierRatioPct = result.inlier_ratio != null ? (result.inlier_ratio * 100).toFixed(1) : '—';
  const reprojErr = result.reprojection_error?.mean_px != null ? `${result.reprojection_error.mean_px.toFixed(2)} px` : '—';
  const latency = `${result.processing_time_s?.toFixed(3) || '—'} s`;
  const confScorePct = qa ? `${(qa.confidence_score * 100).toFixed(0)}%` : '—';
  const algorithmName = result.algorithm_params?.algorithm || 'ORB';
  const isMultiScale = Boolean(result.algorithm_params?.multi_scale);

  const handleDownloadPdf = async () => {
    setDownloadingPdf(true);
    try {
      const url = jobReportPdfUrl(result.job_id);
      const resp = await fetch(url);
      if (!resp.ok || resp.headers.get('content-type')?.includes('text/html')) {
        throw new Error('PDF report generation requires a live Python backend connection.');
      }
      const blob = await resp.blob();
      const blobUrl = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = blobUrl;
      a.download = `scenenav_research_report_${result.job_id.slice(0, 8)}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(blobUrl);
    } catch (err) {
      alert(`Could not download PDF report: ${err.message}`);
    } finally {
      setDownloadingPdf(false);
    }
  };

  return (
    <div
      className={`results-summary-card result-command-center ${isSuccess ? 'is-match' : 'is-rejected'}`}
      style={{
        background: 'linear-gradient(180deg, #121217 0%, #0a0a0d 100%)',
        border: '1px solid rgba(255, 255, 255, 0.09)',
        borderRadius: 'var(--radius)',
        padding: '16px 20px',
        marginBottom: 16,
        boxShadow: 'inset 0 1px 0 rgba(255, 255, 255, 0.08), 0 8px 32px rgba(0, 0, 0, 0.6)',
      }}
    >
      <div className="result-intro">
        <div><span className="result-kicker">SCENENAV / MATCH REPORT</span><h2>{isSuccess ? 'We found the overlap.' : 'This pair needs another look.'}</h2><p>{isSuccess ? 'The images align. Here’s the evidence behind the result.' : 'The system could not verify a reliable geometric match.'}</p></div>
        <div className="result-orb" aria-hidden="true"><span>⌖</span></div>
      </div>
      {/* Top Row: Primary Badges & Action Buttons */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: 12,
          marginBottom: 14,
          paddingBottom: 12,
          borderBottom: '1px solid rgba(255, 255, 255, 0.07)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
          <span className={`badge ${qaBadgeCls}`} style={{ fontSize: 12, padding: '4px 10px' }}>
            {qaIcon} {qaLabel}
          </span>
          <span className={`badge ${geoBadgeCls}`} style={{ fontSize: 11, padding: '4px 8px' }}>
            {geoLabel}
          </span>
          <span className="mono small muted" style={{ fontSize: 11 }}>
            Job: {result.job_id?.slice(0, 8)}
          </span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          {onOpenExplorer && (
            <button
              type="button"
              className="btn-secondary small"
              style={{ fontSize: 12, padding: '6px 12px' }}
              onClick={onOpenExplorer}
              title="Open full-screen visual inspection stage"
            >
              <span>Results Explorer ➔</span>
            </button>
          )}
          {onOpenAnalytics && (
            <button
              type="button"
              className="btn-secondary small"
              style={{ fontSize: 12, padding: '6px 12px' }}
              onClick={onOpenAnalytics}
              title="Inspect technical diagnostics and benchmark tables"
            >
              <span>Detailed Analytics ➔</span>
            </button>
          )}
          <button
            type="button"
            className="btn-primary small"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              fontSize: 12,
              padding: '6px 12px',
            }}
            onClick={handleDownloadPdf}
            disabled={downloadingPdf}
            title="Download publication-grade multi-page PDF research report"
          >
            {downloadingPdf ? (
              <>
                <span className="loading-spinner" style={{ width: 12, height: 12 }} />
                <span>Building PDF…</span>
              </>
            ) : (
              <span>Generate Research Report (PDF)</span>
            )}
          </button>
          <button
            type="button"
            className="btn-secondary small"
            style={{ fontSize: 12, padding: '6px 12px' }}
            onClick={onExportJson}
            title="Export raw structured experiment result JSON"
          >
            Export JSON
          </button>
        </div>
      </div>

      {/* Main KPI Strip */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))',
          gap: 10,
          marginBottom: 12,
        }}
      >
        {/* Metric 1: Inliers */}
        <div style={{ background: 'linear-gradient(180deg, #141419 0%, #0d0d11 100%)', padding: '10px 14px', borderRadius: 'var(--radius)', border: '1px solid rgba(255, 255, 255, 0.08)', boxShadow: 'inset 0 1px 0 rgba(255, 255, 255, 0.04)' }}>
          <div style={{ fontSize: 10, textTransform: 'uppercase', color: 'var(--text-muted)', letterSpacing: '0.05em' }}>
            RANSAC Inliers
          </div>
          <div className="mono" style={{ fontSize: 18, fontWeight: 700, color: inliers > 15 ? 'var(--accent-green)' : (inliers > 0 ? 'var(--accent-orange)' : 'var(--accent-red)') }}>
            {inliers}
            <span style={{ fontSize: 11, color: 'var(--text-secondary)', fontWeight: 400, marginLeft: 4 }}>
              ({inlierRatioPct}%)
            </span>
          </div>
          <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 2 }}>
            of {totalFiltered} filtered matches
          </div>
        </div>

        {/* Metric 2: Reprojection Error */}
        <div style={{ background: 'linear-gradient(180deg, #141419 0%, #0d0d11 100%)', padding: '10px 14px', borderRadius: 'var(--radius)', border: '1px solid rgba(255, 255, 255, 0.08)', boxShadow: 'inset 0 1px 0 rgba(255, 255, 255, 0.04)' }}>
          <div style={{ fontSize: 10, textTransform: 'uppercase', color: 'var(--text-muted)', letterSpacing: '0.05em' }}>
            Mean Reproj. Error
          </div>
          <div className="mono" style={{ fontSize: 18, fontWeight: 700, color: 'var(--text-primary)' }}>
            {reprojErr}
          </div>
          <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 2 }}>
            tolerance: {result.algorithm_params?.ransac_reproj_threshold || 4.0} px
          </div>
        </div>

        {/* Metric 3: Confidence Score */}
        <div style={{ background: 'linear-gradient(180deg, #141419 0%, #0d0d11 100%)', padding: '10px 14px', borderRadius: 'var(--radius)', border: '1px solid rgba(255, 255, 255, 0.08)', boxShadow: 'inset 0 1px 0 rgba(255, 255, 255, 0.04)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: 10, textTransform: 'uppercase', color: 'var(--text-muted)', letterSpacing: '0.05em' }}>
              Confidence Index
            </span>
            <span
              style={{ cursor: 'help', fontSize: 11, color: 'var(--text-muted)' }}
              title="Heuristic multi-signal index combining inlier count, inlier ratio, reprojection error, spatial dispersion, and condition number. Not an absolute calibrated probability."
            >
              ℹ
            </span>
          </div>
          <div className="mono" style={{ fontSize: 18, fontWeight: 700, color: qa?.confidence_score >= 0.55 ? 'var(--accent-green)' : (qa?.confidence_score >= 0.35 ? 'var(--accent-orange)' : 'var(--accent-red)') }}>
            {confScorePct}
          </div>
          <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 2 }}>
            {qa?.status || 'uncalibrated heuristic'}
          </div>
        </div>

        {/* Metric 4: Algorithm & Pyramid */}
        <div style={{ background: 'linear-gradient(180deg, #141419 0%, #0d0d11 100%)', padding: '10px 14px', borderRadius: 'var(--radius)', border: '1px solid rgba(255, 255, 255, 0.08)', boxShadow: 'inset 0 1px 0 rgba(255, 255, 255, 0.04)' }}>
          <div style={{ fontSize: 10, textTransform: 'uppercase', color: 'var(--text-muted)', letterSpacing: '0.05em' }}>
            Feature Engine
          </div>
          <div className="mono" style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-primary)' }}>
            {algorithmName}
          </div>
          <div style={{ fontSize: 10, color: isMultiScale ? 'var(--accent-green)' : 'var(--text-muted)', marginTop: 2 }}>
            {isMultiScale ? 'Pyramid Multi-Scale' : 'Single Scale'}
          </div>
        </div>

        {/* Metric 5: Execution Latency */}
        <div style={{ background: 'linear-gradient(180deg, #141419 0%, #0d0d11 100%)', padding: '10px 14px', borderRadius: 'var(--radius)', border: '1px solid rgba(255, 255, 255, 0.08)', boxShadow: 'inset 0 1px 0 rgba(255, 255, 255, 0.04)' }}>
          <div style={{ fontSize: 10, textTransform: 'uppercase', color: 'var(--text-muted)', letterSpacing: '0.05em' }}>
            Pipeline Latency
          </div>
          <div className="mono" style={{ fontSize: 18, fontWeight: 700, color: 'var(--text-primary)' }}>
            {latency}
          </div>
          <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 2 }}>
            feature + homography + QA
          </div>
        </div>
      </div>

      {/* Bottom Explanatory Notice */}
      <div style={{ fontSize: 11, color: 'var(--text-muted)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 6 }}>
        <span>{geoDesc}</span>
        <span style={{ fontStyle: 'italic' }}>
          * Confidence scores and inliers establish image geometric agreement; they do not establish independent real-world geodetic ground truth.
        </span>
      </div>
    </div>
  );
}
