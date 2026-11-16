import React from 'react';
import { usePwa } from '../../context/PwaContext';
import { ArrowUpCircle, X } from 'lucide-react';

export const PwaUpdateToast: React.FC = () => {
  const { hasUpdate, updateApp, dismissUpdate } = usePwa();

  if (!hasUpdate) return null;

  return (
    <aside
      aria-live="polite"
      className="fixed bottom-4 right-4 sm:bottom-6 sm:right-6 z-[9995] max-w-sm w-[calc(100%-2rem)] bg-white border border-slate-200 rounded-2xl shadow-2xl p-4 flex flex-col gap-3 animate-fade-in"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="w-9 h-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
          <ArrowUpCircle className="w-5 h-5 text-primary" />
        </div>
        <div className="flex-1 min-w-0">
          <h4 className="font-bold text-navy-900 text-sm">Update Available</h4>
          <p className="text-xs text-slate-500 mt-0.5">
            A new version of Zellahostel is ready with performance improvements.
          </p>
        </div>
        <button
          onClick={dismissUpdate}
          className="p-1 text-slate-400 hover:text-navy-900 rounded-lg transition-colors shrink-0"
          title="Dismiss update for now"
          aria-label="Dismiss update"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="flex items-center justify-end gap-2 pt-1 border-t border-slate-100">
        <button
          onClick={dismissUpdate}
          className="px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
        >
          Later
        </button>
        <button
          onClick={updateApp}
          className="px-4 py-1.5 text-xs font-bold text-white bg-primary hover:bg-primary-700 rounded-xl shadow-sm transition-colors"
        >
          Update Now
        </button>
      </div>
    </aside>
  );
};
