import { authenticate } from '../../../../lib/api-auth';

// DELETE /api/requests/:id
// Lets a requester withdraw their own request while it's still pending.
export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { supabase, userId, response } = await authenticate(request);
  if (response) return response;

  const { data, error } = await supabase!
    .from('myapp_change_request')
    .delete()
    .eq('id', id)
    .eq('requestor_id', userId)
    .eq('status', 'pending')
    .select('id')
    .maybeSingle();

  if (error) return Response.json({ error: error.message }, { status: 400 });
  if (!data) return Response.json({ error: 'Request not found, already reviewed, or not yours.' }, { status: 404 });

  return Response.json({ id: (data as { id: number }).id }, { status: 200 });
}
