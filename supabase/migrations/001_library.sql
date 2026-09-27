create schema if not exists private;
revoke all on schema private from public;
create table public.profiles (
 id uuid primary key references auth.users(id) on delete cascade,
 display_name text not null check(char_length(display_name) between 1 and 80),
 avatar_url text, created_at timestamptz not null default now()
);
create table private.member_roles (
 user_id uuid primary key references auth.users(id) on delete cascade,
 role text not null check(role in ('member','admin','owner')) default 'member'
);
create unique index one_owner on private.member_roles(role) where role='owner';
create table private.audit_log (
 id bigint generated always as identity primary key, actor_id uuid, action text not null,
 target_id uuid, details jsonb not null default '{}', created_at timestamptz not null default now()
);
create or replace function public.my_role() returns text language sql stable security definer set search_path='' as $$
 select coalesce((select role from private.member_roles where user_id=auth.uid()),'member') where auth.uid() is not null;
$$;
create or replace function private.is_editor() returns boolean language sql stable security definer set search_path='' as $$
 select coalesce(public.my_role() in ('admin','owner'),false);
$$;
grant usage on schema private to authenticated,anon;
grant execute on function private.is_editor() to authenticated,anon;
revoke all on private.member_roles,private.audit_log from public,anon,authenticated;
create or replace function private.handle_user() returns trigger language plpgsql security definer set search_path='' as $$
begin
 insert into public.profiles(id,display_name,avatar_url) values(new.id,left(coalesce(nullif(new.raw_user_meta_data->>'full_name',''),'Leitor'),80),new.raw_user_meta_data->>'avatar_url');
 insert into private.member_roles(user_id,role) values(new.id,'member'); return new;
end;$$;
create trigger on_auth_user_created after insert on auth.users for each row execute function private.handle_user();
create table public.books (
 id uuid primary key default gen_random_uuid(),title text not null check(char_length(title) between 1 and 250),
 authors text[] not null default '{}',translators text[] not null default '{}',
 published_date text not null default '',translation_date text not null default '',
 edition text not null default '',language text not null default '',
 description text not null default '',topics text[] not null default '{}',schools text[] not null default '{}',
 drive_id text not null unique check(drive_id ~ '^[A-Za-z0-9_-]{20,150}$'),resource_key text,cover_url text,
 source_title text not null default '',status text not null default 'draft' check(status in ('draft','published')),
 created_at timestamptz not null default now(),updated_at timestamptz not null default now(),
 check(topics <@ array['mbti','eneagrama','protoanalise','socionics','jung','neurotype','psicossofia']::text[]),
 check(schools <@ array['SHS','SSS','SCS','SWS']::text[]),
 check(cardinality(schools)=0 or 'socionics'=any(topics)),
 check(published_date='' or published_date ~ '^\d{4}(-\d{2})?(-\d{2})?$'),
 check(translation_date='' or translation_date ~ '^\d{4}(-\d{2})?(-\d{2})?$')
);
create table public.publications (
 id uuid primary key default gen_random_uuid(),title text not null check(char_length(title) between 1 and 250),
 kind text not null check(kind in ('article','base_text','post')),summary text not null default '',
 html text not null default '' check(octet_length(html)<=2000000),topics text[] not null default '{}',schools text[] not null default '{}',
 author_name text not null default '',published_at timestamptz,source_url text,
 status text not null default 'draft' check(status in ('draft','published')),created_at timestamptz not null default now(),
 updated_at timestamptz not null default now(),
 check(topics <@ array['mbti','eneagrama','protoanalise','socionics','jung','neurotype','psicossofia']::text[]),
 check(schools <@ array['SHS','SSS','SCS','SWS']::text[]),
 check(cardinality(schools)=0 or 'socionics'=any(topics))
);
create table public.comments (
 id uuid primary key default gen_random_uuid(),user_id uuid not null references public.profiles(id) on delete cascade,
 book_id uuid references public.books(id) on delete cascade,publication_id uuid references public.publications(id) on delete cascade,
 body text not null check(char_length(btrim(body)) between 1 and 3000),created_at timestamptz not null default now(),
 check(num_nonnulls(book_id,publication_id)=1)
);
create index comments_book on public.comments(book_id,created_at);
create index comments_publication on public.comments(publication_id,created_at);
create or replace function private.published_target(book uuid,publication uuid) returns boolean language sql stable security definer set search_path='' as $$
 select exists(select 1 from public.books where id=book and status='published') or exists(select 1 from public.publications where id=publication and status='published');
$$;
create or replace function private.check_comment() returns trigger language plpgsql security definer set search_path='' as $$
begin
 if auth.uid() is null or new.user_id<>auth.uid() then raise exception 'Entre para comentar.';end if;
 perform pg_advisory_xact_lock(hashtextextended(auth.uid()::text,0));
 if exists(select 1 from public.comments where user_id=auth.uid() and created_at>now()-interval '10 seconds') then raise exception 'Aguarde alguns segundos antes de comentar novamente.';end if;
 new.created_at:=now();return new;
