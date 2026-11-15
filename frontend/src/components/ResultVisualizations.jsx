/**
 * SceneNav AI — ResultVisualizations Workspace
 *
 * Professional research-grade visualization workspace featuring:
 *   - Featured Interactive Canvas Stage (Panel D Footprint Centerpiece, Panel A, B, C, E)
 *   - Quick 5-Panel Artifact Gallery (.result-image-card) with Lightbox zoom/pan
 *   - Clear distinction between observed in-raster and extrapolated areas
 *   - 100% responsive, dark slate scientific aesthetic
 */
import { useState, useRef, useEffect } from 'react';
import { artifactUrl } from '../api/client';

const PANELS = [
  {
    id: 'footprint',
    code: 'Panel D',
    title: 'Estimated Footprint Overlay',
    isCenterpiece: true,
    artifactKey: 'footprint',
    badge: 'CENTERPIECE',
    description: 'Estimated observation footprint polygon overlaid on the reference raster with two-tone in-raster (Cyan) and extrapolated (Amber) area partitioning.',
    legend: [
      { color: '#06b6d4', label: 'Observed In-Raster Area' },
      { color: '#f59e0b', label: 'Extrapolated Area (Unmapped)' },
      { color: '#f43f5e', label: 'Corner Markers (NW/NE/SE/SW)' },
      { color: '#10b981', label: 'Estimated Centroid' },
    ],
    technicalNote: 'Corners transformed via homography H. Area partitioning uses Sutherland-Hodgman clipping against reference bounds.',
  },
  {
    id: 'side_by_side',
    code: 'Panel A',
    title: 'Reference & Query Comparison',
    isCenterpiece: false,
    artifactKey: 'side_by_side',
    badge: 'INPUT IMAGES',
    description: 'Side-by-side comparison preserving original aspect ratios, resolutions, and sensor geometry without black letterboxing.',
    legend: [
      { color: '#38bdf8', label: 'Reference Image (Map / Ortho)' },
      { color: '#a855f7', label: 'Query Image (Observation Scene)' },
    ],
    technicalNote: 'Preserves native image aspect ratios while normalizing display heights for scientific inspection.',
  },
  {
    id: 'tentative_matches',
    code: 'Panel B',
    title: 'Feature Correspondences',
    isCenterpiece: false,
    artifactKey: 'tentative_matches',
    badge: 'CORRESPONDENCES',
    description: 'Tentative nearest-neighbor feature matches surviving Lowe’s ratio test filtering and reference landmark deduplication.',
    legend: [
      { color: '#eab308', label: 'Tentative Correspondence (Lowe Ratio <= 0.75)' },
    ],
    technicalNote: 'Represents candidate descriptor matches prior to RANSAC spatial verification.',
  },
  {
    id: 'inlier_matches',
    code: 'Panel C',
    title: 'RANSAC Inlier Verification',
    isCenterpiece: false,
    artifactKey: 'inlier_matches',
    badge: 'RANSAC CONSENSUS',
    description: 'Geometric consensus verification separating inliers that satisfy planar projective homography H from rejected spatial outliers.',
    legend: [
      { color: '#10b981', label: 'RANSAC Inliers (Planar Agreement)' },
      { color: '#ef4444', label: 'Rejected Outliers' },
    ],
    technicalNote: 'Inliers establish mathematical consensus with a 2D planar homography. Does NOT establish absolute ground-truth GNSS position.',
  },
  {
    id: 'warped_blend',
    code: 'Panel E',
    title: 'Warped Multi-Temporal Blend',
    isCenterpiece: false,
    artifactKey: 'warped_blend',
    badge: 'REGISTRATION BLEND',
    description: '50/50 multi-temporal alpha blend of perspective-warped query image registered into the reference coordinate frame.',
    legend: [
      { color: '#38bdf8', label: 'Reference Base Layer' },
      { color: '#ec4899', label: 'Warped Query Overlay' },
    ],
    technicalNote: 'Reveals registration accuracy through continuous road alignments and structural continuity across observations.',
  },
];

