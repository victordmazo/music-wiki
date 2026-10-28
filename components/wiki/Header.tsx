'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { useCurrentProfile } from '../../lib/use-current-profile';

export function Header() {
  const router = useRouter();
  const { token, profile, loading, refresh } = useCurrentProfile();
  const [searchValue, setSearchValue] = useState('');

  function handleSearch(event: React.FormEvent) {
    event.preventDefault();
    const q = searchValue.trim();
    router.push(q ? `/entries?q=${encodeURIComponent(q)}` : '/entries');
  }

  function handleLogout() {
    localStorage.removeItem('access_token');
    refresh();
    router.push('/');
  }

  return (
    <header className="border-b border-wikiborder bg-white">
      <div className="mx-auto flex max-w-6xl items-center justify-end gap-3 px-4 py-1 text-xs text-wikisubtle">
        {loading ? null : token && profile ? (
          <>
            <Link href="/profile" className="hover:underline">
              {profile.username}
            </Link>
            <button onClick={handleLogout} className="text-wikiblue hover:underline">
              Log out
            </button>
          </>
        ) : (
          <>
            <Link href="/login" className="hover:underline">
              Log in
            </Link>
            <Link href="/register" className="hover:underline">
              Create account
            </Link>
          </>
        )}
      </div>
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 border-t border-wikiborder-light px-4 py-3">
        <Link href="/" className="flex items-baseline gap-2">
          <span className="font-serif text-2xl font-semibold text-wikitext">NE Scene-pedia</span>
          <span className="hidden text-xs text-wikisubtle sm:inline">The free New England music wiki</span>
        </Link>
        <form onSubmit={handleSearch} className="flex w-full max-w-xs sm:w-auto">
          <input
            type="search"
            value={searchValue}
            onChange={(event) => setSearchValue(event.target.value)}
            placeholder="Search NE Scene-pedia"
            className="w-full rounded-l border border-wikiborder px-3 py-1.5 text-sm text-wikitext outline-none focus:border-wikiblue-dark"
          />
          <button
            type="submit"
            className="shrink-0 rounded-r border border-l-0 border-wikiborder bg-wikigray px-3 py-1.5 text-sm hover:bg-slate-200"
          >
            Search
          </button>
        </form>
      </div>
    </header>
  );
}
