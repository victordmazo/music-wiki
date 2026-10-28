'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { apiFetch } from '../../../lib/api-client';
import { useCurrentProfile } from '../../../lib/use-current-profile';
import { EmptyState } from '../../../components/wiki/EmptyState';
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
    return <p className="text-wikisubtle">Loading…</p>;
  }

  if (notFound || !discussion) {
    return <EmptyState message="That discussion doesn't exist." linkHref="/discussions" linkLabel="Back to discussions" />;
  }

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="wiki-title font-serif text-3xl">{discussion.title}</h1>
      {discussion.entry ? (
        <p className="mt-1 text-sm text-wikisubtle">
          About <Link href={`/entries/${discussion.entry.slug}`}>{discussion.entry.title}</Link>
        </p>
      ) : null}

      {error ? (
        <p className="mt-4 rounded border border-wikired bg-red-50 p-3 text-sm text-wikired">{error}</p>
      ) : null}

      <div className="mt-6 space-y-4">
        {posts.length === 0 ? (
          <p className="text-wikisubtle">No comments yet.</p>
        ) : (
          posts.map((post) => {
            const isOwn = post.author_id === profile?.id;
            const canDelete = isOwn || isModerator;
            const busy = busyId === post.id;

            return (
              <div key={post.id} className="rounded border border-wikiborder-light bg-wikigray p-4">
                <div className="flex items-center justify-between gap-3">
                  <span className="text-sm font-semibold text-wikitext">{post.author?.username ?? 'someone'}</span>
                  <span className="text-xs text-wikisubtle">
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
                      className="w-full rounded border border-wikiborder px-3 py-2 text-sm text-wikitext outline-none focus:border-wikiblue-dark"
                    />
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleSaveEdit(post.id)}
                        disabled={busy}
                        className="rounded bg-wikiblue px-3 py-1.5 text-xs font-semibold text-white hover:bg-wikiblue-dark disabled:opacity-70"
                      >
                        {busy ? 'Saving…' : 'Save'}
                      </button>
                      <button
                        onClick={() => setEditingId(null)}
                        className="rounded border border-wikiborder px-3 py-1.5 text-xs hover:bg-slate-200"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <p className="mt-2 whitespace-pre-wrap text-sm text-wikitext">{post.contents}</p>
                )}

                {editingId !== post.id && token ? (
                  <div className="mt-3 flex gap-3 text-xs">
                    {isOwn ? (
                      <button
                        onClick={() => {
                          setEditingId(post.id);
                          setEditValue(post.contents);
                        }}
                        className="text-wikiblue hover:underline"
                      >
                        Edit
                      </button>
                    ) : null}
                    {canDelete ? (
                      <button
                        onClick={() => handleDelete(post.id)}
                        disabled={busy}
                        className="text-wikired hover:underline disabled:opacity-70"
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
            className="w-full rounded border border-wikiborder px-3 py-2 text-sm text-wikitext outline-none focus:border-wikiblue-dark"
          />
          <button
            type="submit"
            disabled={posting}
            className="rounded bg-wikiblue px-4 py-2 text-sm font-semibold text-white hover:bg-wikiblue-dark disabled:opacity-70"
          >
            {posting ? 'Posting…' : 'Post comment'}
          </button>
        </form>
      ) : !profileLoading ? (
        <p className="mt-8 text-sm text-wikitext">
          <Link href="/login">Log in</Link> to join the discussion.
        </p>
      ) : null}
    </div>
  );
}
