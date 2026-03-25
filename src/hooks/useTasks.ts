'use client';

import React from 'react';
import type { Task } from '@/lib/types';
import { subscribeTasks } from '@/lib/firebase/tasks';

export function useTasks(uid: string | undefined) {
  const [tasks, setTasks] = React.useState<Task[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!uid) {
      setTasks([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    const unsubscribe = subscribeTasks(
      uid,
      (next) => {
        setTasks(next);
        setError(null);
        setLoading(false);
      },
      (err) => {
        setError(err instanceof Error ? err.message : 'Failed to load tasks.');
        setLoading(false);
      },
    );

    return unsubscribe;
  }, [uid]);

  return { tasks, loading, error };
}
