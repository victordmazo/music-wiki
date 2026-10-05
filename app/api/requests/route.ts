import { authenticate, isActiveNow, isModerator } from '../../../lib/api-auth';

const REQUEST_COLUMNS =
  'id, request_type, entry_id, requestor_id, proposed_data, reason, status, reviewed_by, reviewed_at, review_note, created_at';

// GET /api/requests?status=pending
// Regular users see only their own requests; moderators see everyone's (optionally
// filtered by status) so they have a review queue.
export async function GET(request: Request) {
  const { supabase, userId, profile, response } = await authenticate(request);
  if (response) return response;

  const url = new URL(request.url);
  const statusFilter = url.searchParams.get('status');

  let query = supabase!
    .from('myapp_change_request')
    .select(REQUEST_COLUMNS)
    .order('created_at', { ascending: false });

  if (!isModerator(profile)) {
    query = query.eq('requestor_id', userId);
  }
  if (statusFilter) {
    query = query.eq('status', statusFilter);
  }

  const { data, error } = await query;
  if (error) return Response.json({ error: error.message }, { status: 500 });

  return Response.json({ requests: data }, { status: 200 });
}

// POST /api/requests
// body: { request_type: 'create'|'edit'|'delete', entry_id?, proposed_data?, reason? }
// Any active registered user can submit a request; it starts out pending and has no
// effect until a moderator reviews it via /api/requests/:id/review.
export async function POST(request: Request) {
  const { supabase, userId, profile, response } = await authenticate(request);
  if (response) return response;

  if (!isActiveNow(profile)) {
    return Response.json({ error: 'Your account cannot submit requests right now.' }, { status: 403 });
  }

  const body = await request.json().catch(() => null);
  const { request_type, entry_id, proposed_data, reason } = (body ?? {}) as {
    request_type?: string;
    entry_id?: number;
    proposed_data?: Record<string, unknown>;
    reason?: string;
  };

  if (request_type !== 'create' && request_type !== 'edit' && request_type !== 'delete') {
    return Response.json({ error: 'request_type must be create, edit, or delete.' }, { status: 400 });
  }
  if (request_type !== 'create' && !entry_id) {
    return Response.json({ error: 'entry_id is required for edit and delete requests.' }, { status: 400 });
  }
  if (request_type === 'create' && !(proposed_data?.title as string | undefined)?.trim()) {
    return Response.json({ error: 'proposed_data.title is required for a new entry request.' }, { status: 400 });
  }

  const { data, error } = await supabase!
    .from('myapp_change_request')
    .insert({
      request_type,
      entry_id: request_type === 'create' ? null : entry_id,
      requestor_id: userId,
      proposed_data: proposed_data ?? {},
      reason: reason ?? null,
    })
    .select(REQUEST_COLUMNS)
    .single();

  if (error) return Response.json({ error: error.message }, { status: 400 });

  return Response.json({ request: data }, { status: 201 });
}
