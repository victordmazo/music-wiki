import { beforeEach, describe, expect, it, vi } from 'vitest';
import { authHeaders, createSupabaseMock, fail, ok } from './test-utils';

vi.mock('../../lib/supabase', () => ({ getSupabaseClient: vi.fn() }));

import { getSupabaseClient } from '../../lib/supabase';
import { GET as listRequests, POST as createRequest } from '../../app/api/requests/route';
import { DELETE as withdrawRequest } from '../../app/api/requests/[id]/route';
import { POST as reviewRequest } from '../../app/api/requests/[id]/review/route';

const mockGetSupabaseClient = vi.mocked(getSupabaseClient);

const ALICE = { id: 'alice-id' };
const MOD = { id: 'mod-id' };
const aliceProfile = { id: 'alice-id', username: 'alice', role: 'user', status: 'active', suspended_until: null };
const modProfile = { id: 'mod-id', username: 'themod', role: 'moderator', status: 'active', suspended_until: null };
const suspendedProfile = { ...aliceProfile, status: 'suspended', suspended_until: '2999-01-01T00:00:00Z' };

describe('requests API', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('GET /api/requests', () => {
    it('requires authentication', async () => {
      mockGetSupabaseClient.mockReturnValue(createSupabaseMock({}) as never);

      const response = await listRequests(new Request('http://localhost/api/requests'));
      expect(response.status).toBe(401);
    });

    it('scopes results to the caller when not a moderator', async () => {
      mockGetSupabaseClient.mockReturnValue(
        createSupabaseMock({
          user: ALICE,
          fromQueue: [ok(aliceProfile), ok([{ id: 1, requestor_id: 'alice-id' }])],
        }) as never
      );

      const response = await listRequests(
        new Request('http://localhost/api/requests', { headers: authHeaders() })
      );

      expect(response.status).toBe(200);
      expect(await response.json()).toEqual({ requests: [{ id: 1, requestor_id: 'alice-id' }] });
    });

    it('lets a moderator see all requests', async () => {
      mockGetSupabaseClient.mockReturnValue(
        createSupabaseMock({
          user: MOD,
          fromQueue: [ok(modProfile), ok([{ id: 1 }, { id: 2 }])],
        }) as never
      );

      const response = await listRequests(
        new Request('http://localhost/api/requests?status=pending', { headers: authHeaders() })
      );

      expect(response.status).toBe(200);
      expect(await response.json()).toEqual({ requests: [{ id: 1 }, { id: 2 }] });
    });
  });

  describe('POST /api/requests', () => {
    it('rejects an invalid request_type', async () => {
      mockGetSupabaseClient.mockReturnValue(
        createSupabaseMock({ user: ALICE, fromQueue: [ok(aliceProfile)] }) as never
      );

      const response = await createRequest(
        new Request('http://localhost/api/requests', {
          method: 'POST',
          headers: authHeaders(),
          body: JSON.stringify({ request_type: 'delete-everything' }),
        })
      );

      expect(response.status).toBe(400);
    });

    it('rejects a create request with no title', async () => {
      mockGetSupabaseClient.mockReturnValue(
        createSupabaseMock({ user: ALICE, fromQueue: [ok(aliceProfile)] }) as never
      );

      const response = await createRequest(
        new Request('http://localhost/api/requests', {
          method: 'POST',
          headers: authHeaders(),
          body: JSON.stringify({ request_type: 'create', proposed_data: {} }),
        })
      );

      expect(response.status).toBe(400);
    });

    it('rejects an edit request with no entry_id', async () => {
      mockGetSupabaseClient.mockReturnValue(
        createSupabaseMock({ user: ALICE, fromQueue: [ok(aliceProfile)] }) as never
      );

      const response = await createRequest(
        new Request('http://localhost/api/requests', {
          method: 'POST',
          headers: authHeaders(),
          body: JSON.stringify({ request_type: 'edit', proposed_data: { description: 'x' } }),
        })
      );

      expect(response.status).toBe(400);
    });

    it('blocks a suspended user from submitting a request', async () => {
      mockGetSupabaseClient.mockReturnValue(
        createSupabaseMock({ user: ALICE, fromQueue: [ok(suspendedProfile)] }) as never
      );

      const response = await createRequest(
        new Request('http://localhost/api/requests', {
          method: 'POST',
          headers: authHeaders(),
          body: JSON.stringify({ request_type: 'create', proposed_data: { title: 'New Band' } }),
        })
      );

      expect(response.status).toBe(403);
    });

    it('creates a pending request for an active user', async () => {
      const created = {
        id: 1,
        request_type: 'create',
        entry_id: null,
        requestor_id: 'alice-id',
        proposed_data: { title: 'New Band' },
        reason: null,
        status: 'pending',
        created_at: '2026-01-01T00:00:00Z',
      };
      mockGetSupabaseClient.mockReturnValue(
        createSupabaseMock({ user: ALICE, fromQueue: [ok(aliceProfile), ok(created)] }) as never
      );

      const response = await createRequest(
        new Request('http://localhost/api/requests', {
          method: 'POST',
          headers: authHeaders(),
          body: JSON.stringify({ request_type: 'create', proposed_data: { title: 'New Band' } }),
        })
      );

      expect(response.status).toBe(201);
      expect(await response.json()).toEqual({ request: created });
    });
  });

  describe('DELETE /api/requests/:id', () => {
    it('withdraws the caller\'s own pending request', async () => {
      mockGetSupabaseClient.mockReturnValue(
        createSupabaseMock({ user: ALICE, fromQueue: [ok(aliceProfile), ok({ id: 1 })] }) as never
      );

      const response = await withdrawRequest(
        new Request('http://localhost/api/requests/1', { method: 'DELETE', headers: authHeaders() }),
        { params: Promise.resolve({ id: '1' }) }
      );

      expect(response.status).toBe(200);
    });

    it('404s for a request that is not the caller\'s or already reviewed', async () => {
      mockGetSupabaseClient.mockReturnValue(
        createSupabaseMock({ user: ALICE, fromQueue: [ok(aliceProfile), ok(null)] }) as never
      );

      const response = await withdrawRequest(
        new Request('http://localhost/api/requests/99', { method: 'DELETE', headers: authHeaders() }),
        { params: Promise.resolve({ id: '99' }) }
      );

      expect(response.status).toBe(404);
    });
  });

  describe('POST /api/requests/:id/review', () => {
    it('rejects a non-moderator', async () => {
      mockGetSupabaseClient.mockReturnValue(
        createSupabaseMock({ user: ALICE, fromQueue: [ok(aliceProfile)] }) as never
      );

      const response = await reviewRequest(
        new Request('http://localhost/api/requests/1/review', {
          method: 'POST',
          headers: authHeaders(),
          body: JSON.stringify({ approve: true }),
        }),
        { params: Promise.resolve({ id: '1' }) }
      );

      expect(response.status).toBe(403);
    });

    it('requires approve to be a boolean', async () => {
      mockGetSupabaseClient.mockReturnValue(
        createSupabaseMock({ user: MOD, fromQueue: [ok(modProfile)] }) as never
      );

      const response = await reviewRequest(
        new Request('http://localhost/api/requests/1/review', {
          method: 'POST',
          headers: authHeaders(),
          body: JSON.stringify({}),
        }),
        { params: Promise.resolve({ id: '1' }) }
      );

      expect(response.status).toBe(400);
    });

    it('approves a request via the review RPC', async () => {
      mockGetSupabaseClient.mockReturnValue(
        createSupabaseMock({
          user: MOD,
          fromQueue: [ok(modProfile)],
          rpcQueue: [ok({ id: 1, status: 'approved', entry_id: 5 })],
        }) as never
      );

      const response = await reviewRequest(
        new Request('http://localhost/api/requests/1/review', {
          method: 'POST',
          headers: authHeaders(),
          body: JSON.stringify({ approve: true, note: 'looks good' }),
        }),
        { params: Promise.resolve({ id: '1' }) }
      );

      expect(response.status).toBe(200);
      expect(await response.json()).toEqual({ request: { id: 1, status: 'approved', entry_id: 5 } });
    });

    it('surfaces an error from the review RPC (e.g. already reviewed)', async () => {
      mockGetSupabaseClient.mockReturnValue(
        createSupabaseMock({
          user: MOD,
          fromQueue: [ok(modProfile)],
          rpcQueue: [fail('Request 1 has already been reviewed')],
        }) as never
      );

      const response = await reviewRequest(
        new Request('http://localhost/api/requests/1/review', {
          method: 'POST',
          headers: authHeaders(),
          body: JSON.stringify({ approve: false }),
        }),
        { params: Promise.resolve({ id: '1' }) }
      );

      expect(response.status).toBe(400);
      expect(await response.json()).toEqual({ error: 'Request 1 has already been reviewed' });
    });
  });
});
