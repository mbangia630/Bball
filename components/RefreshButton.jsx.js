import { useState } from 'react';

// Drop this component anywhere in your app.
// It calls your /api/refresh endpoint to trigger a manual update.

export default function RefreshButton() {
  const [status, setStatus] = useState('idle'); // idle | loading | success | error

  async function handleRefresh() {
    setStatus('loading');
    try {
      const res = await fetch(`/api/refresh?key=${process.env.NEXT_PUBLIC_REFRESH_SECRET}`);
      const data = await res.json();
      if (data.success) {
        setStatus('success');
        setTimeout(() => setStatus('idle'), 5000);
      } else {
        setStatus('error');
        setTimeout(() => setStatus('idle'), 3000);
      }
    } catch {
      setStatus('error');
      setTimeout(() => setStatus('idle'), 3000);
    }
  }

  const labels = {
    idle:    '🔄 Force Refresh',
    loading: '⏳ Triggering...',
    success: '✅ Refresh triggered! Updating in ~60s',
    error:   '❌ Failed — try again',
  };

  return (
    <button
      onClick={handleRefresh}
      disabled={status === 'loading'}
      style={{
        padding: '8px 16px',
        fontSize: 13,
        fontWeight: 600,
        border: '1px solid #444',
        borderRadius: 6,
        cursor: status === 'loading' ? 'wait' : 'pointer',
        background: status === 'success' ? '#16a34a22' : status === 'error' ? '#dc262622' : '#ffffff08',
        color: status === 'success' ? '#16a34a' : status === 'error' ? '#dc2626' : '#ccc',
        transition: 'all 0.2s',
      }}
    >
      {labels[status]}
    </button>
  );
}