const ARTIFACT_LABELS = {
  side_by_side: 'Panel A: Reference & Query (Side-by-Side)',
  tentative_matches: 'Panel B: Tentative Feature Correspondences (Ratio-Filtered)',
  inlier_matches: 'Panel C: Geometric Inliers & Outliers (RANSAC-Verified)',
  footprint: 'Panel D: Estimated Query Footprint on Reference (Centerpiece)',
  warped_blend: 'Panel E: 50/50 Warped Multi-Temporal Registration Blend',
};

function InteractiveLightbox({ url, title, onClose }) {
  const [scale, setScale] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const dragStartRef = useRef({ x: 0, y: 0 });

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  const handleZoomIn = (e) => {
    e?.stopPropagation();
    setScale((prev) => Math.min(prev + 0.25, 4));
  };

  const handleZoomOut = (e) => {
    e?.stopPropagation();
    setScale((prev) => Math.max(prev - 0.25, 0.5));
  };

  const handleReset = (e) => {
    e?.stopPropagation();
    setScale(1);
    setPosition({ x: 0, y: 0 });
  };

  const handleWheel = (e) => {
    e.preventDefault();
    if (e.deltaY < 0) {
      setScale((prev) => Math.min(prev + 0.15, 4));
    } else {
      setScale((prev) => Math.max(prev - 0.15, 0.5));
    }
  };

  const handleMouseDown = (e) => {
    if (e.button !== 0) return;
    setIsDragging(true);
    dragStartRef.current = { x: e.clientX - position.x, y: e.clientY - position.y };
  };

  const handleMouseMove = (e) => {
    if (!isDragging) return;
    setPosition({
      x: e.clientX - dragStartRef.current.x,
      y: e.clientY - dragStartRef.current.y,
    });
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
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          width: '100%',
          background: 'rgba(10, 10, 12, 0.95)',
          padding: '8px 16px',
          borderRadius: 'var(--radius)',
          border: '1px solid var(--border)',
          zIndex: 10,
        }}
      >
        <span style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: 13 }}>
          {title}
        </span>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <button className="btn-secondary small" onClick={handleZoomOut} title="Zoom Out">−</button>
          <span className="mono small" style={{ minWidth: 45, textAlign: 'center', color: 'var(--accent-cyan)' }}>
            {Math.round(scale * 100)}%
          </span>
          <button className="btn-secondary small" onClick={handleZoomIn} title="Zoom In">+</button>
          <button className="btn-secondary small" onClick={handleReset} title="Reset Zoom">Reset</button>
          <button className="btn-danger small" onClick={onClose} title="Close (Esc)" style={{ marginLeft: 8 }}>
            ✕
          </button>
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
            maxWidth: '90vw',
            maxHeight: '80vh',
            objectFit: 'contain',
            userSelect: 'none',
          }}
        />
      </div>

      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          alignSelf: 'center',
          background: 'rgba(10, 10, 12, 0.95)',
          padding: '4px 14px',
          borderRadius: 20,
          border: '1px solid var(--border)',
          fontSize: 11,
          color: 'var(--text-muted)',
        }}
      >
        Scroll to zoom • Click & drag to pan • Press Esc to close
      </div>
    </div>
  );
}

function ArtifactImageCard({ jobId, filename, title }) {
  const [lightbox, setLightbox] = useState(false);
  const url = artifactUrl(jobId, filename);

  return (
    <>
      <div className="result-image-card">
        <div className="card-title" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span>{title}</span>
          <span className="small muted" style={{ fontSize: 10, cursor: 'pointer', color: 'var(--text-secondary)' }} onClick={() => setLightbox(true)}>
            Zoom
          </span>
        </div>
        <img
          src={url}
          alt={title}
          onClick={() => setLightbox(true)}
          style={{ cursor: 'zoom-in', width: '100%', display: 'block' }}
          onError={(e) => { e.target.style.display = 'none'; }}
        />
      </div>
      {lightbox && (
        <InteractiveLightbox
          url={url}
          title={title}
          onClose={() => setLightbox(false)}
        />
      )}
    </>
  );
}

