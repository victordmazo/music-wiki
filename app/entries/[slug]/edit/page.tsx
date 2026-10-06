'use client';

import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { apiFetch } from '../../../../lib/api-client';
import { useCurrentProfile } from '../../../../lib/use-current-profile';
import { EntryForm, type EntryFormValues } from '../../../../components/EntryForm';
import type { EntryDetail } from '../../../../lib/types';

export default function EditEntryPage() {
  const { slug } = useParams<{ slug: string }>();
  const router = useRouter();
  const { token, loading: profileLoading } = useCurrentProfile();

  const [entry, setEntry] = useState<EntryDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!slug) return;
    setLoading(true);
    apiFetch<{ entry: EntryDetail }>(`/api/entries/${slug}`).then((result) => {
      setLoading(false);
      if (result.ok) setEntry(result.data.entry);
      else if (result.status === 404) setNotFound(true);
      else setError(result.error);
    });
  }, [slug]);

  if (profileLoading || loading) {
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
          <p className="text-slate-300">Log in to suggest an edit.</p>
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

  async function handleSubmit(values: EntryFormValues) {
    setSubmitting(true);
    setError('');
    const result = await apiFetch('/api/requests', {
      method: 'POST',
      body: {
        request_type: 'edit',
        entry_id: entry!.id,
        proposed_data: {
          title: values.title,
          description: values.description,
          location: values.location || null,
          genre_ids: values.genreIds,
          images: values.images,
        },
        reason: values.reason || undefined,
      },
    });
    setSubmitting(false);
    if (result.ok) router.push('/requests');
    else setError(result.error);
  }

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100 px-6 py-12">
      <section className="mx-auto w-full max-w-2xl rounded-3xl border border-slate-800 bg-slate-900/90 p-8 shadow-2xl shadow-black/30">
        <p className="text-sm uppercase tracking-[0.25em] text-emerald-300">Suggest an edit</p>
        <h1 className="mt-2 text-3xl font-semibold">{entry.title}</h1>
        <p className="mt-2 text-slate-300">A moderator reviews this before it's applied.</p>

        {error ? (
          <p className="mt-4 rounded-xl border border-red-800 bg-red-900/30 p-3 text-sm text-red-300">{error}</p>
        ) : null}

        <EntryForm
          initial={{
            title: entry.title,
            description: entry.description,
            location: entry.location ?? '',
            genreIds: entry.genres?.map(({ genre }) => genre.id) ?? [],
            reason: '',
          }}
          existingImages={entry.images}
          submitLabel="Submit edit for review"
          submitting={submitting}
          onSubmit={handleSubmit}
        />

        <p className="mt-6 text-sm text-slate-300">
          <Link href={`/entries/${entry.slug}`} className="text-emerald-300 hover:underline">
            Back to entry
          </Link>
        </p>
      </section>
    </main>
  );
}
