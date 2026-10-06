'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { apiFetch } from '../../lib/api-client';
import { useGenres } from '../../lib/use-genres';
import { useCurrentProfile } from '../../lib/use-current-profile';
import type { EntrySummary } from '../../lib/types';

export default function EntriesPage() {
  const { token, loading: profileLoading } = useCurrentProfile();
  const genres = useGenres();

  const [entries, setEntries] = useState<EntrySummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [queryInput, setQueryInput] = useState('');
  const [query, setQuery] = useState('');
  const [genreId, setGenreId] = useState<number | null>(null);

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
    <main className="min-h-screen bg-slate-950 text-slate-100 px-6 py-12">
      <section className="mx-auto w-full max-w-4xl">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-sm uppercase tracking-[0.25em] text-emerald-300">NE Scene-pedia</p>
            <h1 className="mt-2 text-3xl font-semibold">Browse bands &amp; artists</h1>
          </div>

          {!profileLoading && token ? (
            <Link
              href="/entries/new"
              className="rounded-full bg-emerald-400 px-4 py-2 text-sm font-semibold text-slate-950 hover:bg-emerald-300"
            >
              + Add a new entry
            </Link>
          ) : null}
        </div>

        <form
          onSubmit={(event) => {
            event.preventDefault();
            setQuery(queryInput.trim());
          }}
          className="mt-8 flex gap-3"
        >
          <input
            type="text"
            value={queryInput}
            onChange={(event) => setQueryInput(event.target.value)}
            placeholder="Search by name, description, or town…"
            className="w-full rounded-xl border border-slate-700 bg-slate-900 px-4 py-3 text-slate-100 outline-none transition focus:border-emerald-400"
          />
          <button
            type="submit"
            className="shrink-0 rounded-xl border border-slate-700 bg-slate-800 px-5 py-3 text-sm hover:border-emerald-400 hover:text-emerald-200"
          >
            Search
          </button>
        </form>

        <div className="mt-4 flex flex-wrap gap-2">
          <button
            onClick={() => setGenreId(null)}
            className={`rounded-full border px-3 py-1 text-sm transition ${
              genreId === null
                ? 'border-emerald-400 bg-emerald-400/10 text-emerald-200'
                : 'border-slate-700 bg-slate-800 text-slate-300 hover:border-slate-600'
            }`}
          >
            All genres
          </button>
          {genres.map((genre) => (
            <button
              key={genre.id}
              onClick={() => setGenreId(genre.id === genreId ? null : genre.id)}
              className={`rounded-full border px-3 py-1 text-sm transition ${
                genre.id === genreId
                  ? 'border-emerald-400 bg-emerald-400/10 text-emerald-200'
                  : 'border-slate-700 bg-slate-800 text-slate-300 hover:border-slate-600'
              }`}
            >
              {genre.name}
            </button>
          ))}
        </div>

        {error ? (
          <p className="mt-6 rounded-xl border border-red-800 bg-red-900/30 p-3 text-sm text-red-300">{error}</p>
        ) : null}

        <div className="mt-8 space-y-3">
          {loading ? (
            <p className="text-slate-400">Loading…</p>
          ) : entries.length === 0 ? (
            <p className="text-slate-400">
              No entries match yet.{' '}
              {token ? (
                <Link href="/entries/new" className="text-emerald-300 hover:underline">
                  Add the first one.
                </Link>
              ) : null}
            </p>
          ) : (
            entries.map((entry) => (
              <Link
                key={entry.id}
                href={`/entries/${entry.slug}`}
                className="block rounded-2xl border border-slate-800 bg-slate-900/80 p-5 transition hover:border-emerald-400/60"
              >
                <div className="flex items-baseline justify-between gap-4">
                  <h2 className="text-xl font-semibold">{entry.title}</h2>
                  {entry.location ? <span className="text-sm text-slate-400">{entry.location}</span> : null}
                </div>
                {entry.description ? (
                  <p className="mt-2 line-clamp-2 text-sm text-slate-300">{entry.description}</p>
                ) : null}
                {entry.genres && entry.genres.length > 0 ? (
                  <div className="mt-3 flex flex-wrap gap-2">
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
              </Link>
            ))
          )}
        </div>

        <p className="mt-10 text-sm text-slate-300">
          <Link href="/" className="text-emerald-300 hover:underline">
            Back to home
          </Link>
        </p>
      </section>
    </main>
  );
}
