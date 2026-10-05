import { authenticate, forbidden, isModerator } from '../../../../lib/api-auth';

// PATCH /api/posts/:id
// body: { contents: string }
// Authors can edit only their own comments; edited_at is stamped by a DB trigger.
export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { supabase, userId, response } = await authenticate(request);
  if (response) return response;

  const body = await request.json().catch(() => null);
  const { contents } = (body ?? {}) as { contents?: string };

  if (!contents?.trim()) {
    return Response.json({ error: 'contents is required.' }, { status: 400 });
  }

  const { data, error } = await supabase!
    .from('myapp_post')
    .update({ contents: contents.trim() })
    .eq('id', id)
    .eq('author_id', userId)
    .select('id, discussion_id, author_id, contents, created_at, edited_at')
    .maybeSingle();

  if (error) return Response.json({ error: error.message }, { status: 400 });
  if (!data) return Response.json({ error: 'Comment not found or not yours.' }, { status: 404 });

  return Response.json({ post: data }, { status: 200 });
}

// DELETE /api/posts/:id
// Authors delete their own comments. Moderators can delete any registered user's
// comment, but not another moderator's.
export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { supabase, userId, profile, response } = await authenticate(request);
  if (response) return response;

  const { data: post, error: fetchError } = await supabase!
    .from('myapp_post')
    .select('id, author_id, author:myapp_profile(role)')
    .eq('id', id)
    .maybeSingle();

  if (fetchError) return Response.json({ error: fetchError.message }, { status: 500 });
  if (!post) return Response.json({ error: 'Comment not found.' }, { status: 404 });

  const record = post as unknown as { id: number; author_id: string; author: { role: string } | null };
  const isOwn = record.author_id === userId;
  const authorIsModerator = record.author?.role === 'moderator';
  const canModerate = isModerator(profile) && !authorIsModerator;

  if (!isOwn && !canModerate) {
    return forbidden('You cannot delete this comment.');
  }

  const { error: deleteError } = await supabase!.from('myapp_post').delete().eq('id', id);
  if (deleteError) return Response.json({ error: deleteError.message }, { status: 400 });

  return Response.json({ id: record.id }, { status: 200 });
}
