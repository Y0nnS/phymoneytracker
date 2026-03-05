import type { Analytics } from 'firebase/analytics';
import { firebaseApp } from './client';

let analyticsPromise: Promise<Analytics | null> | null = null;

export async function getFirebaseAnalytics(): Promise<Analytics | null> {
  if (typeof window === 'undefined') return null;
  if (!process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID) return null;

  if (!analyticsPromise) {
    analyticsPromise = (async () => {
      const { isSupported, initializeAnalytics } = await import(
        'firebase/analytics'
      );
      const supported = await isSupported();
      if (!supported) return null;
      return initializeAnalytics(firebaseApp, {
        config: {
          send_page_view: false,
        },
      });
    })();
  }

  try {
    return await analyticsPromise;
  } catch {
    analyticsPromise = null;
    return null;
  }
}

