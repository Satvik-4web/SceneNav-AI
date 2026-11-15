/**
 * SceneNav AI — ImageDropZone
 * 
 * Aesthetic: Palantir / Linear-inspired precision upload zone.
 * Features:
 *  - Drag & drop with cyan boundary glow
 *  - Native image dimension extraction (w × h px)
 *  - Aspect-ratio preserving preview
 *  - Format and file size badges
 *  - Quick replace and remove controls
 */
import { useRef, useState, useEffect } from 'react';

const MAX_MB = 50;
const SUPPORTED = ['image/jpeg', 'image/png', 'image/tiff', 'image/bmp', 'image/webp'];

function formatBytes(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

export default function ImageDropZone({ label, file, onChange, error }) {
  const [dragOver, setDragOver] = useState(false);
  const [imgError, setImgError] = useState(false);
  const [dims, setDims] = useState(null);
  const inputRef = useRef();
  const [previewUrl, setPreviewUrl] = useState(null);

  useEffect(() => {
    if (!file) {
      setPreviewUrl(null);
      setDims(null);
      setImgError(false);
      return;
    }

    setImgError(false);
    setDims(null);
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);

    // Extract natural dimensions
    const img = new Image();
    img.onload = () => {
      setDims({ w: img.naturalWidth, h: img.naturalHeight });
    };
    img.onerror = () => {
      // If browser can't decode TIFF natively, don't crash
      setDims(null);
    };
    img.src = url;

    return () => {
      URL.revokeObjectURL(url);
    };
  }, [file]);

  const handleFile = (f) => {
    if (!f) return;
    const isTif = f.name.toLowerCase().endsWith('.tif') || f.name.toLowerCase().endsWith('.tiff');
    if (!SUPPORTED.includes(f.type) && !isTif) {
      alert(`Unsupported format: ${f.type || f.name}\nSupported: JPEG, PNG, TIFF (.tif/.tiff), BMP, WEBP`);
      return;
    }
    if (f.size > MAX_MB * 1024 * 1024) {
      alert(`File too large: ${formatBytes(f.size)}. Maximum: ${MAX_MB} MB`);
      return;
    }
    setImgError(false);
    onChange(f);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    const f = e.dataTransfer.files[0];
    if (f) handleFile(f);
  };

  return (
    <div style={{ marginBottom: 10 }}>
      <div className="image-label" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 5 }}>
        <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-secondary)' }}>{label}</span>
        {dims && (
          <span className="mono" style={{ fontSize: 10, color: 'var(--accent-cyan)' }}>
            {dims.w} × {dims.h} px
          </span>
        )}
      </div>

      <div
        className={`image-drop-zone ${dragOver ? 'drag-over' : ''} ${file ? 'has-image' : ''}`}
        role={!file ? "button" : undefined}
        tabIndex={!file ? 0 : undefined}
        aria-label={!file ? `Upload ${label}` : undefined}
        onKeyDown={(e) => { if (!file && (e.key === "Enter" || e.key === " ")) { e.preventDefault(); inputRef.current.click(); } }}
        onClick={() => !file && inputRef.current.click()}
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        style={{
          border: file ? '1px solid var(--border-light)' : (dragOver ? '1.5px dashed var(--accent-cyan)' : '1.5px dashed var(--border)'),
          background: file ? 'var(--bg-input)' : (dragOver ? 'var(--accent-blue-dim)' : 'var(--bg-secondary)'),
          borderRadius: 'var(--radius)',
          minHeight: file ? 120 : 96,
          padding: file ? 8 : 12,
          position: 'relative',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: file ? 'default' : 'pointer',
          transition: 'all 0.18s ease',
          boxShadow: dragOver ? '0 0 16px var(--border-glow)' : 'none',
        }}
      >
        {/* Tactical HUD Viewfinder Corners */}
        <div className="hud-corner hud-tl" />
        <div className="hud-corner hud-tr" />
        <div className="hud-corner hud-bl" />
        <div className="hud-corner hud-br" />

        {file ? (
          <>
            {imgError ? (
              <div style={{ padding: '16px 8px', textAlign: 'center', color: 'var(--text-secondary)' }}>
                <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 6 }}>
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                    <polygon points="1 6 1 22 8 18 16 22 23 18 23 2 16 6 8 2 1 6" />
                    <line x1="8" y1="2" x2="8" y2="18" />
                    <line x1="16" y1="6" x2="16" y2="22" />
                  </svg>
                </div>
                <div style={{ fontWeight: 600, fontSize: 12, color: 'var(--text-primary)' }}>Geospatial GeoTIFF Raster</div>
                <div className="mono small muted" style={{ marginTop: 2 }}>{file.name}</div>
              </div>
            ) : (
              <div style={{ position: 'relative', width: '100%', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                <img
                  src={previewUrl}
                  alt={label}
                  onError={() => setImgError(true)}
                  style={{
                    maxHeight: 110,
                    maxWidth: '100%',
                    objectFit: 'contain',
                    borderRadius: 4,
                    border: '1px solid var(--border)',
                    boxShadow: 'var(--shadow-sm)',
                  }}
                />
              </div>
            )}
            
            <div
              className="image-meta"
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                width: '100%',
                marginTop: 6,
                padding: '3px 8px',
                background: 'var(--bg-secondary)',
                borderRadius: 4,
                fontSize: 10.5,
              }}
            >
              <span className="mono" style={{ color: 'var(--text-primary)', maxWidth: '75%', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={file.name}>
                {file.name}
              </span>
              <span className="mono muted">{formatBytes(file.size)}</span>
            </div>

            <button
              type="button"
              className="remove-btn"
              onClick={(e) => { e.stopPropagation(); onChange(null); setImgError(false); }}
              title="Remove image"
              style={{
                position: 'absolute',
                top: 6,
                right: 6,
                width: 22,
                height: 22,
                borderRadius: '50%',
                background: 'rgba(10, 10, 12, 0.95)',
                border: '1px solid var(--border-light)',
                color: 'var(--text-secondary)',
                fontSize: 13,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
              }}
            >
              ×
            </button>
          </>
        ) : (
          <div style={{ textAlign: 'center', pointerEvents: 'none' }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ color: 'var(--text-muted)', marginBottom: 4 }}>
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="17 8 12 3 7 8" />
              <line x1="12" y1="3" x2="12" y2="15" />
            </svg>
            <div style={{ fontSize: 11.5, fontWeight: 500, color: 'var(--text-secondary)' }}>
              Click to browse or drop raster
            </div>
            <div className="small muted" style={{ fontSize: 10, marginTop: 2 }}>
              GeoTIFF (.tif), PNG, JPEG, WEBP · max {MAX_MB}MB
            </div>
          </div>
        )}
      </div>

      {error && <div style={{ color: 'var(--accent-red)', fontSize: 11, marginTop: 4 }}>{error}</div>}
      <input
        ref={inputRef}
        type="file"
        accept="image/*,.tif,.tiff"
        style={{ display: 'none' }}
        onChange={(e) => handleFile(e.target.files[0])}
      />
    </div>
  );
}
