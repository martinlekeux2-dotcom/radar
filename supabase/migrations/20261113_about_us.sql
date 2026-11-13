create table if not exists public.about_us (
  id integer primary key default 1 check (id = 1),
  title text not null default '',
  first_name_1 text not null default '',
  photo_1_url text not null default '',
  photo_1_alt text not null default '',
  text_1 text not null default '',
  first_name_2 text not null default '',
  photo_2_url text not null default '',
  photo_2_alt text not null default '',
  text_2 text not null default '',
  first_name_3 text not null default '',
  photo_3_url text not null default '',
  photo_3_alt text not null default '',
  text_3 text not null default '',
  first_name_4 text not null default '',
  photo_4_url text not null default '',
  photo_4_alt text not null default '',
  text_4 text not null default '',
  is_published boolean not null default false,
  updated_at timestamptz not null default now()
);

insert into public.about_us (id)
values (1)
on conflict (id) do nothing;

alter table public.about_us enable row level security;

drop policy if exists "Public can read the published about section" on public.about_us;
create policy "Public can read the published about section"
  on public.about_us for select to anon, authenticated
  using (id = 1 and is_published);

NOTIFY pgrst, 'reload schema';
