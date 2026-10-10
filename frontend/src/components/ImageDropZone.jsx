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
  const inputRef = useRef();
  const previewUrl = file ? URL.createObjectURL(file) : null;

  const handleFile = (f) => {
    if (!f) return;
    if (!SUPPORTED.includes(f.type)) {
      alert(`Unsupported format: ${f.type}\nSupported: JPEG, PNG, TIFF, BMP, WEBP`);
      return;
    }
    if (f.size > MAX_MB * 1024 * 1024) {
      alert(`File too large: ${formatBytes(f.size)}. Maximum: ${MAX_MB} MB`);
      return;
    }
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
            <img src={previewUrl} alt={label} />
            <div className="image-meta">
              {file.name} · {formatBytes(file.size)}
            </div>
            <button
              className="remove-btn"
              onClick={(e) => { e.stopPropagation(); onChange(null); }}
              title="Remove image"
            >×</button>
          </>
        ) : (
          <>
            <span style={{ fontSize: 24, opacity: 0.4 }}>📁</span>
            <span className="small">Drop image here or click to browse</span>
            <span className="small muted">JPEG, PNG, TIFF, BMP, WEBP · max {MAX_MB} MB</span>
          </>
        )}
      </div>
      {error && <div style={{ color: 'var(--accent-red)', fontSize: 11, marginTop: 4 }}>{error}</div>}
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        style={{ display: 'none' }}
        onChange={(e) => handleFile(e.target.files[0])}
      />
    </div>
  );
}
