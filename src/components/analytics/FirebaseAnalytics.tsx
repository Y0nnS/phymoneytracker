'use client';

import React from 'react';
import { usePathname, useSearchParams } from 'next/navigation';
import { getFirebaseAnalytics } from '@/lib/firebase/analytics';

export function FirebaseAnalytics() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const search = searchParams?.toString() ?? '';

  React.useEffect(() => {
    let cancelled = false;

    (async () => {
      const analytics = await getFirebaseAnalytics();
      if (!analytics || cancelled) return;

      const { logEvent } = await import('firebase/analytics');
      const page_path = search ? `${pathname}?${search}` : pathname;

      logEvent(analytics, 'page_view', {
        page_path,
        page_location: window.location.href,
        page_title: document.title,
      });
    })().catch(() => {});

    return () => {
      cancelled = true;
    };
  }, [pathname, search]);

  return null;
}