function InteractiveStageCanvas({ url, title, onDownload }) {
  const [scale, setScale] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [imgDims, setImgDims] = useState(null);
  const containerRef = useRef(null);
  const dragStartRef = useRef({ x: 0, y: 0 });

  const handleZoomIn = () => setScale((prev) => Math.min(prev + 0.25, 4.0));
  const handleZoomOut = () => setScale((prev) => Math.max(prev - 0.25, 0.25));
  const handleReset = () => {
    setScale(1);
    setPosition({ x: 0, y: 0 });
  };

  const handleDoubleClick = () => {
    if (scale > 1.1) {
      handleReset();
    } else {
      setScale(2.0);
    }
  };

  const handleWheel = (e) => {
    e.preventDefault();
    if (e.deltaY < 0) {
      setScale((prev) => Math.min(prev + 0.15, 4.0));
    } else {
      setScale((prev) => Math.max(prev - 0.15, 0.25));
    }
  };

  const handleMouseDown = (e) => {
    if (e.button !== 0) return;
    setIsDragging(true);
    dragStartRef.current = { x: e.clientX - position.x, y: e.clientY - position.y };
  };

  const handleMouseMove = (e) => {
    if (!isDragging) return;
    setPosition({
      x: e.clientX - dragStartRef.current.x,
      y: e.clientY - dragStartRef.current.y,
    });
  };

  const handleMouseUp = () => setIsDragging(false);

  const toggleFullscreen = () => {
    if (!containerRef.current) return;
    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen().catch(() => {});
      setIsFullscreen(true);
    } else {
      document.exitFullscreen().catch(() => {});
      setIsFullscreen(false);
    }
  };

  useEffect(() => {
    const handleFsChange = () => setIsFullscreen(Boolean(document.fullscreenElement));
    document.addEventListener('fullscreenchange', handleFsChange);
    return () => document.removeEventListener('fullscreenchange', handleFsChange);
  }, []);

  return (
    <div
      ref={containerRef}
      style={{
        background: '#000000',
        border: '1px solid var(--border)',
        borderRadius: 'var(--radius)',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
        position: 'relative',
        height: isFullscreen ? '100vh' : '520px',
        marginBottom: 10,
      }}
    >
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '8px 14px',
          background: 'rgba(10, 10, 12, 0.95)',
          borderBottom: '1px solid var(--border)',
          zIndex: 10,
          flexWrap: 'wrap',
          gap: 8,
        }}
      >
        <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-primary)' }}>
          {title}
        </span>

        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <button className="btn-secondary small" onClick={handleZoomOut} title="Canvas Zoom Out" style={{ padding: '3px 8px' }}>−</button>
          <span className="mono small" style={{ minWidth: 44, textAlign: 'center', color: 'var(--accent-cyan)', fontSize: 11 }}>
            {Math.round(scale * 100)}%
          </span>
          <button className="btn-secondary small" onClick={handleZoomIn} title="Canvas Zoom In" style={{ padding: '3px 8px' }}>+</button>
          <button className="btn-secondary small" onClick={handleReset} title="Reset view" style={{ padding: '3px 8px', fontSize: 11 }}>
            Reset
          </button>
          <button className="btn-secondary small" onClick={toggleFullscreen} title="Toggle Fullscreen" style={{ padding: '3px 8px', fontSize: 11 }}>
            {isFullscreen ? 'Exit ⛶' : 'Fullscreen ⛶'}
          </button>
          {onDownload && (
            <button className="btn-secondary small" onClick={onDownload} title="Download original high-res PNG" style={{ padding: '3px 8px', fontSize: 11 }}>
              Download PNG
            </button>
          )}
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
          cursor: isDragging ? 'grabbing' : (scale > 1 ? 'grab' : 'crosshair'),
          position: 'relative',
        }}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onWheel={handleWheel}
        onDoubleClick={handleDoubleClick}
      >
        <img
          src={url}
          alt={title}
          draggable={false}
          onLoad={(e) => {
            if (e.target.naturalWidth && e.target.naturalHeight) {
              setImgDims({ w: e.target.naturalWidth, h: e.target.naturalHeight });
            }
          }}
          style={{
            transform: `translate(${position.x}px, ${position.y}px) scale(${scale})`,
            transition: isDragging ? 'none' : 'transform 0.08s ease-out',
            maxWidth: '100%',
            maxHeight: '100%',
            objectFit: 'contain',
            userSelect: 'none',
          }}
          onError={(e) => {
            e.target.style.display = 'none';
          }}
        />
      </div>

      <div
        style={{
          padding: '4px 12px',
          background: 'rgba(10, 10, 12, 0.95)',
          borderTop: '1px solid rgba(51, 65, 85, 0.5)',
          fontSize: 10,
          color: 'var(--text-muted)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
      >
        <span>Scroll to zoom • Drag to pan • Double-click to 200%</span>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          {imgDims && (
            <span className="mono" style={{ color: 'var(--accent-cyan)' }}>
              {imgDims.w} × {imgDims.h} px
            </span>
          )}
          <span className="mono">Interactive Canvas</span>
        </div>
      </div>
    </div>
  );
}