end;$$;
create trigger limit_comments before insert on public.comments for each row execute function private.check_comment();
alter table public.profiles enable row level security;
alter table public.books enable row level security;
alter table public.publications enable row level security;
alter table public.comments enable row level security;
create policy profiles_read on public.profiles for select to anon,authenticated using(true);
create policy profile_update on public.profiles for update to authenticated using(id=auth.uid()) with check(id=auth.uid());
create policy books_read on public.books for select to anon,authenticated using(status='published' or private.is_editor());
create policy books_write on public.books for all to authenticated using(private.is_editor()) with check(private.is_editor());
create policy publications_read on public.publications for select to anon,authenticated using(status='published' or private.is_editor());
create policy publications_write on public.publications for all to authenticated using(private.is_editor()) with check(private.is_editor());
create policy comments_read on public.comments for select to anon,authenticated using(private.published_target(book_id,publication_id) or private.is_editor());
create policy comments_insert on public.comments for insert to authenticated with check(user_id=auth.uid() and private.published_target(book_id,publication_id));
grant select on public.profiles,public.books,public.publications,public.comments to anon,authenticated;
grant update(display_name) on public.profiles to authenticated;
grant insert,update,delete on public.books,public.publications to authenticated;
grant insert(user_id,book_id,publication_id,body) on public.comments to authenticated;
grant execute on function private.published_target(uuid,uuid) to anon,authenticated;
create or replace function public.remove_comment(comment_id uuid) returns void language plpgsql security definer set search_path='' as $$
declare c public.comments%rowtype;
begin
 select * into c from public.comments where id=comment_id for update;
 if not found then raise exception 'Comentário não encontrado.';end if;
 if auth.uid() is null or (auth.uid()<>c.user_id and not private.is_editor()) then raise exception 'Sem permissão.';end if;
 insert into private.audit_log(actor_id,action,target_id,details) values(auth.uid(),'remove_comment',comment_id,jsonb_build_object('original_author',c.user_id));
 delete from public.comments where id=comment_id;
end;$$;
create or replace function public.claim_owner() returns text language plpgsql security definer set search_path='' as $$
begin
 if auth.uid() is null then raise exception 'Entre com Google.';end if;
 if not exists(
 select 1 from auth.users u join auth.identities i on i.user_id=u.id
 where u.id=auth.uid() and lower(u.email)='ehrenren629@gmail.com' and u.email_confirmed_at is not null
 and i.provider='google' and lower(i.identity_data->>'email')='ehrenren629@gmail.com'
 and i.identity_data->>'email_verified'='true'
 ) then return public.my_role();end if;
 perform pg_advisory_xact_lock(817261);
 if exists(select 1 from private.member_roles where role='owner' and user_id<>auth.uid()) then raise exception 'Proprietária já configurada.';end if;
 insert into private.member_roles(user_id,role) values(auth.uid(),'owner') on conflict(user_id) do update set role='owner';
 return 'owner';
end;$$;
create or replace function public.set_member_role(target_user uuid,new_role text) returns void language plpgsql security definer set search_path='' as $$
declare old_role text;
begin
 if public.my_role() is distinct from 'owner' then raise exception 'Apenas a proprietária pode alterar administradores.';end if;
 if new_role not in ('admin','member') then raise exception 'Papel inválido.';end if;
 select role into old_role from private.member_roles where user_id=target_user for update;
 if not found then raise exception 'Conta não encontrada.';end if;
 if old_role='owner' then raise exception 'A proprietária não pode ser removida.';end if;
 update private.member_roles set role=new_role where user_id=target_user;
 insert into private.audit_log(actor_id,action,target_id,details) values(auth.uid(),'set_role',target_user,jsonb_build_object('before',old_role,'after',new_role));
end;$$;
create or replace function public.list_members() returns table(id uuid,display_name text,avatar_url text,role text) language plpgsql security definer set search_path='' as $$
begin
 if public.my_role() is distinct from 'owner' then raise exception 'Sem permissão.';end if;
 return query select p.id,p.display_name,p.avatar_url,r.role from public.profiles p join private.member_roles r on r.user_id=p.id order by p.display_name;
end;$$;
revoke all on function public.remove_comment(uuid),public.claim_owner(),public.set_member_role(uuid,text),public.list_members() from public,anon;
grant execute on function public.remove_comment(uuid),public.claim_owner(),public.set_member_role(uuid,text),public.list_members() to authenticated;
create or replace function private.updated_stamp() returns trigger language plpgsql set search_path='' as $$begin new.updated_at:=now();return new;end;$$;
create trigger books_updated before update on public.books for each row execute function private.updated_stamp();
create trigger publications_updated before update on public.publications for each row execute function private.updated_stamp();

