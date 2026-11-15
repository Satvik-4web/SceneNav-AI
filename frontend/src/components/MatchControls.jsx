/**
 * SceneNav AI — MatchControls
 *
 * Exposes validated computer-vision and geometric parameters grouped into
 * collapsible sections:
 *  1. Feature Detection (ORB / SIFT & Max Features)
 *  2. Descriptor Matching (Lowe's Ratio & Mutual Consistency)
 *  3. Geometric Verification (RANSAC Threshold & Min Inliers)
 *  4. Advanced Multi-Scale Matching (Pyramid Scale Robustness)
 */
import { useState } from 'react';

const DEFAULTS = {
  algorithm: 'SIFT',
  orb_max_features: 5000,
  ratio_threshold: 0.75,
  ransac_reproj_threshold: 4.0,
  min_inliers: 10,
  mutual_consistency: false,
  multi_scale: false,
};

function ParamSection({ title, defaultOpen = true, children }) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div style={{ marginBottom: 8, border: '1px solid var(--border)', borderRadius: 'var(--radius)', overflow: 'hidden' }}>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        style={{
          width: '100%',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '8px 10px',
          background: 'var(--bg-secondary)',
          color: 'var(--text-primary)',
          fontSize: 11,
          fontWeight: 600,
          textTransform: 'uppercase',
          letterSpacing: '0.05em',
          cursor: 'pointer',
        }}
      >
        <span>{title}</span>
        <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>{open ? '▾' : '▸'}</span>
      </button>

      {open && (
        <div style={{ padding: '10px 10px 6px', background: 'var(--bg-panel)' }}>
          {children}
        </div>
      )}
    </div>
  );
}

