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

drop policy if exists "RADAR staff can upload media" on storage.objects;
create policy "RADAR staff can upload media"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'radar-media'
    and (select public.is_radar_staff())
  );

NOTIFY pgrst, 'reload schema';
