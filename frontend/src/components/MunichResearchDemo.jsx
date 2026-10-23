/**
 * SceneNav AI — Munich Cadastral Visual Localization Research Demonstration
 *
 * Publication-grade interactive showcase presenting the audited Munich aerial localization
 * experiment, deterministic metrics, multi-temporal comparison, and 6 high-resolution figures.
 */
import { useState, useEffect } from 'react';
import { fetchResearchDemonstration, researchArtifactUrl } from '../api/client';

function Lightbox({ url, title, onClose }) {
  const [scale, setScale] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  const handleZoomIn = (e) => {
    e?.stopPropagation();
    setScale((prev) => Math.min(prev + 0.3, 4));
  };

  const handleZoomOut = (e) => {
    e?.stopPropagation();
    setScale((prev) => Math.max(prev - 0.3, 0.4));
  };

  const handleReset = (e) => {
    e?.stopPropagation();
    setScale(1);
    setPosition({ x: 0, y: 0 });
  };

  const handleWheel = (e) => {
    e.preventDefault();
    if (e.deltaY < 0) {
      setScale((prev) => Math.min(prev + 0.2, 4));
    } else {
      setScale((prev) => Math.max(prev - 0.2, 0.4));
    }
  };

  const handleMouseDown = (e) => {
    if (e.button !== 0) return;
    setIsDragging(true);
    setDragStart({ x: e.clientX - position.x, y: e.clientY - position.y });
  };

  const handleMouseMove = (e) => {
    if (!isDragging) return;
    setPosition({ x: e.clientX - dragStart.x, y: e.clientY - dragStart.y });
  };

  const handleMouseUp = () => setIsDragging(false);

  return (
    <div
      className="lightbox-overlay"
      onClick={onClose}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onWheel={handleWheel}
      style={{
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        padding: 20,
        zIndex: 9999,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          width: '100%',
          background: 'rgba(15, 23, 42, 0.95)',
          padding: '10px 18px',
          borderRadius: 8,
          border: '1px solid var(--border)',
          zIndex: 10,
        }}
      >
        <div>
          <span style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: 14 }}>
            {title}
          </span>
          <span className="badge badge-info mono small" style={{ marginLeft: 12 }}>
            Publication Resolution
          </span>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <button className="btn-secondary small" onClick={handleZoomOut} title="Zoom Out">−</button>
          <span className="mono small" style={{ minWidth: 50, textAlign: 'center', color: 'var(--accent-cyan)' }}>
            {Math.round(scale * 100)}%
          </span>
          <button className="btn-secondary small" onClick={handleZoomIn} title="Zoom In">+</button>
          <button className="btn-secondary small" onClick={handleReset} title="Reset">Reset</button>
          <button className="btn-danger small" onClick={onClose} title="Close (Esc)">✕</button>
        </div>
      </div>

      <div
        style={{
          flex: 1,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          overflow: 'hidden',
          width: '100%',
          cursor: isDragging ? 'grabbing' : (scale > 1 ? 'grab' : 'default'),
        }}
        onMouseDown={handleMouseDown}
      >
        <img
          src={url}
          alt={title}
          draggable={false}
          onClick={(e) => e.stopPropagation()}
          style={{
            transform: `translate(${position.x}px, ${position.y}px) scale(${scale})`,
            transition: isDragging ? 'none' : 'transform 0.1s ease-out',
            maxWidth: '92vw',
            maxHeight: '82vh',
            objectFit: 'contain',
            userSelect: 'none',
            borderRadius: 4,
            boxShadow: '0 20px 40px rgba(0,0,0,0.6)',
          }}
        />
      </div>

      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          alignSelf: 'center',
          background: 'rgba(15, 23, 42, 0.9)',
          padding: '6px 16px',
          borderRadius: 20,
          border: '1px solid var(--border)',
          fontSize: 12,
          color: 'var(--text-muted)',
        }}
      >
        🖱️ Mouse Wheel to Zoom • Click & Drag to Pan • Press Esc to Close
      </div>
    </div>
  );
}

