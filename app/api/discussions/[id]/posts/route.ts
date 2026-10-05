import { getSupabaseClient } from '../../../../../lib/supabase';
import { authenticate, isActiveNow } from '../../../../../lib/api-auth';

// GET /api/discussions/:id/posts
// Public: anyone can read comments in a discussion.
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const supabase = getSupabaseClient();
  if (!supabase) return Response.json({ error: 'Supabase credentials are not configured.' }, { status: 500 });

  const { data, error } = await supabase
    .from('myapp_post')
    .select('id, discussion_id, author_id, contents, created_at, edited_at, author:myapp_profile(username)')
    .eq('discussion_id', id)
    .order('created_at', { ascending: true });

  if (error) return Response.json({ error: error.message }, { status: 500 });

  return Response.json({ posts: data }, { status: 200 });
}

// POST /api/discussions/:id/posts
// body: { contents: string }
// Any active registered user can comment.
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { supabase, userId, profile, response } = await authenticate(request);
  if (response) return response;

  if (!isActiveNow(profile)) {
    return Response.json({ error: 'Your account cannot comment right now.' }, { status: 403 });
  }

  const body = await request.json().catch(() => null);
  const { contents } = (body ?? {}) as { contents?: string };

  if (!contents?.trim()) {
    return Response.json({ error: 'contents is required.' }, { status: 400 });
  }

  const discussionId = Number(id);
  if (!Number.isFinite(discussionId)) {
    return Response.json({ error: 'Invalid discussion id.' }, { status: 400 });
  }

  const { data, error } = await supabase!
    .from('myapp_post')
    .insert({ discussion_id: discussionId, author_id: userId, contents: contents.trim() })
    .select('id, discussion_id, author_id, contents, created_at, edited_at')
    .single();

  if (error) return Response.json({ error: error.message }, { status: 400 });

  return Response.json({ post: data }, { status: 201 });
}
