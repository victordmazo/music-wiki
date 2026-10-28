'use client';

import { useParams, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { apiFetch } from '../../../../lib/api-client';
import { useCurrentProfile } from '../../../../lib/use-current-profile';
import { EntryForm, type EntryFormValues } from '../../../../components/EntryForm';
import { EntryTabs } from '../../../../components/wiki/EntryTabs';
import { EmptyState } from '../../../../components/wiki/EmptyState';
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
    return <p className="text-wikisubtle">Loading…</p>;
  }

  if (!token) {
    return <EmptyState message="Log in to suggest an edit." linkHref="/login" linkLabel="Go to login" />;
  }

  if (notFound || !entry) {
    return (
      <EmptyState
        message="That entry doesn't exist (or was removed)."
        linkHref="/entries"
        linkLabel="Back to browse"
      />
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
    <div className="mx-auto max-w-2xl">
      <EntryTabs slug={entry.slug} entryId={entry.id} active="edit" />

      <h1 className="wiki-title font-serif text-3xl">Editing {entry.title}</h1>
      <p className="mt-2 text-sm text-wikisubtle">A moderator reviews this before it's applied.</p>

      {error ? (
        <p className="mt-4 rounded border border-wikired bg-red-50 p-3 text-sm text-wikired">{error}</p>
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
    </div>
  );
}
