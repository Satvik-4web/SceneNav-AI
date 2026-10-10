/**
 * useBackendStatus — polls the /health endpoint to show connection state.
 */
import { useState, useEffect } from 'react';
import { fetchHealth } from '../api/client';

export function useBackendStatus() {
  const [status, setStatus] = useState('checking'); // 'checking' | 'connected' | 'disconnected'
  const [info, setInfo] = useState(null);

  useEffect(() => {
    let mounted = true;

    const check = async () => {
      try {
        const data = await fetchHealth();
        if (mounted) { setStatus('connected'); setInfo(data); }
      } catch {
        if (mounted) { setStatus('disconnected'); setInfo(null); }
      }
    };

    check();
    const interval = setInterval(check, 10000);
    return () => { mounted = false; clearInterval(interval); };
  }, []);

  return { status, info };
}
