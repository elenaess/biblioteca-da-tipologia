import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { PGlite } from "@electric-sql/pglite";
import { avatarImageType, MAX_AVATAR_BYTES } from "../packages/domain/src/avatar";

test("Profile photos reject oversized files and executable files disguised as images", () => {
  assert.equal(avatarImageType(Uint8Array.from([255,216,255,224]).buffer).mime, "image/jpeg");
  assert.equal(avatarImageType(Uint8Array.from([137,80,78,71,13,10,26,10]).buffer).mime, "image/png");
  assert.throws(() => avatarImageType(new TextEncoder().encode('<svg onload="alert(1)"/>').buffer));
  assert.throws(() => avatarImageType(new ArrayBuffer(MAX_AVATAR_BYTES + 1)));
  assert.throws(() => avatarImageType(new ArrayBuffer(0)));
});

test("A member can upload and replace only their own profile photo; unattached photos stay private", async () => {
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
    const a = "10000000-0000-4000-8000-000000000001", b = "10000000-0000-4000-8000-000000000002";
    const path = a + "/profile.jpg";
    await db.exec(`insert into auth.users(id) values('${a}'),('${b}')`);
    async function asUser(id: string | null) {
      await db.exec("reset role");
      await db.query("select set_config('request.jwt.claim.sub',$1,false)", [id || ""]);
      await db.exec("set role " + (id ? "authenticated" : "anon"));
    }
    await asUser(a);
    await db.query("insert into storage.objects(bucket_id,name) values('profile-photos',$1)", [path]);
    await assert.rejects(db.query("insert into storage.objects(bucket_id,name) values('profile-photos',$1)", [b + "/profile.jpg"]));
    await asUser(null);
    assert.equal((await db.query("select * from storage.objects")).rows.length, 0);
    await asUser(a);
    await db.query("update public.profiles set avatar_path=$1 where id=$2", [path, a]);
    assert.equal((await db.query("update storage.objects set name=name returning id")).rows.length, 1);
    await assert.rejects(db.query("update public.profiles set avatar_path=$1 where id=$2", [b + "/profile.jpg", a]));
    await asUser(b);
    assert.equal((await db.query("update public.profiles set avatar_path=$1 where id=$2 returning id", [path, a])).rows.length, 0);
    assert.equal((await db.query("update storage.objects set name=name returning id")).rows.length, 0);
    assert.equal((await db.query("delete from storage.objects returning id")).rows.length, 0);
    await asUser(null);
    assert.equal((await db.query("select * from storage.objects")).rows.length, 1);
    await db.exec("reset role");
    assert.deepEqual((await db.query("select public,file_size_limit from storage.buckets where id='profile-photos'")).rows[0], {public:false,file_size_limit:3145728});
  } finally { await db.close(); }
});
