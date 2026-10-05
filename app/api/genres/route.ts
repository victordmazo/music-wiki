import { getSupabaseClient } from '../../../lib/supabase';

export async function GET() {
  const supabase = getSupabaseClient();
  if (!supabase) return Response.json({ error: 'Supabase credentials are not configured.' }, { status: 500 });

  const { data, error } = await supabase
    .from('myapp_genre')
    .select('id, name')
    .order('name');

  if (error) return Response.json({ error: error.message }, { status: 500 });

  return Response.json({ genres: data }, { status: 200 });
}