export default function MatchControls({ params, onChange }) {
  const handleChange = (key, value) => {
    onChange({ ...params, [key]: value });
  };

  const handleReset = () => onChange({ ...DEFAULTS });

  return (
    <div className="panel">
      <div className="panel-title">Matching Parameters</div>

      {/* 1. Feature Detection Section */}
      <ParamSection title="Feature Detection" defaultOpen={true}>
        {/* Algorithm Selector */}
        <div className="control-group" style={{ marginBottom: 10 }}>
          <div className="control-label" style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
            <span style={{ fontSize: 11, fontWeight: 500 }}>Feature Algorithm</span>
            <span className="control-value mono" style={{ fontSize: 11, color: 'var(--text-primary)' }}>
              {params.algorithm || 'ORB'}
            </span>
          </div>
          <select
            id="algorithm-select"
            value={params.algorithm || 'ORB'}
            onChange={(e) => handleChange('algorithm', e.target.value)}
            style={{ width: '100%', fontSize: 11.5, padding: '5px 8px' }}
          >
            <option value="ORB">ORB (Oriented FAST & Rotated BRIEF - Binary / Fast)</option>
            <option value="SIFT">SIFT (Scale-Invariant Feature Transform - High Inliers / Float)</option>
          </select>
          <div className="control-hint" style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 3 }}>
            Select keypoint detector and descriptor backend.
          </div>
        </div>

        {/* Max Features Slider */}
        <div className="control-group" style={{ marginBottom: 6 }}>
          <div className="control-label" style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
            <span style={{ fontSize: 11, fontWeight: 500 }}>Max Keypoints</span>
            <span className="control-value mono" style={{ fontSize: 11, color: 'var(--text-primary)' }}>
              {params.orb_max_features}
            </span>
          </div>
          <input
            type="range"
            min={100}
            max={10000}
            step={100}
            value={params.orb_max_features}
            onChange={(e) => handleChange('orb_max_features', parseInt(e.target.value, 10))}
          />
          <div className="control-hint" style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 2 }}>
            More features increase coverage across low-texture terrain.
          </div>
        </div>
      </ParamSection>

      {/* 2. Descriptor Matching Section */}
      <ParamSection title="Descriptor Matching" defaultOpen={true}>
        {/* Ratio Test Slider */}
        <div className="control-group" style={{ marginBottom: 8 }}>
          <div className="control-label" style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
            <span style={{ fontSize: 11, fontWeight: 500 }}>Ratio Test Threshold</span>
            <span className="control-value mono" style={{ fontSize: 11, color: 'var(--text-primary)' }}>
              {params.ratio_threshold.toFixed(2)}
            </span>
          </div>
          <input
            type="range"
            min={0.50}
            max={0.95}
            step={0.01}
            value={params.ratio_threshold}
            onChange={(e) => handleChange('ratio_threshold', parseFloat(e.target.value))}
          />
          <div className="control-hint" style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 2 }}>
            Lowe’s distance ratio. Lower = stricter filtering (fewer false positives).
          </div>
        </div>

        {/* Mutual Consistency Toggle */}
        <div style={{ padding: '6px 8px', background: 'var(--bg-secondary)', borderRadius: 4, marginTop: 4 }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', fontSize: 11.5 }}>
            <input
              type="checkbox"
              checked={Boolean(params.mutual_consistency)}
              onChange={(e) => handleChange('mutual_consistency', e.target.checked)}
              style={{ accentColor: 'var(--accent-blue)' }}
            />
            <span style={{ fontWeight: 600 }}>Mutual Consistency Check</span>
          </label>
          <div style={{ fontSize: 9.5, color: 'var(--text-muted)', marginTop: 2, paddingLeft: 20 }}>
            Enforces symmetric 1-to-1 cross-check filtering.
          </div>
        </div>
      </ParamSection>

      {/* 3. Geometric Verification Section */}
      <ParamSection title="Planar Geometry & RANSAC" defaultOpen={true}>
        {/* RANSAC Threshold Slider */}
        <div className="control-group" style={{ marginBottom: 8 }}>
          <div className="control-label" style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
            <span style={{ fontSize: 11, fontWeight: 500 }}>RANSAC Reproj. Threshold (px)</span>
            <span className="control-value mono" style={{ fontSize: 11, color: 'var(--text-primary)' }}>
              {params.ransac_reproj_threshold.toFixed(1)} px
            </span>
          </div>
          <input
            type="range"
            min={1.0}
            max={15.0}
            step={0.5}
            value={params.ransac_reproj_threshold}
            onChange={(e) => handleChange('ransac_reproj_threshold', parseFloat(e.target.value))}
          />
          <div className="control-hint" style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 2 }}>
            Maximum distance for a correspondence to be counted as a planar inlier.
          </div>
        </div>

        {/* Minimum Inliers Slider */}
        <div className="control-group" style={{ marginBottom: 4 }}>
          <div className="control-label" style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
            <span style={{ fontSize: 11, fontWeight: 500 }}>Minimum Inliers</span>
            <span className="control-value mono" style={{ fontSize: 11, color: 'var(--text-primary)' }}>
              {params.min_inliers}
            </span>
          </div>
          <input
            type="range"
            min={4}
            max={100}
            step={1}
            value={params.min_inliers}
            onChange={(e) => handleChange('min_inliers', parseInt(e.target.value, 10))}
          />
          <div className="control-hint" style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 2 }}>
            Minimum consensus required to accept homography H.
          </div>
        </div>
      </ParamSection>

      {/* 4. Advanced Multi-Scale Section */}
      <ParamSection title="Advanced Matching" defaultOpen={false}>
        <div style={{ padding: '6px 8px', background: 'var(--bg-secondary)', borderRadius: 4 }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', fontSize: 11.5 }}>
            <input
              type="checkbox"
              checked={Boolean(params.multi_scale)}
              onChange={(e) => handleChange('multi_scale', e.target.checked)}
              style={{ accentColor: 'var(--accent-blue)' }}
            />
            <span style={{ fontWeight: 600 }}>Multi-Scale Pyramid Matching</span>
          </label>
          <div style={{ fontSize: 9.5, color: 'var(--text-muted)', marginTop: 2, paddingLeft: 20 }}>
            Extracts features across Gaussian scale pyramids to handle altitude variation.
          </div>
        </div>
      </ParamSection>

      {/* Footer Actions */}
      <div style={{ marginTop: 8, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <button
          type="button"
          className="btn-secondary small"
          style={{ fontSize: 10.5, padding: '4px 8px' }}
          onClick={handleReset}
        >
          Reset to defaults
        </button>
        <span className="mono muted" style={{ fontSize: 9.5 }}>RANSAC: USAC_MAGSAC / LMEDS</span>
      </div>

      <div className="disclaimer" style={{ marginTop: 8, fontSize: 10 }}>
        Default settings are calibrated for typical aerial reconnaissance. Adjust for oblique views or low illumination.
      </div>
    </div>
  );
}

export { DEFAULTS };
