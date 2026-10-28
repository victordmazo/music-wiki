import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createSupabaseMock, fail } from './test-utils';

vi.mock('../../lib/supabase', () => ({ getSupabaseClient: vi.fn() }));

import { getSupabaseClient } from '../../lib/supabase';
import { GET as getRandomEntry } from '../../app/api/entries/random/route';

const mockGetSupabaseClient = vi.mocked(getSupabaseClient);

describe('GET /api/entries/random', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns a random entry\'s slug', async () => {
    mockGetSupabaseClient.mockReturnValue(
      createSupabaseMock({
        fromQueue: [{ data: null, error: null, count: 3 }, { data: { slug: 'the-fake-band' }, error: null }],
      }) as never
    );

    const response = await getRandomEntry();

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ slug: 'the-fake-band' });
  });

  it('returns 404 when there are no entries', async () => {
    mockGetSupabaseClient.mockReturnValue(
      createSupabaseMock({ fromQueue: [{ data: null, error: null, count: 0 }] }) as never
    );

    const response = await getRandomEntry();

    expect(response.status).toBe(404);
  });

  it('propagates a database error from the count query', async () => {
    mockGetSupabaseClient.mockReturnValue(createSupabaseMock({ fromQueue: [fail('boom')] }) as never);

    const response = await getRandomEntry();

    expect(response.status).toBe(500);
  });
});
