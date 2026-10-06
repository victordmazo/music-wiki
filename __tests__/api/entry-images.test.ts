import { beforeEach, describe, expect, it, vi } from 'vitest';
import { authHeaders, createSupabaseMock, ok } from './test-utils';

vi.mock('../../lib/supabase', () => ({ getSupabaseClient: vi.fn() }));

import { getSupabaseClient } from '../../lib/supabase';
import { POST as uploadImage } from '../../app/api/entries/images/route';

const mockGetSupabaseClient = vi.mocked(getSupabaseClient);

const ALICE = { id: 'alice-id' };
const aliceProfile = { id: 'alice-id', username: 'alice', role: 'user', status: 'active', suspended_until: null };
const bannedProfile = { ...aliceProfile, status: 'banned' };

function makeStorageMock(result: { error: { message: string } | null }) {
  const upload = vi.fn(async () => result);
  const getPublicUrl = vi.fn((path: string) => ({ data: { publicUrl: `https://cdn.example.com/entry-images/${path}` } }));
  return { from: vi.fn(() => ({ upload, getPublicUrl })) };
}

function withStorage(supabase: object, storage: ReturnType<typeof makeStorageMock>) {
  (supabase as { storage: unknown }).storage = storage;
  return supabase;
}

function makeImageRequest(file?: Blob, token: string | null = 'valid-token') {
  const formData = new FormData();
  if (file) formData.append('image', file, 'photo.jpg');
  return new Request('http://localhost/api/entries/images', {
    method: 'POST',
    headers: token ? authHeaders(token) : {},
    body: formData,
  });
}

describe('POST /api/entries/images', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('requires authentication', async () => {
    mockGetSupabaseClient.mockReturnValue(createSupabaseMock({}) as never);

    const file = new Blob(['fake'], { type: 'image/jpeg' });
    const response = await uploadImage(makeImageRequest(file, null));

    expect(response.status).toBe(401);
  });

  it('blocks a banned user', async () => {
    mockGetSupabaseClient.mockReturnValue(
      createSupabaseMock({ user: ALICE, fromQueue: [ok(bannedProfile)] }) as never
    );

    const file = new Blob(['fake'], { type: 'image/jpeg' });
    const response = await uploadImage(makeImageRequest(file));

    expect(response.status).toBe(403);
  });

  it('requires an image file', async () => {
    mockGetSupabaseClient.mockReturnValue(
      createSupabaseMock({ user: ALICE, fromQueue: [ok(aliceProfile)] }) as never
    );

    const response = await uploadImage(makeImageRequest(undefined));

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({ error: 'image file is required.' });
  });

  it('rejects a non-image file', async () => {
    mockGetSupabaseClient.mockReturnValue(
      createSupabaseMock({ user: ALICE, fromQueue: [ok(aliceProfile)] }) as never
    );

    const file = new Blob(['not an image'], { type: 'text/plain' });
    const response = await uploadImage(makeImageRequest(file));

    expect(response.status).toBe(400);
  });

  it('rejects a file over the size limit', async () => {
    mockGetSupabaseClient.mockReturnValue(
      createSupabaseMock({ user: ALICE, fromQueue: [ok(aliceProfile)] }) as never
    );

    const oversized = new Blob([new Uint8Array(9 * 1024 * 1024)], { type: 'image/jpeg' });
    const response = await uploadImage(makeImageRequest(oversized));

    expect(response.status).toBe(400);
  });

  it('uploads an image and returns its path and public URL', async () => {
    const supabase = withStorage(
      createSupabaseMock({ user: ALICE, fromQueue: [ok(aliceProfile)] }),
      makeStorageMock({ error: null })
    );
    mockGetSupabaseClient.mockReturnValue(supabase as never);

    const file = new Blob(['fake-image'], { type: 'image/jpeg' });
    const response = await uploadImage(makeImageRequest(file));

    expect(response.status).toBe(201);
    const body = await response.json();
    expect(body.path).toMatch(/^alice-id\/.+\.jpg$/);
    expect(body.url).toBe(`https://cdn.example.com/entry-images/${body.path}`);
  });

  it('surfaces a storage upload error', async () => {
    const supabase = withStorage(
      createSupabaseMock({ user: ALICE, fromQueue: [ok(aliceProfile)] }),
      makeStorageMock({ error: { message: 'Bucket not found' } })
    );
    mockGetSupabaseClient.mockReturnValue(supabase as never);

    const file = new Blob(['fake-image'], { type: 'image/jpeg' });
    const response = await uploadImage(makeImageRequest(file));

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({ error: 'Bucket not found' });
  });
});
