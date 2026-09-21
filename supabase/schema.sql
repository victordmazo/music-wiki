-- NE Scene-pedia database schema (Supabase / Postgres)
--
-- Paste this whole file into the Supabase SQL editor and run it. It is idempotent, so it is
-- safe to re-run and safe to run on top of the existing myapp_profile table.
--
-- Passwords are NOT stored here. Supabase Auth keeps them (bcrypt-hashed) in auth.users;
-- myapp_profile is the app-level profile that hangs off auth.users.
--
-- After running, promote yourself to the first moderator (SQL editor only):
--   update myapp_profile set role = 'moderator' where username = 'your-username';

-- ---------------------------------------------------------------------------
-- Enums
-- ---------------------------------------------------------------------------

do $$ begin create type myapp_user_role      as enum ('user', 'moderator');
exception when duplicate_object then null; end $$;

do $$ begin create type myapp_user_status    as enum ('active', 'suspended', 'banned');
exception when duplicate_object then null; end $$;

do $$ begin create type myapp_request_type   as enum ('create', 'edit', 'delete');
exception when duplicate_object then null; end $$;

do $$ begin create type myapp_request_status as enum ('pending', 'approved', 'denied');
exception when duplicate_object then null; end $$;

-- ---------------------------------------------------------------------------
-- Profiles (users + roles + moderation status)
-- ---------------------------------------------------------------------------

create table if not exists myapp_profile (
  id         uuid primary key references auth.users(id) on delete cascade,
  username   text not null,
  biography  text not null default '',
  avatar_url text
);

-- Columns added on top of the original table (no-ops if already present).
alter table myapp_profile add column if not exists avatar_url      text;
alter table myapp_profile add column if not exists role            myapp_user_role   not null default 'user';
alter table myapp_profile add column if not exists status          myapp_user_status not null default 'active';
alter table myapp_profile add column if not exists suspended_until timestamptz;
alter table myapp_profile add column if not exists created_at      timestamptz       not null default now();

create unique index if not exists myapp_profile_username_key on myapp_profile (lower(username));

do $$ begin
  -- NOT VALID: enforced for new/changed rows without failing on any pre-existing row.
  alter table myapp_profile add constraint myapp_profile_username_len
    check (char_length(username) between 3 and 30) not valid;
exception when duplicate_object then null; end $$;

-- ---------------------------------------------------------------------------
-- Helper functions (security definer so policies on myapp_profile can't recurse)
-- ---------------------------------------------------------------------------

create or replace function myapp_role_of(p_uid uuid)
returns myapp_user_role
language sql stable security definer set search_path = public as $$
  select role from myapp_profile where id = p_uid
$$;

-- Caller is an active moderator.
create or replace function myapp_is_moderator()
returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from myapp_profile p
    where p.id = auth.uid() and p.role = 'moderator' and p.status = 'active'
  )
$$;

-- Caller has a profile and is not banned / currently suspended.
create or replace function myapp_is_active_user()
returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from myapp_profile p
    where p.id = auth.uid()
      and (p.status = 'active'
           or (p.status = 'suspended' and p.suspended_until is not null and p.suspended_until <= now()))
  )
$$;

create or replace function myapp_slugify(txt text)
returns text
language sql immutable as $$
  select coalesce(nullif(trim(both '-' from regexp_replace(lower(txt), '[^a-z0-9]+', '-', 'g')), ''), 'entry')
$$;

-- ---------------------------------------------------------------------------
-- Wiki entries, genres, images, revision history
-- ---------------------------------------------------------------------------

create table if not exists myapp_genre (
  id   bigint generated always as identity primary key,
  name text not null unique check (char_length(name) between 1 and 50)
);

create table if not exists myapp_entry (
  id          bigint generated always as identity primary key,
  slug        text not null unique,
  title       text not null check (char_length(title) between 1 and 200),
  description text not null default '' check (char_length(description) <= 20000),
  location    text check (char_length(location) <= 200),           -- town / state
  created_by  uuid references myapp_profile(id) on delete set null,
  updated_by  uuid references myapp_profile(id) on delete set null,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  deleted_at  timestamptz,                                         -- soft delete
  search      tsvector generated always as (
    to_tsvector('english', coalesce(title, '') || ' ' || coalesce(description, '') || ' ' || coalesce(location, ''))
  ) stored
);

create index if not exists myapp_entry_search_idx  on myapp_entry using gin (search);
create index if not exists myapp_entry_deleted_idx on myapp_entry (deleted_at);