export default function ResultVisualizations({ result }) {
  const [activePanelId, setActivePanelId] = useState('footprint');
  const [viewMode, setViewMode] = useState('featured'); // 'featured' | 'quad_grid'

  if (!result || !result.artifacts || Object.keys(result.artifacts).length === 0) {
    if (result && result.status !== 'success') {
      return (
        <div className="panel" style={{ marginTop: 14 }}>
          <div className="panel-title">Visualizations</div>
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
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="8" x2="12" y2="12" />
                <line x1="12" y1="16" x2="12.01" y2="16" />
              </svg>
            </div>
            <p>No geometric visualizations available — matching did not succeed.</p>
            {result.failure_reason && (
              <p style={{ color: 'var(--accent-red)', fontSize: 12, marginTop: 4 }}>
                {result.failure_reason}
              </p>
            )}
          </div>
        </div>
      );
    }
    return null;
  }

  const { artifacts, job_id } = result;
  const getFilename = (path) => path.split('/').pop().split('\\').pop();

  const availablePanels = PANELS.filter((p) => p.artifactKey in artifacts);
  const activePanel = availablePanels.find((p) => p.id === activePanelId) || availablePanels[0] || PANELS[0];
  const availableArtifacts = Object.entries(ARTIFACT_LABELS).filter(([key]) => key in artifacts);

  const handleDownload = (filename, label) => {
    const url = artifactUrl(job_id, filename);
    const a = document.createElement('a');
    a.href = url;
    a.download = `scenenav_${label.toLowerCase().replace(/[^a-z0-9]/g, '_')}_${job_id.slice(0, 8)}.png`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  return (
    <div className="panel" style={{ marginTop: 14 }}>
      {/* Top Header */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: 10,
          marginBottom: 12,
        }}
      >
        <div>
          <div className="panel-title" style={{ margin: 0 }}>
            Visualizations & Corresponding Footprint
          </div>
          <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>
            Interactive multi-panel workspace displaying registration, feature correspondences, and footprint geometry.
          </div>
        </div>

        <div style={{ display: 'flex', gap: 6 }}>
          <button
            className={viewMode === 'featured' ? 'btn-primary small' : 'btn-secondary small'}
            style={{ fontSize: 12, padding: '4px 10px' }}
            onClick={() => setViewMode('featured')}
          >
            Featured Inspector
          </button>
          <button
            className={viewMode === 'quad_grid' ? 'btn-primary small' : 'btn-secondary small'}
            style={{ fontSize: 12, padding: '4px 10px' }}
            onClick={() => setViewMode('quad_grid')}
          >
            4-Panel Quad View
          </button>
        </div>
      </div>

      {viewMode === 'featured' ? (
        <>
          {/* Panel Selector Tabs */}
          <div
            style={{
              display: 'flex',
              gap: 6,
              overflowX: 'auto',
              paddingBottom: 8,
              marginBottom: 12,
              borderBottom: '1px solid var(--border)',
            }}
          >
            {availablePanels.map((panel) => {
              const isActive = panel.id === activePanel.id;
              return (
                <button
                  key={panel.id}
                  onClick={() => setActivePanelId(panel.id)}
                  style={{
                    padding: '8px 14px',
                    fontSize: 12,
                    borderRadius: 'var(--radius)',
                    background: isActive ? 'var(--bg-panel)' : 'var(--bg-secondary)',
                    border: isActive ? '1px solid var(--accent-blue)' : '1px solid var(--border)',
                    color: isActive ? 'var(--text-primary)' : 'var(--text-secondary)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                    whiteSpace: 'nowrap',
                  }}
                >
                  <span className="mono" style={{ fontSize: 10, color: isActive ? 'var(--accent-cyan)' : 'var(--text-muted)' }}>
                    {panel.code}
                  </span>
                  <span>{panel.title}</span>
                  {panel.isCenterpiece && (
                    <span className="badge badge-info" style={{ fontSize: 9, padding: '1px 5px' }}>
                      CENTERPIECE
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Interactive Featured Canvas Stage */}
          <InteractiveStageCanvas
            url={artifactUrl(job_id, getFilename(artifacts[activePanel.artifactKey]))}
            title={`${activePanel.code} — ${activePanel.title}`}
            onDownload={() => handleDownload(getFilename(artifacts[activePanel.artifactKey]), activePanel.title)}
          />

          {/* Technical Contextual Legend */}
          <div
            style={{
              padding: '12px 14px',
              background: 'var(--bg-secondary)',
              border: '1px solid var(--border)',
              borderRadius: 'var(--radius)',
              marginBottom: 16,
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 8, marginBottom: 8 }}>
              <div>
                <span style={{ fontWeight: 600, fontSize: 13, color: 'var(--text-primary)' }}>
                  {activePanel.title}
                </span>
                <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>
                  {activePanel.description}
                </p>
              </div>

              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center' }}>
                {activePanel.legend.map((item, idx) => (
                  <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11 }}>
                    <span style={{ width: 10, height: 10, borderRadius: '50%', background: item.color, display: 'inline-block' }} />
                    <span style={{ color: 'var(--text-secondary)' }}>{item.label}</span>
                  </div>
                ))}
              </div>
            </div>

            <div style={{ fontSize: 11, color: 'var(--text-muted)', fontStyle: 'italic', borderTop: '1px solid rgba(51, 65, 85, 0.4)', paddingTop: 6 }}>
              <b>Technical Interpretation:</b> {activePanel.technicalNote}
            </div>
          </div>
        </>
      ) : (
        /* Quad Grid View */
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: 14, marginBottom: 16 }}>
          {availablePanels.map((panel) => {
            const filename = getFilename(artifacts[panel.artifactKey]);
            const url = artifactUrl(job_id, filename);
            return (
              <div
                key={panel.id}
                style={{
                  background: 'var(--bg-secondary)',
                  border: '1px solid var(--border)',
                  borderRadius: 'var(--radius)',
                  overflow: 'hidden',
                  display: 'flex',
                  flexDirection: 'column',
                }}
              >
                <div
                  style={{
                    padding: '8px 12px',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    borderBottom: '1px solid var(--border)',
                    background: 'var(--bg-panel)',
                  }}
                >
                  <span style={{ fontSize: 12, fontWeight: 600 }}>
                    {panel.code}: {panel.title}
                  </span>
                  <div style={{ display: 'flex', gap: 6 }}>
                    <button
                      className="btn-secondary small"
                      style={{ fontSize: 10, padding: '2px 6px' }}
                      onClick={() => {
                        setActivePanelId(panel.id);
                        setViewMode('featured');
                      }}
                      title="Inspect full screen"
                    >
                      Inspect
                    </button>
                    <button
                      className="btn-secondary small"
                      style={{ fontSize: 10, padding: '2px 6px' }}
                      onClick={() => handleDownload(filename, panel.title)}
                      title="Download image"
                    >
                      PNG
                    </button>
                  </div>
                </div>

                <div
                  style={{
                    height: 280,
                    background: '#000000',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    overflow: 'hidden',
                    cursor: 'pointer',
                  }}
                  onClick={() => {
                    setActivePanelId(panel.id);
                    setViewMode('featured');
                  }}
                >
                  <img
                    src={url}
                    alt={panel.title}
                    style={{
                      maxWidth: '100%',
                      maxHeight: '100%',
                      objectFit: 'contain',
                    }}
                  />
                </div>

                <div style={{ padding: '8px 12px', fontSize: 11, color: 'var(--text-muted)' }}>
                  {panel.description}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Artifact Gallery Cards (5 Cards) */}
      <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
        All Generated Artifacts ({availableArtifacts.length})
      </div>
      <div className="result-images-grid">
        {availableArtifacts.map(([key, label]) => (
          <ArtifactImageCard
            key={key}
            jobId={job_id}
            filename={getFilename(artifacts[key])}
            title={label}
          />
        ))}
      </div>
    </div>
  );
}
