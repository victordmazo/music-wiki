'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { apiFetch } from '../../../lib/api-client';
import { useCurrentProfile } from '../../../lib/use-current-profile';
import { EntryForm, type EntryFormValues } from '../../../components/EntryForm';
import { EmptyState } from '../../../components/wiki/EmptyState';

export default function NewEntryPage() {
  const router = useRouter();
  const { token, loading } = useCurrentProfile();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  if (loading) {
    return <p className="text-wikisubtle">Loading…</p>;
  }

  // Per the proposal: the add/edit feature is not shown to users who aren't logged in.
  if (!token) {
    return <EmptyState message="Log in to add a new entry." linkHref="/login" linkLabel="Go to login" />;
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
    <div className="mx-auto max-w-2xl">
      <h1 className="wiki-title font-serif text-3xl">Propose a new band or artist</h1>
      <p className="mt-2 text-sm text-wikisubtle">A moderator reviews this before it goes live.</p>

      {error ? (
        <p className="mt-4 rounded border border-wikired bg-red-50 p-3 text-sm text-wikired">{error}</p>
      ) : null}

      <EntryForm
        initial={{ title: '', description: '', location: '', genreIds: [], reason: '' }}
        submitLabel="Submit for review"
        submitting={submitting}
        onSubmit={handleSubmit}
      />
    </div>
  );
}
