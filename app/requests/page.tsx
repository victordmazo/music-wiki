'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { apiFetch } from '../../lib/api-client';
import { useCurrentProfile } from '../../lib/use-current-profile';
import type { ChangeRequest, RequestStatus } from '../../lib/types';

const STATUS_STYLES: Record<RequestStatus, string> = {
  pending: 'border-amber-700 bg-amber-900/30 text-amber-300',
  approved: 'border-emerald-700 bg-emerald-900/30 text-emerald-300',
  denied: 'border-red-800 bg-red-900/30 text-red-300',
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
    return (
      <main className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center">
        <p className="text-slate-400">Loading…</p>
      </main>
    );
  }

  if (!token) {
    return (
      <main className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center px-6">
        <section className="text-center space-y-4">
          <p className="text-slate-300">Log in to see your requests.</p>
          <Link
            href="/login"
            className="inline-block rounded-full border border-slate-700 bg-slate-800 px-4 py-2 text-sm hover:border-emerald-400 hover:text-emerald-200"
          >
            Go to login
          </Link>
        </section>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100 px-6 py-12">
      <section className="mx-auto w-full max-w-3xl">
        <p className="text-sm uppercase tracking-[0.25em] text-emerald-300">
          {isModerator ? 'Review queue' : 'My requests'}
        </p>
        <h1 className="mt-2 text-3xl font-semibold">
          {isModerator ? 'Pending changes from everyone' : 'Your submitted changes'}
        </h1>

        <div className="mt-6 flex gap-2">
          {FILTERS.map((status) => (
            <button
              key={status}
              onClick={() => setStatusFilter(status)}
              className={`rounded-full border px-3 py-1 text-sm capitalize transition ${
                statusFilter === status
                  ? 'border-emerald-400 bg-emerald-400/10 text-emerald-200'
                  : 'border-slate-700 bg-slate-800 text-slate-300 hover:border-slate-600'
              }`}
            >
              {status}
            </button>
          ))}
        </div>

        {error ? (
          <p className="mt-6 rounded-xl border border-red-800 bg-red-900/30 p-3 text-sm text-red-300">{error}</p>
        ) : null}

        <div className="mt-6 space-y-4">
          {loading ? (
            <p className="text-slate-400">Loading…</p>
          ) : requests.length === 0 ? (
            <p className="text-slate-400">Nothing here.</p>
          ) : (
            requests.map((request) => {
              const isOwn = request.requestor_id === profile?.id;
              const busy = busyId === request.id;

              return (
                <div key={request.id} className="rounded-2xl border border-slate-800 bg-slate-900/80 p-5">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <span className="text-xs uppercase tracking-widest text-slate-500">{request.request_type}</span>
                      <h2 className="text-lg font-semibold">{requestLabel(request)}</h2>
                    </div>
                    <span className={`rounded-full border px-3 py-1 text-xs capitalize ${STATUS_STYLES[request.status]}`}>
                      {request.status}
                    </span>
                  </div>

                  {request.proposed_data?.description ? (
                    <p className="mt-2 line-clamp-2 text-sm text-slate-300">{request.proposed_data.description}</p>
                  ) : null}
                  {request.reason ? <p className="mt-2 text-sm text-slate-400">Reason: {request.reason}</p> : null}
                  {request.review_note ? (
                    <p className="mt-2 text-sm text-slate-400">Moderator note: {request.review_note}</p>
                  ) : null}
                  <p className="mt-2 text-xs text-slate-500">{new Date(request.created_at).toLocaleString()}</p>

                  {request.status === 'pending' && isOwn ? (
                    <button
                      onClick={() => withdraw(request.id)}
                      disabled={busy}
                      className="mt-4 rounded-full border border-slate-700 bg-slate-800 px-4 py-2 text-sm hover:border-red-700 hover:text-red-300 disabled:opacity-70"
                    >
                      {busy ? 'Withdrawing…' : 'Withdraw'}
                    </button>
                  ) : null}

                  {request.status === 'pending' && isModerator ? (
                    <div className="mt-4 space-y-3">
                      <textarea
                        value={notes[request.id] ?? ''}
                        onChange={(event) => setNotes((prev) => ({ ...prev, [request.id]: event.target.value }))}
                        placeholder="Note to the requester (optional)"
                        rows={2}
                        className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-2 text-sm text-slate-100 outline-none transition focus:border-emerald-400"
                      />
                      <div className="flex gap-3">
                        <button
                          onClick={() => review(request.id, true)}
                          disabled={busy}
                          className="rounded-full bg-emerald-400 px-4 py-2 text-sm font-semibold text-slate-950 hover:bg-emerald-300 disabled:opacity-70"
                        >
                          {busy ? 'Working…' : 'Approve'}
                        </button>
                        <button
                          onClick={() => review(request.id, false)}
                          disabled={busy}
                          className="rounded-full border border-red-800 bg-red-950/40 px-4 py-2 text-sm text-red-300 hover:border-red-700 disabled:opacity-70"
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

        <p className="mt-10 text-sm text-slate-300">
          <Link href="/entries" className="text-emerald-300 hover:underline">
            Back to browse
          </Link>
        </p>
      </section>
    </main>
  );
}
