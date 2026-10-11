/**
 * SceneNav AI — MatchControls
 * Exposes validated algorithm parameters with sensible defaults.
 */

const PARAM_DEFS = [
  {
    key: 'orb_max_features',
    label: 'Max ORB Features',
    min: 100, max: 10000, step: 100,
    hint: 'More features improve coverage but increase processing time.',
  },
  {
    key: 'ratio_threshold',
    label: 'Ratio Test Threshold',
    min: 0.50, max: 0.95, step: 0.01,
    hint: "Lowe's ratio test. Lower = stricter filtering (fewer but more reliable matches).",
  },
  {
    key: 'ransac_reproj_threshold',
    label: 'RANSAC Reprojection Threshold (px)',
    min: 1.0, max: 15.0, step: 0.5,
    hint: 'Maximum pixel error for a point to be counted as a geometric inlier.',
  },
  {
    key: 'min_inliers',
    label: 'Minimum Inliers',
    min: 4, max: 100, step: 1,
    hint: 'Minimum geometric inliers required to accept a homography estimate.',
  },
];

const DEFAULTS = {
  algorithm: 'ORB',
  orb_max_features: 5000,
  ratio_threshold: 0.75,
  ransac_reproj_threshold: 4.0,
  min_inliers: 10,
  mutual_consistency: false,
};

export default function MatchControls({ params, onChange }) {
  const handleChange = (key, value) => {
    onChange({ ...params, [key]: value });
  };

  const handleReset = () => onChange({ ...DEFAULTS });

  return (
    <div className="panel">
      <div className="panel-title">Matching Parameters</div>

      {/* Algorithm Selector */}
      <div className="control-group" style={{ marginBottom: 12 }}>
        <div className="control-label">
          <span>Feature Algorithm</span>
          <span className="control-value mono">{params.algorithm || 'ORB'}</span>
        </div>
        <select
          id="algorithm-select"
          value={params.algorithm || 'ORB'}
          onChange={(e) => handleChange('algorithm', e.target.value)}
          style={{ width: '100%', fontSize: 12, padding: '6px 8px' }}
        >
          <option value="ORB">ORB (Oriented FAST & Rotated BRIEF - Fast / Binary)</option>
          <option value="SIFT">SIFT (Scale-Invariant Feature Transform - High Inliers / Floating Point)</option>
        </select>
        <div className="control-hint">Select feature detector and descriptor backend.</div>
      </div>

      {PARAM_DEFS.map(({ key, label, min, max, step, hint }) => (
        <div className="control-group" key={key}>
          <div className="control-label">
            <span>{label}</span>
            <span className="control-value mono">{params[key]}</span>
          </div>
          <input
            type="range"
            min={min} max={max} step={step}
            value={params[key]}
            onChange={(e) => {
              const v = step < 1 ? parseFloat(e.target.value) : parseInt(e.target.value);
              handleChange(key, v);
            }}
          />
          <div className="control-hint">{hint}</div>
        </div>
      ))}

      {/* Mutual Consistency Toggle */}
      <div className="control-group" style={{ marginTop: 8, padding: '8px 10px', background: 'var(--bg-secondary)', borderRadius: 'var(--radius)' }}>
        <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 12 }}>
          <input
            type="checkbox"
            checked={Boolean(params.mutual_consistency)}
            onChange={(e) => handleChange('mutual_consistency', e.target.checked)}
            style={{ accentColor: 'var(--accent-blue)' }}
          />
          <span style={{ fontWeight: 600 }}>Mutual Consistency Check</span>
        </label>
        <div className="control-hint" style={{ marginTop: 2 }}>
          Enforces bidirectional cross-check filtering (discards asymmetric nearest-neighbor matches).
        </div>
      </div>

      <button className="btn-secondary small" style={{ fontSize: 11, padding: '4px 10px', marginTop: 4 }} onClick={handleReset}>
        Reset to defaults
      </button>
      <div className="disclaimer" style={{ marginTop: 8 }}>
        Default settings are not universally optimal. Adjust for your imagery.
      </div>
    </div>
  );
}

export { DEFAULTS };

