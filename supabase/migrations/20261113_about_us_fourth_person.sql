alter table public.about_us
  add column if not exists first_name_4 text not null default '',
  add column if not exists photo_4_url text not null default '',
  add column if not exists photo_4_alt text not null default '',
  add column if not exists text_4 text not null default '';

update public.about_us
set is_published = false
where is_published
  and (
    nullif(trim(first_name_4), '') is null
    or nullif(trim(photo_4_url), '') is null
    or nullif(trim(text_4), '') is null
  );

NOTIFY pgrst, 'reload schema';
