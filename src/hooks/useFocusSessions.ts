'use client';

import React from 'react';
import type { FocusSession } from '@/lib/types';
import { subscribeFocusSessions } from '@/lib/firebase/focusSessions';

export function useFocusSessions(uid: string | undefined) {
  const [sessions, setSessions] = React.useState<FocusSession[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!uid) {
      setSessions([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    const unsubscribe = subscribeFocusSessions(
      uid,
      (next) => {
        setSessions(next);
        setError(null);
        setLoading(false);
      },
      (err) => {
        setError(err instanceof Error ? err.message : 'Failed to load focus sessions.');
        setLoading(false);
      },
    );

    return unsubscribe;
  }, [uid]);

  return { sessions, loading, error };
}