create table if not exists myapp_entry_genre (
  entry_id bigint not null references myapp_entry(id) on delete cascade,
  genre_id bigint not null references myapp_genre(id) on delete cascade,
  primary key (entry_id, genre_id)
);
create index if not exists myapp_entry_genre_genre_idx on myapp_entry_genre (genre_id);

create table if not exists myapp_entry_image (
  id           bigint generated always as identity primary key,
  entry_id     bigint not null references myapp_entry(id) on delete cascade,
  storage_path text not null,                                      -- path inside the 'entry-images' bucket
  caption      text,
  uploaded_by  uuid references myapp_profile(id) on delete set null,
  created_at   timestamptz not null default now()
);
create index if not exists myapp_entry_image_entry_idx on myapp_entry_image (entry_id);

-- Edit log: who changed an entry and what changed. Written by trigger, never by clients.
create table if not exists myapp_entry_revision (
  id         bigint generated always as identity primary key,
  entry_id   bigint not null references myapp_entry(id) on delete cascade,
  editor_id  uuid references myapp_profile(id) on delete set null,
  action     text not null check (action in ('create', 'edit', 'delete', 'restore')),
  old_data   jsonb,                                                -- only the fields that changed
  new_data   jsonb,
  created_at timestamptz not null default now()
);
create index if not exists myapp_entry_revision_entry_idx on myapp_entry_revision (entry_id, created_at desc);

-- ---------------------------------------------------------------------------
-- Change requests (new entry / edit / delete) awaiting moderator review
-- ---------------------------------------------------------------------------
-- proposed_data shape (all keys optional except title on 'create'):
--   { "title": "...", "description": "...", "location": "...",
--     "genre_ids": [1, 2], "images": [{ "storage_path": "...", "caption": "..." }] }

create table if not exists myapp_change_request (
  id            bigint generated always as identity primary key,
  request_type  myapp_request_type not null,
  entry_id      bigint references myapp_entry(id) on delete cascade,  -- null for 'create' until approved
  requestor_id  uuid not null references myapp_profile(id) on delete cascade,
  proposed_data jsonb not null default '{}'::jsonb,
  reason        text,
  status        myapp_request_status not null default 'pending',
  reviewed_by   uuid references myapp_profile(id) on delete set null,
  reviewed_at   timestamptz,
  review_note   text,
  created_at    timestamptz not null default now(),
  constraint myapp_change_request_object  check (jsonb_typeof(proposed_data) = 'object'),
  constraint myapp_change_request_entry   check (request_type = 'create' or entry_id is not null),
  constraint myapp_change_request_title   check (request_type <> 'create' or nullif(trim(proposed_data ->> 'title'), '') is not null)
);
create index if not exists myapp_change_request_status_idx    on myapp_change_request (status, created_at);
create index if not exists myapp_change_request_requestor_idx on myapp_change_request (requestor_id);

-- ---------------------------------------------------------------------------
-- Discussions
-- ---------------------------------------------------------------------------

create table if not exists myapp_discussion (
  id         bigint generated always as identity primary key,
  entry_id   bigint references myapp_entry(id) on delete set null,   -- optional link to a band page
  title      text not null check (char_length(title) between 1 and 200),
  created_by uuid references myapp_profile(id) on delete set null,
  created_at timestamptz not null default now()
);
create index if not exists myapp_discussion_entry_idx on myapp_discussion (entry_id);

create table if not exists myapp_post (
  id            bigint generated always as identity primary key,
  discussion_id bigint not null references myapp_discussion(id) on delete cascade,
  author_id     uuid not null references myapp_profile(id) on delete cascade,
  contents      text not null check (char_length(contents) between 1 and 5000),
  created_at    timestamptz not null default now(),
  edited_at     timestamptz
);
create index if not exists myapp_post_discussion_idx on myapp_post (discussion_id, created_at);

-- ---------------------------------------------------------------------------
-- Triggers
-- ---------------------------------------------------------------------------

-- Only moderators may change role / status / suspension, and never their own.
-- auth.uid() is null for the service role and the SQL editor, which bypass this check.
create or replace function myapp_profile_guard()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.id is distinct from old.id then
    raise exception 'Profile id cannot be changed' using errcode = '42501';
  end if;

  if auth.uid() is not null and (
       new.role            is distinct from old.role
    or new.status          is distinct from old.status
    or new.suspended_until is distinct from old.suspended_until) then
    if not myapp_is_moderator() then
      raise exception 'Only moderators can change role or status' using errcode = '42501';
    end if;
    if new.id = auth.uid() then
      raise exception 'Moderators cannot change their own role or status' using errcode = '42501';
    end if;
  end if;
  return new;
