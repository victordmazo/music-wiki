import { getSupabaseClient } from '../../../lib/supabase';

const BASE_COLUMNS = 'id, slug, title, description, location, created_at, updated_at';
const GENRES_EMBED = 'genres:myapp_entry_genre(genre:myapp_genre(id,name))';
const GENRES_EMBED_INNER = 'genres:myapp_entry_genre!inner(genre:myapp_genre(id,name))';

// GET /api/entries?q=search+text&genre=3&limit=50
// Lists non-deleted wiki entries. Anyone can browse, so no auth is required.
export async function GET(request: Request) {
  const supabase = getSupabaseClient();
  if (!supabase) return Response.json({ error: 'Supabase credentials are not configured.' }, { status: 500 });

  const url = new URL(request.url);
  const q = url.searchParams.get('q')?.trim() || null;
  const genreParam = url.searchParams.get('genre');
  const genreId = genreParam && Number.isFinite(Number(genreParam)) ? Number(genreParam) : null;

  const limitParam = Number(url.searchParams.get('limit'));
  const limit = Number.isFinite(limitParam) && limitParam > 0 ? Math.min(limitParam, 100) : 50;

  let query = supabase
    .from('myapp_entry')
    .select(`${BASE_COLUMNS}, ${genreId ? GENRES_EMBED_INNER : GENRES_EMBED}`)
    .is('deleted_at', null)
    .order('title')
    .limit(limit);

  if (q) query = query.textSearch('search', q, { type: 'websearch' });
  if (genreId) query = query.eq('myapp_entry_genre.genre_id', genreId);

  const { data, error } = await query;

  if (error) return Response.json({ error: error.message }, { status: 500 });

  return Response.json({ entries: data }, { status: 200 });
}
