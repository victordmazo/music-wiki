'use client';

import { useEffect, useState } from 'react';
import { apiFetch, getStoredToken } from './api-client';
import type { Profile } from './types';

/** Shared "who's logged in" hook: reads the stored token and loads their profile. */
export function useCurrentProfile() {
  const [token, setToken] = useState<string | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const stored = getStoredToken();
    setToken(stored);
    if (!stored) {
      setLoading(false);
      return;
    }
    apiFetch<{ profile: Profile | null }>('/api/profile', { token: stored }).then((result) => {
      if (result.ok) setProfile(result.data.profile);
      setLoading(false);
    });
  }, []);

  const isModerator = profile?.role === 'moderator' && profile?.status === 'active';
  return { token, profile, loading, isModerator };
}
