/**
 * useMatchHistory — manages local session history of match results.
 * Capped at 20 results. Not a persistent database.
 */
import { useState, useCallback } from 'react';

const MAX_HISTORY = 20;

export function useMatchHistory() {
  const [history, setHistory] = useState([]);

  const addResult = useCallback((result) => {
    setHistory(prev => {
      const entry = {
        job_id: result.job_id,
        status: result.status,
        timestamp: new Date().toISOString(),
        result,
      };
      return [entry, ...prev].slice(0, MAX_HISTORY);
    });
  }, []);

  const clearHistory = useCallback(() => setHistory([]), []);

  const exportJSON = useCallback(() => {
    const blob = new Blob([JSON.stringify(history, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `scenenav_session_${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }, [history]);

  return { history, addResult, clearHistory, exportJSON };
}
