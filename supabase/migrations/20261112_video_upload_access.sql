drop policy if exists "RADAR staff can upload media" on storage.objects;
create policy "RADAR staff can upload media"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'radar-media'
    and (select public.is_radar_staff())
  );
NOTIFY pgrst, 'reload schema';
