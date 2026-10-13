import { getSupabaseClient } from '../../../../lib/supabase';

// GET /api/discussions/:id
// Public: a single discussion's metadata (title, who started it, which entry it's
// about, if any). The posts themselves come from /api/discussions/:id/posts.
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const supabase = getSupabaseClient();
  if (!supabase) return Response.json({ error: 'Supabase credentials are not configured.' }, { status: 500 });

  const { data: discussion, error } = await supabase
    .from('myapp_discussion')
    .select('id, entry_id, title, created_by, created_at, author:myapp_profile(username), entry:myapp_entry(slug,title)')
    .eq('id', id)
    .maybeSingle();

  if (error) return Response.json({ error: error.message }, { status: 500 });
  if (!discussion) return Response.json({ error: 'Discussion not found.' }, { status: 404 });

  return Response.json({ discussion }, { status: 200 });
}
