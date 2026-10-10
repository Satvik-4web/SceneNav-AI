/**
 * SceneNav AI — ResultVisualizations
 * Displays matching visualization artifacts from a completed job.
 */
import { useState } from 'react';
import { artifactUrl } from '../api/client';

function ArtifactImage({ jobId, filename, title }) {
  const [lightbox, setLightbox] = useState(false);
  const url = artifactUrl(jobId, filename);

  return (
    <>
      <div className="result-image-card">
        <div className="card-title">{title}</div>
        <img
          src={url}
          alt={title}
          onClick={() => setLightbox(true)}
          style={{ cursor: 'zoom-in' }}
          onError={(e) => { e.target.style.display = 'none'; }}
        />
      </div>
      {lightbox && (
        <div className="lightbox-overlay" onClick={() => setLightbox(false)}>
          <img src={url} alt={title} />
        </div>
      )}
    </>
  );
}

const ARTIFACT_LABELS = {
  side_by_side: 'Reference & Query (side-by-side)',
  tentative_matches: 'Tentative Feature Correspondences',
  inlier_matches: 'Geometric Inliers Only',
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
            <p>No visualizations available — matching did not succeed.</p>
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

  // Extract just the filename from the path
  const getFilename = (path) => path.split('/').pop().split('\\').pop();

  const available = Object.entries(ARTIFACT_LABELS).filter(([key]) => key in artifacts);

  return (
    <div className="panel">
      <div className="panel-title">Visualizations</div>
      <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 10 }}>
        Click any image to enlarge. Artifact counts reflect actual pipeline stages reached.
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
          Footprint visualization not generated — region estimation did not produce a valid result.
        </div>
      )}
    </div>
  );
}
