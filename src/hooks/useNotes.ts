'use client';

import React from 'react';
import type { Note } from '@/lib/types';
import { subscribeNotes } from '@/lib/firebase/notes';

export function useNotes(uid: string | undefined) {
  const [notes, setNotes] = React.useState<Note[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!uid) {
      setNotes([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    const unsubscribe = subscribeNotes(
      uid,
      (next) => {
        setNotes(next);
        setError(null);
        setLoading(false);
      },
      (err) => {
        setError(err instanceof Error ? err.message : 'Failed to load notes.');
        setLoading(false);
      },
    );

    return unsubscribe;
  }, [uid]);

  return { notes, loading, error };
}
