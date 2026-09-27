alter table public.books drop constraint book_file_source;
alter table public.books add constraint book_file_source check(
 (source_type='drive' and drive_id is not null and file_path is null and file_name is null and file_size is null)
 or (source_type='upload' and drive_id is null and resource_key is null and file_path is not null
 and file_path ~ '^[a-f0-9-]{36}/[a-f0-9-]{36}[.](pdf|epub|html|md|txt)$'
 and split_part(file_path,'/',1)=id::text and file_name is not null and char_length(file_name) between 1 and 255
 and file_size between 1 and 26214400));
update storage.buckets set allowed_mime_types=array['application/pdf','application/epub+zip','text/html','text/markdown','text/plain'] where id='library-files';
alter policy library_files_insert on storage.objects with check(bucket_id='library-files' and private.is_editor() and name ~ '^[a-f0-9-]{36}/[a-f0-9-]{36}[.](pdf|epub|html|md|txt)$');
alter policy library_files_update on storage.objects with check(bucket_id='library-files' and private.is_editor() and name ~ '^[a-f0-9-]{36}/[a-f0-9-]{36}[.](pdf|epub|html|md|txt)$');
create table public.book_readers (
 book_id uuid primary key references public.books(id) on delete cascade,
 revision uuid not null, source_path text, format text not null check(format in ('epub','pdf','html','markdown','txt')),
 processing_status text not null check(processing_status in ('pending','processing','ready','failed')),
 message text not null default '' check(length(message)<1000), metadata jsonb not null default '{}',
 toc jsonb not null default '[]' check(jsonb_typeof(toc)='array' and pg_column_size(toc)<1000000),
 chapters jsonb not null default '[]' check(jsonb_typeof(chapters)='array' and jsonb_array_length(chapters)<=2000),
 updated_at timestamptz not null default now()
);
create table public.book_chapters (
 book_id uuid not null references public.book_readers(book_id) on delete cascade,
 id text not null check(length(id) between 1 and 160),
 title text not null default '', "order" integer not null check("order">=0),
 html text not null check(octet_length(html)<=2000000), plain_text text not null,
 text_length integer not null check(text_length>=0), error boolean not null default false,
 primary key(book_id,id),unique(book_id,"order")
);
create table public.reading_progress (
 user_id uuid not null references auth.users(id) on delete cascade,
 book_id uuid not null references public.books(id) on delete cascade,
 revision uuid not null,chapter_id text not null,section_id text,
 progress double precision not null check(progress between 0 and 1),
 chapter_progress double precision not null check(chapter_progress between 0 and 1),
 scroll_offset double precision check(scroll_offset>=0),updated_at timestamptz not null default now(),
 primary key(user_id,book_id)
);
alter table public.book_readers enable row level security;
alter table public.book_chapters enable row level security;
alter table public.reading_progress enable row level security;
create policy reader_read on public.book_readers for select to anon,authenticated using(exists(select 1 from public.books b where b.id=book_id));
create policy reader_write on public.book_readers for all to authenticated using(private.is_editor()) with check(private.is_editor());
create policy chapter_read on public.book_chapters for select to anon,authenticated using(exists(select 1 from public.books b where b.id=book_id));
create policy chapter_write on public.book_chapters for all to authenticated using(private.is_editor()) with check(private.is_editor());
create policy progress_own on public.reading_progress for all to authenticated using(user_id=(select auth.uid())) with check(user_id=(select auth.uid()) and exists(select 1 from public.books b where b.id=book_id));
grant select on public.book_readers,public.book_chapters to anon,authenticated;
grant insert,update,delete on public.book_readers,public.book_chapters to authenticated;
grant select,insert,update,delete on public.reading_progress to authenticated;
create index progress_book on public.reading_progress(book_id);
create function public.save_book_reader(p_book uuid,p_manifest jsonb,p_chapters jsonb) returns void language plpgsql security invoker set search_path='' as $$
begin
 if not private.is_editor() then raise exception 'Sem permissão.';end if;
 perform 1 from public.books where id=p_book and file_path=p_manifest->>'source_path' for update;
 if not found then raise exception 'A ficha do livro mudou. Recarregue antes de importar.';end if;
 if jsonb_array_length(p_chapters)>2000 then raise exception 'Livro grande demais.';end if;
 delete from public.book_readers where book_id=p_book;
 insert into public.book_readers(book_id,revision,source_path,format,processing_status,message,metadata,toc,chapters)
 values(p_book,(p_manifest->>'revision')::uuid,p_manifest->>'source_path',p_manifest->>'format',p_manifest->>'processing_status',coalesce(p_manifest->>'message',''),coalesce(p_manifest->'metadata','{}'),coalesce(p_manifest->'toc','[]'),coalesce(p_manifest->'chapters','[]'));
 insert into public.book_chapters(book_id,id,title,"order",html,plain_text,text_length,error)
 select p_book,c->>'id',c->>'title',(c->>'order')::integer,c->>'html',c->>'plainText',(c->>'textLength')::integer,coalesce((c->>'error')::boolean,false) from jsonb_array_elements(p_chapters)c;
end;$$;
revoke all on function public.save_book_reader(uuid,jsonb,jsonb) from public,anon;
grant execute on function public.save_book_reader(uuid,jsonb,jsonb) to authenticated;
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types) values('book-assets','book-assets',false,8388608,array['image/png','image/jpeg','image/webp','image/gif']);
create policy book_assets_read on storage.objects for select to anon,authenticated using(bucket_id='book-assets' and (private.is_editor() or exists(select 1 from public.books b where b.id::text=split_part(name,'/',1) and b.status='published')));
create policy book_assets_insert on storage.objects for insert to authenticated with check(bucket_id='book-assets' and private.is_editor() and name ~ '^[a-f0-9-]{36}/[a-f0-9-]{36}/[a-f0-9-]{36}[.](png|jpg|webp|gif)$');
create policy book_assets_delete on storage.objects for delete to authenticated using(bucket_id='book-assets' and private.is_editor());