const ARTIFACT_TABS = [
  {
    id: '06_executive_research_overview.png',
    label: '📑 Executive 16:9 Overview',
    desc: 'Comprehensive summary layout featuring input images, footprint overlay, metrics scorecard, and integrity disclosures.',
  },
  {
    id: '02_georeferenced_footprint_overlay.png',
    label: '🗺️ Cadastral Footprint (94.8% / 5.2% Split)',
    desc: 'Authoritative two-tone georeferenced footprint overlay showing verified in-raster extent (solid cyan, 94.79%) and eastern extrapolated extent beyond E=688,100m (amber dashed, 5.21%).',
  },
  {
    id: '01_feature_correspondences_sift.png',
    label: '🔗 SIFT Correspondences (138 Inliers)',
    desc: 'Difference-of-Gaussians scale-space pyramid matching showing 138 verified inliers (79.8% inlier ratio).',
  },
  {
    id: '01_feature_correspondences_orb.png',
    label: '⚡ ORB Correspondences (79 Inliers)',
    desc: 'High-speed oriented FAST + steered BRIEF binary descriptor matching showing 79 verified inliers (83.2% inlier ratio).',
  },
  {
    id: '03_warped_query_registration.png',
    label: '📐 Warped Projective Registration',
    desc: '4-panel alignment verification: original query, reference orthophoto, warped query plane, and 50/50 blended seam overlay.',
  },
  {
    id: '04_orb_vs_sift_comparison.png',
    label: '📊 ORB vs. SIFT Benchmark Scorecard',
    desc: 'Complete quantitative evaluation matrix comparing detector density, inlier ratios, residuals, runtime, and 0.42m repeatability delta.',
  },
  {
    id: '05_temporal_urban_transformation.png',
    label: '⏳ Temporal Transformation (2012 vs 2024)',
    desc: 'Heckenstaller-Tunnel urban transformation analysis documenting why the 2024 reference image was safely rejected.',
  },
];

