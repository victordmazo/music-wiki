import { beforeEach, describe, expect, it, vi } from 'vitest';
import { authHeaders, createSupabaseMock, ok } from './test-utils';

vi.mock('../../lib/supabase', () => ({ getSupabaseClient: vi.fn() }));

import { getSupabaseClient } from '../../lib/supabase';
import { PATCH as editPost, DELETE as deletePost } from '../../app/api/posts/[id]/route';

const mockGetSupabaseClient = vi.mocked(getSupabaseClient);

const ALICE = { id: 'alice-id' };
const BOB = { id: 'bob-id' };
const MOD = { id: 'mod-id' };
const aliceProfile = { id: 'alice-id', username: 'alice', role: 'user', status: 'active', suspended_until: null };
const bobProfile = { id: 'bob-id', username: 'bob', role: 'user', status: 'active', suspended_until: null };
const modProfile = { id: 'mod-id', username: 'themod', role: 'moderator', status: 'active', suspended_until: null };

describe('PATCH /api/posts/:id', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('requires contents', async () => {
    mockGetSupabaseClient.mockReturnValue(
      createSupabaseMock({ user: ALICE, fromQueue: [ok(aliceProfile)] }) as never
    );

    const response = await editPost(
      new Request('http://localhost/api/posts/1', {
        method: 'PATCH',
        headers: authHeaders(),
        body: JSON.stringify({ contents: '' }),
      }),
      { params: Promise.resolve({ id: '1' }) }
    );

    expect(response.status).toBe(400);
  });

  it('404s when editing a comment that is not the caller\'s', async () => {
    mockGetSupabaseClient.mockReturnValue(
      createSupabaseMock({ user: BOB, fromQueue: [ok(bobProfile), ok(null)] }) as never
    );

    const response = await editPost(
      new Request('http://localhost/api/posts/1', {
        method: 'PATCH',
        headers: authHeaders(),
        body: JSON.stringify({ contents: 'nope' }),
      }),
      { params: Promise.resolve({ id: '1' }) }
    );

    expect(response.status).toBe(404);
  });

  it('lets the author edit their own comment', async () => {
    const updated = { id: 1, discussion_id: 1, author_id: 'alice-id', contents: 'edited', created_at: 'now', edited_at: 'now' };
    mockGetSupabaseClient.mockReturnValue(
      createSupabaseMock({ user: ALICE, fromQueue: [ok(aliceProfile), ok(updated)] }) as never
    );

    const response = await editPost(
      new Request('http://localhost/api/posts/1', {
        method: 'PATCH',
        headers: authHeaders(),
        body: JSON.stringify({ contents: 'edited' }),
      }),
      { params: Promise.resolve({ id: '1' }) }
    );

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ post: updated });
  });
});

describe('DELETE /api/posts/:id', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('lets an author delete their own comment', async () => {
    mockGetSupabaseClient.mockReturnValue(
      createSupabaseMock({
        user: ALICE,
        fromQueue: [ok(aliceProfile), ok({ id: 1, author_id: 'alice-id', author: { role: 'user' } }), ok(null)],
      }) as never
    );

    const response = await deletePost(
      new Request('http://localhost/api/posts/1', { method: 'DELETE', headers: authHeaders() }),
      { params: Promise.resolve({ id: '1' }) }
    );

    expect(response.status).toBe(200);
  });

  it('blocks a regular user from deleting someone else\'s comment', async () => {
    mockGetSupabaseClient.mockReturnValue(
      createSupabaseMock({
        user: BOB,
        fromQueue: [ok(bobProfile), ok({ id: 1, author_id: 'alice-id', author: { role: 'user' } })],
      }) as never
    );

    const response = await deletePost(
      new Request('http://localhost/api/posts/1', { method: 'DELETE', headers: authHeaders() }),
      { params: Promise.resolve({ id: '1' }) }
    );

    expect(response.status).toBe(403);
  });

  it('lets a moderator delete a regular user\'s comment', async () => {
    mockGetSupabaseClient.mockReturnValue(
      createSupabaseMock({
        user: MOD,
        fromQueue: [ok(modProfile), ok({ id: 1, author_id: 'alice-id', author: { role: 'user' } }), ok(null)],
      }) as never
    );

    const response = await deletePost(
      new Request('http://localhost/api/posts/1', { method: 'DELETE', headers: authHeaders() }),
      { params: Promise.resolve({ id: '1' }) }
    );

    expect(response.status).toBe(200);
  });

  it('blocks a moderator from deleting another moderator\'s comment', async () => {
    mockGetSupabaseClient.mockReturnValue(
      createSupabaseMock({
        user: MOD,
        fromQueue: [ok(modProfile), ok({ id: 1, author_id: 'mod-two-id', author: { role: 'moderator' } })],
      }) as never
    );

    const response = await deletePost(
      new Request('http://localhost/api/posts/1', { method: 'DELETE', headers: authHeaders() }),
      { params: Promise.resolve({ id: '1' }) }
    );

    expect(response.status).toBe(403);
  });

  it('404s when the comment does not exist', async () => {
    mockGetSupabaseClient.mockReturnValue(
      createSupabaseMock({ user: ALICE, fromQueue: [ok(aliceProfile), ok(null)] }) as never
    );

    const response = await deletePost(
      new Request('http://localhost/api/posts/999', { method: 'DELETE', headers: authHeaders() }),
      { params: Promise.resolve({ id: '999' }) }
    );

    expect(response.status).toBe(404);
  });
});
