insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values('editorial-images','editorial-images',false,5242880,array['image/jpeg','image/png','image/webp'])
on conflict(id) do nothing;
create policy editorial_read on storage.objects for select to anon,authenticated using(bucket_id='editorial-images' and private.is_editor());
create policy editorial_insert on storage.objects for insert to authenticated with check(bucket_id='editorial-images' and private.is_editor());
create policy editorial_update on storage.objects for update to authenticated using(bucket_id='editorial-images' and private.is_editor()) with check(bucket_id='editorial-images' and private.is_editor());
create policy editorial_delete on storage.objects for delete to authenticated using(bucket_id='editorial-images' and private.is_editor());
