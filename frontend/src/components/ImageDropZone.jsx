/**
 * SceneNav AI — ImageDropZone
 * Handles file selection and drag-and-drop with preview.
 */
import { useRef, useState } from 'react';

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
  const inputRef = useRef();
  const previewUrl = file ? URL.createObjectURL(file) : null;

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
    <div>
      <div className="image-label">{label}</div>
      <div
        className={`image-drop-zone ${dragOver ? 'drag-over' : ''} ${file ? 'has-image' : ''}`}
        onClick={() => !file && inputRef.current.click()}
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
      >
        {file ? (
          <>
            {imgError ? (
              <div style={{ padding: '24px 12px', textAlign: 'center', color: 'var(--accent-cyan)' }}>
                <div style={{ fontSize: 28, marginBottom: 6 }}>🗺️</div>
                <div style={{ fontWeight: 600, fontSize: 13 }}>GeoTIFF Reference Raster</div>
                <div className="mono small muted" style={{ marginTop: 4 }}>{file.name}</div>
              </div>
            ) : (
              <img src={previewUrl} alt={label} onError={() => setImgError(true)} />
            )}
            <div className="image-meta">
              {file.name} · {formatBytes(file.size)}
            </div>
            <button
              className="remove-btn"
              onClick={(e) => { e.stopPropagation(); onChange(null); setImgError(false); }}
              title="Remove image"
            >×</button>
          </>
        ) : (
          <>
            <span style={{ fontSize: 24, opacity: 0.4 }}>📁</span>
            <span className="small">Drop image here or click to browse</span>
            <span className="small muted">JPEG, PNG, TIFF (.tif), BMP, WEBP · max {MAX_MB} MB</span>
          </>
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
