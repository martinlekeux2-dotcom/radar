create table if not exists public.live_update (
  id integer primary key default 1 check (id = 1),
  title text not null default '',
  copy text not null default '',
  link_url text,
  link_label text not null default 'Suivre l’actualité',
  is_published boolean not null default false,
  updated_at timestamptz not null default now()
);

insert into public.live_update (id)
values (1)
on conflict (id) do nothing;

alter table public.live_update enable row level security;

drop policy if exists "Public can read the published live update" on public.live_update;
create policy "Public can read the published live update"
  on public.live_update for select to anon, authenticated
  using (id = 1 and is_published);
