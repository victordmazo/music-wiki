'use client';

import { useState } from 'react';
import { getStoredToken } from '../lib/api-client';
import { useGenres } from '../lib/use-genres';
import { GenrePicker } from './GenrePicker';
import type { EntryImage } from '../lib/types';

export type EntryFormValues = {
  title: string;
  description: string;
  location: string;
  genreIds: number[];
  reason: string;
  images: { storage_path: string; caption: string | null }[];
};

type PendingImage = { path: string; url: string; caption: string };

/** The shared add/edit form: same fields either way, per the proposal's edit/add feature. */
export function EntryForm({
  initial,
  existingImages,
  submitLabel,
  submitting,
  onSubmit,
}: {
  initial: Omit<EntryFormValues, 'images'>;
  existingImages?: EntryImage[];
  submitLabel: string;
  submitting: boolean;
  onSubmit: (values: EntryFormValues) => void;
}) {
  const genres = useGenres();
  const [title, setTitle] = useState(initial.title);
  const [description, setDescription] = useState(initial.description);
  const [location, setLocation] = useState(initial.location);
  const [genreIds, setGenreIds] = useState<number[]>(initial.genreIds);
  const [reason, setReason] = useState(initial.reason);

  const [pendingImages, setPendingImages] = useState<PendingImage[]>([]);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState('');

  async function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;

    setUploading(true);
    setUploadError('');
    const formData = new FormData();
    formData.append('image', file);

    const token = getStoredToken();
    const res = await fetch('/api/entries/images', {
      method: 'POST',
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      body: formData,
    });
    const data = await res.json().catch(() => null);
    setUploading(false);

    if (res.ok) {
      setPendingImages((prev) => [...prev, { path: data.path, url: data.url, caption: '' }]);
    } else {
      setUploadError(data?.error || 'Upload failed.');
    }
  }

  function updateCaption(path: string, caption: string) {
    setPendingImages((prev) => prev.map((image) => (image.path === path ? { ...image, caption } : image)));
  }

  function removePending(path: string) {
    setPendingImages((prev) => prev.filter((image) => image.path !== path));
  }

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        onSubmit({
          title,
          description,
          location,
          genreIds,
          reason,
          images: pendingImages.map(({ path, caption }) => ({ storage_path: path, caption: caption || null })),
        });
      }}
      className="mt-6 space-y-5"
    >
      <label className="block text-sm text-slate-200">
        Title
        <input
          type="text"
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          required
          className="mt-1 w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-slate-100 outline-none transition focus:border-emerald-400"
          placeholder="Band or artist name"
        />
      </label>

      <label className="block text-sm text-slate-200">
        Location
        <input
          type="text"
          value={location}
          onChange={(event) => setLocation(event.target.value)}
          className="mt-1 w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-slate-100 outline-none transition focus:border-emerald-400"
          placeholder="Town, state"
        />
      </label>

      <label className="block text-sm text-slate-200">
        Description
        <textarea
          value={description}
          onChange={(event) => setDescription(event.target.value)}
          rows={6}
          className="mt-1 w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-slate-100 outline-none transition focus:border-emerald-400"
          placeholder="Tell people what this act is about…"
        />
      </label>

      <div>
        <p className="text-sm text-slate-200">Genres</p>
        <div className="mt-2">
          <GenrePicker genres={genres} selected={genreIds} onChange={setGenreIds} />
        </div>
      </div>

      <div>
        <p className="text-sm text-slate-200">Photos</p>

        {existingImages && existingImages.length > 0 ? (
          <div className="mt-2">
            <p className="text-xs text-slate-500">Already on this entry:</p>
            <div className="mt-2 grid grid-cols-3 gap-2 sm:grid-cols-4">
              {existingImages.map((image) => (
                <img key={image.id} src={image.url} alt={image.caption ?? ''} className="aspect-square w-full rounded-lg object-cover opacity-80" />
              ))}
            </div>
          </div>
        ) : null}

        <label className="mt-3 inline-block cursor-pointer rounded-full border border-slate-700 bg-slate-800 px-4 py-2 text-sm hover:border-emerald-400 hover:text-emerald-200">
          {uploading ? 'Uploading…' : '+ Add a photo'}
          <input type="file" accept="image/*" onChange={handleFileChange} disabled={uploading} className="hidden" />
        </label>
        {uploadError ? <p className="mt-2 text-sm text-red-300">{uploadError}</p> : null}

        {pendingImages.length > 0 ? (
          <div className="mt-3 space-y-2">
            {pendingImages.map((image) => (
              <div key={image.path} className="flex items-center gap-3 rounded-xl border border-slate-800 bg-slate-900/60 p-2">
                <img src={image.url} alt="" className="h-16 w-16 rounded-lg object-cover" />
                <input
                  type="text"
                  value={image.caption}
                  onChange={(event) => updateCaption(image.path, event.target.value)}
                  placeholder="Caption (optional)"
                  className="flex-1 rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 outline-none transition focus:border-emerald-400"
                />
                <button
                  type="button"
                  onClick={() => removePending(image.path)}
                  className="shrink-0 rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-xs text-slate-300 hover:border-red-700 hover:text-red-300"
                >
                  Remove
                </button>
              </div>
            ))}
          </div>
        ) : null}
      </div>

      <label className="block text-sm text-slate-200">
        Note to the moderator (optional)
        <textarea
          value={reason}
          onChange={(event) => setReason(event.target.value)}
          rows={2}
          className="mt-1 w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-slate-100 outline-none transition focus:border-emerald-400"
          placeholder="Why this change, or where the info came from…"
        />
      </label>

      <button
        type="submit"
        disabled={submitting || uploading}
        className="w-full rounded-xl bg-emerald-400 px-4 py-3 font-semibold text-slate-950 transition hover:bg-emerald-300 disabled:cursor-not-allowed disabled:opacity-70"
      >
        {submitting ? 'Submitting…' : submitLabel}
      </button>
    </form>
  );
}
