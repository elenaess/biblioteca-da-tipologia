import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { PGlite } from "@electric-sql/pglite";

test("Uploaded PDFs inherit publication visibility; members cannot upload, replace or delete", async () => {
  const db = new PGlite();
  await db.exec(`create role anon;create role authenticated;create schema auth;create table auth.users(id uuid primary key,email text,email_confirmed_at timestamptz,raw_user_meta_data jsonb default '{}');create table auth.identities(user_id uuid,provider text,identity_data jsonb);create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;grant usage on schema auth to anon,authenticated;grant execute on function auth.uid() to anon,authenticated;
 create schema storage;create table storage.buckets(id text primary key,name text,public boolean,file_size_limit bigint,allowed_mime_types text[]);create table storage.objects(id uuid default gen_random_uuid(),bucket_id text references storage.buckets(id),name text);alter table storage.objects enable row level security;grant usage on schema storage to anon,authenticated;grant select,insert,update,delete on storage.objects to anon,authenticated;`);
  for (const name of fs.readdirSync("supabase/migrations").sort())
    await db.exec(fs.readFileSync("supabase/migrations/" + name, "utf8"));
  const admin = "10000000-0000-4000-8000-000000000001",
    member = "10000000-0000-4000-8000-000000000002";
  const book = "20000000-0000-4000-8000-000000000001",
    path = book + "/30000000-0000-4000-8000-000000000001.pdf";
  await db.exec(
    `insert into auth.users(id) values('${admin}'),('${member}');update private.member_roles set role='admin' where user_id='${admin}';`,
  );
  async function role(id: string | null) {
    await db.exec("reset role");
    await db.query("select set_config('request.jwt.claim.sub',$1,false)", [
      id || "",
    ]);
    await db.exec("set role " + (id ? "authenticated" : "anon"));
  }
  await role(admin);
  await db.query(
    "insert into storage.objects(bucket_id,name) values('library-files',$1)",
    [path],
  );
  await db.query(
    "insert into public.books(id,title,source_type,file_path,file_name,file_size) values($1,'PDF de teste','upload',$2,'Livro.pdf',100)",
    [book, path],
  );
  assert.equal(
    (await db.query("select * from storage.objects")).rows.length,
    1,
  );
  await role(null);
  assert.equal(
    (await db.query("select * from storage.objects")).rows.length,
    0,
  );
  await role(member);
  assert.equal(
    (await db.query("select * from storage.objects")).rows.length,
    0,
  );
  await assert.rejects(
    db.query(
      "insert into storage.objects(bucket_id,name) values('library-files',$1)",
      [path],
    ),
  );
  await role(admin);
  await db.query("update public.books set status='published' where id=$1", [
    book,
  ]);
  await role(null);
  assert.equal(
    (await db.query("select * from storage.objects")).rows.length,
    1,
  );
  await role(member);
  assert.equal(
    (await db.query("update storage.objects set name='replaced' returning id"))
      .rows.length,
    0,
  );
  assert.equal(
    (await db.query("delete from storage.objects returning id")).rows.length,
    0,
  );
  await role(admin);
  await db.query("update public.books set status='draft' where id=$1", [book]);
  await role(null);
  assert.equal(
    (await db.query("select * from storage.objects")).rows.length,
    0,
  );
  await role(admin);
  await assert.rejects(
    db.query(
      "update public.books set drive_id='abcdefghijklmnopqrstuv' where id=$1",
      [book],
    ),
  );
  const image = "10000000-0000-4000-8000-000000000004.png";
  await db.query(
    "insert into storage.objects(bucket_id,name) values('editorial-images',$1)",
    [image],
  );
  const imageUrl =
    "https://test.supabase.co/storage/v1/object/public/editorial-images/" +
    image;
  const publication = "40000000-0000-4000-8000-000000000001";
  await db.query(
    "insert into public.publications(id,title,kind,html) values($1,'Teste imagem','article',$2)",
    [publication, '<p><img src="' + imageUrl + '"></p>'],
  );
  await role(null);
  assert.equal(
    (
      await db.query(
        "select * from storage.objects where bucket_id='editorial-images'",
      )
    ).rows.length,
    0,
  );
  await role(admin);
  await db.query(
    "update public.publications set status='published' where id=$1",
    [publication],
  );
  await role(null);
  assert.equal(
    (
      await db.query(
        "select * from storage.objects where bucket_id='editorial-images'",
      )
    ).rows.length,
    1,
  );
  await role(admin);
  await db.query("update public.publications set status='draft' where id=$1", [
    publication,
  ]);
  await role(null);
  assert.equal(
    (
      await db.query(
        "select * from storage.objects where bucket_id='editorial-images'",
      )
    ).rows.length,
    0,
  );
  await db.exec("reset role");
  assert.equal(
    (
      await db.query<{ public: boolean }>(
        "select public from storage.buckets where id='editorial-images'",
      )
    ).rows[0].public,
    false,
  );
  await db.close();
});
