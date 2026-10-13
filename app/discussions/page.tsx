'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { apiFetch } from '../../lib/api-client';
import { useCurrentProfile } from '../../lib/use-current-profile';
import type { Discussion } from '../../lib/types';

export default function DiscussionsPage() {
  const router = useRouter();
  const { token, loading: profileLoading } = useCurrentProfile();

  const [discussions, setDiscussions] = useState<Discussion[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [creating, setCreating] = useState(false);
  const [title, setTitle] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    apiFetch<{ discussions: Discussion[] }>('/api/discussions').then((result) => {
      setLoading(false);
      if (result.ok) setDiscussions(result.data.discussions);
      else setError(result.error);
    });
  }, []);

  async function handleCreate(event: React.FormEvent) {
    event.preventDefault();
    setSubmitting(true);
    setError('');
    const result = await apiFetch<{ discussion: Discussion }>('/api/discussions', {
      method: 'POST',
      body: { title },
    });
    setSubmitting(false);
    if (result.ok) router.push(`/discussions/${result.data.discussion.id}`);
    else setError(result.error);
  }

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100 px-6 py-12">
      <section className="mx-auto w-full max-w-3xl">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-sm uppercase tracking-[0.25em] text-emerald-300">Discussions</p>
            <h1 className="mt-2 text-3xl font-semibold">What people are talking about</h1>
          </div>
          {!profileLoading && token ? (
            <button
              onClick={() => setCreating((v) => !v)}
              className="rounded-full bg-emerald-400 px-4 py-2 text-sm font-semibold text-slate-950 hover:bg-emerald-300"
            >
              + Start a discussion
            </button>
          ) : null}
        </div>

        {creating ? (
          <form onSubmit={handleCreate} className="mt-6 flex gap-3">
            <input
              type="text"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              required
              placeholder="What's this about?"
              className="w-full rounded-xl border border-slate-700 bg-slate-900 px-4 py-3 text-slate-100 outline-none transition focus:border-emerald-400"
            />
            <button
              type="submit"
              disabled={submitting}
              className="shrink-0 rounded-xl bg-emerald-400 px-5 py-3 text-sm font-semibold text-slate-950 hover:bg-emerald-300 disabled:opacity-70"
            >
              {submitting ? 'Starting…' : 'Start'}
            </button>
          </form>
        ) : null}

        {error ? (
          <p className="mt-6 rounded-xl border border-red-800 bg-red-900/30 p-3 text-sm text-red-300">{error}</p>
        ) : null}

        <div className="mt-8 space-y-3">
          {loading ? (
            <p className="text-slate-400">Loading…</p>
          ) : discussions.length === 0 ? (
            <p className="text-slate-400">No discussions yet.</p>
          ) : (
            discussions.map((discussion) => (
              <Link
                key={discussion.id}
                href={`/discussions/${discussion.id}`}
                className="block rounded-2xl border border-slate-800 bg-slate-900/80 p-5 transition hover:border-emerald-400/60"
              >
                <h2 className="text-lg font-semibold">{discussion.title}</h2>
                <p className="mt-1 text-sm text-slate-400">
                  {discussion.entry ? `About ${discussion.entry.title}` : 'General discussion'}
                  {discussion.author?.username ? ` · started by ${discussion.author.username}` : ''}
                </p>
              </Link>
            ))
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
