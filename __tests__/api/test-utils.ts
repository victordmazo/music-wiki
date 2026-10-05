import { vi } from 'vitest';

type QueryResult = { data: unknown; error: { message: string } | null };

/**
 * A minimal stand-in for a Supabase PostgrestFilterBuilder: every filter/modifier
 * method is chainable (returns itself), `.single()`/`.maybeSingle()` resolve the
 * given result directly, and awaiting the builder itself (via `.then`) also
 * resolves the same result — matching how the real client can be used either way.
 */
function makeBuilder(result: QueryResult) {
  const builder: Record<string, unknown> = {};
  const methods = [
    'select', 'insert', 'update', 'delete',
    'eq', 'neq', 'in', 'is', 'order', 'limit', 'range', 'or', 'textSearch',
  ];
  for (const name of methods) {
    builder[name] = vi.fn(() => builder);
  }
  builder.single = vi.fn(async () => result);
  builder.maybeSingle = vi.fn(async () => result);
  builder.then = (resolve: (r: QueryResult) => unknown, reject?: (e: unknown) => unknown) =>
    Promise.resolve(result).then(resolve, reject);
  return builder;
}

/**
 * Builds a fake Supabase client for route tests.
 *
 * `fromQueue` and `rpcQueue` are consumed in call order: the first `.from(...)` call
 * a route makes gets `fromQueue[0]`, the second gets `fromQueue[1]`, and so on. Every
 * route that requires auth calls `authenticate()` first, which itself issues one
 * `.from('myapp_profile')` call for the profile lookup — so that's always index 0
 * for authenticated routes.
 */
export function createSupabaseMock(opts: {
  user?: { id: string } | null;
  userError?: { message: string } | null;
  fromQueue?: QueryResult[];
  rpcQueue?: QueryResult[];
}) {
  const fromQueue = [...(opts.fromQueue ?? [])];
  const rpcQueue = [...(opts.rpcQueue ?? [])];

  return {
    auth: {
      getUser: vi.fn(async () => ({ data: { user: opts.user ?? null }, error: opts.userError ?? null })),
    },
    from: vi.fn(() => makeBuilder(fromQueue.shift() ?? { data: null, error: null })),
    rpc: vi.fn(() => makeBuilder(rpcQueue.shift() ?? { data: null, error: null })),
  };
}

export function ok(data: unknown): QueryResult {
  return { data, error: null };
}

export function fail(message: string): QueryResult {
  return { data: null, error: { message } };
}

export function authHeaders(token = 'valid-token') {
  return { Authorization: `Bearer ${token}` };
}
