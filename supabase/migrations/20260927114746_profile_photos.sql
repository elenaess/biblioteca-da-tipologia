alter table public.profiles add column avatar_path text;
alter table public.profiles add constraint profile_photo_owned_path check (
  avatar_path is null or avatar_path ~ ('^' || id::text || '/profile[.](jpg|png|webp)$')
);
grant update(avatar_path) on public.profiles to authenticated;

insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values('profile-photos','profile-photos',false,3145728,array['image/jpeg','image/png','image/webp'])
on conflict(id) do nothing;

create policy profile_photos_read on storage.objects for select to anon,authenticated
using(bucket_id='profile-photos' and (
  split_part(name,'/',1) = (select auth.uid())::text
  or exists(select 1 from public.profiles p where p.avatar_path = name)
));
create policy profile_photos_insert on storage.objects for insert to authenticated
with check(bucket_id='profile-photos' and name ~ ('^' || (select auth.uid())::text || '/profile[.](jpg|png|webp)$'));
create policy profile_photos_update on storage.objects for update to authenticated
using(bucket_id='profile-photos' and split_part(name,'/',1) = (select auth.uid())::text)
with check(bucket_id='profile-photos' and name ~ ('^' || (select auth.uid())::text || '/profile[.](jpg|png|webp)$'));
create policy profile_photos_delete on storage.objects for delete to authenticated
using(bucket_id='profile-photos' and split_part(name,'/',1) = (select auth.uid())::text);