export default function MunichResearchDemo({ onSwitchToPipeline }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeArtifact, setActiveArtifact] = useState(ARTIFACT_TABS[0].id);
  const [activeDataTab, setActiveDataTab] = useState('coordinates');
  const [lightboxOpen, setLightboxOpen] = useState(false);

  useEffect(() => {
    let mounted = true;
    fetchResearchDemonstration()
      .then((record) => {
        if (mounted) {
          setData(record);
          setLoading(false);
        }
      })
      .catch((err) => {
        if (mounted) {
          setError(err.message);
          setLoading(false);
        }
      });
    return () => { mounted = false; };
  }, []);

  const handleDownloadRecord = () => {
    if (!data) return;
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'experiment_record_munich_20261022.json';
    a.click();
    URL.revokeObjectURL(url);
  };

  const activeTabMeta = ARTIFACT_TABS.find((t) => t.id === activeArtifact) || ARTIFACT_TABS[0];
  const artifactImageUrl = researchArtifactUrl(activeArtifact);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* Top Banner Card */}
      <div className="panel" style={{ background: 'linear-gradient(135deg, rgba(15,23,42,0.95), rgba(30,41,59,0.8))', border: '1px solid rgba(6,182,212,0.3)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12 }}>
          <div>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 6 }}>
              <span className="badge badge-success" style={{ fontSize: 11, padding: '4px 10px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                🌐 LOCALIZED (WGS-84)
              </span>
              <span className="badge badge-info mono" style={{ fontSize: 11 }}>
                EPSG:25832 (ETRS89 / UTM zone 32N)
              </span>
              <span className="badge mono" style={{ fontSize: 11, background: 'rgba(245,158,11,0.15)', color: '#f59e0b', border: '1px solid rgba(245,158,11,0.3)' }}>
                AUDITED OCT 2026
              </span>
            </div>
            <h2 style={{ fontSize: 20, fontWeight: 700, margin: '4px 0', color: 'var(--text-primary)' }}>
              Munich Cadastral Visual Localization Demonstration
            </h2>
            <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
              Query: DLR 3K Airborne Camera (July 2011) · Reference: Bavaria DOP20 True-Orthophoto (July 2012, 0.50m GSD)
            </div>
          </div>

          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <button className="btn-secondary small" onClick={handleDownloadRecord} title="Download Machine-Readable JSON Record">
              💾 Export experiment_record.json
            </button>
            {onSwitchToPipeline && (
              <button className="btn-primary small" onClick={onSwitchToPipeline}>
                ⚡ Open in Live Pipeline
              </button>
            )}
          </div>
        </div>

        {/* High-Level Metric Cards Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 10, marginTop: 16 }}>
          <div className="metric-card" style={{ borderLeft: '3px solid var(--accent-cyan)' }}>
            <div className="metric-label">Audited UTM Centroid</div>
            <div className="metric-value mono" style={{ fontSize: 13, color: 'var(--accent-cyan)' }}>
              E=687,789.1 m<br />N=5,331,662.8 m
            </div>
          </div>
          <div className="metric-card" style={{ borderLeft: '3px solid var(--accent-green)' }}>
            <div className="metric-label">Audited WGS-84 Centroid</div>
            <div className="metric-value mono" style={{ fontSize: 13, color: 'var(--accent-green)' }}>
              48.110518° N<br />11.522913° E
            </div>
          </div>
          <div className="metric-card" style={{ borderLeft: '3px solid #f59e0b' }}>
            <div className="metric-label">Inter-Algorithm Repeatability</div>
            <div className="metric-value mono" style={{ fontSize: 15, color: '#f59e0b' }}>
              0.42 m (42.0 cm)
            </div>
            <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>ORB vs. SIFT Delta</div>
          </div>
          <div className="metric-card" style={{ borderLeft: '3px solid #8b5cf6' }}>
            <div className="metric-label">Ground Footprint Area</div>
            <div className="metric-value mono" style={{ fontSize: 15, color: '#8b5cf6' }}>
              339,161 m² / 338,934 m²
            </div>
            <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>SIFT / ORB (Δ = 227 m² · 0.07%)</div>
          </div>
          <div className="metric-card" style={{ borderLeft: '3px solid #06b6d4', background: 'rgba(6,182,212,0.06)' }}>
            <div className="metric-label">Raster Boundary Overlap</div>
            <div className="metric-value mono" style={{ fontSize: 14 }}>
              <span style={{ color: '#06b6d4', fontWeight: 700 }}>94.8%</span> / <span style={{ color: '#f59e0b', fontWeight: 700 }}>5.2%</span>
            </div>
            <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>321,487 m² verified · 17,674 m² extrapolated</div>
          </div>
          <div className="metric-card" style={{ borderLeft: '3px solid var(--accent-green)' }}>
            <div className="metric-label">Inlier Support (2012 DOP)</div>
            <div className="metric-value mono" style={{ fontSize: 14 }}>
              SIFT: 138 / ORB: 79
            </div>
            <div style={{ fontSize: 10, color: 'var(--accent-green)' }}>79.8% / 83.2% ratio</div>
          </div>
          <div className="metric-card" style={{ borderLeft: '3px solid #ef4444' }}>
            <div className="metric-label">2024 Current DOP</div>
            <div className="metric-value mono" style={{ fontSize: 14, color: '#ef4444' }}>
              REJECTED (5 & 6 inliers)
            </div>
            <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>Tunnel transformation</div>
          </div>
        </div>
      </div>

      {/* Main Visual Artifacts Viewer */}
      <div className="panel" style={{ padding: 16 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, flexWrap: 'wrap', gap: 8 }}>
          <div className="panel-title" style={{ margin: 0 }}>
            Publication-Grade Visual Artifacts
          </div>
          <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>
            Generated deterministically at publication resolution with TrueType typography
          </span>
        </div>

        {/* Artifact View Tabs */}
        <div style={{ display: 'flex', gap: 6, overflowX: 'auto', paddingBottom: 6, marginBottom: 12 }}>
          {ARTIFACT_TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveArtifact(tab.id)}
              style={{
                padding: '6px 12px',
                borderRadius: 6,
                border: activeArtifact === tab.id ? '1px solid var(--accent-cyan)' : '1px solid var(--border)',
                background: activeArtifact === tab.id ? 'rgba(6, 182, 212, 0.15)' : 'var(--bg-secondary)',
                color: activeArtifact === tab.id ? 'var(--accent-cyan)' : 'var(--text-secondary)',
                fontWeight: activeArtifact === tab.id ? 600 : 400,
                fontSize: 12,
                cursor: 'pointer',
                whiteSpace: 'nowrap',
                transition: 'all 0.15s ease',
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Active Tab Description */}
        <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 10, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span>{activeTabMeta.desc}</span>
          <button
            className="btn-secondary small"
            onClick={() => setLightboxOpen(true)}
            style={{ fontSize: 11, display: 'flex', alignItems: 'center', gap: 4 }}
          >
            🔍 Interactive Zoom & Pan
          </button>
        </div>

        {/* Image Preview Canvas */}
        <div
          onClick={() => setLightboxOpen(true)}
          style={{
            position: 'relative',
            background: '#0b0f17',
            borderRadius: 8,
            overflow: 'hidden',
            border: '1px solid var(--border)',
            cursor: 'zoom-in',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            minHeight: 480,
          }}
        >
          <img
            src={artifactImageUrl}
            alt={activeTabMeta.label}
            style={{ width: '100%', maxHeight: '70vh', objectFit: 'contain', display: 'block' }}
          />
          <div
            style={{
              position: 'absolute',
              bottom: 12,
              right: 12,
              background: 'rgba(15, 23, 42, 0.85)',
              padding: '4px 10px',
              borderRadius: 4,
              fontSize: 11,
              color: 'var(--text-muted)',
              border: '1px solid var(--border)',
              pointerEvents: 'none',
            }}
          >
            🔍 Click to open interactive pan/zoom lightbox
          </div>
        </div>
      </div>

      {/* Lightbox Modal */}
      {lightboxOpen && (
        <Lightbox
          url={artifactImageUrl}
          title={activeTabMeta.label}
          onClose={() => setLightboxOpen(false)}
        />
      )}

      {/* Deep-Dive Technical Analysis Tabs */}
      <div className="panel" style={{ padding: 16 }}>
        <div style={{ display: 'flex', gap: 8, borderBottom: '1px solid var(--border)', paddingBottom: 8, marginBottom: 16, overflowX: 'auto' }}>
          {[
            { id: 'coordinates', label: '📍 Audited Geodetic Coordinates' },
            { id: 'algorithm', label: '📊 ORB vs. SIFT Comparison' },
            { id: 'temporal', label: '⏳ Temporal Urban Transformation' },
            { id: 'camera', label: '✈️ Camera Station Telemetry' },
            { id: 'disclosures', label: '🛡️ Scientific Integrity Disclosures' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveDataTab(tab.id)}
              style={{
                background: 'none',
                border: 'none',
                padding: '6px 14px',
                fontSize: 13,
                fontWeight: activeDataTab === tab.id ? 600 : 400,
                color: activeDataTab === tab.id ? 'var(--accent-cyan)' : 'var(--text-secondary)',
                borderBottom: activeDataTab === tab.id ? '2px solid var(--accent-cyan)' : '2px solid transparent',
                cursor: 'pointer',
                whiteSpace: 'nowrap',
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Tab 1: Coordinates */}
        {activeDataTab === 'coordinates' && (
          <div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 14 }}>
              <div style={{ background: 'var(--bg-secondary)', padding: 14, borderRadius: 6, border: '1px solid var(--border)' }}>
                <div style={{ fontWeight: 600, fontSize: 13, color: 'var(--accent-cyan)', marginBottom: 8 }}>
                  Audited Footprint Centroid (SIFT Baseline)
                </div>
                <div className="mono" style={{ fontSize: 12, lineHeight: 1.6 }}>
                  <strong>Projected (EPSG:25832):</strong><br />
                  Easting: 687,788.7 m<br />
                  Northing: 5,331,662.7 m<br />
                  <br />
                  <strong>Geographic (WGS-84):</strong><br />
                  Latitude: 48.110518° N<br />
                  Longitude: 11.522907° E
                </div>
              </div>

              <div style={{ background: 'var(--bg-secondary)', padding: 14, borderRadius: 6, border: '1px solid var(--border)' }}>
                <div style={{ fontWeight: 600, fontSize: 13, color: 'var(--accent-green)', marginBottom: 8 }}>
                  Audited Footprint Centroid (ORB Baseline)
                </div>
                <div className="mono" style={{ fontSize: 12, lineHeight: 1.6 }}>
                  <strong>Projected (EPSG:25832):</strong><br />
                  Easting: 687,789.1 m<br />
                  Northing: 5,331,662.8 m<br />
                  <br />
                  <strong>Geographic (WGS-84):</strong><br />
                  Latitude: 48.110518° N<br />
                  Longitude: 11.522913° E
                </div>
              </div>

              <div style={{ background: 'var(--bg-secondary)', padding: 14, borderRadius: 6, border: '1px solid var(--border)' }}>
                <div style={{ fontWeight: 600, fontSize: 13, color: '#f59e0b', marginBottom: 8 }}>
                  Footprint Geometry & Dimensions
                </div>
                <div className="mono" style={{ fontSize: 12, lineHeight: 1.6 }}>
                  <strong>Total SIFT Area:</strong> 339,161 m² (33.92 ha)<br />
                  <strong>Total ORB Area:</strong> 338,934 m² (Δ = 227 m² · 0.07%)<br />
                  <strong>In-Raster Extent:</strong> 321,487 m² (94.79%)<br />
                  <strong>Extrapolated East:</strong> 17,674 m² (5.21% beyond E=688,100m)<br />
                  <strong>Mean Dimensions:</strong> 712.7 m × 475.9 m (Aspect: 1.497)
                </div>
              </div>
            </div>

            {/* Corner Coordinates Table */}
            <div style={{ marginTop: 14, overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                <thead>
                  <tr style={{ background: 'var(--bg-secondary)', borderBottom: '1px solid var(--border)', textAlign: 'left' }}>
                    <th style={{ padding: '8px 10px' }}>Corner</th>
                    <th style={{ padding: '8px 10px' }}>UTM 32N Easting</th>
                    <th style={{ padding: '8px 10px' }}>UTM 32N Northing</th>
                    <th style={{ padding: '8px 10px' }}>WGS-84 Latitude</th>
                    <th style={{ padding: '8px 10px' }}>WGS-84 Longitude</th>
                    <th style={{ padding: '8px 10px' }}>Coverage Status</th>
                  </tr>
                </thead>
                <tbody className="mono">
                  <tr style={{ borderBottom: '1px solid var(--border)' }}>
                    <td style={{ padding: '8px 10px', color: 'var(--accent-cyan)' }}>Top-Left (NW)</td>
                    <td style={{ padding: '8px 10px' }}>687,398.1 m</td>
                    <td style={{ padding: '8px 10px' }}>5,331,860.7 m</td>
                    <td style={{ padding: '8px 10px' }}>48.112413° N</td>
                    <td style={{ padding: '8px 10px' }}>11.517751° E</td>
                    <td style={{ padding: '8px 10px', color: 'var(--accent-green)' }}>✓ Inside Reference Raster</td>
                  </tr>
                  <tr style={{ borderBottom: '1px solid var(--border)' }}>
                    <td style={{ padding: '8px 10px', color: '#f59e0b' }}>Top-Right (NE)</td>
                    <td style={{ padding: '8px 10px' }}>688,112.0 m</td>
                    <td style={{ padding: '8px 10px' }}>5,331,939.7 m</td>
                    <td style={{ padding: '8px 10px' }}>48.112912° N</td>
                    <td style={{ padding: '8px 10px' }}>11.527368° E</td>
                    <td style={{ padding: '8px 10px', color: '#f59e0b' }}>⚠ Extrapolated (+12.0m E)</td>
                  </tr>
                  <tr style={{ borderBottom: '1px solid var(--border)' }}>
                    <td style={{ padding: '8px 10px', color: '#f59e0b' }}>Bottom-Right (SE)</td>
                    <td style={{ padding: '8px 10px' }}>688,162.7 m</td>
                    <td style={{ padding: '8px 10px' }}>5,331,473.1 m</td>
                    <td style={{ padding: '8px 10px' }}>48.108703° N</td>
                    <td style={{ padding: '8px 10px' }}>11.527843° E</td>
                    <td style={{ padding: '8px 10px', color: '#f59e0b' }}>⚠ Extrapolated (+62.7m E)</td>
                  </tr>
                  <tr>
                    <td style={{ padding: '8px 10px', color: 'var(--accent-cyan)' }}>Bottom-Left (SW)</td>
                    <td style={{ padding: '8px 10px' }}>687,461.5 m</td>
                    <td style={{ padding: '8px 10px' }}>5,331,382.4 m</td>
                    <td style={{ padding: '8px 10px' }}>48.108094° N</td>
                    <td style={{ padding: '8px 10px' }}>11.518392° E</td>
                    <td style={{ padding: '8px 10px', color: 'var(--accent-green)' }}>✓ Inside Reference Raster</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Tab 2: Algorithm Comparison */}
        {activeDataTab === 'algorithm' && (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
              <thead>
                <tr style={{ background: 'var(--bg-secondary)', borderBottom: '1px solid var(--border)', textAlign: 'left' }}>
                  <th style={{ padding: '10px' }}>Evaluation Metric</th>
                  <th style={{ padding: '10px' }}>ORB Baseline (Fast Binary)</th>
                  <th style={{ padding: '10px' }}>SIFT Alternative (Scale-Space)</th>
                  <th style={{ padding: '10px' }}>Discrepancy (Delta)</th>
                  <th style={{ padding: '10px' }}>Scientific Assessment</th>
                </tr>
              </thead>
              <tbody>
                <tr style={{ borderBottom: '1px solid var(--border)' }}>
                  <td style={{ padding: '10px', fontWeight: 600 }}>Keypoint Detector Density</td>
                  <td style={{ padding: '10px' }} className="mono">5,000 / 5,000</td>
                  <td style={{ padding: '10px' }} className="mono">5,000 / 5,000</td>
                  <td style={{ padding: '10px' }} className="mono">0</td>
                  <td style={{ padding: '10px', color: 'var(--text-secondary)' }}>Identical detector capacity on 1536px pyramid</td>
                </tr>
                <tr style={{ borderBottom: '1px solid var(--border)' }}>
                  <td style={{ padding: '10px', fontWeight: 600 }}>Ratio-Filtered Matches</td>
                  <td style={{ padding: '10px' }} className="mono">95 matches</td>
                  <td style={{ padding: '10px' }} className="mono">173 matches</td>
                  <td style={{ padding: '10px', color: '#f59e0b' }} className="mono">+78 (+82.1%)</td>
                  <td style={{ padding: '10px', color: 'var(--text-secondary)' }}>Continuous gradient histograms provide denser tentative matches</td>
                </tr>
                <tr style={{ borderBottom: '1px solid var(--border)' }}>
                  <td style={{ padding: '10px', fontWeight: 600 }}>RANSAC Geometric Inliers</td>
                  <td style={{ padding: '10px', color: 'var(--accent-cyan)' }} className="mono">79 inliers</td>
                  <td style={{ padding: '10px', color: 'var(--accent-green)' }} className="mono">138 inliers</td>
                  <td style={{ padding: '10px', color: '#f59e0b' }} className="mono">+59 (+74.7%)</td>
                  <td style={{ padding: '10px', color: 'var(--text-secondary)' }}>SIFT achieves higher feature support across rooftop structures</td>
                </tr>
                <tr style={{ borderBottom: '1px solid var(--border)' }}>
                  <td style={{ padding: '10px', fontWeight: 600 }}>Geometric Inlier Ratio</td>
                  <td style={{ padding: '10px', color: 'var(--accent-cyan)' }} className="mono">83.2%</td>
                  <td style={{ padding: '10px', color: 'var(--accent-green)' }} className="mono">79.8%</td>
                  <td style={{ padding: '10px', color: '#f59e0b' }} className="mono">-3.4%</td>
                  <td style={{ padding: '10px', color: 'var(--text-secondary)' }}>Both algorithms comfortably exceed 10-inlier safety threshold</td>
                </tr>
                <tr style={{ borderBottom: '1px solid var(--border)' }}>
                  <td style={{ padding: '10px', fontWeight: 600 }}>Mean Reprojection Residual</td>
                  <td style={{ padding: '10px' }} className="mono">2.28 px (~1.14 m)</td>
                  <td style={{ padding: '10px' }} className="mono">1.68 px (~0.84 m)</td>
                  <td style={{ padding: '10px', color: '#f59e0b' }} className="mono">-0.60 px</td>
                  <td style={{ padding: '10px', color: 'var(--text-secondary)' }}>Evaluated in reference raster pixel space (GSD = 0.50m/px)</td>
                </tr>
                <tr style={{ borderBottom: '1px solid var(--border)' }}>
                  <td style={{ padding: '10px', fontWeight: 600 }}>Processing Duration</td>
                  <td style={{ padding: '10px' }} className="mono">3.74 s</td>
                  <td style={{ padding: '10px' }} className="mono">4.32 s</td>
                  <td style={{ padding: '10px', color: 'var(--accent-green)' }} className="mono">ORB 15% faster</td>
                  <td style={{ padding: '10px', color: 'var(--text-secondary)' }}>ORB binary Hamming distance operations execute faster on CPU</td>
                </tr>
                <tr>
                  <td style={{ padding: '10px', fontWeight: 600 }}>Cross-Algorithm Repeatability</td>
                  <td style={{ padding: '10px' }} className="mono">E=687,789.1, N=5,331,662.8</td>
                  <td style={{ padding: '10px' }} className="mono">E=687,788.7, N=5,331,662.7</td>
                  <td style={{ padding: '10px', color: 'var(--accent-cyan)', fontWeight: 600 }} className="mono">Δ = 0.42 m (42.0 cm)</td>
                  <td style={{ padding: '10px', color: 'var(--text-secondary)' }}>Sub-meter inter-algorithmic agreement under identical reference geometry</td>
                </tr>
              </tbody>
            </table>
          </div>
        )}

        {/* Tab 3: Temporal Transformation */}
        {activeDataTab === 'temporal' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
              <div style={{ background: 'rgba(16,185,129,0.06)', padding: 14, borderRadius: 6, border: '1px solid rgba(16,185,129,0.2)' }}>
                <div style={{ fontWeight: 600, color: 'var(--accent-green)', fontSize: 13, marginBottom: 6 }}>
                  ✓ 2012 Historical Orthophoto (DOP20) — Localized
                </div>
                <div style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.6 }}>
                  Captured July 2012 during active Mittlerer Ring Südwest construction. Open excavation trenches, temporary ramps, retaining walls, and asphalt corridors match the July 2011 aerial photograph.<br />
                  <strong style={{ color: 'var(--accent-green)' }}>SIFT: 138 inliers (79.8%) · ORB: 79 inliers (83.2%) → LOCALIZED</strong>
                </div>
              </div>

              <div style={{ background: 'rgba(239,68,68,0.06)', padding: 14, borderRadius: 6, border: '1px solid rgba(239,68,68,0.2)' }}>
                <div style={{ fontWeight: 600, color: '#ef4444', fontSize: 13, marginBottom: 6 }}>
                  ✗ 2024 Current Orthophoto (Munich Municipal) — Rejected
                </div>
                <div style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.6 }}>
                  Captured in 2024 after completion of the €398M Heckenstaller-Tunnel (opened June 2015). Expressway moved underground; surface converted to 2.7 ha parkland with lawns, acoustic berms, and trees.<br />
                  <strong style={{ color: '#ef4444' }}>SIFT: 6 inliers (21.4%) · ORB: 5 inliers (15.6%) → REJECTED (&lt; 10 inliers)</strong>
                </div>
              </div>
            </div>

            <div style={{ background: 'var(--bg-secondary)', padding: 14, borderRadius: 6, border: '1px solid var(--border)', fontSize: 12, lineHeight: 1.6 }}>
              <strong style={{ color: 'var(--text-primary)' }}>Why This Proves System Reliability:</strong>
              <p style={{ margin: '6px 0 0 0', color: 'var(--text-secondary)' }}>
                A common failure mode in visual localization systems is <em>false positive acceptance</em> when presented with out-of-date reference imagery. SceneNav AI's strict RANSAC consensus filter (threshold: 10 geometric inliers) successfully prevented a false geographic lock, proving that the verification pipeline rejects obsolete maps where visual appearance has fundamentally transformed.
              </p>
            </div>
          </div>
        )}

        {/* Tab 4: Camera Station */}
        {activeDataTab === 'camera' && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 14 }}>
            <div style={{ background: 'var(--bg-secondary)', padding: 14, borderRadius: 6, border: '1px solid var(--border)' }}>
              <div style={{ fontWeight: 600, fontSize: 13, color: '#f59e0b', marginBottom: 8 }}>
                Aircraft GNSS Station (EXIF)
              </div>
              <div className="mono" style={{ fontSize: 12, lineHeight: 1.6 }}>
                <strong>Latitude:</strong> 48.110297° N<br />
                <strong>Longitude:</strong> 11.523567° E<br />
                <strong>UTM Easting:</strong> 687,838.6 m<br />
                <strong>UTM Northing:</strong> 5,331,639.8 m<br />
                <strong>Barometric/GPS Altitude:</strong> 1,611.5 m MSL
              </div>
            </div>

            <div style={{ background: 'var(--bg-secondary)', padding: 14, borderRadius: 6, border: '1px solid var(--border)' }}>
              <div style={{ fontWeight: 600, fontSize: 13, color: 'var(--accent-cyan)', marginBottom: 8 }}>
                Horizontal Displacement & Vector
              </div>
              <div className="mono" style={{ fontSize: 12, lineHeight: 1.6 }}>
                <strong>Horizontal Offset:</strong> 54.6 m SSE<br />
                <strong>Δ Easting:</strong> +49.9 m<br />
                <strong>Δ Northing:</strong> -22.9 m<br />
                <strong>Ground Elevation:</strong> ~535.0 m MSL (Munich)<br />
                <strong>True Flight Altitude (AGL):</strong> ~1,076.5 m
              </div>
            </div>

            <div style={{ background: 'var(--bg-secondary)', padding: 14, borderRadius: 6, border: '1px solid var(--border)' }}>
              <div style={{ fontWeight: 600, fontSize: 13, color: 'var(--accent-green)', marginBottom: 8 }}>
                Inferred Optical Axis Pitch
              </div>
              <div className="mono" style={{ fontSize: 12, lineHeight: 1.6 }}>
                <strong>Pitch Angle (AGL basis):</strong> 2.90° off-nadir<br />
                <span style={{ color: 'var(--text-muted)', fontSize: 11 }}>arctan(54.6m / 1076.5m)</span><br />
                <br />
                <strong>Pitch Angle (MSL basis):</strong> 1.94° off-nadir<br />
                <span style={{ color: 'var(--text-muted)', fontSize: 11 }}>arctan(54.6m / 1611.5m)</span><br />
                <br />
                <span style={{ color: '#f59e0b', fontSize: 11 }}>* Inferred geometric estimate (no attitude sensor in EXIF)</span>
              </div>
            </div>
          </div>
        )}

        {/* Tab 5: Disclosures */}
        {activeDataTab === 'disclosures' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {[
              {
                title: '1. Repeatability vs. Absolute Geographic Accuracy',
                body: 'The 0.42 m discrepancy demonstrates inter-algorithmic repeatability between ORB and SIFT under identical reference geometry. It does NOT validate absolute geographic ground accuracy against physical Earth coordinates, because both pipelines share the same reference orthophoto.',
              },
              {
                title: '2. Ground Control Points (GCPs)',
                body: 'No surveyed terrestrial Ground Control Points (GCPs) or differential-GPS checkpoints were used during this test. Absolute geodetic coordinates reflect the Bavarian Vermessungsverwaltung state cadastral survey framework (EPSG:25832).',
              },
              {
                title: '3. Reprojection Residual Domain',
                body: 'Mean reprojection errors (1.68 px SIFT / 2.28 px ORB) are mathematical fit residuals evaluated in reference raster pixel space (GSD = 0.50 m/px). They do not represent physical flight navigation error.',
              },
              {
                title: '4. Camera Orientation & Attitude',
                body: 'The 2.90° off-nadir pitch angle is an inferred geometric estimate derived by dividing horizontal displacement by estimated AGL altitude. The original DSLR airborne camera lacked inertial measurement unit (IMU) telemetry in its EXIF header.',
              },
              {
                title: '5. Prototype Status',
                body: 'SceneNav AI is an offline visual-localization research prototype. It is not certified for autonomous flight guidance or safety-critical GPS-denied navigation.',
              },
              {
                title: '6. Reference Raster Coverage & Eastern Boundary Extrapolation',
                body: '94.79% (321,487 m²) of the estimated footprint lies within the Bavarian cadastral reference raster tile (bavaria_2012_aligned_dop.tif, 2800×2400 px, Easting max: 688,100.0 m). The remaining 5.21% (17,674 m²) extends past the eastern tile boundary and represents projective homography extrapolation. Visual features were matched solely within the 94.79% verified region; the extrapolated 5.21% is not confirmed by this reference tile.',
              },
              {
                title: '7. Area Discrepancy Resolution (338,934 m² vs. 339,161 m²)',
                body: 'The 227 m² discrepancy between earlier reports (338,934 m²) and later runs (339,161 m²) stems from comparing the ORB footprint polygon (338,934 m²) against the SIFT footprint polygon (339,161 m²). Both calculations are mathematically exact (0.067% variance); SIFT inliers span slightly wider building geometries, resulting in a 227 m² larger ground footprint.',
              },
            ].map((disc, idx) => (
              <div
                key={idx}
                style={{
                  background: 'var(--bg-secondary)',
                  padding: 12,
                  borderRadius: 6,
                  borderLeft: '3px solid #f59e0b',
                  fontSize: 12,
                }}
              >
                <div style={{ fontWeight: 600, color: 'var(--text-primary)', marginBottom: 4 }}>
                  {disc.title}
                </div>
                <div style={{ color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                  {disc.body}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
