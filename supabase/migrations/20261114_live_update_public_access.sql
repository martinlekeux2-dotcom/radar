alter table public.live_update enable row level security;

grant select on table public.live_update to anon, authenticated;

drop policy if exists "Public can read the published live update" on public.live_update;
create policy "Public can read the published live update"
  on public.live_update for select to anon, authenticated
  using (id = 1 and is_published);
