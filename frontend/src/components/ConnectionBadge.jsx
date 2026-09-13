import { useState, useEffect } from 'react';
import { onConnectionStatusChange } from '../api/client';

const STATUS_CONFIG = {
  live: { label: 'Live — Real CP-SAT Backend', color: '#1e8a5f', bg: 'rgba(30, 138, 95, 0.12)' },
  offline: { label: 'Offline Mode — Snapshot Data', color: '#c0392b', bg: 'rgba(192, 57, 43, 0.12)' },
  checking: { label: 'Connecting...', color: '#8a97a3', bg: 'rgba(138, 151, 163, 0.12)' },
};

export function ConnectionBadge() {
  const [status, setStatus] = useState('checking');

  useEffect(() => {
    const unsubscribe = onConnectionStatusChange(setStatus);
    return unsubscribe;
  }, []);

  const config = STATUS_CONFIG[status] || STATUS_CONFIG.checking;

  return (
    <div
      title={
        status === 'offline'
          ? 'The live backend did not respond in time — showing bundled snapshot data instead.'
          : status === 'live'
          ? 'Connected to the live FastAPI + CP-SAT backend on Render.'
          : 'Checking backend connectivity...'
      }
      style={{
        display: 'inline-flex', alignItems: 'center', gap: 6,
        padding: '4px 10px', borderRadius: 20, fontSize: 11, fontWeight: 700,
        fontFamily: 'inherit', background: config.bg, color: config.color,
        whiteSpace: 'nowrap', border: `1px solid ${config.color}22`,
      }}
    >
      <span
        style={{
          width: 7, height: 7, borderRadius: '50%', background: config.color,
          display: 'inline-block',
          animation: status === 'checking' ? 'rb-pulse 1.2s ease-in-out infinite' : 'none',
        }}
      />
      {config.label}
      <style>{`
        @keyframes rb-pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.3; }
        }
      `}</style>
    </div>
  );
}
