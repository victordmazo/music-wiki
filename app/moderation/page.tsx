'use client';

import { useEffect, useState } from 'react';
import { apiFetch } from '../../lib/api-client';
import { useCurrentProfile } from '../../lib/use-current-profile';
import { EmptyState } from '../../components/wiki/EmptyState';
import type { UserAccount, UserStatus } from '../../lib/types';

const STATUS_STYLES: Record<UserStatus, string> = {
  active: 'border-wikiok-border bg-wikiok-bg text-wikiok',
  suspended: 'border-wikiwarn-border bg-wikiwarn-bg text-wikiwarn',
  banned: 'border-wikired bg-red-50 text-wikired',
};

export default function ModerationPage() {
  const { token, profile, isModerator, loading: profileLoading } = useCurrentProfile();

  const [users, setUsers] = useState<UserAccount[]>([]);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState('');
  const [query, setQuery] = useState('');
  const [busyId, setBusyId] = useState<string | null>(null);
  const [suspendingId, setSuspendingId] = useState<string | null>(null);
  const [suspendUntil, setSuspendUntil] = useState('');
  const [confirmingBanId, setConfirmingBanId] = useState<string | null>(null);

  function load() {
    if (!token || !isModerator) return;
    setLoading(true);
    const search = query ? `?q=${encodeURIComponent(query)}` : '';
    apiFetch<{ users: UserAccount[]; hasMore: boolean }>(`/api/users${search}`).then((result) => {
      setLoading(false);
      if (result.ok) {
        setUsers(result.data.users);
        setHasMore(result.data.hasMore);
      } else {
        setError(result.error);
      }
    });
  }

  useEffect(load, [token, isModerator, query]);

  async function loadMore() {
    setLoadingMore(true);
    const params = new URLSearchParams({ offset: String(users.length) });
    if (query) params.set('q', query);
    const result = await apiFetch<{ users: UserAccount[]; hasMore: boolean }>(`/api/users?${params.toString()}`);
    setLoadingMore(false);
    if (result.ok) {
      setUsers((prev) => [...prev, ...result.data.users]);
      setHasMore(result.data.hasMore);
    } else {
      setError(result.error);
    }
  }

  // Patches the one row that changed from the PATCH response, instead of
  // refetching the whole (possibly paginated) list after every action.
  async function moderate(id: string, body: Record<string, unknown>) {
    setBusyId(id);
    setError('');
    const result = await apiFetch<{ profile: UserAccount }>(`/api/users/${id}/moderate`, { method: 'PATCH', body });
    setBusyId(null);
    if (result.ok) {
      setUsers((prev) => prev.map((user) => (user.id === id ? result.data.profile : user)));
    } else {
      setError(result.error);
    }
  }

  function confirmSuspend(id: string) {
    moderate(id, { status: 'suspended', suspended_until: suspendUntil ? `${suspendUntil}T00:00:00Z` : null });
    setSuspendingId(null);
    setSuspendUntil('');
  }

  function confirmBan(id: string) {
    moderate(id, { status: 'banned' });
    setConfirmingBanId(null);
  }

  if (profileLoading) {
    return <p className="text-wikisubtle">Loading…</p>;
  }

  if (!token) {
    return <EmptyState message="Log in to access user moderation." linkHref="/login" linkLabel="Go to login" />;
  }

  if (!isModerator) {
    return (
      <EmptyState
        message="Only moderators can manage user accounts."
        linkHref="/entries"
        linkLabel="Back to browse"
      />
    );
  }

  return (
    <div>
      <h1 className="wiki-title font-serif text-3xl">User accounts</h1>

      <input
        type="text"
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        placeholder="Search by username…"
        className="mt-4 w-full rounded border border-wikiborder px-3 py-2 text-sm text-wikitext outline-none focus:border-wikiblue-dark"
      />

      {error ? (
        <p className="mt-6 rounded border border-wikired bg-red-50 p-3 text-sm text-wikired">{error}</p>
      ) : null}

      <div className="mt-6 space-y-3">
        {loading ? (
          <p className="text-wikisubtle">Loading…</p>
        ) : users.length === 0 ? (
          <p className="text-wikisubtle">No users match.</p>
        ) : (
          users.map((user) => {
            const isSelf = user.id === profile?.id;
            const busy = busyId === user.id;

            return (
              <div key={user.id} className="rounded border border-wikiborder-light p-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-wikitext">{user.username}</span>
                    {isSelf ? <span className="text-xs text-wikisubtle">(you)</span> : null}
                    {user.role === 'moderator' ? (
                      <span className="rounded-full border border-wikiborder bg-wikigray px-2.5 py-0.5 text-xs text-wikisubtle">
                        moderator
                      </span>
                    ) : null}
                  </div>
                  <span className={`rounded border px-2.5 py-0.5 text-xs capitalize ${STATUS_STYLES[user.status]}`}>
                    {user.status}
                    {user.status === 'suspended' && user.suspended_until
                      ? ` until ${new Date(user.suspended_until).toLocaleDateString()}`
                      : ''}
                  </span>
                </div>

                {!isSelf ? (
                  <div className="mt-3 flex flex-wrap items-center gap-3 text-sm">
                    {user.status !== 'active' ? (
                      <button
                        onClick={() => moderate(user.id, { status: 'active' })}
                        disabled={busy}
                        className="rounded bg-wikiblue px-3 py-1.5 font-semibold text-white hover:bg-wikiblue-dark disabled:opacity-70"
                      >
                        Reinstate
                      </button>
                    ) : (
                      <button
                        onClick={() => setSuspendingId(suspendingId === user.id ? null : user.id)}
                        className="rounded border border-wikiwarn-border px-3 py-1.5 text-wikiwarn hover:bg-wikiwarn-bg"
                      >
                        Suspend
                      </button>
                    )}

                    {user.status !== 'banned' ? (
                      <button
                        onClick={() => setConfirmingBanId(confirmingBanId === user.id ? null : user.id)}
                        disabled={busy}
                        className="rounded border border-wikired px-3 py-1.5 text-wikired hover:bg-red-50 disabled:opacity-70"
                      >
                        Ban
                      </button>
                    ) : null}

                    {user.role === 'user' ? (
                      <button
                        onClick={() => moderate(user.id, { role: 'moderator' })}
                        disabled={busy}
                        className="rounded border border-wikiborder px-3 py-1.5 hover:bg-wikigray disabled:opacity-70"
                      >
                        Promote to moderator
                      </button>
                    ) : (
                      <button
                        onClick={() => moderate(user.id, { role: 'user' })}
                        disabled={busy}
                        className="rounded border border-wikiborder px-3 py-1.5 hover:bg-wikigray disabled:opacity-70"
                      >
                        Demote to user
                      </button>
                    )}
                  </div>
                ) : (
                  <p className="mt-3 text-xs text-wikisubtle">You can't change your own role or status here.</p>
                )}

                {suspendingId === user.id ? (
                  <div className="mt-3 flex flex-wrap items-center gap-3 rounded border border-wikiwarn-border bg-wikiwarn-bg p-3">
                    <label className="text-sm text-wikiwarn">
                      Until (optional — leave blank for indefinite)
                      <input
                        type="date"
                        value={suspendUntil}
                        onChange={(event) => setSuspendUntil(event.target.value)}
                        className="ml-3 rounded border border-wikiborder px-3 py-1.5 text-sm text-wikitext outline-none focus:border-wikiwarn-border"
                      />
                    </label>
                    <button
                      onClick={() => confirmSuspend(user.id)}
                      disabled={busy}
                      className="rounded bg-wikiwarn-border px-3 py-1.5 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-70"
                    >
                      {busy ? 'Working…' : 'Confirm suspension'}
                    </button>
                    <button
                      onClick={() => setSuspendingId(null)}
                      className="rounded border border-wikiborder px-3 py-1.5 text-sm hover:bg-wikigray"
                    >
                      Cancel
                    </button>
                  </div>
                ) : null}

                {confirmingBanId === user.id ? (
                  <div className="mt-3 flex flex-wrap items-center gap-3 rounded border border-wikired bg-red-50 p-3">
                    <p className="text-sm text-wikired">
                      Ban {user.username}? They'll be blocked from posting or editing until reinstated.
                    </p>
                    <button
                      onClick={() => confirmBan(user.id)}
                      disabled={busy}
                      className="rounded bg-wikired px-3 py-1.5 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-70"
                    >
                      {busy ? 'Working…' : 'Confirm ban'}
                    </button>
                    <button
                      onClick={() => setConfirmingBanId(null)}
                      className="rounded border border-wikiborder px-3 py-1.5 text-sm hover:bg-wikigray"
                    >
                      Cancel
                    </button>
                  </div>
                ) : null}
              </div>
            );
          })
        )}

        {!loading && hasMore ? (
          <button
            onClick={loadMore}
            disabled={loadingMore}
            className="w-full rounded border border-wikiborder py-2 text-sm hover:bg-wikigray disabled:opacity-70"
          >
            {loadingMore ? 'Loading…' : 'Load more'}
          </button>
        ) : null}
      </div>
    </div>
  );
}
