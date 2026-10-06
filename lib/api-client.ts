// Small fetch wrapper shared by client pages. Not a route handler, so it's safe to
// import from any 'use client' component; it only touches `window`/`localStorage`
// inside function bodies, never at module scope.

export function getStoredToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('access_token');
}

export type ApiResult<T> = { ok: true; status: number; data: T } | { ok: false; status: number; error: string };

export async function apiFetch<T = unknown>(
  path: string,
  options: { method?: string; body?: unknown; token?: string | null } = {}
): Promise<ApiResult<T>> {
  const headers: Record<string, string> = {};
  if (options.body !== undefined) headers['Content-Type'] = 'application/json';

  const token = options.token !== undefined ? options.token : getStoredToken();
  if (token) headers.Authorization = `Bearer ${token}`;

  let response: Response;
  try {
    response = await fetch(path, {
      method: options.method ?? 'GET',
      headers,
      body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
    });
  } catch {
    return { ok: false, status: 0, error: 'Could not reach the server.' };
  }

  const data = await response.json().catch(() => null);

  if (!response.ok) {
    return { ok: false, status: response.status, error: data?.error || 'Something went wrong.' };
  }
  return { ok: true, status: response.status, data: data as T };
}