end $$;

drop trigger if exists myapp_profile_guard on myapp_profile;
create trigger myapp_profile_guard before update on myapp_profile
  for each row execute function myapp_profile_guard();

-- Stamp updated_at / updated_by. The editor is, in order of preference: the requester whose
-- change is being applied by myapp_review_request, the signed-in user, or the supplied value.
create or replace function myapp_entry_before_write()
returns trigger language plpgsql as $$
begin
  new.updated_at := now();
  new.updated_by := coalesce(nullif(current_setting('myapp.acting_editor', true), '')::uuid, auth.uid(), new.updated_by);
  return new;
end $$;

drop trigger if exists myapp_entry_before_write on myapp_entry;
create trigger myapp_entry_before_write before insert or update on myapp_entry
  for each row execute function myapp_entry_before_write();

-- Write the edit log.
create or replace function myapp_entry_after_write()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_new    jsonb;
  v_old    jsonb;
  v_action text;
begin
  if tg_op = 'INSERT' then
    insert into myapp_entry_revision (entry_id, editor_id, action, new_data)
    values (new.id, new.updated_by, 'create',
            jsonb_build_object('title', new.title, 'description', new.description, 'location', new.location));
    return new;
  end if;

  select coalesce(jsonb_object_agg(n.key, n.value), '{}'::jsonb) into v_new
  from jsonb_each(to_jsonb(new)) n
  where n.key not in ('updated_at', 'updated_by', 'search')
    and to_jsonb(old) -> n.key is distinct from n.value;

  if v_new = '{}'::jsonb then
    return new;
  end if;

  select coalesce(jsonb_object_agg(o.key, o.value), '{}'::jsonb) into v_old
  from jsonb_each(to_jsonb(old)) o
  where v_new ? o.key;

  v_action := case
    when old.deleted_at is null     and new.deleted_at is not null then 'delete'
    when old.deleted_at is not null and new.deleted_at is null     then 'restore'
    else 'edit'
  end;

  insert into myapp_entry_revision (entry_id, editor_id, action, old_data, new_data)
  values (new.id, new.updated_by, v_action, v_old, v_new);
  return new;
end $$;

drop trigger if exists myapp_entry_after_write on myapp_entry;
create trigger myapp_entry_after_write after insert or update on myapp_entry
  for each row execute function myapp_entry_after_write();

-- Comments: authors can edit contents only; edited_at is stamped automatically.
create or replace function myapp_post_before_update()
returns trigger language plpgsql as $$
begin
  new.discussion_id := old.discussion_id;
  new.author_id     := old.author_id;
  new.created_at    := old.created_at;
  if new.contents is distinct from old.contents then
    new.edited_at := now();
  else
    new.edited_at := old.edited_at;
  end if;
  return new;
end $$;

drop trigger if exists myapp_post_before_update on myapp_post;
create trigger myapp_post_before_update before update on myapp_post
  for each row execute function myapp_post_before_update();

-- ---------------------------------------------------------------------------
-- Request review: approve or deny, applying the change atomically.
-- Call as a moderator (auth.uid() is used) or from the service role (pass p_reviewer).
-- ---------------------------------------------------------------------------

create or replace function myapp_review_request(
  p_request_id bigint,
  p_approve    boolean,
  p_note       text default null,
  p_reviewer   uuid default null
)
returns myapp_change_request
language plpgsql security definer set search_path = public as $$
declare
  v_reviewer uuid := coalesce(auth.uid(), p_reviewer);
  v_req      myapp_change_request;
  v_data     jsonb;
  v_entry_id bigint;
  v_slug     text;
