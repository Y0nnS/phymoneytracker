'use client';

import React from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '@/components/auth/AuthProvider';
import { QuickCaptureModal } from '@/components/layout/QuickCaptureModal';
import { Sidebar } from '@/components/layout/Sidebar';
import { Topbar } from '@/components/layout/Topbar';
import { MobileNav } from '@/components/layout/MobileNav';

export function AppShell({ children }: { children: React.ReactNode }) {
  const SIDEBAR_STATE_KEY = 'productivity-space.sidebar-collapsed';
  const { user, loading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [quickCaptureOpen, setQuickCaptureOpen] = React.useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = React.useState(false);

  React.useEffect(() => {
    const saved = window.localStorage.getItem(SIDEBAR_STATE_KEY);
    setSidebarCollapsed(saved === 'true');
  }, []);

  React.useEffect(() => {
    window.localStorage.setItem(SIDEBAR_STATE_KEY, String(sidebarCollapsed));
  }, [sidebarCollapsed]);

  React.useEffect(() => {
    if (!loading && !user) router.replace('/sign-in');
  }, [loading, user, router]);

  React.useEffect(() => {
    function isEditableTarget(target: EventTarget | null) {
      if (!(target instanceof HTMLElement)) return false;
      const tag = target.tagName.toLowerCase();
      return tag === 'input' || tag === 'textarea' || tag === 'select' || target.isContentEditable;
    }

    function onKeyDown(e: KeyboardEvent) {
      if (isEditableTarget(e.target)) return;
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      if (e.key.toLowerCase() !== 'q') return;
      e.preventDefault();
      setQuickCaptureOpen(true);
    }

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  if (loading || !user) {
    return (
      <div className="min-h-screen bg-zinc-950 text-zinc-100">
        <div className="flex w-full flex-col gap-4 px-6 py-14">
          <div className="h-7 w-40 animate-pulse rounded-md bg-zinc-900" />
          <div className="h-10 w-full animate-pulse rounded-xl bg-zinc-900" />
          <div className="h-10 w-2/3 animate-pulse rounded-xl bg-zinc-900" />
        </div>
      </div>
    );
  }

  return (
    <div className="h-dvh overflow-hidden bg-zinc-950 text-zinc-100">
      <div className="flex h-full">
        <div
          className="app-sidebar-shell hidden md:shrink-0 md:block"
          data-collapsed={sidebarCollapsed ? 'true' : 'false'}>
          <Sidebar onQuickCapture={() => setQuickCaptureOpen(true)} />
        </div>
        <div className="flex min-w-0 flex-1 flex-col overflow-y-auto overflow-x-hidden">
          <Topbar
            onQuickCapture={() => setQuickCaptureOpen(true)}
            sidebarCollapsed={sidebarCollapsed}
            onToggleSidebar={() => setSidebarCollapsed((value) => !value)}
          />
          <div
            key={pathname}
            className="flex-1 px-3 py-4 pb-24 motion-reduce:animate-none motion-safe:animate-[page-in_180ms_ease-out] sm:px-6 sm:py-6 md:pb-6">
            {children}
          </div>
        </div>
      </div>
      <MobileNav onQuickCapture={() => setQuickCaptureOpen(true)} />
      <QuickCaptureModal open={quickCaptureOpen} onClose={() => setQuickCaptureOpen(false)} />
    </div>
  );
}
