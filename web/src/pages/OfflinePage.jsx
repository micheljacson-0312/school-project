// Offline fallback page — shown by the service worker when there's no
// cached version of the requested URL. Friendly messaging + retry button.
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';

export default function OfflinePage() {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  useEffect(() => {
    const on  = () => setIsOnline(true);
    const off = () => setIsOnline(false);
    window.addEventListener('online',  on);
    window.addEventListener('offline', off);
    return () => {
      window.removeEventListener('online',  on);
      window.removeEventListener('offline', off);
    };
  }, []);
  return (
    <div className="max-w-xl mx-auto px-4 py-16 text-center">
      <div className="text-6xl">📡</div>
      <h1 className="text-2xl font-semibold mt-4">You&apos;re offline</h1>
      <p className="text-slate-500 mt-2">
        We couldn&apos;t reach the server. Cached pages may still be available
        from your previous visit.
      </p>
      <div className="flex flex-wrap justify-center gap-3 mt-6">
        <button onClick={() => location.reload()} className="btn-primary" disabled={!isOnline}>
          {isOnline ? 'Retry' : 'Waiting for connection…'}
        </button>
        <Link to="/" className="btn-secondary">Home</Link>
      </div>
    </div>
  );
}
