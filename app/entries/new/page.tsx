'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { apiFetch } from '../../../lib/api-client';
import { useCurrentProfile } from '../../../lib/use-current-profile';
import { EntryForm, type EntryFormValues } from '../../../components/EntryForm';

export default function NewEntryPage() {
  const router = useRouter();
  const { token, loading } = useCurrentProfile();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  if (loading) {
    return (
      <main className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center">
        <p className="text-slate-400">Loading…</p>
      </main>
    );
  }

  // Per the proposal: the add/edit feature is not shown to users who aren't logged in.
  if (!token) {
    return (
      <main className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center px-6">
        <section className="text-center space-y-4">
          <p className="text-slate-300">Log in to add a new entry.</p>
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

  async function handleSubmit(values: EntryFormValues) {
    setSubmitting(true);
    setError('');
    const result = await apiFetch('/api/requests', {
      method: 'POST',
      body: {
        request_type: 'create',
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
        <p className="text-sm uppercase tracking-[0.25em] text-emerald-300">Add an entry</p>
        <h1 className="mt-2 text-3xl font-semibold">Propose a new band or artist</h1>
        <p className="mt-2 text-slate-300">A moderator reviews this before it goes live.</p>

        {error ? (
          <p className="mt-4 rounded-xl border border-red-800 bg-red-900/30 p-3 text-sm text-red-300">{error}</p>
        ) : null}

        <EntryForm
          initial={{ title: '', description: '', location: '', genreIds: [], reason: '' }}
          submitLabel="Submit for review"
          submitting={submitting}
          onSubmit={handleSubmit}
        />

        <p className="mt-6 text-sm text-slate-300">
          <Link href="/entries" className="text-emerald-300 hover:underline">
            Back to browse
          </Link>
        </p>
      </section>
    </main>
  );
}