begin
  if v_reviewer is null or not exists (
    select 1 from myapp_profile where id = v_reviewer and role = 'moderator' and status = 'active'
  ) then
    raise exception 'Only active moderators can review requests' using errcode = '42501';
  end if;

  select * into v_req from myapp_change_request where id = p_request_id for update;
  if not found then
    raise exception 'Request % not found', p_request_id using errcode = 'P0002';
  end if;
  if v_req.status <> 'pending' then
    raise exception 'Request % has already been reviewed', p_request_id;
  end if;

  if p_approve then
    v_data     := v_req.proposed_data;
    v_entry_id := v_req.entry_id;

    -- Credit the edit to the requester, not the approving moderator (transaction-local).
    perform set_config('myapp.acting_editor', v_req.requestor_id::text, true);

    if v_req.request_type = 'create' then
      v_slug := myapp_slugify(v_data ->> 'title');
      if exists (select 1 from myapp_entry where slug = v_slug) then
        v_slug := v_slug || '-' || p_request_id;
      end if;
      insert into myapp_entry (slug, title, description, location, created_by, updated_by)
      values (v_slug, trim(v_data ->> 'title'), coalesce(v_data ->> 'description', ''),
              v_data ->> 'location', v_req.requestor_id, v_req.requestor_id)
      returning id into v_entry_id;

    elsif v_req.request_type = 'edit' then
      update myapp_entry set
        title       = coalesce(nullif(trim(v_data ->> 'title'), ''), title),
        description = coalesce(v_data ->> 'description', description),
        location    = case when v_data ? 'location' then v_data ->> 'location' else location end
      where id = v_entry_id and deleted_at is null;
      if not found then
        raise exception 'Entry % no longer exists', v_entry_id;
      end if;

    else -- delete
      update myapp_entry set deleted_at = now() where id = v_entry_id and deleted_at is null;
      if not found then
        raise exception 'Entry % no longer exists', v_entry_id;
      end if;
    end if;

    if v_req.request_type in ('create', 'edit') then
      if jsonb_typeof(v_data -> 'genre_ids') = 'array' then
        delete from myapp_entry_genre where entry_id = v_entry_id;
        insert into myapp_entry_genre (entry_id, genre_id)
        select distinct v_entry_id, g.id
        from jsonb_array_elements_text(v_data -> 'genre_ids') x
        join myapp_genre g on g.id = x.value::bigint;
      end if;

      if jsonb_typeof(v_data -> 'images') = 'array' then
        insert into myapp_entry_image (entry_id, storage_path, caption, uploaded_by)
        select v_entry_id, i ->> 'storage_path', i ->> 'caption', v_req.requestor_id
        from jsonb_array_elements(v_data -> 'images') i
        where nullif(i ->> 'storage_path', '') is not null;
      end if;
    end if;

    perform set_config('myapp.acting_editor', '', true);
  end if;

  update myapp_change_request set
    status      = (case when p_approve then 'approved' else 'denied' end)::myapp_request_status,
    reviewed_by = v_reviewer,
    reviewed_at = now(),
    review_note = p_note,
    entry_id    = coalesce(v_entry_id, entry_id)
  where id = p_request_id
  returning * into v_req;

  return v_req;
end $$;

revoke all on function myapp_review_request(bigint, boolean, text, uuid) from public, anon;
grant execute on function myapp_review_request(bigint, boolean, text, uuid) to authenticated, service_role;

-- ---------------------------------------------------------------------------
-- Row Level Security
-- Anonymous visitors can read; registered users write through requests and discussions;
-- moderators edit directly. The service role (used by the Next.js API routes) bypasses RLS.
-- ---------------------------------------------------------------------------

alter table myapp_profile        enable row level security;
alter table myapp_genre          enable row level security;
alter table myapp_entry          enable row level security;
alter table myapp_entry_genre    enable row level security;
alter table myapp_entry_image    enable row level security;
alter table myapp_entry_revision enable row level security;
alter table myapp_change_request enable row level security;
alter table myapp_discussion     enable row level security;
alter table myapp_post           enable row level security;

-- Profiles ------------------------------------------------------------------
drop policy if exists "profile read"   on myapp_profile;
drop policy if exists "profile insert" on myapp_profile;
drop policy if exists "profile update" on myapp_profile;

create policy "profile read"   on myapp_profile for select using (true);
create policy "profile insert" on myapp_profile for insert to authenticated
  with check (id = auth.uid() and role = 'user' and status = 'active');
create policy "profile update" on myapp_profile for update to authenticated
  using (id = auth.uid() or myapp_is_moderator())
  with check (id = auth.uid() or myapp_is_moderator());

-- Genres / entries / images (moderators write directly) ------------------------
drop policy if exists "genre read"         on myapp_genre;
drop policy if exists "genre write"        on myapp_genre;
drop policy if exists "entry read"         on myapp_entry;
drop policy if exists "entry insert"       on myapp_entry;
drop policy if exists "entry update"       on myapp_entry;
drop policy if exists "entry_genre read"   on myapp_entry_genre;
drop policy if exists "entry_genre write"  on myapp_entry_genre;
drop policy if exists "entry_image read"   on myapp_entry_image;
drop policy if exists "entry_image write"  on myapp_entry_image;
drop policy if exists "revision read"      on myapp_entry_revision;

