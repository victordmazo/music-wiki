import { getSupabaseClient } from '../../../lib/supabase';
import { authenticate, isActiveNow } from '../../../lib/api-auth';

// GET /api/discussions?entry_id=5
// Public: anyone can browse discussion threads.
export async function GET(request: Request) {
  const supabase = getSupabaseClient();
  if (!supabase) return Response.json({ error: 'Supabase credentials are not configured.' }, { status: 500 });

  const url = new URL(request.url);
  const entryId = url.searchParams.get('entry_id');

  let query = supabase
    .from('myapp_discussion')
    .select('id, entry_id, title, created_by, created_at, author:myapp_profile(username), entry:myapp_entry(slug,title)')
    .order('created_at', { ascending: false });

  if (entryId) query = query.eq('entry_id', entryId);

  const { data, error } = await query;
  if (error) return Response.json({ error: error.message }, { status: 500 });

  return Response.json({ discussions: data }, { status: 200 });
}

// POST /api/discussions
// body: { title: string, entry_id?: number }
// Any active registered user can start a discussion.
export async function POST(request: Request) {
  const { supabase, userId, profile, response } = await authenticate(request);
  if (response) return response;

  if (!isActiveNow(profile)) {
    return Response.json({ error: 'Your account cannot start discussions right now.' }, { status: 403 });
  }

  const body = await request.json().catch(() => null);
  const { title, entry_id } = (body ?? {}) as { title?: string; entry_id?: number };

  if (!title?.trim()) {
    return Response.json({ error: 'title is required.' }, { status: 400 });
  }

  const { data, error } = await supabase!
    .from('myapp_discussion')
    .insert({ title: title.trim(), entry_id: entry_id ?? null, created_by: userId })
    .select('id, entry_id, title, created_by, created_at')
    .single();

  if (error) return Response.json({ error: error.message }, { status: 400 });

  return Response.json({ discussion: data }, { status: 201 });
}
