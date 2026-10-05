import { getSupabaseClient } from './supabase';

export type Role = 'user' | 'moderator';
export type UserStatus = 'active' | 'suspended' | 'banned';

export type Profile = {
  id: string;
  username: string;
  role: Role;
  status: UserStatus;
  suspended_until: string | null;
};

export function getToken(request: Request): string | null {
  const auth = request.headers.get('Authorization');
  return auth?.startsWith('Bearer ') ? auth.slice(7) : null;
}

export function unauthorized(message = 'Unauthorized') {
  return Response.json({ error: message }, { status: 401 });
}

export function forbidden(message = 'Forbidden') {
  return Response.json({ error: message }, { status: 403 });
}

export function serverError(message = 'Supabase credentials are not configured.') {
  return Response.json({ error: message }, { status: 500 });
}

type SupabaseClient = NonNullable<ReturnType<typeof getSupabaseClient>>;

type AuthResult = {
  supabase: SupabaseClient | null;
  userId: string | null;
  profile: Profile | null;
  response: Response | null;
};

/**
 * Resolves the caller's Supabase auth user and app profile (myapp_profile) from the
 * request's Bearer token.
 *
 * IMPORTANT: routes call this and use the returned `supabase` client (backed by the
 * service-role key) for every subsequent query. That key bypasses Row Level Security,
 * so every permission check RLS would normally enforce (ownership, moderator-only
 * actions, suspended/banned accounts) must be re-checked here in the route handler.
 *
 * When `response` is non-null the caller is not authenticated (or Supabase isn't
 * configured); the route should return it immediately.
 */
export async function authenticate(request: Request): Promise<AuthResult> {
  const supabase = getSupabaseClient();
  if (!supabase) {
    return { supabase: null, userId: null, profile: null, response: serverError() };
  }

  const token = getToken(request);
  if (!token) {
    return { supabase, userId: null, profile: null, response: unauthorized() };
  }

  const { data: { user }, error } = await supabase.auth.getUser(token);
  if (error || !user) {
    return { supabase, userId: null, profile: null, response: unauthorized('Invalid or expired token.') };
  }

  const { data: profile } = await supabase
    .from('myapp_profile')
    .select('id, username, role, status, suspended_until')
    .eq('id', user.id)
    .maybeSingle();

  return { supabase, userId: user.id, profile: (profile as Profile | null) ?? null, response: null };
}

/** True when the user has a profile and isn't currently banned or suspended. */
export function isActiveNow(profile: Profile | null): boolean {
  if (!profile) return false;
  if (profile.status === 'active') return true;
  if (profile.status === 'suspended' && profile.suspended_until) {
    return new Date(profile.suspended_until).getTime() <= Date.now();
  }
  return false;
}

/** True when the user is a moderator whose own account is in good standing. */
export function isModerator(profile: Profile | null): boolean {
  return profile?.role === 'moderator' && profile?.status === 'active';
}
