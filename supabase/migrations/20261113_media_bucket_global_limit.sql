update storage.buckets
set file_size_limit = null
where id = 'radar-media';

NOTIFY pgrst, 'reload schema';
