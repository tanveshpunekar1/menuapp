import React, { useState, useEffect } from 'react';
import { Bug, X, Trash2, AlertTriangle, RefreshCw, CheckCircle2, ChevronDown, ChevronUp } from 'lucide-react';
import { getErrorLogs, clearErrorLogs, syncClientJournalToServer, getTombstones, getClientJournal, type ApiErrorEntry } from '../lib/api';
import { useAuth } from '../context/AuthContext';

export const DebugPanel: React.FC = () => {
  const { user } = useAuth();
  const [errors, setErrors] = useState<ApiErrorEntry[]>(() => getErrorLogs());
  const [latestToast, setLatestToast] = useState<ApiErrorEntry | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [syncSuccess, setSyncSuccess] = useState(false);

  const isDebugQuery = typeof window !== 'undefined' && window.location.search.includes('debug=1');
  const isSuperAdmin = user?.role === 'platform_admin';
  const showTrigger = isDebugQuery || isSuperAdmin || errors.length > 0;

  useEffect(() => {
    const handleNewError = (e: Event) => {
      const customEvent = e as CustomEvent<ApiErrorEntry>;
      setErrors(getErrorLogs());
      if (customEvent.detail) {
        setLatestToast(customEvent.detail);
      }
    };

    const handleClear = () => {
      setErrors([]);
      setLatestToast(null);
    };

    window.addEventListener('restoqr:api-error', handleNewError);
    window.addEventListener('restoqr:api-error-clear', handleClear);
    return () => {
      window.removeEventListener('restoqr:api-error', handleNewError);
      window.removeEventListener('restoqr:api-error-clear', handleClear);
    };
  }, []);

  useEffect(() => {
    if (!latestToast) return;
    const timer = setTimeout(() => setLatestToast(null), 6000);
    return () => clearTimeout(timer);
  }, [latestToast]);

  const handleManualSync = async () => {
    setSyncing(true);
    try {
      await syncClientJournalToServer();
      setSyncSuccess(true);
      setTimeout(() => setSyncSuccess(false), 2500);
    } finally {
      setSyncing(false);
    }
  };

  if (!showTrigger && !latestToast) return null;

  const tombstonesCount = getTombstones().length;
  const journal = getClientJournal();

  return (
    <>
      {/* Visible Error Toast Banner whenever an API / Auth / DB call fails */}
      {latestToast && (
        <div className="fixed top-4 right-4 z-[9999] max-w-md bg-red-950/95 border border-red-500/40 text-red-100 px-4 py-3 rounded-2xl shadow-2xl backdrop-blur-md flex items-start gap-3 animate-in fade-in slide-in-from-top-3">
          <AlertTriangle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-red-300">
              <span>Error [{latestToast.code}]</span>
              <span className="text-red-400/80 font-mono truncate">{latestToast.method} {latestToast.endpoint}</span>
            </div>
            <p className="text-xs text-red-100 mt-1 break-words font-medium">{latestToast.message}</p>
          </div>
          <button
            onClick={() => setLatestToast(null)}
            className="text-red-300 hover:text-white p-1 rounded-lg transition-colors"
            title="Dismiss"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Floating Debug Toggle Pill (SuperAdmin or ?debug=1) */}
      {(isDebugQuery || isSuperAdmin) && (
        <div className="fixed bottom-4 left-4 z-[9990]">
          {!isOpen ? (
            <button
              onClick={() => setIsOpen(true)}
              className={`flex items-center gap-2 px-3 py-2 rounded-full text-xs font-semibold shadow-lg border backdrop-blur-md transition-all ${
                errors.length > 0
                  ? 'bg-red-950/90 text-red-200 border-red-500/40 hover:bg-red-900'
                  : 'bg-slate-900/90 text-slate-200 border-slate-700/60 hover:bg-slate-800'
              }`}
            >
              <Bug className="w-3.5 h-3.5 text-orange-400" />
              <span>Diagnostics</span>
              {errors.length > 0 && (
                <span className="px-1.5 py-0.5 text-[10px] bg-red-500 text-white rounded-full font-bold">
                  {errors.length}
                </span>
              )}
              <ChevronUp className="w-3.5 h-3.5 opacity-60" />
            </button>
          ) : (
            <div className="w-80 sm:w-96 bg-slate-950/95 border border-slate-800 text-slate-100 rounded-2xl shadow-2xl backdrop-blur-xl overflow-hidden">
              <div className="px-4 py-3 bg-slate-900 border-b border-slate-800 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Bug className="w-4 h-4 text-orange-400" />
                  <span className="text-xs font-bold tracking-wide uppercase text-slate-200">
                    System Diagnostics ({errors.length}/20)
                  </span>
                </div>
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={handleManualSync}
                    disabled={syncing}
                    className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
                    title="Sync state to server"
                  >
                    {syncSuccess ? (
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                    ) : (
                      <RefreshCw className={`w-3.5 h-3.5 ${syncing ? 'animate-spin text-orange-400' : ''}`} />
                    )}
                  </button>
                  {errors.length > 0 && (
                    <button
                      onClick={clearErrorLogs}
                      className="p-1.5 text-slate-400 hover:text-red-400 hover:bg-slate-800 rounded-lg transition-colors"
                      title="Clear error logs"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                  <button
                    onClick={() => setIsOpen(false)}
                    className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
                  >
                    <ChevronDown className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <div className="px-4 py-2.5 bg-slate-900/50 border-b border-slate-800/80 grid grid-cols-3 gap-2 text-[11px]">
                <div>
                  <span className="text-slate-400 block">Role</span>
                  <span className="font-semibold text-emerald-400">{user?.role || 'guest'}</span>
                </div>
                <div>
                  <span className="text-slate-400 block">Journal Cache</span>
                  <span className="font-semibold text-slate-200">
                    {journal.restaurants.length}R / {journal.menu_items.length}M
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block">Tombstones</span>
                  <span className="font-semibold text-orange-400">{tombstonesCount} deleted</span>
                </div>
              </div>

              <div className="max-h-64 overflow-y-auto divide-y divide-slate-800/70">
                {errors.length === 0 ? (
                  <div className="py-8 text-center text-xs text-slate-400">
                    <CheckCircle2 className="w-6 h-6 text-emerald-400 mx-auto mb-1.5 opacity-80" />
                    No API or authentication errors recorded.
                  </div>
                ) : (
                  errors.map(err => (
                    <div key={err.id} className="p-3 hover:bg-slate-900/60 transition-colors text-xs">
                      <div className="flex items-center justify-between gap-2 mb-1">
                        <span className="px-1.5 py-0.5 rounded bg-red-500/20 text-red-300 font-mono text-[10px] font-bold">
                          {err.method} [{err.code}]
                        </span>
                        <span className="text-[10px] text-slate-400 font-mono">
                          {new Date(err.timestamp).toLocaleTimeString()}
                        </span>
                      </div>
                      <div className="font-mono text-[11px] text-slate-300 truncate mb-0.5">{err.endpoint}</div>
                      <div className="text-red-200 break-words">{err.message}</div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </>
  );
};
