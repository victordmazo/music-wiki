export type Role = 'user' | 'moderator';
export type UserStatus = 'active' | 'suspended' | 'banned';

export type Profile = {
  id: string;
  username: string;
  biography: string;
  avatar_url: string | null;
  role: Role;
  status: UserStatus;
};

export type Genre = { id: number; name: string };

export type EntrySummary = {
  id: number;
  slug: string;
  title: string;
  description: string;
  location: string | null;
  created_at: string;
  updated_at: string;
  genres?: { genre: Genre }[];
};

export type EntryImage = { id: number; storage_path: string; caption: string | null; url: string };

export type EntryDetail = EntrySummary & { images?: EntryImage[] };

export type EntryRevision = {
  id: number;
  action: 'create' | 'edit' | 'delete' | 'restore';
  old_data: Record<string, unknown> | null;
  new_data: Record<string, unknown> | null;
  created_at: string;
  editor: { username: string } | null;
};

export type RequestType = 'create' | 'edit' | 'delete';
export type RequestStatus = 'pending' | 'approved' | 'denied';

export type ChangeRequest = {
  id: number;
  request_type: RequestType;
  entry_id: number | null;
  requestor_id: string;
  proposed_data: {
    title?: string;
    description?: string;
    location?: string | null;
    genre_ids?: number[];
    images?: { storage_path: string; caption: string | null }[];
  };
  reason: string | null;
  status: RequestStatus;
  reviewed_by?: string | null;
  reviewed_at?: string | null;
  review_note?: string | null;
  created_at: string;
};
