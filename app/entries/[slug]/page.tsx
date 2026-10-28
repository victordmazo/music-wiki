'use client';

import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { apiFetch } from '../../../lib/api-client';
import { useCurrentProfile } from '../../../lib/use-current-profile';
import { EntryTabs } from '../../../components/wiki/EntryTabs';
import { EmptyState } from '../../../components/wiki/EmptyState';
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
    return <p className="text-wikisubtle">Loading…</p>;
  }

  if (notFound || !entry) {
    return (
      <EmptyState
        message="There is currently no text in this page. (That entry doesn't exist, or was removed.)"
        linkHref="/entries"
        linkLabel="Back to browse"
      />
    );
  }

  return (
    <div>
      <EntryTabs slug={entry.slug} entryId={entry.id} active="read" />

      {error ? (
        <p className="mb-4 rounded border border-wikired bg-red-50 p-3 text-sm text-wikired">{error}</p>
      ) : null}

      <h1 className="wiki-title font-serif text-4xl">{entry.title}</h1>

      <div className="float-right mb-4 ml-6 w-full max-w-[16rem] rounded border border-wikiborder bg-wikigray text-sm">
        {entry.images && entry.images.length > 0 ? (
          <img
            src={entry.images[0].url}
            alt={entry.images[0].caption ?? entry.title}
            className="w-full rounded-t object-cover"
          />
        ) : null}
        <table className="w-full border-collapse">
          <tbody>
            <tr className="border-t border-wikiborder-light">
              <th className="w-1/3 bg-slate-100 px-2 py-1.5 text-left align-top font-semibold">Location</th>
              <td className="px-2 py-1.5">{entry.location || '—'}</td>
            </tr>
            <tr className="border-t border-wikiborder-light">
              <th className="bg-slate-100 px-2 py-1.5 text-left align-top font-semibold">Genres</th>
              <td className="px-2 py-1.5">
                {entry.genres && entry.genres.length > 0 ? entry.genres.map(({ genre }) => genre.name).join(', ') : '—'}
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <div className="mb-4 inline-block rounded border border-wikiborder-light bg-wikigray p-3 text-sm">
        <p className="font-semibold">Contents</p>
        <ol className="mt-1 list-decimal space-y-0.5 pl-4">
          <li>
            <a href="#description">Description</a>
          </li>
          {entry.images && entry.images.length > 0 ? (
            <li>
              <a href="#photos">Photos</a>
            </li>
          ) : null}
          <li>
            <a href="#discussions">Discussions</a>
          </li>
          <li>
            <a href="#history">Edit history</a>
          </li>
        </ol>
      </div>

      <h2 id="description" className="wiki-title font-serif text-xl">
        Description
      </h2>
      <p className="mt-2 whitespace-pre-wrap text-wikitext">{entry.description || 'No description yet.'}</p>

      {!profileLoading && token ? (
        <p className="mt-4 text-sm">
          <Link href={`/entries/${entry.slug}/edit`}>Suggest an edit</Link>
          {' · '}
          <button onClick={() => setRequestingDelete((v) => !v)} className="text-wikired hover:underline">
            Request deletion
          </button>
        </p>
      ) : null}

      {requestingDelete ? (
        <div className="mt-4 rounded border border-wikired bg-red-50 p-4">
          <p className="text-sm text-wikitext">
            This asks a moderator to remove the entry. It stays up until they approve it.
          </p>
          <textarea
            value={deleteReason}
            onChange={(event) => setDeleteReason(event.target.value)}
            placeholder="Why should this be removed? (optional)"
            rows={2}
            className="mt-3 w-full rounded border border-wikiborder px-3 py-2 text-sm text-wikitext outline-none focus:border-wikired"
          />
          <div className="mt-3 flex gap-3">
            <button
              onClick={handleRequestDeletion}
              disabled={submittingDelete}
              className="rounded bg-wikired px-4 py-2 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-70"
            >
              {submittingDelete ? 'Submitting…' : 'Submit deletion request'}
            </button>
            <button
              onClick={() => setRequestingDelete(false)}
              className="rounded border border-wikiborder px-4 py-2 text-sm hover:bg-wikigray"
            >
              Cancel
            </button>
          </div>
        </div>
      ) : null}

      {deleteMessage ? <p className="mt-4 text-sm text-wikitext">{deleteMessage}</p> : null}

      {entry.images && entry.images.length > 0 ? (
        <div className="clear-both pt-4">
          <h2 id="photos" className="wiki-title font-serif text-xl">
            Photos
          </h2>
          <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3">
            {entry.images.map((image) => (
              <figure key={image.id}>
                <img src={image.url} alt={image.caption ?? entry.title} className="aspect-square w-full rounded border border-wikiborder-light object-cover" />
                {image.caption ? <figcaption className="mt-1 text-xs text-wikisubtle">{image.caption}</figcaption> : null}
              </figure>
            ))}
          </div>
        </div>
      ) : null}

      {/* clear-both here too: covers the no-photos case, where Photos above is skipped
          entirely and Discussions is the first element after the floated infobox. */}
      <h2 id="discussions" className="wiki-title clear-both mt-8 font-serif text-xl">
        Discussions
      </h2>
      <div className="mt-2 flex items-center justify-between gap-3">
        <p className="text-sm text-wikisubtle">Talk about this entry.</p>
        {!profileLoading && token && !startingDiscussion ? (
          <button onClick={() => setStartingDiscussion(true)} className="text-sm text-wikiblue hover:underline">
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
            className="w-full rounded border border-wikiborder px-3 py-2 text-sm text-wikitext outline-none focus:border-wikiblue-dark"
          />
          <button
            type="submit"
            disabled={submittingDiscussion}
            className="shrink-0 rounded bg-wikiblue px-4 py-2 text-sm font-semibold text-white hover:bg-wikiblue-dark disabled:opacity-70"
          >
            {submittingDiscussion ? 'Starting…' : 'Start'}
          </button>
        </form>
      ) : null}

      {discussions.length === 0 ? (
        <p className="mt-2 text-sm text-wikisubtle">No discussions about this entry yet.</p>
      ) : (
        <ul className="mt-3 divide-y divide-wikiborder-light border-t border-wikiborder-light text-sm">
          {discussions.map((discussion) => (
            <li key={discussion.id} className="py-2">
              <Link href={`/discussions/${discussion.id}`}>{discussion.title}</Link>
              {discussion.author?.username ? (
                <span className="text-wikisubtle"> · started by {discussion.author.username}</span>
              ) : null}
            </li>
          ))}
        </ul>
      )}

      <h2 id="history" className="wiki-title mt-8 font-serif text-xl">
        Edit history
      </h2>
      {revisions.length === 0 ? (
        <p className="mt-2 text-sm text-wikisubtle">No edits yet.</p>
      ) : (
        <ul className="mt-3 divide-y divide-wikiborder-light border-t border-wikiborder-light text-sm">
          {revisions.map((revision) => (
            <li key={revision.id} className="py-2">
              <span className="text-wikitext">{describeChange(revision)}</span>
              <span className="text-wikisubtle">
                {' '}
                by {revision.editor?.username ?? 'a moderator'} · {new Date(revision.created_at).toLocaleString()}
              </span>
            </li>
          ))}
        </ul>
      )}

      {!profileLoading && !token ? (
        <p className="mt-8 text-sm text-wikitext">
          <Link href="/login">Log in</Link> to suggest edits or request deletion.
        </p>
      ) : null}
    </div>
  );
}
