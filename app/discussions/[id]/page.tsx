'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { apiFetch } from '../../../lib/api-client';
import { useCurrentProfile } from '../../../lib/use-current-profile';
import type { Discussion, Post } from '../../../lib/types';

export default function DiscussionThreadPage() {
  const { id } = useParams<{ id: string }>();
  const { token, profile, isModerator, loading: profileLoading } = useCurrentProfile();

  const [discussion, setDiscussion] = useState<Discussion | null>(null);
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [error, setError] = useState('');

  const [composerValue, setComposerValue] = useState('');
  const [posting, setPosting] = useState(false);

  const [editingId, setEditingId] = useState<number | null>(null);
  const [editValue, setEditValue] = useState('');
  const [busyId, setBusyId] = useState<number | null>(null);

  function loadPosts() {
    apiFetch<{ posts: Post[] }>(`/api/discussions/${id}/posts`).then((result) => {
      if (result.ok) setPosts(result.data.posts);
    });
  }

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    Promise.all([
      apiFetch<{ discussion: Discussion }>(`/api/discussions/${id}`),
      apiFetch<{ posts: Post[] }>(`/api/discussions/${id}/posts`),
    ]).then(([discussionResult, postsResult]) => {
      setLoading(false);
      if (discussionResult.ok) setDiscussion(discussionResult.data.discussion);
      else if (discussionResult.status === 404) setNotFound(true);
      else setError(discussionResult.error);

      if (postsResult.ok) setPosts(postsResult.data.posts);
    });
  }, [id]);

  async function handlePost(event: React.FormEvent) {
    event.preventDefault();
    setPosting(true);
    setError('');
    const result = await apiFetch(`/api/discussions/${id}/posts`, {
      method: 'POST',
      body: { contents: composerValue },
    });
    setPosting(false);
    if (result.ok) {
      setComposerValue('');
      loadPosts();
    } else {
      setError(result.error);
    }
  }

  async function handleSaveEdit(postId: number) {
    setBusyId(postId);
    const result = await apiFetch(`/api/posts/${postId}`, { method: 'PATCH', body: { contents: editValue } });
    setBusyId(null);
    if (result.ok) {
      setEditingId(null);
      loadPosts();
    } else {
      setError(result.error);
    }
  }

  async function handleDelete(postId: number) {
    setBusyId(postId);
    const result = await apiFetch(`/api/posts/${postId}`, { method: 'DELETE' });
    setBusyId(null);
    if (result.ok) loadPosts();
    else setError(result.error);
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center">
        <p className="text-slate-400">Loading…</p>
      </main>
    );
  }

  if (notFound || !discussion) {
    return (
      <main className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center px-6">
        <section className="text-center space-y-4">
          <p className="text-slate-300">That discussion doesn't exist.</p>
          <Link
            href="/discussions"
            className="inline-block rounded-full border border-slate-700 bg-slate-800 px-4 py-2 text-sm hover:border-emerald-400 hover:text-emerald-200"
          >
            Back to discussions
          </Link>
        </section>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100 px-6 py-12">
      <section className="mx-auto w-full max-w-2xl">
        <p className="text-sm uppercase tracking-[0.25em] text-emerald-300">Discussion</p>
        <h1 className="mt-2 text-3xl font-semibold">{discussion.title}</h1>
        {discussion.entry ? (
          <p className="mt-1 text-sm text-slate-400">
            About{' '}
            <Link href={`/entries/${discussion.entry.slug}`} className="text-emerald-300 hover:underline">
              {discussion.entry.title}
            </Link>
          </p>
        ) : null}

        {error ? (
          <p className="mt-4 rounded-xl border border-red-800 bg-red-900/30 p-3 text-sm text-red-300">{error}</p>
        ) : null}

        <div className="mt-8 space-y-4">
          {posts.length === 0 ? (
            <p className="text-slate-400">No comments yet.</p>
          ) : (
            posts.map((post) => {
              const isOwn = post.author_id === profile?.id;
              const canDelete = isOwn || isModerator;
              const busy = busyId === post.id;

              return (
                <div key={post.id} className="rounded-2xl border border-slate-800 bg-slate-900/80 p-4">
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-sm font-semibold text-slate-200">{post.author?.username ?? 'someone'}</span>
                    <span className="text-xs text-slate-500">
                      {new Date(post.created_at).toLocaleString()}
                      {post.edited_at ? ' (edited)' : ''}
                    </span>
                  </div>

                  {editingId === post.id ? (
                    <div className="mt-2 space-y-2">
                      <textarea
                        value={editValue}
                        onChange={(event) => setEditValue(event.target.value)}
                        rows={2}
                        className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 outline-none transition focus:border-emerald-400"
                      />
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleSaveEdit(post.id)}
                          disabled={busy}
                          className="rounded-full bg-emerald-400 px-3 py-1.5 text-xs font-semibold text-slate-950 hover:bg-emerald-300 disabled:opacity-70"
                        >
                          {busy ? 'Saving…' : 'Save'}
                        </button>
                        <button
                          onClick={() => setEditingId(null)}
                          className="rounded-full border border-slate-700 bg-slate-800 px-3 py-1.5 text-xs hover:border-slate-600"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <p className="mt-2 whitespace-pre-wrap text-sm text-slate-200">{post.contents}</p>
                  )}

                  {editingId !== post.id && token ? (
                    <div className="mt-3 flex gap-3 text-xs">
                      {isOwn ? (
                        <button
                          onClick={() => {
                            setEditingId(post.id);
                            setEditValue(post.contents);
                          }}
                          className="text-slate-400 hover:text-emerald-300"
                        >
                          Edit
                        </button>
                      ) : null}
                      {canDelete ? (
                        <button
                          onClick={() => handleDelete(post.id)}
                          disabled={busy}
                          className="text-slate-400 hover:text-red-300 disabled:opacity-70"
                        >
                          {busy ? 'Deleting…' : 'Delete'}
                        </button>
                      ) : null}
                    </div>
                  ) : null}
                </div>
              );
            })
          )}
        </div>

        {!profileLoading && token ? (
          <form onSubmit={handlePost} className="mt-8 space-y-3">
            <textarea
              value={composerValue}
              onChange={(event) => setComposerValue(event.target.value)}
              required
              rows={3}
              placeholder="Add a comment…"
              className="w-full rounded-xl border border-slate-700 bg-slate-900 px-4 py-3 text-slate-100 outline-none transition focus:border-emerald-400"
            />
            <button
              type="submit"
              disabled={posting}
              className="rounded-xl bg-emerald-400 px-4 py-2 text-sm font-semibold text-slate-950 hover:bg-emerald-300 disabled:opacity-70"
            >
              {posting ? 'Posting…' : 'Post comment'}
            </button>
          </form>
        ) : !profileLoading ? (
          <p className="mt-8 text-sm text-slate-300">
            <Link href="/login" className="text-emerald-300 hover:underline">
              Log in
            </Link>{' '}
            to join the discussion.
          </p>
        ) : null}

        <p className="mt-10 text-sm text-slate-300">
          <Link href="/discussions" className="text-emerald-300 hover:underline">
            Back to discussions
          </Link>
        </p>
      </section>
    </main>
  );
}
