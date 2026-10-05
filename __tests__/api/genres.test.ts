import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createSupabaseMock, fail, ok } from './test-utils';

vi.mock('../../lib/supabase', () => ({ getSupabaseClient: vi.fn() }));

import { getSupabaseClient } from '../../lib/supabase';
import { GET } from '../../app/api/genres/route';

const mockGetSupabaseClient = vi.mocked(getSupabaseClient);

describe('GET /api/genres', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns the genre list', async () => {
    mockGetSupabaseClient.mockReturnValue(
      createSupabaseMock({ fromQueue: [ok([{ id: 1, name: 'Punk' }, { id: 2, name: 'Folk' }])] }) as never
    );

    const response = await GET();

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ genres: [{ id: 1, name: 'Punk' }, { id: 2, name: 'Folk' }] });
  });

  it('returns 500 when Supabase is not configured', async () => {
    mockGetSupabaseClient.mockReturnValue(null);

    const response = await GET();

    expect(response.status).toBe(500);
  });

  it('propagates a database error', async () => {
    mockGetSupabaseClient.mockReturnValue(createSupabaseMock({ fromQueue: [fail('db down')] }) as never);

    const response = await GET();

    expect(response.status).toBe(500);
    expect(await response.json()).toEqual({ error: 'db down' });
  });
});
