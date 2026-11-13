create extension if not exists pgcrypto;

create table if not exists public.articles (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  slug text not null unique,
  excerpt text,
  content text not null default '',
  category text not null,
  location text,
  cover_image_url text,
  author_name text,
  tags text[] not null default '{}',
  status text not null default 'draft'
    check (status in ('draft', 'published', 'archived')),
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint articles_published_at_required
    check (status <> 'published' or published_at is not null)
);

alter table public.articles
  add column if not exists location text;
alter table public.articles
  add column if not exists show_on_home boolean not null default true;
alter table public.articles
  add column if not exists menu_section text;
alter table public.articles
  add column if not exists cover_image_caption text;
alter table public.articles
  add column if not exists show_as_reportage boolean not null default false;

create table if not exists public.videos (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  slug text not null unique,
  description text,
  video_url text not null,
  thumbnail_url text,
  duration_seconds integer check (duration_seconds is null or duration_seconds > 0),
  category text,
  featured_position smallint check (featured_position is null or featured_position between 1 and 3),
  status text not null default 'draft'
    check (status in ('draft', 'published', 'archived')),
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint videos_published_at_required
    check (status <> 'published' or published_at is not null)
);

alter table public.videos
  add column if not exists featured_position smallint
    check (featured_position is null or featured_position between 1 and 3);

create table if not exists public.events (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  slug text not null unique,
  description text,
  category text,
  venue text,
  city text,
  starts_at timestamptz not null,
  ends_at timestamptz,
  ticket_url text,
  image_url text,
  status text not null default 'draft'
    check (status in ('draft', 'published', 'cancelled')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint events_end_after_start
    check (ends_at is null or ends_at >= starts_at)
);

create table if not exists public.quick_infos (
  id uuid primary key default gen_random_uuid(),
  category text not null,
  icon text not null default 'lightbulb'
    check (icon in ('lightbulb', 'leaf', 'location', 'energy')),
  title text not null,
  copy text not null,
  position integer not null default 0,
  status text not null default 'draft'
    check (status in ('draft', 'published', 'archived')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.daily_fact (
  id integer primary key default 1 check (id = 1),
  value text not null default '1 idée',
  suffix text not null default '/ jour',
  description text not null default 'Pour comprendre l’actualité sans perdre le fil.',
  updated_at timestamptz not null default now()
);

create table if not exists public.live_update (
  id integer primary key default 1 check (id = 1),
  title text not null default '',
  copy text not null default '',
  link_url text,
  link_label text not null default 'Suivre l’actualité',
  is_published boolean not null default false,
  updated_at timestamptz not null default now()
);

insert into public.daily_fact (id)
values (1)
on conflict (id) do nothing;

insert into public.live_update (id)
values (1)
on conflict (id) do nothing;

create table if not exists public.admin_users (
  user_id uuid primary key references auth.users (id) on delete cascade,
  role text not null default 'editor' check (role in ('admin', 'editor')),
  created_at timestamptz not null default now()
);

create table if not exists public.admin_notes (
  user_id uuid primary key references auth.users (id) on delete cascade,
  content text not null default '',
  updated_at timestamptz not null default now()
);

create table if not exists public.comments (
  id uuid primary key default gen_random_uuid(),
  article_id uuid references public.articles (id) on delete set null,
  author_name text not null,
  author_email text,
  content text not null,
  status text not null default 'pending'
    check (status in ('pending', 'approved', 'rejected')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists articles_published_at_idx
  on public.articles (published_at desc)
  where status = 'published';
create index if not exists articles_category_idx
  on public.articles (category);
create index if not exists articles_menu_section_published_at_idx
  on public.articles (menu_section, published_at desc)
  where status = 'published' and menu_section is not null;
create index if not exists articles_home_published_at_idx
  on public.articles (published_at desc)
  where status = 'published' and show_on_home;
create index if not exists videos_published_at_idx
  on public.videos (published_at desc)
  where status = 'published';
create unique index if not exists videos_featured_position_idx
  on public.videos (featured_position)
  where featured_position is not null and status = 'published';

create or replace function public.set_home_featured_video(target_video_id uuid, target_position smallint)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if target_position is null then
    update public.videos
    set featured_position = null
    where id = target_video_id;
    return;
  end if;

  if target_position not between 1 and 3 then
    raise exception 'La position mise en avant doit être 1, 2 ou 3.';
  end if;

  update public.videos
  set featured_position = null
  where featured_position = target_position
    and id <> target_video_id
    and status = 'published';

  update public.videos
  set featured_position = target_position
  where id = target_video_id
    and status = 'published';

  if not found then
    raise exception 'La vidéo sélectionnée doit être publiée.';
  end if;
end;
$$;

revoke all on function public.set_home_featured_video(uuid, smallint) from public, anon, authenticated;
grant execute on function public.set_home_featured_video(uuid, smallint) to service_role;
create index if not exists events_starts_at_idx
  on public.events (starts_at)
  where status = 'published';
create index if not exists quick_infos_position_idx
  on public.quick_infos (position, created_at desc)
  where status = 'published';
create index if not exists comments_status_created_at_idx
  on public.comments (status, created_at desc);
create index if not exists comments_article_id_idx
  on public.comments (article_id);

alter table public.articles enable row level security;
alter table public.videos enable row level security;
alter table public.events enable row level security;
alter table public.quick_infos enable row level security;
alter table public.daily_fact enable row level security;
alter table public.live_update enable row level security;
alter table public.admin_users enable row level security;
alter table public.admin_notes enable row level security;
alter table public.comments enable row level security;

create or replace function public.is_radar_staff()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.admin_users
    where user_id = (select auth.uid())
  );
$$;

revoke all on function public.is_radar_staff() from public;
grant execute on function public.is_radar_staff() to authenticated;

drop policy if exists "Users can read their own admin role" on public.admin_users;
create policy "Users can read their own admin role"
  on public.admin_users for select to authenticated
  using (user_id = (select auth.uid()));

drop policy if exists "Public can read published articles" on public.articles;
create policy "Public can read published articles"
  on public.articles for select to anon, authenticated
  using (status = 'published' and published_at <= now());

drop policy if exists "Public can read published videos" on public.videos;
create policy "Public can read published videos"
  on public.videos for select to anon, authenticated
  using (status = 'published' and published_at <= now());

drop policy if exists "Public can read upcoming published events" on public.events;
create policy "Public can read upcoming published events"
  on public.events for select to anon, authenticated
  using (status = 'published' and starts_at >= now());

drop policy if exists "Public can read published quick infos" on public.quick_infos;
create policy "Public can read published quick infos"
  on public.quick_infos for select to anon, authenticated
  using (status = 'published');

drop policy if exists "Public can read the daily fact" on public.daily_fact;
create policy "Public can read the daily fact"
  on public.daily_fact for select to anon, authenticated
  using (id = 1);

drop policy if exists "Public can read the published live update" on public.live_update;
create policy "Public can read the published live update"
  on public.live_update for select to anon, authenticated
  using (id = 1 and is_published);

insert into storage.buckets (id, name, public, allowed_mime_types)
values (
  'radar-media',
  'radar-media',
  true,
  array['video/mp4', 'video/webm', 'video/quicktime', 'image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update
set public = excluded.public,
    allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "RADAR staff can upload media" on storage.objects;
create policy "RADAR staff can upload media"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'radar-media'
    and (select public.is_radar_staff())
  );
