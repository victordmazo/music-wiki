import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createSupabaseMock, fail, ok } from './test-utils';

vi.mock('../../lib/supabase', () => ({ getSupabaseClient: vi.fn() }));

import { getSupabaseClient } from '../../lib/supabase';
import { GET as listEntries } from '../../app/api/entries/route';
import { GET as getEntry } from '../../app/api/entries/[slug]/route';

const mockGetSupabaseClient = vi.mocked(getSupabaseClient);

describe('GET /api/entries', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('lists non-deleted entries', async () => {
    mockGetSupabaseClient.mockReturnValue(
      createSupabaseMock({ fromQueue: [ok([{ id: 1, slug: 'the-fake-band', title: 'The Fake Band' }])] }) as never
    );

    const response = await listEntries(new Request('http://localhost/api/entries'));

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ entries: [{ id: 1, slug: 'the-fake-band', title: 'The Fake Band' }] });
  });

  it('propagates a database error', async () => {
    mockGetSupabaseClient.mockReturnValue(createSupabaseMock({ fromQueue: [fail('boom')] }) as never);

    const response = await listEntries(new Request('http://localhost/api/entries'));

    expect(response.status).toBe(500);
    expect(await response.json()).toEqual({ error: 'boom' });
  });
});

describe('GET /api/entries/:slug', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns an entry with its revision history', async () => {
    mockGetSupabaseClient.mockReturnValue(
      createSupabaseMock({
        fromQueue: [
          ok({ id: 1, slug: 'the-fake-band', title: 'The Fake Band' }),
          ok([{ id: 10, action: 'create' }]),
        ],
      }) as never
    );

    const response = await getEntry(new Request('http://localhost/api/entries/the-fake-band'), {
      params: Promise.resolve({ slug: 'the-fake-band' }),
    });

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      entry: { id: 1, slug: 'the-fake-band', title: 'The Fake Band' },
      revisions: [{ id: 10, action: 'create' }],
    });
  });

  it('returns 404 when the entry does not exist', async () => {
    mockGetSupabaseClient.mockReturnValue(createSupabaseMock({ fromQueue: [ok(null)] }) as never);

    const response = await getEntry(new Request('http://localhost/api/entries/missing'), {
      params: Promise.resolve({ slug: 'missing' }),
    });

    expect(response.status).toBe(404);
  });
});
