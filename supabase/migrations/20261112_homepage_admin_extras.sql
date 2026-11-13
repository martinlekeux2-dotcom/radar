alter table public.articles
  add column if not exists cover_image_caption text;
alter table public.articles
  add column if not exists show_as_reportage boolean not null default false;

create table if not exists public.daily_fact (
  id integer primary key default 1 check (id = 1),
  value text not null default '1 idée',
  suffix text not null default '/ jour',
  description text not null default 'Pour comprendre l’actualité sans perdre le fil.',
  updated_at timestamptz not null default now()
);

insert into public.daily_fact (id)
values (1)
on conflict (id) do nothing;

alter table public.daily_fact enable row level security;

drop policy if exists "Public can read the daily fact" on public.daily_fact;
create policy "Public can read the daily fact"
  on public.daily_fact for select to anon, authenticated
  using (id = 1);

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
