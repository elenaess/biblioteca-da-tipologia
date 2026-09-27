alter table public.books alter column drive_id drop not null;
alter table public.books add column source_type text not null default 'drive' check(source_type in ('drive','upload'));
alter table public.books add column file_path text unique;
alter table public.books add column file_name text;
alter table public.books add column file_size bigint;
alter table public.books add constraint book_file_source check(
 (source_type='drive' and drive_id is not null and file_path is null and file_name is null and file_size is null)
 or (source_type='upload' and drive_id is null and resource_key is null
  and file_path is not null and file_path ~ '^[a-f0-9-]{36}/[a-f0-9-]{36}\.pdf$'
  and split_part(file_path,'/',1)=id::text
  and file_name is not null and char_length(file_name) between 1 and 255
  and file_size is not null and file_size between 1 and 26214400)
);
alter table private.member_roles enable row level security;
alter table private.audit_log enable row level security;
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values('library-files','library-files',false,26214400,array['application/pdf'])
on conflict(id) do nothing;
create policy library_files_read on storage.objects for select to anon,authenticated using(
 bucket_id='library-files' and (private.is_editor() or exists(
  select 1 from public.books where source_type='upload' and file_path=storage.objects.name and status='published'
 ))
);
create policy library_files_insert on storage.objects for insert to authenticated with check(
 bucket_id='library-files' and private.is_editor() and name ~ '^[a-f0-9-]{36}/[a-f0-9-]{36}\.pdf$'
);
create policy library_files_update on storage.objects for update to authenticated
 using(bucket_id='library-files' and private.is_editor())
 with check(bucket_id='library-files' and private.is_editor() and name ~ '^[a-f0-9-]{36}/[a-f0-9-]{36}\.pdf$');
create policy library_files_delete on storage.objects for delete to authenticated using(bucket_id='library-files' and private.is_editor());
