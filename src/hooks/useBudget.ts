'use client';

import React from 'react';
import type { Budget } from '@/lib/types';
import { subscribeBudget } from '@/lib/firebase/budgets';

export function useBudget(uid: string | undefined, monthId: string) {
  const [budget, setBudget] = React.useState<Budget | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!uid) {
      setBudget(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    const unsubscribe = subscribeBudget(
      uid,
      monthId,
      (next) => {
        setBudget(next);
        setError(null);
        setLoading(false);
      },
      (err) => {
        setError(err instanceof Error ? err.message : 'Gagal memuat budget.');
        setLoading(false);
      },
    );

    return unsubscribe;
  }, [uid, monthId]);

  return { budget, loading, error };
}

