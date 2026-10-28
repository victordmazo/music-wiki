'use client';

import { createContext, useContext, useEffect, useRef, useState } from 'react';
import { usePathname } from 'next/navigation';
import { apiFetch, getStoredToken } from './api-client';
import { isModerator as checkIsModerator } from './permissions';
import type { Profile } from './types';

type CurrentProfileValue = {
  token: string | null;
  profile: Profile | null;
  loading: boolean;
  isModerator: boolean;
  /** Re-reads the stored token and refetches the profile (e.g. right after login/logout). */
  refresh: () => void;
  /**
   * Applies a profile a mutation (save, avatar upload, create) already returned,
   * without the full-page "loading" flicker a refresh() would cause.
   */
  setProfile: (profile: Profile) => void;
};

const CurrentProfileContext = createContext<CurrentProfileValue | null>(null);

/**
 * Mounted once in the root layout so the header, sidebar, and every page share a
 * single "who's logged in" fetch instead of each page hitting /api/profile itself.
 *
 * Refetches on every route change, not just on mount, so a moderator's own
 * suspend/ban/role change on this account is picked up on the next navigation
 * instead of staying frozen for the rest of the browser session. `loading` only
 * flips true for the very first fetch, though — later, route-change-triggered
 * refetches update `profile` silently once they resolve, so navigating around
 * doesn't flash a loading state on every page that gates on it.
 */
export function CurrentProfileProvider({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [token, setToken] = useState<string | null>(null);
  const [profile, setProfileState] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const hasLoadedOnce = useRef(false);

  function load() {
    const stored = getStoredToken();
    setToken(stored);
    if (!stored) {
      setProfileState(null);
      setLoading(false);
      hasLoadedOnce.current = true;
      return;
    }
    if (!hasLoadedOnce.current) setLoading(true);
    apiFetch<{ profile: Profile | null }>('/api/profile', { token: stored }).then((result) => {
      if (result.ok) setProfileState(result.data.profile);
      setLoading(false);
      hasLoadedOnce.current = true;
    });
  }

  /** Forces the next load() to show the full loading state again (e.g. after login/logout). */
  function refresh() {
    hasLoadedOnce.current = false;
    load();
  }

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(load, [pathname]);

  const isModerator = checkIsModerator(profile);

  return (
    <CurrentProfileContext.Provider
      value={{ token, profile, loading, isModerator, refresh, setProfile: setProfileState }}
    >
      {children}
    </CurrentProfileContext.Provider>
  );
}

export function useCurrentProfile(): CurrentProfileValue {
  const context = useContext(CurrentProfileContext);
  if (!context) {
    throw new Error('useCurrentProfile must be used within CurrentProfileProvider');
  }
  return context;
}
