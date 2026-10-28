'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useCurrentProfile } from '../../lib/use-current-profile';
import { apiFetch } from '../../lib/api-client';

function NavLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <li>
      <Link href={href} className="block px-2 py-1 text-sm text-wikiblue hover:underline">
        {children}
      </Link>
    </li>
  );
}

export function Sidebar() {
  const router = useRouter();
  const { token, isModerator } = useCurrentProfile();

  async function goToRandom() {
    const result = await apiFetch<{ slug: string }>('/api/entries/random');
    router.push(result.ok ? `/entries/${result.data.slug}` : '/entries');
  }

  return (
    <nav className="hidden w-48 shrink-0 md:block">
      <div className="rounded border border-wikiborder-light bg-wikigray p-3">
        <p className="px-2 text-xs font-semibold uppercase tracking-wide text-wikisubtle">Navigation</p>
        <ul className="mt-1">
          <NavLink href="/">Main page</NavLink>
          <NavLink href="/entries">Browse bands &amp; artists</NavLink>
          <li>
            <button
              onClick={goToRandom}
              className="block w-full px-2 py-1 text-left text-sm text-wikiblue hover:underline"
            >
              Random article
            </button>
          </li>
          <NavLink href="/discussions">Discussions</NavLink>
        </ul>
      </div>

      <div className="mt-4 rounded border border-wikiborder-light bg-wikigray p-3">
        <p className="px-2 text-xs font-semibold uppercase tracking-wide text-wikisubtle">Tools</p>
        <ul className="mt-1">
          {token ? (
            <>
              <NavLink href="/entries/new">Add a new entry</NavLink>
              <NavLink href="/requests">{isModerator ? 'Review queue' : 'My requests'}</NavLink>
              {isModerator ? <NavLink href="/moderation">Manage users</NavLink> : null}
              <NavLink href="/profile">My profile</NavLink>
            </>
          ) : (
            <>
              <NavLink href="/login">Log in</NavLink>
              <NavLink href="/register">Create account</NavLink>
            </>
          )}
        </ul>
      </div>
    </nav>
  );
}
