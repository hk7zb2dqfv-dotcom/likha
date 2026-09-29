create schema if not exists private;
revoke all on schema private from public;
grant usage on schema private to anon, authenticated;

create table if not exists public.likha_site_config (
  id boolean primary key default true check (id),
  theme jsonb not null default '{"primary":"#173a2d","secondary":"#d3a43c","background":"#f4f4ed","text":"#17251e","accent":"#bd4c34","button":"#173a2d","nav":"#10271f","headingFont":"Playfair Display","bodyFont":"DM Sans"}'::jsonb,
  logo_url text not null default 'assets/likha-logo.png',
  cover_url text not null default 'assets/likha-cover.jpg',
  background_image_url text,
  hero_art_url text not null default 'assets/studio-study.jpg',
  school_email_domain text,
  social_links jsonb not null default '{"facebook":"https://www.facebook.com/share/1bakt6K9i3/?mibextid=wwXIfr","instagram":"https://www.instagram.com/nuc_likha?stkn=ZDhoN3NleWxtdnR4","messenger":"https://m.me/cm/AbaSoX92N1rJONYl/?send_source=cm:copy_invite_link"}'::jsonb,
  updated_at timestamptz not null default now()
);

create table if not exists public.likha_home_content (
  id boolean primary key default true check (id),
  tagline text not null default 'Create. Express. Belong.',
  intro text not null default 'A home for artists, writers, makers and curious minds at NU Cebu.',
  subtitle text not null default 'Ideas become things we can share.',
  about_title text not null default 'A community made to create',
  about_body text not null default 'LIKHA is the arts club of NU Cebu. We bring people together to make, learn and share creative work across disciplines.',
  join_copy text not null default 'Bring your ideas, your practice, or just your curiosity. There is room to begin here.',
  updated_at timestamptz not null default now()
);

