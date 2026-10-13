'use client';

import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { apiFetch } from '../../../lib/api-client';
import { useCurrentProfile } from '../../../lib/use-current-profile';
import type { Discussion, EntryDetail, EntryRevision } from '../../../lib/types';

function describeChange(revision: EntryRevision): string {
  const fields = Object.keys(revision.new_data ?? {});
  if (fields.length === 0) return revision.action;
  return `${revision.action} — changed ${fields.join(', ')}`;
}

export default function EntryDetailPage() {
  const { slug } = useParams<{ slug: string }>();
  const router = useRouter();
  const { token, loading: profileLoading } = useCurrentProfile();

  const [entry, setEntry] = useState<EntryDetail | null>(null);
  const [revisions, setRevisions] = useState<EntryRevision[]>([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [error, setError] = useState('');

  const [requestingDelete, setRequestingDelete] = useState(false);
  const [deleteReason, setDeleteReason] = useState('');
  const [submittingDelete, setSubmittingDelete] = useState(false);
  const [deleteMessage, setDeleteMessage] = useState('');

  const [discussions, setDiscussions] = useState<Discussion[]>([]);
  const [startingDiscussion, setStartingDiscussion] = useState(false);
  const [discussionTitle, setDiscussionTitle] = useState('');
  const [submittingDiscussion, setSubmittingDiscussion] = useState(false);

  useEffect(() => {
    if (!slug) return;
    setLoading(true);
    apiFetch<{ entry: EntryDetail; revisions: EntryRevision[] }>(`/api/entries/${slug}`).then((result) => {
      setLoading(false);
      if (result.ok) {
        setEntry(result.data.entry);
        setRevisions(result.data.revisions);
      } else if (result.status === 404) {
        setNotFound(true);
      } else {
        setError(result.error);
      }
    });
  }, [slug]);

  useEffect(() => {
    if (!entry) return;
    apiFetch<{ discussions: Discussion[] }>(`/api/discussions?entry_id=${entry.id}`).then((result) => {
      if (result.ok) setDiscussions(result.data.discussions);
    });
  }, [entry?.id]);

  async function handleStartDiscussion(event: React.FormEvent) {
    event.preventDefault();
    if (!entry) return;
    setSubmittingDiscussion(true);
    setError('');
    const result = await apiFetch<{ discussion: Discussion }>('/api/discussions', {
      method: 'POST',
      body: { title: discussionTitle, entry_id: entry.id },
    });
    setSubmittingDiscussion(false);
    if (result.ok) router.push(`/discussions/${result.data.discussion.id}`);
    else setError(result.error);
  }

  async function handleRequestDeletion() {
    if (!entry) return;
    setSubmittingDelete(true);
    setDeleteMessage('');
    const result = await apiFetch('/api/requests', {
      method: 'POST',
      body: { request_type: 'delete', entry_id: entry.id, reason: deleteReason || undefined },
    });
    setSubmittingDelete(false);
    if (result.ok) {
      setRequestingDelete(false);
      setDeleteMessage('Deletion request submitted for moderator review.');
    } else {
      setDeleteMessage(result.error);
    }
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center">
        <p className="text-slate-400">Loading…</p>
      </main>
    );
  }

  if (notFound || !entry) {
    return (
      <main className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center px-6">
        <section className="text-center space-y-4">
          <p className="text-slate-300">That entry doesn't exist (or was removed).</p>
          <Link
            href="/entries"
            className="inline-block rounded-full border border-slate-700 bg-slate-800 px-4 py-2 text-sm hover:border-emerald-400 hover:text-emerald-200"
          >
            Back to browse
          </Link>
        </section>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100 px-6 py-12">
      <section className="mx-auto w-full max-w-3xl rounded-3xl border border-slate-800 bg-slate-900/80 p-10 shadow-2xl shadow-black/30">
        {error ? (
          <p className="mb-6 rounded-xl border border-red-800 bg-red-900/30 p-3 text-sm text-red-300">{error}</p>
        ) : null}

        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-4xl font-semibold">{entry.title}</h1>
            {entry.location ? <p className="mt-1 text-slate-400">{entry.location}</p> : null}
          </div>

          {!profileLoading && token ? (
            <div className="flex gap-3">
              <Link
                href={`/entries/${entry.slug}/edit`}
                className="rounded-full border border-slate-700 bg-slate-800 px-4 py-2 text-sm hover:border-emerald-400 hover:text-emerald-200"
              >
                Suggest an edit
              </Link>
              <button
                onClick={() => setRequestingDelete((v) => !v)}
                className="rounded-full border border-red-900 bg-red-950/40 px-4 py-2 text-sm text-red-300 hover:border-red-700"
              >
                Request deletion
              </button>
            </div>
          ) : null}
        </div>

        {entry.genres && entry.genres.length > 0 ? (
          <div className="mt-4 flex flex-wrap gap-2">
            {entry.genres.map(({ genre }) => (
              <span
                key={genre.id}
                className="rounded-full border border-slate-700 bg-slate-800 px-2.5 py-0.5 text-xs text-slate-300"
              >
                {genre.name}
              </span>
            ))}
          </div>
        ) : null}

        <p className="mt-6 whitespace-pre-wrap text-slate-200">{entry.description || 'No description yet.'}</p>

        {entry.images && entry.images.length > 0 ? (
          <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3">
            {entry.images.map((image) => (
              <img
                key={image.id}
                src={image.url}
                alt={image.caption ?? entry.title}
                className="aspect-square w-full rounded-xl object-cover"
              />
            ))}
          </div>
        ) : null}

        {requestingDelete ? (
          <div className="mt-6 rounded-xl border border-red-900 bg-red-950/30 p-4">
            <p className="text-sm text-red-200">
              This asks a moderator to remove the entry. It stays up until they approve it.
            </p>
            <textarea
              value={deleteReason}
              onChange={(event) => setDeleteReason(event.target.value)}
              placeholder="Why should this be removed? (optional)"
              rows={2}
              className="mt-3 w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-slate-100 outline-none transition focus:border-red-400"
            />
            <div className="mt-3 flex gap-3">
              <button
                onClick={handleRequestDeletion}
                disabled={submittingDelete}
                className="rounded-xl bg-red-500 px-4 py-2 text-sm font-semibold text-slate-950 hover:bg-red-400 disabled:opacity-70"
              >
                {submittingDelete ? 'Submitting…' : 'Submit deletion request'}
              </button>
              <button
                onClick={() => setRequestingDelete(false)}
                className="rounded-xl border border-slate-700 bg-slate-800 px-4 py-2 text-sm hover:border-slate-600"
              >
                Cancel
              </button>
            </div>
          </div>
        ) : null}

        {deleteMessage ? <p className="mt-4 text-sm text-slate-300">{deleteMessage}</p> : null}

        <div className="mt-10">
          <div className="flex items-center justify-between gap-3">
            <p className="text-xs uppercase tracking-widest text-slate-400">Discussions</p>
            {!profileLoading && token && !startingDiscussion ? (
              <button
                onClick={() => setStartingDiscussion(true)}
                className="text-xs text-emerald-300 hover:underline"
              >
                + Start a discussion
              </button>
            ) : null}
          </div>

          {startingDiscussion ? (
            <form onSubmit={handleStartDiscussion} className="mt-3 flex gap-2">
              <input
                type="text"
                value={discussionTitle}
                onChange={(event) => setDiscussionTitle(event.target.value)}
                required
                placeholder={`What's up with ${entry.title}?`}
                className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 outline-none transition focus:border-emerald-400"
              />
              <button
                type="submit"
                disabled={submittingDiscussion}
                className="shrink-0 rounded-xl bg-emerald-400 px-4 py-2 text-sm font-semibold text-slate-950 hover:bg-emerald-300 disabled:opacity-70"
              >
                {submittingDiscussion ? 'Starting…' : 'Start'}
              </button>
            </form>
          ) : null}

          {discussions.length === 0 ? (
            <p className="mt-2 text-sm text-slate-500">No discussions about this entry yet.</p>
          ) : (
            <ul className="mt-3 space-y-2">
              {discussions.map((discussion) => (
                <li key={discussion.id}>
                  <Link
                    href={`/discussions/${discussion.id}`}
                    className="block rounded-xl border border-slate-800 bg-slate-900/60 p-3 text-sm text-slate-200 hover:border-emerald-400/60"
                  >
                    {discussion.title}
                    {discussion.author?.username ? (
                      <span className="text-slate-500"> · started by {discussion.author.username}</span>
                    ) : null}
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="mt-10">
          <p className="text-xs uppercase tracking-widest text-slate-400">Edit history</p>
          {revisions.length === 0 ? (
            <p className="mt-2 text-sm text-slate-500">No edits yet.</p>
          ) : (
            <ul className="mt-3 space-y-2">
              {revisions.map((revision) => (
                <li key={revision.id} className="rounded-xl border border-slate-800 bg-slate-900/60 p-3 text-sm">
                  <span className="text-slate-200">{describeChange(revision)}</span>
                  <span className="text-slate-500">
                    {' '}
                    by {revision.editor?.username ?? 'a moderator'} ·{' '}
                    {new Date(revision.created_at).toLocaleString()}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>

        {!profileLoading && !token ? (
          <p className="mt-8 text-sm text-slate-300">
            <Link href="/login" className="text-emerald-300 hover:underline">
              Log in
            </Link>{' '}
            to suggest edits or request deletion.
          </p>
        ) : null}

        <p className="mt-8 text-sm text-slate-300">
          <Link href="/entries" className="text-emerald-300 hover:underline">
            Back to browse
          </Link>
        </p>
      </section>
    </main>
  );
}
