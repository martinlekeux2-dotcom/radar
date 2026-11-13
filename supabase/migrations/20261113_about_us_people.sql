alter table public.about_us
  add column if not exists first_name_1 text not null default '',
  add column if not exists text_1 text not null default '',
  add column if not exists first_name_2 text not null default '',
  add column if not exists text_2 text not null default '',
  add column if not exists first_name_3 text not null default '',
  add column if not exists text_3 text not null default '';

update public.about_us
set is_published = false
where is_published
  and (
    nullif(trim(first_name_1), '') is null or nullif(trim(text_1), '') is null
    or nullif(trim(first_name_2), '') is null or nullif(trim(text_2), '') is null
    or nullif(trim(first_name_3), '') is null or nullif(trim(text_3), '') is null
  );

NOTIFY pgrst, 'reload schema';
