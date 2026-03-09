'use client';

import React from 'react';
import type { PlannerBlock } from '@/lib/types';
import { subscribePlannerBlocks } from '@/lib/firebase/plannerBlocks';

export function usePlannerBlocks(uid: string | undefined) {
  const [blocks, setBlocks] = React.useState<PlannerBlock[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!uid) {
      setBlocks([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    const unsubscribe = subscribePlannerBlocks(
      uid,
      (next) => {
        setBlocks(next);
        setError(null);
        setLoading(false);
      },
      (err) => {
        setError(err instanceof Error ? err.message : 'Gagal memuat planner.');
        setLoading(false);
      },
    );

    return unsubscribe;
  }, [uid]);

  return { blocks, loading, error };
}
