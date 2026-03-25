'use client';

import React from 'react';
import type { Transaction } from '@/lib/types';
import { subscribeTransactions } from '@/lib/firebase/transactions';

export function useTransactions(uid: string | undefined) {
  const [transactions, setTransactions] = React.useState<Transaction[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!uid) {
      setTransactions([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    const unsubscribe = subscribeTransactions(
      uid,
      (next) => {
        setTransactions(next);
        setError(null);
        setLoading(false);
      },
      (err) => {
        setError(err instanceof Error ? err.message : 'Failed to load transactions.');
        setLoading(false);
      },
    );

    return unsubscribe;
  }, [uid]);

  return { transactions, loading, error };
}

