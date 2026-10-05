import { beforeEach, describe, expect, it, vi } from 'vitest';
import { authHeaders, createSupabaseMock, fail, ok } from './test-utils';

vi.mock('../../lib/supabase', () => ({ getSupabaseClient: vi.fn() }));

import { getSupabaseClient } from '../../lib/supabase';
import { GET as listDiscussions, POST as createDiscussion } from '../../app/api/discussions/route';
import { GET as listPosts, POST as createPost } from '../../app/api/discussions/[id]/posts/route';

const mockGetSupabaseClient = vi.mocked(getSupabaseClient);

const ALICE = { id: 'alice-id' };
const aliceProfile = { id: 'alice-id', username: 'alice', role: 'user', status: 'active', suspended_until: null };
const bannedProfile = { ...aliceProfile, status: 'banned' };

describe('GET /api/discussions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('lists discussions without requiring auth', async () => {
    mockGetSupabaseClient.mockReturnValue(
      createSupabaseMock({ fromQueue: [ok([{ id: 1, title: 'Best NE shows' }])] }) as never
    );

    const response = await listDiscussions(new Request('http://localhost/api/discussions'));

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ discussions: [{ id: 1, title: 'Best NE shows' }] });
  });

  it('propagates a database error', async () => {
    mockGetSupabaseClient.mockReturnValue(createSupabaseMock({ fromQueue: [fail('boom')] }) as never);

    const response = await listDiscussions(new Request('http://localhost/api/discussions'));

    expect(response.status).toBe(500);
  });
});

describe('POST /api/discussions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('requires authentication', async () => {
    mockGetSupabaseClient.mockReturnValue(createSupabaseMock({}) as never);

    const response = await createDiscussion(
      new Request('http://localhost/api/discussions', { method: 'POST', body: JSON.stringify({ title: 'x' }) })
    );
    expect(response.status).toBe(401);
  });

  it('requires a title', async () => {
    mockGetSupabaseClient.mockReturnValue(
      createSupabaseMock({ user: ALICE, fromQueue: [ok(aliceProfile)] }) as never
    );

    const response = await createDiscussion(
      new Request('http://localhost/api/discussions', {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({ title: '   ' }),
      })
    );

    expect(response.status).toBe(400);
  });

  it('blocks a banned user', async () => {
    mockGetSupabaseClient.mockReturnValue(
      createSupabaseMock({ user: ALICE, fromQueue: [ok(bannedProfile)] }) as never
    );

    const response = await createDiscussion(
      new Request('http://localhost/api/discussions', {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({ title: 'New thread' }),
      })
    );

    expect(response.status).toBe(403);
  });

  it('creates a discussion for an active user', async () => {
    const created = { id: 1, entry_id: null, title: 'New thread', created_by: 'alice-id', created_at: 'now' };
    mockGetSupabaseClient.mockReturnValue(
      createSupabaseMock({ user: ALICE, fromQueue: [ok(aliceProfile), ok(created)] }) as never
    );

    const response = await createDiscussion(
      new Request('http://localhost/api/discussions', {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({ title: 'New thread' }),
      })
    );

    expect(response.status).toBe(201);
    expect(await response.json()).toEqual({ discussion: created });
  });
});

describe('GET /api/discussions/:id/posts', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('lists posts without requiring auth', async () => {
    mockGetSupabaseClient.mockReturnValue(createSupabaseMock({ fromQueue: [ok([{ id: 1, contents: 'hi' }])] }) as never);

    const response = await listPosts(new Request('http://localhost/api/discussions/1/posts'), {
      params: Promise.resolve({ id: '1' }),
    });

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ posts: [{ id: 1, contents: 'hi' }] });
  });
});

describe('POST /api/discussions/:id/posts', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('requires contents', async () => {
    mockGetSupabaseClient.mockReturnValue(
      createSupabaseMock({ user: ALICE, fromQueue: [ok(aliceProfile)] }) as never
    );

    const response = await createPost(
      new Request('http://localhost/api/discussions/1/posts', {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({ contents: '' }),
      }),
      { params: Promise.resolve({ id: '1' }) }
    );

    expect(response.status).toBe(400);
  });

  it('creates a comment for an active user', async () => {
    const created = { id: 1, discussion_id: 1, author_id: 'alice-id', contents: 'hello', created_at: 'now', edited_at: null };
    mockGetSupabaseClient.mockReturnValue(
      createSupabaseMock({ user: ALICE, fromQueue: [ok(aliceProfile), ok(created)] }) as never
    );

    const response = await createPost(
      new Request('http://localhost/api/discussions/1/posts', {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({ contents: 'hello' }),
      }),
      { params: Promise.resolve({ id: '1' }) }
    );

    expect(response.status).toBe(201);
    expect(await response.json()).toEqual({ post: created });
  });
});
