'use client';

import Link from 'next/link';
import { Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { apiFetch } from '../../lib/api-client';
import { useCurrentProfile } from '../../lib/use-current-profile';
import type { Discussion } from '../../lib/types';

function DiscussionsPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const entryIdRaw = searchParams.get('entry_id');
  // A malformed entry_id (e.g. a hand-edited URL) just falls back to "no filter"
  // instead of sending an invalid value to the API or silently dropping the
  // association when starting a new discussion.
  const entryId = entryIdRaw !== null && Number.isInteger(Number(entryIdRaw)) ? Number(entryIdRaw) : null;
  const { token, loading: profileLoading } = useCurrentProfile();

  const [discussions, setDiscussions] = useState<Discussion[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [creating, setCreating] = useState(false);
  const [title, setTitle] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    setLoading(true);
    const query = entryId !== null ? `?entry_id=${entryId}` : '';
    apiFetch<{ discussions: Discussion[] }>(`/api/discussions${query}`).then((result) => {
      setLoading(false);
      if (result.ok) setDiscussions(result.data.discussions);
      else setError(result.error);
    });
  }, [entryId]);

  async function handleCreate(event: React.FormEvent) {
    event.preventDefault();
    setSubmitting(true);
    setError('');
    const result = await apiFetch<{ discussion: Discussion }>('/api/discussions', {
      method: 'POST',
      body: { title, entry_id: entryId ?? undefined },
    });
    setSubmitting(false);
    if (result.ok) router.push(`/discussions/${result.data.discussion.id}`);
    else setError(result.error);
  }

  const entryTitle = entryId !== null ? discussions[0]?.entry?.title : null;

  return (
    <div>
      <h1 className="wiki-title font-serif text-3xl">Discussions</h1>
      <p className="mt-1 text-sm text-wikisubtle">
        {entryId !== null ? (
          <>
            Filtered to{entryTitle ? ` discussions about ${entryTitle}` : ' one entry'} —{' '}
            <Link href="/discussions">view all discussions</Link>
          </>
        ) : (
          'What people are talking about'
        )}
      </p>

      {!profileLoading && token ? (
        <button
          onClick={() => setCreating((v) => !v)}
          className="mt-4 text-sm text-wikiblue hover:underline"
        >
          + Start a discussion
        </button>
      ) : null}

      {creating ? (
        <form onSubmit={handleCreate} className="mt-3 flex gap-2">
          <input
            type="text"
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            required
            placeholder="What's this about?"
            className="w-full rounded border border-wikiborder px-3 py-2 text-sm text-wikitext outline-none focus:border-wikiblue-dark"
          />
          <button
            type="submit"
            disabled={submitting}
            className="shrink-0 rounded bg-wikiblue px-4 py-2 text-sm font-semibold text-white hover:bg-wikiblue-dark disabled:opacity-70"
          >
            {submitting ? 'Starting…' : 'Start'}
          </button>
        </form>
      ) : null}

      {error ? (
        <p className="mt-6 rounded border border-wikired bg-red-50 p-3 text-sm text-wikired">{error}</p>
      ) : null}

      <ul className="mt-6 divide-y divide-wikiborder-light border-t border-wikiborder-light">
        {loading ? (
          <li className="py-4 text-wikisubtle">Loading…</li>
        ) : discussions.length === 0 ? (
          <li className="py-4 text-wikisubtle">No discussions yet.</li>
        ) : (
          discussions.map((discussion) => (
            <li key={discussion.id} className="py-3">
              <Link href={`/discussions/${discussion.id}`} className="text-lg">
                {discussion.title}
              </Link>
              <p className="mt-1 text-sm text-wikisubtle">
                {discussion.entry ? `About ${discussion.entry.title}` : 'General discussion'}
                {discussion.author?.username ? ` · started by ${discussion.author.username}` : ''}
              </p>
            </li>
          ))
        )}
      </ul>
    </div>
  );
}

export default function DiscussionsPage() {
  return (
    <Suspense fallback={<p className="text-wikisubtle">Loading…</p>}>
      <DiscussionsPageContent />
    </Suspense>
  );
}
