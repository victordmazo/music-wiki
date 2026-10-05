import { getSupabaseClient } from '../../../../lib/supabase';

// GET /api/entries/:slug
// Returns one wiki entry plus its genres, images, and recent edit history.
// Public: only non-deleted entries are visible here.
export async function GET(_request: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;

  const supabase = getSupabaseClient();
  if (!supabase) return Response.json({ error: 'Supabase credentials are not configured.' }, { status: 500 });

  const { data: entry, error } = await supabase
    .from('myapp_entry')
    .select(
      'id, slug, title, description, location, created_at, updated_at, ' +
      'genres:myapp_entry_genre(genre:myapp_genre(id,name)), ' +
      'images:myapp_entry_image(id, storage_path, caption)'
    )
    .eq('slug', slug)
    .is('deleted_at', null)
    .maybeSingle();

  if (error) return Response.json({ error: error.message }, { status: 500 });
  if (!entry) return Response.json({ error: 'Entry not found.' }, { status: 404 });

  const { data: revisions, error: revisionError } = await supabase
    .from('myapp_entry_revision')
    .select('id, action, old_data, new_data, created_at, editor:myapp_profile(username)')
    .eq('entry_id', (entry as unknown as { id: number }).id)
    .order('created_at', { ascending: false })
    .limit(20);

  if (revisionError) return Response.json({ error: revisionError.message }, { status: 500 });

  return Response.json({ entry, revisions: revisions ?? [] }, { status: 200 });
}
