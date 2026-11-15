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

  const hasQaConfidence = qa && typeof qa.confidence_score === 'number' && !isNaN(qa.confidence_score);
  const confScoreText = hasQaConfidence ? `${(qa.confidence_score * 100).toFixed(0)}%` : 'Not assessed';
  const confSubtext = hasQaConfidence
    ? (qaStatus === 'ACCEPTED' ? 'High Confidence (Verified)' : qaStatus)
    : 'Uncalibrated pixel-space';
  const confTooltip = hasQaConfidence
    ? 'Heuristic multi-signal index combining inlier count, inlier ratio, reprojection error, spatial dispersion, and condition number.'
    : 'Multi-signal confidence score is not assessed on uncalibrated pixel-space pairs. Geometric inlier consensus governs registration validity.';

  const algorithmName = result.algorithm_params?.algorithm || 'ORB';
  const isMultiScale = Boolean(result.algorithm_params?.multi_scale);

  const handleDownloadPdf = async () => {
    setDownloadingPdf(true);
    try {
      const url = jobReportPdfUrl(result.job_id);
      const resp = await fetch(url);
      if (!resp.ok || resp.headers.get('content-type')?.includes('text/html')) {
        // Fallback for client-side / cloud deployment: trigger browser print-to-PDF
        window.print();
        return;
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
    } catch {
      window.print();
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
        <div>
          <span className="result-kicker">SCENENAV / MATCH REPORT</span>
          <h2>{isSuccess ? 'Geometric overlap estimated.' : 'Geometric verification failed.'}</h2>
          <p>{isSuccess ? 'Planar correspondences align in pixel space. Review the geometric evidence and residual metrics below.' : 'Correspondences failed to satisfy geometric constraints or minimum inlier thresholds.'}</p>
        </div>
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

      {/* Main KPI Strip with Hero Metric Prominence and Generous Spacing */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
          gap: 12,
          marginBottom: 14,
        }}
      >
        {/* Metric 1: Inliers (Primary Hero) */}
        <div
          className="summary-metric-card hero-kpi"
          style={{
            background: 'linear-gradient(180deg, #161822 0%, #0e1017 100%)',
            padding: '14px 16px',
            borderRadius: 'var(--radius)',
            border: '1px solid rgba(59, 130, 246, 0.32)',
            boxShadow: '0 4px 16px rgba(0, 0, 0, 0.4), inset 0 1px 0 rgba(255, 255, 255, 0.08)',
          }}
        >
          <div style={{ fontSize: 10.5, textTransform: 'uppercase', color: 'var(--text-muted)', letterSpacing: '0.06em', fontWeight: 600 }}>
            RANSAC Inliers
          </div>
          <div className="mono" style={{ fontSize: 22, fontWeight: 700, color: inliers > 15 ? 'var(--accent-green)' : (inliers > 0 ? 'var(--accent-orange)' : 'var(--accent-red)'), marginTop: 2 }}>
            {inliers}
            <span style={{ fontSize: 12, color: 'var(--text-secondary)', fontWeight: 500, marginLeft: 6 }}>
              ({inlierRatioPct}%)
            </span>
          </div>
          <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>
            of {totalFiltered} filtered matches
          </div>
        </div>

        {/* Metric 2: Reprojection Error (Primary Hero) */}
        <div
          className="summary-metric-card hero-kpi"
          style={{
            background: 'linear-gradient(180deg, #161822 0%, #0e1017 100%)',
            padding: '14px 16px',
            borderRadius: 'var(--radius)',
            border: '1px solid rgba(59, 130, 246, 0.32)',
            boxShadow: '0 4px 16px rgba(0, 0, 0, 0.4), inset 0 1px 0 rgba(255, 255, 255, 0.08)',
          }}
        >
          <div style={{ fontSize: 10.5, textTransform: 'uppercase', color: 'var(--text-muted)', letterSpacing: '0.06em', fontWeight: 600 }}>
            Mean Reproj. Error
          </div>
          <div className="mono" style={{ fontSize: 22, fontWeight: 700, color: 'var(--text-primary)', marginTop: 2 }}>
            {reprojErr}
          </div>
          <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>
            tolerance: {result.algorithm_params?.ransac_reproj_threshold || 4.0} px
          </div>
        </div>

        {/* Metric 3: Confidence Score */}
        <div
          className="summary-metric-card"
          style={{
            background: 'linear-gradient(180deg, #141419 0%, #0d0d11 100%)',
            padding: '14px 16px',
            borderRadius: 'var(--radius)',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            boxShadow: 'inset 0 1px 0 rgba(255, 255, 255, 0.04)',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: 10.5, textTransform: 'uppercase', color: 'var(--text-muted)', letterSpacing: '0.06em', fontWeight: 600 }}>
              Confidence Index
            </span>
            <span
              style={{ cursor: 'help', fontSize: 11, color: 'var(--text-muted)' }}
              title={confTooltip}
            >
              ℹ
            </span>
          </div>
          <div className="mono" style={{
            fontSize: hasQaConfidence ? 20 : 15,
            fontWeight: 700,
            color: hasQaConfidence
              ? (qa?.confidence_score >= 0.55 ? 'var(--accent-green)' : (qa?.confidence_score >= 0.35 ? 'var(--accent-orange)' : 'var(--accent-red)'))
              : 'var(--text-secondary)',
            marginTop: 2,
          }}>
            {confScoreText}
          </div>
          <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>
            {confSubtext}
          </div>
        </div>

        {/* Metric 4: Algorithm & Pyramid */}
        <div
          className="summary-metric-card"
          style={{
            background: 'linear-gradient(180deg, #141419 0%, #0d0d11 100%)',
            padding: '14px 16px',
            borderRadius: 'var(--radius)',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            boxShadow: 'inset 0 1px 0 rgba(255, 255, 255, 0.04)',
          }}
        >
          <div style={{ fontSize: 10.5, textTransform: 'uppercase', color: 'var(--text-muted)', letterSpacing: '0.06em', fontWeight: 600 }}>
            Feature Engine
          </div>
          <div className="mono" style={{ fontSize: 20, fontWeight: 700, color: 'var(--text-primary)', marginTop: 2 }}>
            {algorithmName}
          </div>
          <div style={{ fontSize: 11, color: isMultiScale ? 'var(--accent-green)' : 'var(--text-muted)', marginTop: 4 }}>
            {isMultiScale ? 'Pyramid Multi-Scale' : 'Single Scale'}
          </div>
        </div>

        {/* Metric 5: Execution Latency */}
        <div
          className="summary-metric-card"
          style={{
            background: 'linear-gradient(180deg, #141419 0%, #0d0d11 100%)',
            padding: '14px 16px',
            borderRadius: 'var(--radius)',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            boxShadow: 'inset 0 1px 0 rgba(255, 255, 255, 0.04)',
          }}
        >
          <div style={{ fontSize: 10.5, textTransform: 'uppercase', color: 'var(--text-muted)', letterSpacing: '0.06em', fontWeight: 600 }}>
            Pipeline Latency
          </div>
          <div className="mono" style={{ fontSize: 20, fontWeight: 700, color: 'var(--text-primary)', marginTop: 2 }}>
            {latency}
          </div>
          <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>
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
