'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { apiFetch } from '../../lib/api-client';
import { useCurrentProfile } from '../../lib/use-current-profile';
import { EmptyState } from '../../components/wiki/EmptyState';
import type { ChangeRequest, RequestStatus } from '../../lib/types';

const STATUS_STYLES: Record<RequestStatus, string> = {
  pending: 'border-wikiwarn-border bg-wikiwarn-bg text-wikiwarn',
  approved: 'border-wikiok-border bg-wikiok-bg text-wikiok',
  denied: 'border-wikired bg-red-50 text-wikired',
};

const FILTERS = ['pending', 'approved', 'denied', 'all'] as const;

function requestLabel(request: ChangeRequest): string {
  if (request.proposed_data?.title) return request.proposed_data.title;
  return request.entry_id ? `Entry #${request.entry_id}` : `Request #${request.id}`;
}

export default function RequestsPage() {
  const { token, profile, isModerator, loading: profileLoading } = useCurrentProfile();

  const [requests, setRequests] = useState<ChangeRequest[]>([]);
  const [statusFilter, setStatusFilter] = useState<(typeof FILTERS)[number]>('pending');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [busyId, setBusyId] = useState<number | null>(null);
  const [notes, setNotes] = useState<Record<number, string>>({});

  function load() {
    if (!token) return;
    setLoading(true);
    const query = statusFilter === 'all' ? '' : `?status=${statusFilter}`;
    apiFetch<{ requests: ChangeRequest[] }>(`/api/requests${query}`).then((result) => {
      setLoading(false);
      if (result.ok) setRequests(result.data.requests);
      else setError(result.error);
    });
  }

  useEffect(load, [token, statusFilter]);

  async function withdraw(id: number) {
    setBusyId(id);
    const result = await apiFetch(`/api/requests/${id}`, { method: 'DELETE' });
    setBusyId(null);
    if (result.ok) load();
    else setError(result.error);
  }

  async function review(id: number, approve: boolean) {
    setBusyId(id);
    const result = await apiFetch(`/api/requests/${id}/review`, {
      method: 'POST',
      body: { approve, note: notes[id] || undefined },
    });
    setBusyId(null);
    if (result.ok) load();
    else setError(result.error);
  }

  if (profileLoading) {
    return <p className="text-wikisubtle">Loading…</p>;
  }

  if (!token) {
    return <EmptyState message="Log in to see your requests." linkHref="/login" linkLabel="Go to login" />;
  }

  return (
    <div>
      <h1 className="wiki-title font-serif text-3xl">
        {isModerator ? 'Review queue' : 'My requests'}
      </h1>
      <p className="mt-1 text-sm text-wikisubtle">
        {isModerator ? 'Pending changes from everyone' : 'Your submitted changes'}
      </p>

      <div className="mt-4 flex flex-wrap gap-x-4 text-sm">
        {FILTERS.map((status) => (
          <button
            key={status}
            onClick={() => setStatusFilter(status)}
            className={`capitalize ${
              statusFilter === status ? 'font-semibold text-wikitext' : 'text-wikiblue hover:underline'
            }`}
          >
            {status}
          </button>
        ))}
      </div>

      {error ? (
        <p className="mt-6 rounded border border-wikired bg-red-50 p-3 text-sm text-wikired">{error}</p>
      ) : null}

      <div className="mt-6 space-y-4">
        {loading ? (
          <p className="text-wikisubtle">Loading…</p>
        ) : requests.length === 0 ? (
          <p className="text-wikisubtle">Nothing here.</p>
        ) : (
          requests.map((request) => {
            const isOwn = request.requestor_id === profile?.id;
            const busy = busyId === request.id;

            return (
              <div key={request.id} className="rounded border border-wikiborder-light p-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <span className="text-xs uppercase tracking-wide text-wikisubtle">{request.request_type}</span>
                    <h2 className="font-serif text-lg font-semibold">{requestLabel(request)}</h2>
                  </div>
                  <span className={`rounded border px-2.5 py-0.5 text-xs capitalize ${STATUS_STYLES[request.status]}`}>
                    {request.status}
                  </span>
                </div>

                {request.proposed_data?.description ? (
                  <p className="mt-2 line-clamp-2 text-sm text-wikitext">{request.proposed_data.description}</p>
                ) : null}
                {request.reason ? <p className="mt-2 text-sm text-wikisubtle">Reason: {request.reason}</p> : null}
                {request.review_note ? (
                  <p className="mt-2 text-sm text-wikisubtle">Moderator note: {request.review_note}</p>
                ) : null}
                <p className="mt-2 text-xs text-wikisubtle">{new Date(request.created_at).toLocaleString()}</p>

                {request.status === 'pending' && isOwn ? (
                  <button
                    onClick={() => withdraw(request.id)}
                    disabled={busy}
                    className="mt-3 rounded border border-wikiborder px-3 py-1.5 text-sm hover:border-wikired hover:text-wikired disabled:opacity-70"
                  >
                    {busy ? 'Withdrawing…' : 'Withdraw'}
                  </button>
                ) : null}

                {request.status === 'pending' && isModerator ? (
                  <div className="mt-3 space-y-2">
                    <textarea
                      value={notes[request.id] ?? ''}
                      onChange={(event) => setNotes((prev) => ({ ...prev, [request.id]: event.target.value }))}
                      placeholder="Note to the requester (optional)"
                      rows={2}
                      className="w-full rounded border border-wikiborder px-3 py-2 text-sm text-wikitext outline-none focus:border-wikiblue-dark"
                    />
                    <div className="flex gap-3">
                      <button
                        onClick={() => review(request.id, true)}
                        disabled={busy}
                        className="rounded bg-wikiblue px-4 py-1.5 text-sm font-semibold text-white hover:bg-wikiblue-dark disabled:opacity-70"
                      >
                        {busy ? 'Working…' : 'Approve'}
                      </button>
                      <button
                        onClick={() => review(request.id, false)}
                        disabled={busy}
                        className="rounded border border-wikired px-4 py-1.5 text-sm text-wikired hover:bg-red-50 disabled:opacity-70"
                      >
                        Deny
                      </button>
                    </div>
                  </div>
                ) : null}
              </div>
            );
          })
        )}
      </div>

      {isModerator ? (
        <p className="mt-10 text-sm">
          <Link href="/moderation">Manage users</Link>
        </p>
      ) : null}
    </div>
  );
}