create policy "genre read"  on myapp_genre for select using (true);
create policy "genre write" on myapp_genre for all to authenticated
  using (myapp_is_moderator()) with check (myapp_is_moderator());

create policy "entry read"   on myapp_entry for select using (deleted_at is null or myapp_is_moderator());
create policy "entry insert" on myapp_entry for insert to authenticated
  with check (myapp_is_moderator() and created_by = auth.uid());
create policy "entry update" on myapp_entry for update to authenticated
  using (myapp_is_moderator()) with check (myapp_is_moderator());
-- No delete policy: entries are soft-deleted via deleted_at so history is kept.

create policy "entry_genre read"  on myapp_entry_genre for select using (true);
create policy "entry_genre write" on myapp_entry_genre for all to authenticated
  using (myapp_is_moderator()) with check (myapp_is_moderator());

create policy "entry_image read"  on myapp_entry_image for select using (true);
create policy "entry_image write" on myapp_entry_image for all to authenticated
  using (myapp_is_moderator()) with check (myapp_is_moderator());

create policy "revision read" on myapp_entry_revision for select using (true);
-- No write policies: only the security-definer trigger inserts revisions.

-- Change requests -------------------------------------------------------------
drop policy if exists "request read"   on myapp_change_request;
drop policy if exists "request insert" on myapp_change_request;
drop policy if exists "request delete" on myapp_change_request;

create policy "request read" on myapp_change_request for select to authenticated
  using (requestor_id = auth.uid() or myapp_is_moderator());
create policy "request insert" on myapp_change_request for insert to authenticated
  with check (requestor_id = auth.uid() and status = 'pending'
              and reviewed_by is null and reviewed_at is null and myapp_is_active_user());
create policy "request delete" on myapp_change_request for delete to authenticated
  using (requestor_id = auth.uid() and status = 'pending');   -- withdraw own pending request
-- No update policy: approval/denial goes through myapp_review_request().

-- Discussions and comments ------------------------------------------------------
drop policy if exists "discussion read"   on myapp_discussion;
drop policy if exists "discussion insert" on myapp_discussion;
drop policy if exists "discussion delete" on myapp_discussion;
drop policy if exists "post read"         on myapp_post;
drop policy if exists "post insert"       on myapp_post;
drop policy if exists "post update"       on myapp_post;
drop policy if exists "post delete"       on myapp_post;

create policy "discussion read"   on myapp_discussion for select using (true);
create policy "discussion insert" on myapp_discussion for insert to authenticated
  with check (created_by = auth.uid() and myapp_is_active_user());
create policy "discussion delete" on myapp_discussion for delete to authenticated
  using (myapp_is_moderator());

create policy "post read"   on myapp_post for select using (true);
create policy "post insert" on myapp_post for insert to authenticated
  with check (author_id = auth.uid() and myapp_is_active_user());
create policy "post update" on myapp_post for update to authenticated
  using (author_id = auth.uid() and myapp_is_active_user())
  with check (author_id = auth.uid());
-- Authors delete their own comments; moderators delete anyone's except other moderators'.
create policy "post delete" on myapp_post for delete to authenticated
  using (author_id = auth.uid()
         or (myapp_is_moderator() and myapp_role_of(author_id) is distinct from 'moderator'));

-- ---------------------------------------------------------------------------
-- Storage buckets (public read; the API/service role handles avatar uploads)
-- ---------------------------------------------------------------------------

insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true), ('entry-images', 'entry-images', true)
on conflict (id) do nothing;

drop policy if exists "entry images upload" on storage.objects;
drop policy if exists "entry images delete" on storage.objects;

create policy "entry images upload" on storage.objects for insert to authenticated
  with check (bucket_id = 'entry-images' and myapp_is_active_user());
create policy "entry images delete" on storage.objects for delete to authenticated
  using (bucket_id = 'entry-images' and myapp_is_moderator());

-- ---------------------------------------------------------------------------
-- Seed data
-- ---------------------------------------------------------------------------

insert into myapp_genre (name) values
  ('Punk'), ('Hardcore'), ('Post-Hardcore'), ('Pop Punk'), ('Emo'), ('Indie Rock'),
  ('Folk'), ('Singer-Songwriter'), ('Metal'), ('Hip Hop'), ('Electronic'), ('Shoegaze'),
  ('Math Rock'), ('Noise'), ('Ska'), ('Jazz')
on conflict (name) do nothing;
