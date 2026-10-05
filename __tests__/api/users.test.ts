import { beforeEach, describe, expect, it, vi } from 'vitest';
import { authHeaders, createSupabaseMock, ok } from './test-utils';

vi.mock('../../lib/supabase', () => ({ getSupabaseClient: vi.fn() }));

import { getSupabaseClient } from '../../lib/supabase';
import { PATCH as moderateUser } from '../../app/api/users/[id]/moderate/route';

const mockGetSupabaseClient = vi.mocked(getSupabaseClient);

const ALICE = { id: 'alice-id' };
const MOD = { id: 'mod-id' };
const aliceProfile = { id: 'alice-id', username: 'alice', role: 'user', status: 'active', suspended_until: null };
const modProfile = { id: 'mod-id', username: 'themod', role: 'moderator', status: 'active', suspended_until: null };

describe('PATCH /api/users/:id/moderate', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('requires authentication', async () => {
    mockGetSupabaseClient.mockReturnValue(createSupabaseMock({}) as never);

    const response = await moderateUser(
      new Request('http://localhost/api/users/alice-id/moderate', {
        method: 'PATCH',
        body: JSON.stringify({ status: 'banned' }),
      }),
      { params: Promise.resolve({ id: 'alice-id' }) }
    );
    expect(response.status).toBe(401);
  });

  it('rejects a non-moderator caller', async () => {
    mockGetSupabaseClient.mockReturnValue(
      createSupabaseMock({ user: ALICE, fromQueue: [ok(aliceProfile)] }) as never
    );

    const response = await moderateUser(
      new Request('http://localhost/api/users/bob-id/moderate', {
        method: 'PATCH',
        headers: authHeaders(),
        body: JSON.stringify({ status: 'banned' }),
      }),
      { params: Promise.resolve({ id: 'bob-id' }) }
    );

    expect(response.status).toBe(403);
  });

  it('blocks a moderator from changing their own status', async () => {
    mockGetSupabaseClient.mockReturnValue(
      createSupabaseMock({ user: MOD, fromQueue: [ok(modProfile)] }) as never
    );

    const response = await moderateUser(
      new Request('http://localhost/api/users/mod-id/moderate', {
        method: 'PATCH',
        headers: authHeaders(),
        body: JSON.stringify({ role: 'user' }),
      }),
      { params: Promise.resolve({ id: 'mod-id' }) }
    );

    expect(response.status).toBe(403);
  });

  it('rejects an invalid status value', async () => {
    mockGetSupabaseClient.mockReturnValue(
      createSupabaseMock({ user: MOD, fromQueue: [ok(modProfile)] }) as never
    );

    const response = await moderateUser(
      new Request('http://localhost/api/users/alice-id/moderate', {
        method: 'PATCH',
        headers: authHeaders(),
        body: JSON.stringify({ status: 'exiled' }),
      }),
      { params: Promise.resolve({ id: 'alice-id' }) }
    );

    expect(response.status).toBe(400);
  });

  it('lets a moderator suspend a user', async () => {
    const updated = { id: 'alice-id', username: 'alice', role: 'user', status: 'suspended', suspended_until: '2026-01-01T00:00:00Z' };
    mockGetSupabaseClient.mockReturnValue(
      createSupabaseMock({ user: MOD, fromQueue: [ok(modProfile), ok(updated)] }) as never
    );

    const response = await moderateUser(
      new Request('http://localhost/api/users/alice-id/moderate', {
        method: 'PATCH',
        headers: authHeaders(),
        body: JSON.stringify({ status: 'suspended', suspended_until: '2026-01-01T00:00:00Z' }),
      }),
      { params: Promise.resolve({ id: 'alice-id' }) }
    );

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ profile: updated });
  });

  it('lets a moderator promote a user', async () => {
    const updated = { id: 'alice-id', username: 'alice', role: 'moderator', status: 'active', suspended_until: null };
    mockGetSupabaseClient.mockReturnValue(
      createSupabaseMock({ user: MOD, fromQueue: [ok(modProfile), ok(updated)] }) as never
    );

    const response = await moderateUser(
      new Request('http://localhost/api/users/alice-id/moderate', {
        method: 'PATCH',
        headers: authHeaders(),
        body: JSON.stringify({ role: 'moderator' }),
      }),
      { params: Promise.resolve({ id: 'alice-id' }) }
    );

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ profile: updated });
  });

  it('404s for a user that does not exist', async () => {
    mockGetSupabaseClient.mockReturnValue(
      createSupabaseMock({ user: MOD, fromQueue: [ok(modProfile), ok(null)] }) as never
    );

    const response = await moderateUser(
      new Request('http://localhost/api/users/ghost-id/moderate', {
        method: 'PATCH',
        headers: authHeaders(),
        body: JSON.stringify({ status: 'banned' }),
      }),
      { params: Promise.resolve({ id: 'ghost-id' }) }
    );

    expect(response.status).toBe(404);
  });
});
