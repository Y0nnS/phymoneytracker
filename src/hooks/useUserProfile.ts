'use client';

import React from 'react';
import type { UserProfile } from '@/lib/types';
import { subscribeUserProfile } from '@/lib/firebase/users';

export function useUserProfile(uid: string | undefined) {
  const [profile, setProfile] = React.useState<UserProfile | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!uid) {
      setProfile(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    const unsubscribe = subscribeUserProfile(
      uid,
      (next) => {
        setProfile(next);
        setError(null);
        setLoading(false);
      },
      (err) => {
        setError(err instanceof Error ? err.message : 'Failed to load profile.');
        setLoading(false);
      },
    );

    return unsubscribe;
  }, [uid]);

  return { profile, loading, error };
}
