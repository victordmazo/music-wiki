import { getSupabaseClient } from '../../../../lib/supabase';

// GET /api/entries/random
// Public: picks one entry at random, server-side, and returns only its slug — the
// sidebar's "Random article" link used to fetch up to 100 full entry records
// (description, genres, images) client-side just to read one slug off the array.
export async function GET() {
  const supabase = getSupabaseClient();
  if (!supabase) return Response.json({ error: 'Supabase credentials are not configured.' }, { status: 500 });

  const { count, error: countError } = await supabase
    .from('myapp_entry')
    .select('id', { count: 'exact', head: true })
    .is('deleted_at', null);

  if (countError) return Response.json({ error: countError.message }, { status: 500 });
  if (!count) return Response.json({ error: 'No entries yet.' }, { status: 404 });

  const offset = Math.floor(Math.random() * count);

  const { data, error } = await supabase
    .from('myapp_entry')
    .select('slug')
    .is('deleted_at', null)
    .range(offset, offset)
    .maybeSingle();

  if (error) return Response.json({ error: error.message }, { status: 500 });
  if (!data) return Response.json({ error: 'No entries yet.' }, { status: 404 });

  return Response.json({ slug: (data as { slug: string }).slug }, { status: 200 });
}
