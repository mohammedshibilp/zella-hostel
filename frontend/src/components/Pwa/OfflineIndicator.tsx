import React, { useState, useEffect } from 'react';
import { usePwa } from '../../context/PwaContext';
import { WifiOff, Wifi, RefreshCw } from 'lucide-react';

export const OfflineIndicator: React.FC = () => {
  const { isOnline } = usePwa();
  const [showRestored, setShowRestored] = useState<boolean>(false);
  const [isRetrying, setIsRetrying] = useState<boolean>(false);

  useEffect(() => {
    if (isOnline) {
      // Show "Back Online" message briefly
      setShowRestored(true);
      const timer = setTimeout(() => setShowRestored(false), 3000);
      return () => clearTimeout(timer);
    }
  }, [isOnline]);

  const handleRetry = async () => {
    setIsRetrying(true);
    try {
      const res = await fetch('/api/health?t=' + Date.now(), { method: 'HEAD', cache: 'no-store' });
      if (res.ok || res.status < 500) {
        window.location.reload();
      }
    } catch (err) {
      // Still offline
    } finally {
      setTimeout(() => setIsRetrying(false), 500);
    }
  };

  // When online and not displaying restoration toast, don't render anything
  if (isOnline && !showRestored) return null;

  if (showRestored) {
    return (
      <aside
        aria-live="polite"
        className="fixed top-4 left-1/2 -translate-x-1/2 z-[9990] bg-emerald-600 text-white px-4 py-2 rounded-full shadow-lg flex items-center gap-2 text-xs font-bold animate-fade-in"
      >
        <Wifi className="w-4 h-4 shrink-0" />
        <span>Back online — Connected to hostel servers</span>
      </aside>
    );
  }

  return (
    <aside
      aria-live="assertive"
      className="fixed top-3 left-1/2 -translate-x-1/2 z-[9990] w-[calc(100%-1.5rem)] max-w-md bg-navy-900 text-white p-3 rounded-2xl shadow-2xl border border-navy-800 flex items-center justify-between gap-3 text-xs animate-fade-in"
    >
      <div className="flex items-center gap-2.5 min-w-0">
        <div className="w-8 h-8 rounded-xl bg-rose-500/20 text-rose-400 flex items-center justify-center shrink-0">
          <WifiOff className="w-4 h-4" />
        </div>
        <div className="min-w-0">
          <div className="font-bold text-white text-xs">Offline Mode</div>
          <div className="text-[11px] text-slate-300 truncate">
            Cached shell active. Reconnect to save new records.
          </div>
        </div>
      </div>

      <button
        onClick={handleRetry}
        disabled={isRetrying}
        className="px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white font-bold text-xs shrink-0 flex items-center gap-1.5 transition-colors disabled:opacity-50"
      >
        <RefreshCw className={`w-3.5 h-3.5 ${isRetrying ? 'animate-spin' : ''}`} />
        <span>Retry</span>
      </button>
    </aside>
  );
};
