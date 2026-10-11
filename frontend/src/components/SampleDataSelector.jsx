/**
 * SceneNav AI — SampleDataSelector
 * Allows one-click loading of benchmark pairs directly into the matching panel.
 */
import { useState, useEffect } from 'react';
import { fetchSamples, fetchSampleImageFile } from '../api/client';

export default function SampleDataSelector({ onSelectSample, disabled }) {
  const [samples, setSamples] = useState([]);
  const [selectedId, setSelectedId] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    let mounted = true;
    fetchSamples()
      .then((data) => {
        if (mounted && data.pairs) {
          setSamples(data.pairs);
        }
      })
      .catch((err) => {
        if (mounted) setError(err.message);
      });
    return () => { mounted = false; };
  }, []);

  const handleChoose = async (pairId) => {
    if (!pairId) return;
    setSelectedId(pairId);
    const pair = samples.find((p) => p.id === pairId);
    if (!pair) return;

    setLoading(true);
    setError(null);
    try {
      const refFilename = pair.reference_path.split('/').pop().split('\\').pop();
      const qryFilename = pair.query_path.split('/').pop().split('\\').pop();

      const [refFile, qryFile] = await Promise.all([
        fetchSampleImageFile('references', refFilename),
        fetchSampleImageFile('queries', qryFilename),
      ]);

      onSelectSample(refFile, qryFile, pair);
    } catch (err) {
      setError(`Failed to load sample: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  if (samples.length === 0 && !error) {
    return null;
  }

  return (
    <div style={{ marginBottom: 14, padding: '10px 12px', background: 'var(--bg-secondary)', borderRadius: 'var(--radius)', border: '1px solid var(--border)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
        <span style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--accent-cyan)' }}>
          ⚡ Preset Test Pairs
        </span>
        {loading && <span className="small muted">Loading images…</span>}
      </div>

      <select
        value={selectedId}
        onChange={(e) => handleChoose(e.target.value)}
        disabled={disabled || loading}
        style={{ width: '100%', fontSize: 12, padding: '6px 8px' }}
      >
        <option value="">— Select a benchmark pair to load —</option>
        {samples.map((pair) => (
          <option key={pair.id} value={pair.id}>
            {pair.label}
          </option>
        ))}
      </select>

      {error && (
        <div style={{ color: 'var(--accent-red)', fontSize: 11, marginTop: 4 }}>
          {error}
        </div>
      )}
      <div className="small muted" style={{ marginTop: 4, fontSize: 11 }}>
        Instantly loads verified test images from the dataset manifest.
      </div>
    </div>
  );
}
