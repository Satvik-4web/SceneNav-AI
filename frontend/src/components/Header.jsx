/**
 * SceneNav AI — App Header
 */
import { useBackendStatus } from '../hooks/useBackendStatus';

export default function Header() {
  const { status, info } = useBackendStatus();

  const statusLabel = {
    checking: 'Connecting…',
    connected: `Backend connected`,
    disconnected: 'Backend offline',
  }[status];

  return (
    <header className="app-header">
      <h1>
        🛰 SceneNav AI
        <span className="subtitle">Scene Aided Navigation Research Prototype</span>
      </h1>
      <div className="header-right">
        {info && (
          <span className="muted small mono">
            {info.algorithm_version} · v{info.version}
          </span>
        )}
        <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span className={`status-dot ${status}`} />
          <span className="small">{statusLabel}</span>
        </span>
      </div>
    </header>
  );
}
