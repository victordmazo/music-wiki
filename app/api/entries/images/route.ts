import { randomUUID } from 'node:crypto';
import { authenticate, isActiveNow } from '../../../../lib/api-auth';

const MAX_SIZE_BYTES = 8 * 1024 * 1024; // 8MB

// POST /api/entries/images
// Uploads a photo to the 'entry-images' bucket and returns its storage path + public
// URL. This is a standalone upload step: it doesn't attach the image to any entry.
// The caller includes the returned path in a create/edit request's
// proposed_data.images, and myapp_review_request() links it to the entry once a
// moderator approves that request.
export async function POST(request: Request) {
  const { supabase, userId, profile, response } = await authenticate(request);
  if (response) return response;

  if (!isActiveNow(profile)) {
    return Response.json({ error: 'Your account cannot upload images right now.' }, { status: 403 });
  }

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return Response.json({ error: 'Invalid form data.' }, { status: 400 });
  }

  const file = formData.get('image');
  if (!file || !(file instanceof Blob)) {
    return Response.json({ error: 'image file is required.' }, { status: 400 });
  }
  if (file.type && !file.type.startsWith('image/')) {
    return Response.json({ error: 'Only image files are allowed.' }, { status: 400 });
  }
  if (file.size > MAX_SIZE_BYTES) {
    return Response.json({ error: 'Images must be 8MB or smaller.' }, { status: 400 });
  }

  const ext = file instanceof File && file.name.includes('.') ? file.name.split('.').pop() : 'jpg';
  const path = `${userId}/${randomUUID()}.${ext}`;

  const { error: uploadError } = await supabase!.storage.from('entry-images').upload(path, file);
  if (uploadError) return Response.json({ error: uploadError.message }, { status: 400 });

  const { data: { publicUrl } } = supabase!.storage.from('entry-images').getPublicUrl(path);

  return Response.json({ path, url: publicUrl }, { status: 201 });
}
