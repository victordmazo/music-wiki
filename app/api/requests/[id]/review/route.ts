import { authenticate, forbidden, isModerator } from '../../../../../lib/api-auth';

// POST /api/requests/:id/review
// body: { approve: boolean, note?: string }
// Moderator-only. Applies (or denies) the request atomically via the
// myapp_review_request() database function, which also writes the edit-log entry.
// p_reviewer is passed explicitly because this route's Supabase client uses the
// service-role key, so there is no Postgres session for auth.uid() to read.
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { supabase, userId, profile, response } = await authenticate(request);
  if (response) return response;

  if (!isModerator(profile)) return forbidden('Only moderators can review requests.');

  const body = await request.json().catch(() => null);
  const { approve, note } = (body ?? {}) as { approve?: boolean; note?: string };

  if (typeof approve !== 'boolean') {
    return Response.json({ error: 'approve (boolean) is required.' }, { status: 400 });
  }

  const requestId = Number(id);
  if (!Number.isFinite(requestId)) {
    return Response.json({ error: 'Invalid request id.' }, { status: 400 });
  }

  const { data, error } = await supabase!
    .rpc('myapp_review_request', {
      p_request_id: requestId,
      p_approve: approve,
      p_note: note ?? null,
      p_reviewer: userId,
    })
    .single();

  if (error) return Response.json({ error: error.message }, { status: 400 });

  return Response.json({ request: data }, { status: 200 });
}
