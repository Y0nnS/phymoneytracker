'use client';

import React from 'react';
import { cn } from '@/lib/utils';

const ANIMATION_MS = 180;

export function Modal({
  open,
  title,
  children,
  onClose,
  className,
}: {
  open: boolean;
  title: string;
  children: React.ReactNode;
  onClose: () => void;
  className?: string;
}) {
  const titleId = React.useId();
  const [mounted, setMounted] = React.useState(open);
  const [visible, setVisible] = React.useState(open);

  React.useEffect(() => {
    if (open) {
      setMounted(true);
      setVisible(true);
      return;
    }

    if (!mounted) return;
    setVisible(false);
    const t = window.setTimeout(() => setMounted(false), ANIMATION_MS);
    return () => window.clearTimeout(t);
  }, [open, mounted]);

  React.useEffect(() => {
    if (!open) return;
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [open, onClose]);

  React.useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  if (!mounted) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-6">
      <button
        type="button"
        className={cn(
          'absolute inset-0 bg-black/70 motion-reduce:animate-none',
          visible
            ? 'motion-safe:animate-[overlay-in_180ms_ease-out]'
            : 'motion-safe:animate-[overlay-out_180ms_ease-in_forwards]',
        )}
        aria-label="Tutup"
        onClick={onClose}/>
      <div
        className={cn(
          'relative z-10 w-full max-w-lg rounded-2xl border border-zinc-800 bg-zinc-950 p-5 shadow-2xl shadow-black/60 ring-1 ring-white/5 motion-reduce:animate-none',
          visible
            ? 'motion-safe:animate-[modal-in_180ms_ease-out]'
            : 'motion-safe:animate-[modal-out_180ms_ease-in_forwards]',
          className,
        )}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}>
        <div className="mb-4 flex items-start justify-between gap-4">
          <div className="text-base font-semibold" id={titleId}>
            {title}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md px-2 py-1 text-sm font-semibold text-zinc-300 hover:bg-zinc-900">
            Tutup
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
