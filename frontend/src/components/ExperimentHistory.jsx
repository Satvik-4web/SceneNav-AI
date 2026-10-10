/**
 * SceneNav AI — ExperimentHistory
 * Shows session history with export functionality.
 * Clearly labelled as session-only (not a persistent database).
 */

const STATUS_ICON = {
  success: '✓',
  insufficient_features: '✗',
  insufficient_matches: '✗',
  geometry_failed: '✗',
  invalid_image: '⚠',
  processing_error: '⚠',
};

const STATUS_COLOR = {
  success: 'var(--accent-green)',
  insufficient_features: 'var(--accent-red)',
  insufficient_matches: 'var(--accent-red)',
  geometry_failed: 'var(--accent-red)',
  invalid_image: 'var(--accent-orange)',
  processing_error: 'var(--accent-orange)',
};

export default function ExperimentHistory({ history, onSelect, onClear, onExport }) {
  if (history.length === 0) {
    return (
      <div className="panel">
        <div className="panel-title">Session History</div>
        <div style={{ color: 'var(--text-muted)', fontSize: 12, padding: '12px 0' }}>
          No experiments run yet.
        </div>
        <div className="disclaimer">
          Session history is local to this browser tab. It is not a persistent research database.
        </div>
      </div>
    );
  }

  return (
    <div className="panel">
      <div className="panel-title">Session History ({history.length})</div>
      <ul className="history-list">
        {history.map((entry) => (
          <li
            key={entry.job_id}
            className="history-item"
            onClick={() => onSelect(entry.result)}
          >
            <span style={{ color: STATUS_COLOR[entry.status] || 'var(--text-secondary)' }}>
              {STATUS_ICON[entry.status] || '?'}
            </span>
            <span className="h-job mono">{entry.job_id?.slice(0, 8)}</span>
            <span style={{ color: STATUS_COLOR[entry.status] || 'var(--text-secondary)', fontSize: 11 }}>
              {entry.status}
            </span>
            <span className="h-time">
              {new Date(entry.timestamp).toLocaleTimeString()}
            </span>
          </li>
        ))}
      </ul>
      <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
        <button className="btn-secondary" style={{ flex: 1 }} onClick={onExport}>
          Export JSON
        </button>
        <button className="btn-danger" style={{ flex: 1 }} onClick={onClear}>
          Clear
        </button>
      </div>
      <div className="disclaimer" style={{ marginTop: 8 }}>
        Session history is local to this browser tab only.
      </div>
    </div>
  );
}