create table if not exists public.likha_profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null,
  email text not null,
  display_name text,
  community_type text not null default 'student' check (community_type in ('student','faculty','staff')),
  course text not null default '',
  year_level text,
  contact_info text not null default '',
  interests text[] not null default '{}',
  profile_image_url text,
  role text not null default 'member' check (role in ('member','sub_admin','main_admin')),
  permissions jsonb not null default '{}'::jsonb,
  membership_status text not null default 'active' check (membership_status in ('active','pending','suspended')),
  account_status text not null default 'active' check (account_status in ('active','restricted','banned')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index if not exists likha_profiles_email_lower_idx on public.likha_profiles (lower(email));

create table if not exists public.likha_membership_applications (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null unique references public.likha_profiles(id) on delete cascade,
  status text not null default 'active' check (status in ('active','pending','suspended')),
  consented_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create table if not exists public.likha_admin_requests (
  id uuid primary key default gen_random_uuid(),
  applicant_id uuid not null default auth.uid() references public.likha_profiles(id) on delete cascade,
  reason text not null check (char_length(reason) between 20 and 1200),
  status text not null default 'pending' check (status in ('pending','approved','rejected')),
  reviewed_by uuid references public.likha_profiles(id) on delete set null,
  reviewed_at timestamptz,
  created_at timestamptz not null default now()
);
create unique index if not exists likha_one_pending_admin_request_per_user on public.likha_admin_requests(applicant_id) where status = 'pending';

create table if not exists public.likha_artists (
  id text primary key default gen_random_uuid()::text,
  name text not null,
  bio text not null default '',
  program text not null default '',
  interests text[] not null default '{}',
  profile_image_url text,
  external_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.likha_ateliers (
  id text primary key default gen_random_uuid()::text,
  slug text not null unique,
  name text not null,
  description text not null default '',
  cover_image_url text,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.likha_artworks (
  id text primary key default gen_random_uuid()::text,
  title text not null,
  caption text not null default '',
  description text not null default '',
  image_url text,
  artist_id text references public.likha_artists(id) on delete set null,
  atelier_id text references public.likha_ateliers(id) on delete set null,
  category text,
  featured boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.likha_announcements (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  body text not null,
  image_url text,
  link_url text,
  published boolean not null default false,
  published_at timestamptz,
  created_by uuid references public.likha_profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.likha_chat_messages (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  display_name text not null,
  body text not null default '' check (char_length(body) <= 1000),
  image_path text,
  sticker text,
  moderation_status text not null default 'visible' check (moderation_status in ('visible','removed')),
  created_at timestamptz not null default now(),
  check (body <> '' or image_path is not null or sticker is not null)
);
create index if not exists likha_chat_messages_created_idx on public.likha_chat_messages(created_at desc);

create table if not exists public.likha_chat_reports (
  id uuid primary key default gen_random_uuid(),
  message_id uuid not null references public.likha_chat_messages(id) on delete cascade,
  reporter_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  reason text not null check (char_length(reason) between 2 and 80),
  status text not null default 'open' check (status in ('open','dismissed','resolved')),
  reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  unique(message_id, reporter_id)
);

create table if not exists public.likha_audit_log (
  id bigint generated by default as identity primary key,
  actor_id uuid,
  action text not null,
  entity text not null,
  entity_id text,
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

insert into public.likha_site_config(id) values (true) on conflict (id) do nothing;
insert into public.likha_home_content(id) values (true) on conflict (id) do nothing;

create or replace function private.is_main_admin()
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.likha_profiles p
    where p.id = (select auth.uid()) and p.role = 'main_admin' and p.account_status = 'active'
  );
$$;

create or replace function private.can_manage_content()
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.likha_profiles p
    where p.id = (select auth.uid()) and p.account_status = 'active'
      and (p.role = 'main_admin' or (p.role = 'sub_admin' and coalesce((p.permissions ->> 'content')::boolean, false)))
  );
$$;

create or replace function private.can_moderate_chat()
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.likha_profiles p
    where p.id = (select auth.uid()) and p.account_status = 'active'
      and (p.role = 'main_admin' or (p.role = 'sub_admin' and coalesce((p.permissions ->> 'moderate_chat')::boolean, false)))
  );
$$;

create or replace function private.can_restrict_members()
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.likha_profiles p
    where p.id = (select auth.uid()) and p.account_status = 'active'
      and (p.role = 'main_admin' or (p.role = 'sub_admin' and coalesce((p.permissions ->> 'restrict_users')::boolean, false)))
  );
$$;

create or replace function private.can_read_chat()
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.likha_profiles p
    where p.id = (select auth.uid()) and p.membership_status = 'active' and p.account_status in ('active','restricted')
  );
$$;

create or replace function private.can_post_chat()
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.likha_profiles p
    where p.id = (select auth.uid()) and p.membership_status = 'active' and p.account_status = 'active'
  );
$$;

grant execute on function private.is_main_admin() to anon, authenticated;
grant execute on function private.can_manage_content() to anon, authenticated;
grant execute on function private.can_moderate_chat() to anon, authenticated;
grant execute on function private.can_restrict_members() to anon, authenticated;
grant execute on function private.can_read_chat() to anon, authenticated;
grant execute on function private.can_post_chat() to anon, authenticated;

create or replace function private.create_likha_member()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  metadata jsonb := coalesce(new.raw_user_meta_data, '{}'::jsonb);
  school_domain text;
  member_type text := coalesce(metadata ->> 'community_type', 'student');
  full_name_value text := btrim(coalesce(metadata ->> 'full_name', ''));
  interests_value text[] := '{}';
begin
  select c.school_email_domain into school_domain from public.likha_site_config c where c.id = true;
  if school_domain is not null and lower(new.email) not like '%@' || lower(school_domain) then
    raise exception 'Registration requires an approved school email address.';
  end if;
  if coalesce(metadata ->> 'consent', 'false') <> 'true' then
    raise exception 'Membership consent is required.';
  end if;
  if full_name_value = '' or char_length(full_name_value) > 100 then
    raise exception 'Enter a valid full name.';
  end if;
  if member_type not in ('student','faculty','staff') then
    raise exception 'Choose student, faculty or staff.';
  end if;
  if jsonb_typeof(metadata -> 'interests') = 'array' then
    select coalesce(array_agg(value), '{}') into interests_value from jsonb_array_elements_text(metadata -> 'interests') as value;
  end if;
  insert into public.likha_profiles(id, full_name, email, community_type, course, year_level, contact_info, interests)
  values (
    new.id, full_name_value, lower(new.email), member_type,
    left(coalesce(metadata ->> 'course', ''), 100), nullif(left(metadata ->> 'year_level', 30), ''),
    left(coalesce(metadata ->> 'contact_info', ''), 60), interests_value
  );
  insert into public.likha_membership_applications(profile_id, status) values (new.id, 'active');
  return new;
end;
$$;
revoke execute on function private.create_likha_member() from public, anon, authenticated;
drop trigger if exists likha_auth_user_created on auth.users;
create trigger likha_auth_user_created after insert on auth.users for each row execute function private.create_likha_member();

create or replace function private.set_chat_display_name()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  profile_name text;
  member_status text;
  account_state text;
begin
  select p.display_name, p.membership_status, p.account_status
    into profile_name, member_status, account_state
    from public.likha_profiles p where p.id = (select auth.uid());
  if member_status <> 'active' or account_state <> 'active' or profile_name is null or btrim(profile_name) = '' then
    raise exception 'An active LIKHA member with a chat display name is required.';
  end if;
  new.user_id := (select auth.uid());
  new.display_name := left(btrim(profile_name), 40);
  new.body := left(btrim(coalesce(new.body, '')), 1000);
  if new.body = '' and new.image_path is null and new.sticker is null then
    raise exception 'Add a message, image or sticker.';
  end if;
  return new;
end;
$$;
revoke execute on function private.set_chat_display_name() from public, anon, authenticated;
drop trigger if exists likha_chat_message_identity on public.likha_chat_messages;
create trigger likha_chat_message_identity before insert on public.likha_chat_messages for each row execute function private.set_chat_display_name();

create or replace function private.set_updated_at()
returns trigger language plpgsql set search_path = '' as $$
begin
  new.updated_at := now();
  return new;
end;
$$;
drop trigger if exists likha_profiles_updated_at on public.likha_profiles;
create trigger likha_profiles_updated_at before update on public.likha_profiles for each row execute function private.set_updated_at();
drop trigger if exists likha_artists_updated_at on public.likha_artists;
create trigger likha_artists_updated_at before update on public.likha_artists for each row execute function private.set_updated_at();
drop trigger if exists likha_ateliers_updated_at on public.likha_ateliers;
create trigger likha_ateliers_updated_at before update on public.likha_ateliers for each row execute function private.set_updated_at();
drop trigger if exists likha_artworks_updated_at on public.likha_artworks;
create trigger likha_artworks_updated_at before update on public.likha_artworks for each row execute function private.set_updated_at();
drop trigger if exists likha_home_updated_at on public.likha_home_content;
create trigger likha_home_updated_at before update on public.likha_home_content for each row execute function private.set_updated_at();
drop trigger if exists likha_site_updated_at on public.likha_site_config;
create trigger likha_site_updated_at before update on public.likha_site_config for each row execute function private.set_updated_at();
drop trigger if exists likha_announcements_updated_at on public.likha_announcements;
create trigger likha_announcements_updated_at before update on public.likha_announcements for each row execute function private.set_updated_at();

create or replace function public.likha_review_admin_request(p_request_id uuid, p_approved boolean, p_permissions jsonb default '{}'::jsonb)
returns void language plpgsql security definer set search_path = '' as $$
declare
  request_row public.likha_admin_requests%rowtype;
  permission_key text;
begin
  if not private.is_main_admin() then raise exception 'Main Admin access is required.'; end if;
  if p_permissions is null or jsonb_typeof(p_permissions) <> 'object' then raise exception 'Invalid permission set.'; end if;
  for permission_key in select jsonb_object_keys(p_permissions) loop
    if permission_key not in ('content','moderate_chat','restrict_users') or jsonb_typeof(p_permissions -> permission_key) <> 'boolean' then
      raise exception 'Invalid Sub-Admin permission.';
    end if;
  end loop;
  select * into request_row from public.likha_admin_requests where id = p_request_id for update;
  if not found or request_row.status <> 'pending' then raise exception 'This request is no longer pending.'; end if;
  update public.likha_admin_requests set status = case when p_approved then 'approved' else 'rejected' end,
    reviewed_by = (select auth.uid()), reviewed_at = now() where id = p_request_id;
  if p_approved then
    update public.likha_profiles set role = 'sub_admin', permissions = jsonb_build_object(
      'content', coalesce((p_permissions ->> 'content')::boolean, false),
      'moderate_chat', coalesce((p_permissions ->> 'moderate_chat')::boolean, false),
      'restrict_users', coalesce((p_permissions ->> 'restrict_users')::boolean, false)
    ) where id = request_row.applicant_id and membership_status = 'active' and account_status = 'active';
    if not found then raise exception 'The applicant no longer has an active member account.'; end if;
  end if;
  insert into public.likha_audit_log(actor_id, action, entity, entity_id, details)
  values ((select auth.uid()), case when p_approved then 'approve_admin_request' else 'reject_admin_request' end,
    'admin_request', p_request_id::text, jsonb_build_object('applicant_id', request_row.applicant_id));
end;
$$;

create or replace function public.likha_set_admin_permissions(p_user_id uuid, p_permissions jsonb, p_revoke boolean default false)
returns void language plpgsql security definer set search_path = '' as $$
declare
  permission_key text;
begin
  if not private.is_main_admin() then raise exception 'Main Admin access is required.'; end if;
  if p_permissions is null or jsonb_typeof(p_permissions) <> 'object' then raise exception 'Invalid permission set.'; end if;
  for permission_key in select jsonb_object_keys(p_permissions) loop
    if permission_key not in ('content','moderate_chat','restrict_users') or jsonb_typeof(p_permissions -> permission_key) <> 'boolean' then
      raise exception 'Invalid Sub-Admin permission.';
    end if;
  end loop;
  update public.likha_profiles set role = case when p_revoke then 'member' else 'sub_admin' end,
    permissions = case when p_revoke then '{}'::jsonb else p_permissions end
    where id = p_user_id and role = 'sub_admin';
  if not found then raise exception 'Sub-Admin account not found.'; end if;
  insert into public.likha_audit_log(actor_id, action, entity, entity_id, details)
  values ((select auth.uid()), case when p_revoke then 'revoke_sub_admin' else 'change_sub_admin_permissions' end,
    'profile', p_user_id::text, jsonb_build_object('permissions', p_permissions));
end;
$$;

create or replace function public.likha_set_member_status(p_user_id uuid, p_status text)
returns void language plpgsql security definer set search_path = '' as $$
declare
  target_role text;
begin
  if p_status not in ('active','restricted','banned') then raise exception 'Invalid account status.'; end if;
  if p_status <> 'active' and not private.can_restrict_members() then raise exception 'Member restriction permission is required.'; end if;
  if p_status = 'active' and not (private.is_main_admin() or private.can_restrict_members()) then raise exception 'Member restriction permission is required.'; end if;
  select role into target_role from public.likha_profiles where id = p_user_id for update;
  if not found then raise exception 'Member account not found.'; end if;
  if target_role = 'main_admin' then raise exception 'Main Admin accounts cannot be changed here.'; end if;
  update public.likha_profiles set account_status = p_status where id = p_user_id;
  insert into public.likha_audit_log(actor_id, action, entity, entity_id, details)
  values ((select auth.uid()), 'set_member_status', 'profile', p_user_id::text, jsonb_build_object('status', p_status));
end;
$$;

create or replace function public.likha_chat_member_summary(p_user_ids uuid[])
returns table(id uuid, full_name text, account_status text)
language plpgsql stable security definer set search_path = '' as $$
begin
  if not private.can_restrict_members() then raise exception 'Member restriction permission is required.'; end if;
  if cardinality(p_user_ids) > 100 then raise exception 'Request no more than 100 member summaries.'; end if;
  return query select p.id, p.full_name, p.account_status from public.likha_profiles p where p.id = any(p_user_ids);
end;
$$;

revoke all on function public.likha_review_admin_request(uuid, boolean, jsonb) from public, anon;
revoke all on function public.likha_set_admin_permissions(uuid, jsonb, boolean) from public, anon;
revoke all on function public.likha_set_member_status(uuid, text) from public, anon;
revoke all on function public.likha_chat_member_summary(uuid[]) from public, anon;
grant execute on function public.likha_review_admin_request(uuid, boolean, jsonb) to authenticated;
grant execute on function public.likha_set_admin_permissions(uuid, jsonb, boolean) to authenticated;
grant execute on function public.likha_set_member_status(uuid, text) to authenticated;
grant execute on function public.likha_chat_member_summary(uuid[]) to authenticated;

create or replace function private.log_likha_change()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  record_value jsonb;
begin
  record_value := case when tg_op = 'DELETE' then to_jsonb(old) else to_jsonb(new) end;
  insert into public.likha_audit_log(actor_id, action, entity, entity_id)
  values ((select auth.uid()), lower(tg_op), tg_table_name, record_value ->> 'id');
  if tg_op = 'DELETE' then
    return old;
  end if;
  return new;
end;
$$;
revoke execute on function private.log_likha_change() from public, anon, authenticated;
drop trigger if exists likha_artwork_audit on public.likha_artworks;
create trigger likha_artwork_audit after insert or update or delete on public.likha_artworks for each row execute function private.log_likha_change();
drop trigger if exists likha_artist_audit on public.likha_artists;
create trigger likha_artist_audit after insert or update or delete on public.likha_artists for each row execute function private.log_likha_change();
drop trigger if exists likha_atelier_audit on public.likha_ateliers;
create trigger likha_atelier_audit after insert or update or delete on public.likha_ateliers for each row execute function private.log_likha_change();
drop trigger if exists likha_announcement_audit on public.likha_announcements;
create trigger likha_announcement_audit after insert or update or delete on public.likha_announcements for each row execute function private.log_likha_change();
drop trigger if exists likha_site_config_audit on public.likha_site_config;
create trigger likha_site_config_audit after update on public.likha_site_config for each row execute function private.log_likha_change();
drop trigger if exists likha_home_content_audit on public.likha_home_content;
create trigger likha_home_content_audit after update on public.likha_home_content for each row execute function private.log_likha_change();
drop trigger if exists likha_chat_report_audit on public.likha_chat_reports;
create trigger likha_chat_report_audit after update on public.likha_chat_reports for each row execute function private.log_likha_change();

alter table public.likha_site_config enable row level security;
alter table public.likha_home_content enable row level security;
alter table public.likha_profiles enable row level security;
alter table public.likha_membership_applications enable row level security;
alter table public.likha_admin_requests enable row level security;
alter table public.likha_artists enable row level security;
alter table public.likha_ateliers enable row level security;
alter table public.likha_artworks enable row level security;
alter table public.likha_announcements enable row level security;
alter table public.likha_chat_messages enable row level security;
alter table public.likha_chat_reports enable row level security;
alter table public.likha_audit_log enable row level security;

revoke all on public.likha_site_config, public.likha_home_content, public.likha_profiles,
  public.likha_membership_applications, public.likha_admin_requests, public.likha_artists,
  public.likha_ateliers, public.likha_artworks, public.likha_announcements,
  public.likha_chat_messages, public.likha_chat_reports, public.likha_audit_log from anon, authenticated;

grant select on public.likha_site_config, public.likha_home_content, public.likha_artists,
  public.likha_ateliers, public.likha_artworks, public.likha_announcements to anon, authenticated;
grant select on public.likha_profiles, public.likha_membership_applications,
  public.likha_admin_requests, public.likha_chat_messages, public.likha_chat_reports,
  public.likha_audit_log to authenticated;
grant update(theme,logo_url,cover_url,background_image_url,hero_art_url,school_email_domain,social_links) on public.likha_site_config to authenticated;
grant update(tagline,intro,subtitle,about_title,about_body,join_copy) on public.likha_home_content to authenticated;
grant update(full_name,display_name,community_type,course,year_level,contact_info,interests,profile_image_url) on public.likha_profiles to authenticated;
grant insert, update, delete on public.likha_artists, public.likha_ateliers,
  public.likha_artworks, public.likha_announcements to authenticated;
grant insert on public.likha_admin_requests to authenticated;
grant insert on public.likha_chat_messages, public.likha_chat_reports to authenticated;
grant update(moderation_status) on public.likha_chat_messages to authenticated;
grant update(status,reviewed_at) on public.likha_chat_reports to authenticated;

drop policy if exists likha_site_config_public_read on public.likha_site_config;
create policy likha_site_config_public_read on public.likha_site_config for select to anon, authenticated using (true);
drop policy if exists likha_site_config_main_update on public.likha_site_config;
create policy likha_site_config_main_update on public.likha_site_config for update to authenticated using ((select private.is_main_admin())) with check ((select private.is_main_admin()));
drop policy if exists likha_home_public_read on public.likha_home_content;
create policy likha_home_public_read on public.likha_home_content for select to anon, authenticated using (true);
drop policy if exists likha_home_main_update on public.likha_home_content;
create policy likha_home_main_update on public.likha_home_content for update to authenticated using ((select private.is_main_admin())) with check ((select private.is_main_admin()));

drop policy if exists likha_profile_private_read on public.likha_profiles;
create policy likha_profile_private_read on public.likha_profiles for select to authenticated using (id = (select auth.uid()) or (select private.is_main_admin()));
drop policy if exists likha_profile_self_update on public.likha_profiles;
create policy likha_profile_self_update on public.likha_profiles for update to authenticated using (id = (select auth.uid())) with check (id = (select auth.uid()));
drop policy if exists likha_membership_owner_read on public.likha_membership_applications;
create policy likha_membership_owner_read on public.likha_membership_applications for select to authenticated using (profile_id = (select auth.uid()) or (select private.is_main_admin()));

drop policy if exists likha_admin_request_read on public.likha_admin_requests;
create policy likha_admin_request_read on public.likha_admin_requests for select to authenticated using (applicant_id = (select auth.uid()) or (select private.is_main_admin()));
drop policy if exists likha_admin_request_create on public.likha_admin_requests;
create policy likha_admin_request_create on public.likha_admin_requests for insert to authenticated with check (applicant_id = (select auth.uid()) and status = 'pending' and (select private.can_post_chat()));

drop policy if exists likha_artists_public_read on public.likha_artists;
create policy likha_artists_public_read on public.likha_artists for select to anon, authenticated using (true);
drop policy if exists likha_artists_manage on public.likha_artists;
create policy likha_artists_manage on public.likha_artists for all to authenticated using ((select private.can_manage_content())) with check ((select private.can_manage_content()));
drop policy if exists likha_ateliers_public_read on public.likha_ateliers;
create policy likha_ateliers_public_read on public.likha_ateliers for select to anon, authenticated using (true);
drop policy if exists likha_ateliers_manage on public.likha_ateliers;
create policy likha_ateliers_manage on public.likha_ateliers for all to authenticated using ((select private.can_manage_content())) with check ((select private.can_manage_content()));
drop policy if exists likha_artworks_public_read on public.likha_artworks;
create policy likha_artworks_public_read on public.likha_artworks for select to anon, authenticated using (true);
drop policy if exists likha_artworks_manage on public.likha_artworks;
create policy likha_artworks_manage on public.likha_artworks for all to authenticated using ((select private.can_manage_content())) with check ((select private.can_manage_content()));
drop policy if exists likha_announcements_public_read on public.likha_announcements;
create policy likha_announcements_public_read on public.likha_announcements for select to anon, authenticated using (published or (select private.can_manage_content()));
drop policy if exists likha_announcements_manage on public.likha_announcements;
create policy likha_announcements_manage on public.likha_announcements for all to authenticated using ((select private.can_manage_content())) with check ((select private.can_manage_content()));

drop policy if exists likha_chat_members_read on public.likha_chat_messages;
create policy likha_chat_members_read on public.likha_chat_messages for select to authenticated using ((select private.can_read_chat()) and (moderation_status = 'visible' or (select private.can_moderate_chat())));
drop policy if exists likha_chat_members_send on public.likha_chat_messages;
create policy likha_chat_members_send on public.likha_chat_messages for insert to authenticated with check ((select private.can_post_chat()) and user_id = (select auth.uid()) and moderation_status = 'visible' and (image_path is null or split_part(image_path, '/', 1) = (select auth.uid())::text));
drop policy if exists likha_chat_moderators_update on public.likha_chat_messages;
create policy likha_chat_moderators_update on public.likha_chat_messages for update to authenticated using ((select private.can_moderate_chat())) with check ((select private.can_moderate_chat()));
drop policy if exists likha_reporter_create on public.likha_chat_reports;
create policy likha_reporter_create on public.likha_chat_reports for insert to authenticated with check (reporter_id = (select auth.uid()) and (select private.can_post_chat()));
drop policy if exists likha_moderator_read_reports on public.likha_chat_reports;
create policy likha_moderator_read_reports on public.likha_chat_reports for select to authenticated using ((select private.can_moderate_chat()));
drop policy if exists likha_moderator_update_reports on public.likha_chat_reports;
create policy likha_moderator_update_reports on public.likha_chat_reports for update to authenticated using ((select private.can_moderate_chat())) with check ((select private.can_moderate_chat()));
drop policy if exists likha_audit_main_read on public.likha_audit_log;
create policy likha_audit_main_read on public.likha_audit_log for select to authenticated using ((select private.is_main_admin()));

insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values ('likha-site-media','likha-site-media',true,8388608,array['image/jpeg','image/png','image/webp'])
on conflict (id) do update set public = excluded.public, file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values ('likha-chat-media','likha-chat-media',false,8388608,array['image/jpeg','image/png','image/webp'])
on conflict (id) do update set public = excluded.public, file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists likha_site_media_manager_insert on storage.objects;
create policy likha_site_media_manager_insert on storage.objects for insert to authenticated with check (bucket_id = 'likha-site-media' and (select private.can_manage_content()));
drop policy if exists likha_site_media_manager_update on storage.objects;
create policy likha_site_media_manager_update on storage.objects for update to authenticated using (bucket_id = 'likha-site-media' and (select private.can_manage_content())) with check (bucket_id = 'likha-site-media' and (select private.can_manage_content()));
drop policy if exists likha_site_media_manager_delete on storage.objects;
create policy likha_site_media_manager_delete on storage.objects for delete to authenticated using (bucket_id = 'likha-site-media' and (select private.can_manage_content()));
drop policy if exists likha_chat_media_member_read on storage.objects;
create policy likha_chat_media_member_read on storage.objects for select to authenticated using (
  bucket_id = 'likha-chat-media'
  and (select private.can_read_chat())
  and exists (
    select 1 from public.likha_chat_messages m
    where m.image_path = name
      and (m.moderation_status = 'visible' or (select private.can_moderate_chat()))
  )
);
drop policy if exists likha_chat_media_member_insert on storage.objects;
create policy likha_chat_media_member_insert on storage.objects for insert to authenticated with check (bucket_id = 'likha-chat-media' and (storage.foldername(name))[1] = (select auth.uid())::text and (select private.can_post_chat()));
drop policy if exists likha_chat_media_moderator_delete on storage.objects;
create policy likha_chat_media_moderator_delete on storage.objects for delete to authenticated using (bucket_id = 'likha-chat-media' and (select private.can_moderate_chat()));

do $$
declare
  atelier_id_expr text;
  atelier_ref_expr text := 'null::text';
  query_text text;
begin
  if to_regclass('public.artists') is not null
    and exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'artists' and column_name = 'id')
    and exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'artists' and column_name = 'name') then
    execute $sql$
      insert into public.likha_artists(id,name,bio,profile_image_url,created_at)
      select id::text,name,coalesce(bio,''),nullif(photo_url,''),coalesce(created_at,now()) from public.artists
      on conflict(id) do nothing
    $sql$;
  end if;
  if to_regclass('public.ateliers') is not null
    and exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'ateliers' and column_name = 'slug')
    and exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'ateliers' and column_name = 'name') then
    select case when exists (select 1 from information_schema.columns where table_schema='public' and table_name='ateliers' and column_name='id') then 'id::text' else 'slug::text' end into atelier_id_expr;
    query_text := format($sql$
      insert into public.likha_ateliers(id,slug,name,sort_order)
      select %s,slug::text,name,coalesce(sort,0) from public.ateliers
      on conflict(id) do nothing
    $sql$, atelier_id_expr);
    execute query_text;
  end if;
  if to_regclass('public.artworks') is not null
    and exists (select 1 from information_schema.columns where table_schema='public' and table_name='artworks' and column_name='id')
    and exists (select 1 from information_schema.columns where table_schema='public' and table_name='artworks' and column_name='title')
    and exists (select 1 from information_schema.columns where table_schema='public' and table_name='artworks' and column_name='image_url')
    and exists (select 1 from information_schema.columns where table_schema='public' and table_name='artworks' and column_name='artist_id') then
    if exists (select 1 from information_schema.columns where table_schema='public' and table_name='artworks' and column_name='atelier_id') then
      atelier_ref_expr := 'a.atelier_id::text';
    elsif exists (select 1 from information_schema.columns where table_schema='public' and table_name='artworks' and column_name='atelier') then
      atelier_ref_expr := 'coalesce((select r.id from public.likha_ateliers r where r.slug = a.atelier::text limit 1), a.atelier::text)';
    end if;
    query_text := format($sql$
      insert into public.likha_artworks(id,title,caption,image_url,artist_id,atelier_id,created_at)
      select a.id::text,a.title::text,coalesce(a.caption,''),a.image_url::text,a.artist_id::text,%s,coalesce(a.created_at,now())
      from public.artworks a
      on conflict(id) do nothing
    $sql$, atelier_ref_expr);
    execute query_text;
  end if;
end;
$$;

do $$
begin
  if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'likha_chat_messages') then
    alter publication supabase_realtime add table public.likha_chat_messages;
  end if;
end;
$$;
