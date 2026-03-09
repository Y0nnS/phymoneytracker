'use client';

import React from 'react';
import type { Goal } from '@/lib/types';
import { subscribeGoals } from '@/lib/firebase/goals';

export function useGoals(uid: string | undefined) {
  const [goals, setGoals] = React.useState<Goal[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!uid) {
      setGoals([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    const unsubscribe = subscribeGoals(
      uid,
      (next) => {
        setGoals(next);
        setError(null);
        setLoading(false);
      },
      (err) => {
        setError(err instanceof Error ? err.message : 'Gagal memuat goals.');
        setLoading(false);
      },
    );

    return unsubscribe;
  }, [uid]);

  return { goals, loading, error };
}
