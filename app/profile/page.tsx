'use client';

import { useEffect, useRef, useState } from 'react';
import { useCurrentProfile } from '../../lib/use-current-profile';
import { EmptyState } from '../../components/wiki/EmptyState';

export default function ProfilePage() {
  const { token, profile, loading, setProfile } = useCurrentProfile();

  const [error, setError] = useState('');
  const [editing, setEditing] = useState(false);
  const [biography, setBiography] = useState('');
  const [saving, setSaving] = useState(false);

  const [creating, setCreating] = useState(false);
  const [newUsername, setNewUsername] = useState('');
  const [newBiography, setNewBiography] = useState('');

  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (profile) setBiography(profile.biography);
  }, [profile]);

  async function handleCreate(event: React.FormEvent) {
    event.preventDefault();
    if (!token) return;
    setCreating(true);
    const res = await fetch('/api/profile', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ username: newUsername, biography: newBiography }),
    });
    const data = await res.json();
    setCreating(false);
    if (res.ok) setProfile(data.profile);
    else setError(data.error || 'Failed to create profile.');
  }

  async function handleSave() {
    if (!token) return;
    setSaving(true);
    const res = await fetch('/api/profile', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ biography }),
    });
    const data = await res.json();
    setSaving(false);
    if (res.ok) {
      setProfile(data.profile);
      setEditing(false);
    } else {
      setError(data.error || 'Failed to save.');
    }
  }

  async function handleAvatarChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file || !token) return;
    setUploading(true);
    const formData = new FormData();
    formData.append('image', file);
    const res = await fetch('/api/profile/avatar', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: formData,
    });
    const data = await res.json();
    setUploading(false);
    if (res.ok) setProfile(data.profile);
    else setError(data.error || 'Failed to upload image.');
    event.target.value = '';
  }

  if (loading) {
    return <p className="text-wikisubtle">Loading…</p>;
  }

  if (!token) {
    return (
      <EmptyState message="You must be logged in to view your profile." linkHref="/login" linkLabel="Go to login" />
    );
  }

  return (
    <div className="mx-auto max-w-md">
      <h1 className="wiki-title font-serif text-3xl">Profile</h1>

      {error ? (
        <p className="mt-4 rounded border border-wikired bg-red-50 p-3 text-sm text-wikired">{error}</p>
      ) : null}

      {profile === null ? (
        <>
          <p className="mt-4 text-sm text-wikitext">Create your profile to start editing and commenting.</p>
          <form onSubmit={handleCreate} className="mt-4 space-y-4">
            <label className="block text-sm text-wikitext">
              Username
              <input
                type="text"
                value={newUsername}
                onChange={(event) => setNewUsername(event.target.value)}
                required
                className="mt-1 w-full rounded border border-wikiborder px-3 py-2 text-sm outline-none focus:border-wikiblue-dark"
                placeholder="your_username"
              />
            </label>
            <label className="block text-sm text-wikitext">
              Biography
              <textarea
                value={newBiography}
                onChange={(event) => setNewBiography(event.target.value)}
                rows={3}
                className="mt-1 w-full rounded border border-wikiborder px-3 py-2 text-sm outline-none focus:border-wikiblue-dark"
                placeholder="Tell us about yourself…"
              />
            </label>
            <button
              type="submit"
              disabled={creating}
              className="w-full rounded bg-wikiblue px-4 py-2 text-sm font-semibold text-white hover:bg-wikiblue-dark disabled:opacity-70"
            >
              {creating ? 'Creating…' : 'Create profile'}
            </button>
          </form>
        </>
      ) : (
        <>
          <div className="mt-4 flex flex-col items-center gap-3">
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              className="group relative h-24 w-24 overflow-hidden rounded-full border border-wikiborder bg-wikigray disabled:opacity-70"
              title="Change profile photo"
            >
              {profile.avatar_url ? (
                <img src={profile.avatar_url} alt="Avatar" className="h-full w-full object-cover" />
              ) : (
                <span className="text-3xl font-semibold text-wikisubtle">{profile.username[0].toUpperCase()}</span>
              )}
              <span className="absolute inset-0 flex items-center justify-center bg-black/50 text-xs text-white opacity-0 transition group-hover:opacity-100">
                {uploading ? 'Uploading…' : 'Change photo'}
              </span>
            </button>
            <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarChange} />
            <h2 className="font-serif text-2xl font-semibold">{profile.username}</h2>
            {profile.role === 'moderator' ? (
              <span className="rounded-full border border-wikiborder bg-wikigray px-2.5 py-0.5 text-xs text-wikisubtle">
                moderator
              </span>
            ) : null}
          </div>

          <div className="mt-6">
            <p className="text-xs uppercase tracking-wide text-wikisubtle">Biography</p>
            {editing ? (
              <div className="mt-2 space-y-3">
                <textarea
                  value={biography}
                  onChange={(event) => setBiography(event.target.value)}
                  rows={4}
                  className="w-full rounded border border-wikiborder px-3 py-2 text-sm outline-none focus:border-wikiblue-dark"
                />
                <div className="flex gap-3">
                  <button
                    onClick={handleSave}
                    disabled={saving}
                    className="rounded bg-wikiblue px-4 py-2 text-sm font-semibold text-white hover:bg-wikiblue-dark disabled:opacity-70"
                  >
                    {saving ? 'Saving…' : 'Save'}
                  </button>
                  <button
                    onClick={() => {
                      setEditing(false);
                      setBiography(profile.biography);
                    }}
                    className="rounded border border-wikiborder px-4 py-2 text-sm hover:bg-wikigray"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <div className="mt-2">
                <p className="text-wikitext">{profile.biography || 'No biography yet.'}</p>
                <button
                  onClick={() => setEditing(true)}
                  className="mt-3 rounded border border-wikiborder px-4 py-2 text-sm hover:bg-wikigray"
                >
                  Edit biography
                </button>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
