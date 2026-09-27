update storage.buckets set public=false where id='editorial-images';
drop policy editorial_read on storage.objects;
create policy editorial_read on storage.objects for select to anon,authenticated using(
 bucket_id='editorial-images' and (
  private.is_editor()
  or exists(select 1 from public.books b where b.status='published'
   and right(b.cover_url,char_length('/editorial-images/'||storage.objects.name))='/editorial-images/'||storage.objects.name)
  or exists(select 1 from public.publications p where p.status='published'
   and (strpos(p.html,'/editorial-images/'||storage.objects.name||'"')>0
    or strpos(p.html,'/editorial-images/'||storage.objects.name||chr(39))>0))
 )
);
