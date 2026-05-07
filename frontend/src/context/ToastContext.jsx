import { createContext, useCallback, useContext, useMemo, useState } from 'react';

const ToastContext = createContext(null);

let toastId = 0;

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const dismiss = useCallback((id) => {
    setToasts((curr) => curr.filter((t) => t.id !== id));
  }, []);

  const push = useCallback(
    (message, kind = 'info', ttl = 4000) => {
      const id = ++toastId;
      setToasts((curr) => [...curr, { id, message, kind }]);
      if (ttl > 0) setTimeout(() => dismiss(id), ttl);
      return id;
    },
    [dismiss],
  );

  const value = useMemo(
    () => ({
      push,
      dismiss,
      success: (m, ttl) => push(m, 'success', ttl),
      error: (m, ttl) => push(m, 'error', ttl ?? 6000),
      info: (m, ttl) => push(m, 'info', ttl),
    }),
    [push, dismiss],
  );

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="fixed top-4 right-4 z-50 space-y-2 pointer-events-none">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={`pointer-events-auto min-w-[260px] max-w-sm px-4 py-3 rounded-lg border shadow-lg text-sm
              ${t.kind === 'error'
                ? 'bg-neutral-900 border-red-500/40 text-red-200'
                : t.kind === 'success'
                ? 'bg-neutral-900 border-emerald-500/40 text-emerald-200'
                : 'bg-neutral-900 border-neutral-700 text-neutral-100'}`}
            role="status"
          >
            <div className="flex items-start gap-2">
              <span className="flex-1">{t.message}</span>
              <button
                onClick={() => dismiss(t.id)}
                className="text-neutral-400 hover:text-neutral-100"
                aria-label="Dismiss"
              >
                ×
              </button>
            </div>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used inside <ToastProvider>');
  return ctx;
}
