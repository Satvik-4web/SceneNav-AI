/**
 * SceneNav AI — Global Application Header & Primary Navigation Shell
 * 
 * Aesthetic: Minimalist Monochromatic Obsidian (Linear / Vercel Pro Style)
 * Clean typography, zero emoji clutter, precise state indicators.
 */
import { useBackendStatus } from '../hooks/useBackendStatus';

export default function Header({ activeWorkspace = 'studio', onSelectWorkspace = () => {} }) {
  const { status, info } = useBackendStatus();

  const statusLabel = {
    checking: 'Connecting…',
    connected: 'Backend connected',
    disconnected: 'Backend offline',
  }[status] || 'Connecting…';

  return (
    <header className="app-header">
      {/* Brand Identity & Subtitle */}
      <div className="brand-block">
        <div className="brand-icon">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" style={{ color: '#fafafa' }}>
            <circle cx="12" cy="12" r="8" stroke="currentColor" strokeOpacity="0.4" />
            <circle cx="12" cy="12" r="2.5" fill="#fafafa" />
            <line x1="12" y1="2" x2="12" y2="6" />
            <line x1="12" y1="18" x2="12" y2="22" />
            <line x1="2" y1="12" x2="6" y2="12" />
            <line x1="18" y1="12" x2="22" y2="12" />
          </svg>
        </div>
        <div className="brand-titles">
          <h1>
            SceneNav AI
            <span className="org-tag">DRDO Flight Dynamics</span>
          </h1>
          <div className="subtitle" style={{ fontSize: 11, color: 'var(--text-secondary)' }}>
            Scene Aided Navigation Research Prototype
          </div>
        </div>
      </div>

      {/* 4 Primary Workspaces Navigation — Clean, Un-slopped */}
      <nav className="workspace-nav" aria-label="Main Workspaces">
        <button
          type="button"
          id="mode-interactive-btn"
          className={`nav-tab-btn ${activeWorkspace === 'studio' ? 'active' : ''}`}
          onClick={() => onSelectWorkspace('studio')}
          title="Experiment Configuration & Live Matching Pipeline"
        >
          <span>Live Matching Studio</span>
        </button>

        <button
          type="button"
          id="header-nav-explorer-btn"
          className={`nav-tab-btn ${activeWorkspace === 'explorer' ? 'active' : ''}`}
          onClick={() => onSelectWorkspace('explorer')}
          title="Dedicated Geospatial & Feature Visualization Workspace"
        >
          <span>Results Explorer</span>
        </button>

        <button
          type="button"
          id="header-nav-analytics-btn"
          className={`nav-tab-btn ${activeWorkspace === 'analytics' ? 'active' : ''}`}
          onClick={() => onSelectWorkspace('analytics')}
          title="Technical Diagnostics, Conditioning & Benchmark Analysis"
        >
          <span>Research & Analytics</span>
        </button>

        <button
          type="button"
          id="mode-research-demo-btn"
          className={`nav-tab-btn ${activeWorkspace === 'munich' ? 'active' : ''}`}
          onClick={() => onSelectWorkspace('munich')}
          title="Historical Munich Cadastral Orthophoto Case Study (1860-2026)"
        >
          <span>Munich Cadastral Research Demo (2026)</span>
        </button>
      </nav>

      {/* Telemetry Status & System Version */}
      <div className="header-right">
        {info ? (
          <span className="mono muted small" style={{ fontSize: 10.5, padding: '3px 8px', background: '#09090b', borderRadius: 4, border: '1px solid var(--border)' }}>
            {info.algorithm_version} · v{info.version}
          </span>
        ) : (
          <span className="mono muted small" style={{ fontSize: 10.5, padding: '3px 8px', background: '#09090b', borderRadius: 4, border: '1px solid var(--border)' }}>
            v0.1.0-release
          </span>
        )}
        <div className="telemetry-pill">
          <span className={`status-dot ${status}`} />
          <span style={{ fontSize: 11.5 }}>{statusLabel}</span>
        </div>
      </div>
    </header>
  );
}
