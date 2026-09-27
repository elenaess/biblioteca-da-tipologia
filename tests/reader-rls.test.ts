import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { PGlite } from "@electric-sql/pglite";
test("Reader chapters follow book visibility; progress stays private and only editors publish", async () => {
  const db = new PGlite();
  try {
    await db.exec(`create role anon; create role authenticated; create schema auth;
      create table auth.users(id uuid primary key,email text,email_confirmed_at timestamptz,raw_user_meta_data jsonb default '{}');
      create table auth.identities(user_id uuid,provider text,identity_data jsonb);
      create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
      grant usage on schema auth to anon,authenticated; grant execute on function auth.uid() to anon,authenticated;
      create schema storage; create table storage.buckets(id text primary key,name text,public boolean,file_size_limit bigint,allowed_mime_types text[]);
      create table storage.objects(id uuid default gen_random_uuid(),bucket_id text references storage.buckets(id),name text);
      alter table storage.objects enable row level security;
      grant usage on schema storage to anon,authenticated; grant select,insert,update,delete on storage.objects to anon,authenticated;`);
    for (const name of fs.readdirSync("supabase/migrations").sort())
      await db.exec(fs.readFileSync("supabase/migrations/" + name, "utf8"));

    const a = "20000000-0000-4000-8000-000000000001",
      b = "20000000-0000-4000-8000-000000000002",
      book = "30000000-0000-4000-8000-000000000001",
      revision = "40000000-0000-4000-8000-000000000001";
    await db.exec(
      `insert into auth.users(id) values('${a}'),('${b}'); update private.member_roles set role='admin' where user_id='${a}'; insert into public.books(id,title,source_type,drive_id,file_path,file_name,file_size,status) values('${book}','Livro','upload',null,'${book}/${revision}.epub','livro.epub',200,'draft')`,
    );
    async function as(id: string | null) {
      await db.exec("reset role");
      await db.query("select set_config('request.jwt.claim.sub',$1,false)", [
        id || "",
      ]);
      await db.exec("set role " + (id ? "authenticated" : "anon"));
    }
    const manifest = {
      revision,
      source_path: book + "/" + revision + ".epub",
      format: "epub",
      processing_status: "ready",
      chapters: [{ id: "c1", order: 0, title: "A", textLength: 20 }],
      toc: [],
    };
    const chapters = [
      {
        id: "c1",
        order: 0,
        title: "A",
        html: "<p>Test</p>",
        plainText: "Test",
        textLength: 4,
      },
    ];
    await as(b);
    await assert.rejects(
      db.query("select public.save_book_reader($1,$2,$3)", [
        book,
        manifest,
        chapters,
      ]),
    );
    await as(a);
    await db.query("select public.save_book_reader($1,$2,$3)", [
      book,
      manifest,
      chapters,
    ]);
    await as(null);
    assert.equal(
      (await db.query("select * from public.book_chapters")).rows.length,
      0,
    );
    await as(a);
    await db.exec(
      `update public.books set status='published' where id='${book}'`,
    );
    await as(null);
    assert.equal(
      (await db.query("select * from public.book_chapters")).rows.length,
      1,
    );
    await as(a);
    await db.query(
      "insert into public.reading_progress(user_id,book_id,revision,chapter_id,progress,chapter_progress) values($1,$2,$3,$4,$5,$6)",
      [a, book, revision, "c1", 0.5, 0.5],
    );
    await as(b);
    assert.equal(
      (await db.query("select * from public.reading_progress")).rows.length,
      0,
    );
    await assert.rejects(
      db.query(
        "insert into public.reading_progress(user_id,book_id,revision,chapter_id,progress,chapter_progress) values($1,$2,$3,$4,$5,$6)",
        [a, book, revision, "c1", 0.8, 0.8],
      ),
    );
    assert.equal(
      (
        await db.query(
          "update public.reading_progress set progress=0 returning *",
        )
      ).rows.length,
      0,
    );
    await as(a);
    assert.equal(
      (
        await db.query<{ progress: number }>(
          "select progress from public.reading_progress",
        )
      ).rows[0].progress,
      0.5,
    );
  } finally {
    await db.close();
  }
});
