'use client';

import Link from 'next/link';
import { Suspense, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { apiFetch } from '../../lib/api-client';
import { useGenres } from '../../lib/use-genres';
import { useCurrentProfile } from '../../lib/use-current-profile';
import type { EntrySummary } from '../../lib/types';

function EntriesPageContent() {
  const searchParams = useSearchParams();
  const { token, loading: profileLoading } = useCurrentProfile();
  const genres = useGenres();

  const [entries, setEntries] = useState<EntrySummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [queryInput, setQueryInput] = useState('');
  const [query, setQuery] = useState('');
  const [genreId, setGenreId] = useState<number | null>(null);

  // Re-syncs from the URL whenever ?q= changes, including when the header's global
  // search box pushes a new query while this page is already mounted — Next reuses
  // the same component instance on a same-route navigation, so without this the
  // search box would silently do nothing.
  const qParam = searchParams.get('q') ?? '';
  useEffect(() => {
    setQueryInput(qParam);
    setQuery(qParam);
  }, [qParam]);

  useEffect(() => {
    setLoading(true);
    const params = new URLSearchParams();
    if (query) params.set('q', query);
    if (genreId) params.set('genre', String(genreId));

    apiFetch<{ entries: EntrySummary[] }>(`/api/entries?${params.toString()}`).then((result) => {
      setLoading(false);
      if (result.ok) setEntries(result.data.entries);
      else setError(result.error);
    });
  }, [query, genreId]);

  return (
    <div>
      <h1 className="wiki-title font-serif text-3xl">Browse bands &amp; artists</h1>

      <form
        onSubmit={(event) => {
          event.preventDefault();
          setQuery(queryInput.trim());
        }}
        className="mt-4 flex gap-2"
      >
        <input
          type="text"
          value={queryInput}
          onChange={(event) => setQueryInput(event.target.value)}
          placeholder="Search by name, description, or town…"
          className="w-full rounded border border-wikiborder px-3 py-2 text-sm text-wikitext outline-none focus:border-wikiblue-dark"
        />
        <button
          type="submit"
          className="shrink-0 rounded border border-wikiborder bg-wikigray px-4 py-2 text-sm hover:bg-slate-200"
        >
          Search
        </button>
      </form>

      <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-sm">
        <button
          onClick={() => setGenreId(null)}
          className={genreId === null ? 'font-semibold text-wikitext' : 'text-wikiblue hover:underline'}
        >
          All genres
        </button>
        {genres.map((genre) => (
          <button
            key={genre.id}
            onClick={() => setGenreId(genre.id === genreId ? null : genre.id)}
            className={genre.id === genreId ? 'font-semibold text-wikitext' : 'text-wikiblue hover:underline'}
          >
            {genre.name}
          </button>
        ))}
      </div>

      {!profileLoading && token ? (
        <p className="mt-4 text-sm">
          <Link href="/entries/new">+ Add a new entry</Link>
        </p>
      ) : null}

      {error ? (
        <p className="mt-6 rounded border border-wikired bg-red-50 p-3 text-sm text-wikired">{error}</p>
      ) : null}

      <ul className="mt-6 divide-y divide-wikiborder-light border-t border-wikiborder-light">
        {loading ? (
          <li className="py-4 text-wikisubtle">Loading…</li>
        ) : entries.length === 0 ? (
          <li className="py-4 text-wikisubtle">
            No entries match yet. {token ? <Link href="/entries/new">Add the first one.</Link> : null}
          </li>
        ) : (
          entries.map((entry) => (
            <li key={entry.id} className="py-3">
              <Link href={`/entries/${entry.slug}`} className="text-lg">
                {entry.title}
              </Link>
              {entry.location ? <span className="ml-2 text-sm text-wikisubtle">({entry.location})</span> : null}
              {entry.description ? (
                <p className="mt-1 line-clamp-2 text-sm text-wikitext">{entry.description}</p>
              ) : null}
              {entry.genres && entry.genres.length > 0 ? (
                <p className="mt-1 text-xs text-wikisubtle">
                  {entry.genres.map(({ genre }) => genre.name).join(' · ')}
                </p>
              ) : null}
            </li>
          ))
        )}
      </ul>
    </div>
  );
}

export default function EntriesPage() {
  return (
    <Suspense fallback={<p className="text-wikisubtle">Loading…</p>}>
      <EntriesPageContent />
    </Suspense>
  );
}
