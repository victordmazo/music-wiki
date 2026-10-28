import { authenticate, forbidden, isModerator } from '../../../lib/api-auth';

const PAGE_SIZE = 50;

/** Escapes Postgres LIKE/ILIKE metacharacters so a search term is matched literally. */
function escapeLikePattern(value: string): string {
  return value.replace(/\\/g, '\\\\').replace(/%/g, '\\%').replace(/_/g, '\\_');
}

// GET /api/users?q=search&offset=0
// Moderator-only: search registered users by username, paginated 50 at a time, as a
// starting point for suspending, banning, reinstating, or promoting/demoting an account.
export async function GET(request: Request) {
  const { supabase, profile, response } = await authenticate(request);
  if (response) return response;

  if (!isModerator(profile)) return forbidden('Only moderators can list user accounts.');

  const url = new URL(request.url);
  const q = url.searchParams.get('q')?.trim();

  const offsetParam = Number(url.searchParams.get('offset'));
  const offset = Number.isInteger(offsetParam) && offsetParam >= 0 ? offsetParam : 0;

  let query = supabase!
    .from('myapp_profile')
    .select('id, username, role, status, suspended_until')
    .order('username')
    // Fetch one extra row past the page size so we can tell the client whether
    // there's a next page without a separate count query.
    .range(offset, offset + PAGE_SIZE);

  if (q) query = query.ilike('username', `%${escapeLikePattern(q)}%`);

  const { data, error } = await query;
  if (error) return Response.json({ error: error.message }, { status: 500 });

  const rows = data ?? [];
  const hasMore = rows.length > PAGE_SIZE;
  const users = hasMore ? rows.slice(0, PAGE_SIZE) : rows;

  return Response.json({ users, hasMore }, { status: 200 });
}
