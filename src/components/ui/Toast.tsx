'use client';

import React from 'react';
import { cn } from '@/lib/utils';

type ToastVariant = 'default' | 'success' | 'danger';

type ToastItem = {
  id: string;
  title?: string;
  message: string;
  variant: ToastVariant;
  closing?: boolean;
};

type ToastContextValue = {
  toast: (message: string, options?: { title?: string; variant?: ToastVariant }) => void;
  success: (message: string, options?: { title?: string }) => void;
  danger: (message: string, options?: { title?: string }) => void;
};

const ToastContext = React.createContext<ToastContextValue | undefined>(undefined);

function makeId() {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = React.useState<ToastItem[]>([]);

  const dismiss = React.useCallback((id: string) => {
    setToasts((prev) => prev.map((t) => (t.id === id ? { ...t, closing: true } : t)));
    window.setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 180);
  }, []);

  const push = React.useCallback(
    (message: string, options?: { title?: string; variant?: ToastVariant }) => {
      const id = makeId();
      const item: ToastItem = {
        id,
        title: options?.title,
        message,
        variant: options?.variant ?? 'default',
      };

      setToasts((prev) => {
        const next = [...prev, item];
        return next.slice(-4);
      });

      window.setTimeout(() => dismiss(id), 3500);
    },
    [dismiss],
  );

  const value = React.useMemo<ToastContextValue>(
    () => ({
      toast: (message, options) => push(message, options),
      success: (message, options) => push(message, { ...options, variant: 'success' }),
      danger: (message, options) => push(message, { ...options, variant: 'danger' }),
    }),
    [push],
  );

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div
        className="pointer-events-none fixed inset-x-0 bottom-3 z-[60] flex w-full justify-end px-3 md:bottom-5 md:px-6"
        aria-live="polite"
        aria-relevant="additions">
        <div className="flex w-full max-w-sm flex-col gap-2">
          {toasts.map((t) => (
            <div
              key={t.id}
              className={cn(
                'pointer-events-auto rounded-2xl border p-4 shadow-lg shadow-black/50 ring-1 ring-white/5',
                t.variant === 'success'
                  ? 'border-emerald-900/60 bg-emerald-950/60 text-emerald-50'
                  : t.variant === 'danger'
                    ? 'border-red-900/60 bg-red-950/60 text-red-50'
                    : 'border-zinc-800 bg-zinc-950 text-zinc-100',
                t.closing
                  ? 'animate-[toast-out_180ms_ease-in_forwards]'
                  : 'animate-[toast-in_180ms_ease-out]',
              )}
              role="status">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  {t.title ? (
                    <div className="truncate text-sm font-semibold">{t.title}</div>
                  ) : null}
                  <div className={cn('text-sm', t.title ? 'text-white/80' : 'text-white/90')}>
                    {t.message}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => dismiss(t.id)}
                  className="rounded-md px-2 py-1 text-xs font-semibold text-white/70 hover:bg-white/10 hover:text-white"
                  aria-label="Tutup notifikasi">
                  Tutup
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const value = React.useContext(ToastContext);
  if (!value) throw new Error('useToast harus dipakai di dalam <ToastProvider>.');
  return value;
}
