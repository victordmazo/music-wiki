import { authenticate, forbidden, isModerator } from '../../../../../lib/api-auth';

const STATUSES = ['active', 'suspended', 'banned'];
const ROLES = ['user', 'moderator'];

// PATCH /api/users/:id/moderate
// body: { status?: 'active'|'suspended'|'banned', suspended_until?: string|null, role?: 'user'|'moderator' }
// Moderator-only: suspend/ban/reinstate a registered user, or promote/demote one.
// A moderator can never change their own role or status this way.
export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { supabase, userId, profile, response } = await authenticate(request);
  if (response) return response;

  if (!isModerator(profile)) return forbidden('Only moderators can manage user accounts.');
  if (id === userId) return forbidden('Moderators cannot change their own role or status.');

  const body = await request.json().catch(() => null);
  const { status, role, suspended_until } = (body ?? {}) as {
    status?: string;
    role?: string;
    suspended_until?: string | null;
  };

  if (status === undefined && role === undefined) {
    return Response.json({ error: 'status or role is required.' }, { status: 400 });
  }
  if (status !== undefined && !STATUSES.includes(status)) {
    return Response.json({ error: 'status must be active, suspended, or banned.' }, { status: 400 });
  }
  if (role !== undefined && !ROLES.includes(role)) {
    return Response.json({ error: 'role must be user or moderator.' }, { status: 400 });
  }

  const updates: Record<string, unknown> = {};
  if (status !== undefined) {
    updates.status = status;
    updates.suspended_until = status === 'suspended' ? suspended_until ?? null : null;
  }
  if (role !== undefined) updates.role = role;

  const { data, error } = await supabase!
    .from('myapp_profile')
    .update(updates)
    .eq('id', id)
    .select('id, username, role, status, suspended_until')
    .maybeSingle();

  if (error) return Response.json({ error: error.message }, { status: 400 });
  if (!data) return Response.json({ error: 'User not found.' }, { status: 404 });

  return Response.json({ profile: data }, { status: 200 });
}
