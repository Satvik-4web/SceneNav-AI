/**
 * SceneNav AI — ResultVisualizations
 * Displays matching visualization artifacts from a completed job.
 * Includes interactive pan and zoom controls in the modal viewer.
 */
import { useState, useRef, useEffect } from 'react';
import { artifactUrl } from '../api/client';

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
    if (e.button !== 0) return; // left click only
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

  const handleMouseUp = () => {
    setIsDragging(false);
  };

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
      {/* Top Header Bar */}
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          width: '100%',
          background: 'rgba(22, 27, 34, 0.85)',
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
          <button
            className="btn-danger small"
            onClick={onClose}
            title="Close (Esc)"
            style={{ marginLeft: 8 }}
          >
            ✕
          </button>
        </div>
      </div>

      {/* Main Image Stage */}
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

      {/* Bottom Hint */}
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          alignSelf: 'center',
          background: 'rgba(22, 27, 34, 0.85)',
          padding: '4px 12px',
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

function ArtifactImage({ jobId, filename, title }) {
  const [lightbox, setLightbox] = useState(false);
  const url = artifactUrl(jobId, filename);

  return (
    <>
      <div className="result-image-card">
        <div className="card-title" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span>{title}</span>
          <span className="small muted" style={{ fontSize: 10, cursor: 'pointer' }} onClick={() => setLightbox(true)}>
            🔍 Zoom
          </span>
        </div>
        <img
          src={url}
          alt={title}
          onClick={() => setLightbox(true)}
          style={{ cursor: 'zoom-in' }}
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

const ARTIFACT_LABELS = {
  side_by_side: 'Reference & Query (Side-by-Side)',
  tentative_matches: 'Tentative Feature Correspondences (Ratio-Filtered)',
  inlier_matches: 'Geometric Inliers Only (RANSAC-Verified)',
  footprint: 'Estimated Query Footprint on Reference',
};

export default function ResultVisualizations({ result }) {
  if (!result || !result.artifacts || Object.keys(result.artifacts).length === 0) {
    if (result && result.status !== 'success') {
      return (
        <div className="panel">
          <div className="panel-title">Visualizations</div>
          <div className="empty-state">
            <div className="icon">🔭</div>
            <p>No geometric visualizations available — matching did not succeed.</p>
            {result.failure_reason && (
              <p style={{ color: 'var(--accent-red)', fontSize: 12 }}>{result.failure_reason}</p>
            )}
          </div>
        </div>
      );
    }
    return null;
  }

  const { artifacts, job_id } = result;
  const getFilename = (path) => path.split('/').pop().split('\\').pop();
  const available = Object.entries(ARTIFACT_LABELS).filter(([key]) => key in artifacts);

  return (
    <div className="panel">
      <div className="panel-title">Visualizations & Corresponding Footprint</div>
      <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 10 }}>
        Click any artifact to open the interactive viewer with zoom and pan controls.
      </div>
      <div className="result-images-grid">
        {available.map(([key, label]) => (
          <ArtifactImage
            key={key}
            jobId={job_id}
            filename={getFilename(artifacts[key])}
            title={label}
          />
        ))}
      </div>
      {result.status === 'success' && !('footprint' in artifacts) && (
        <div className="disclaimer" style={{ marginTop: 8 }}>
          Footprint visualization not generated — region estimation did not produce a valid closed polygon.
        </div>
      )}
    </div>
  );
}
