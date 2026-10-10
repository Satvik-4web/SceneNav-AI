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
  orb_max_features: 5000,
  ratio_threshold: 0.75,
  ransac_reproj_threshold: 4.0,
  min_inliers: 10,
};

export default function MatchControls({ params, onChange }) {
  const handleChange = (key, value) => {
    onChange({ ...params, [key]: value });
  };

  const handleReset = () => onChange({ ...DEFAULTS });

  return (
    <div className="panel">
      <div className="panel-title">Matching Parameters</div>
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
      <button className="btn-secondary small" style={{ fontSize: 11, padding: '4px 10px' }} onClick={handleReset}>
        Reset to defaults
      </button>
      <div className="disclaimer" style={{ marginTop: 8 }}>
        Default settings are not universally optimal. Adjust for your imagery.
      </div>
    </div>
  );
}

export { DEFAULTS };
