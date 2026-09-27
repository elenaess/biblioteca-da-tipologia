import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { PGlite } from "@electric-sql/pglite";
test("Database enforces published visibility, roles, owner identity and comment removal", async () => {
  const db = new PGlite();
  await db.exec(
    `create role anon;create role authenticated;create schema auth;create table auth.users(id uuid primary key,email text,email_confirmed_at timestamptz,raw_user_meta_data jsonb default '{}');create table auth.identities(user_id uuid,provider text,identity_data jsonb);create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;grant usage on schema auth to anon,authenticated;grant execute on function auth.uid() to anon,authenticated;`,
  );
  await db.exec(fs.readFileSync("supabase/migrations/001_library.sql", "utf8"));
  await db.exec(fs.readFileSync("supabase/migrations/20260927004000_authenticated_role_lookup.sql", "utf8"));
  const member = "10000000-0000-4000-8000-000000000001",
    admin = "10000000-0000-4000-8000-000000000002",
    owner = "10000000-0000-4000-8000-000000000003";
  await db.exec(
    `insert into auth.users(id,email,email_confirmed_at,raw_user_meta_data) values ('${member}','reader@test.dev',now(),'{"full_name":"Leitora","role":"owner","email":"ehrenren629@gmail.com"}'),('${admin}','admin@test.dev',now(),'{}'),('${owner}','ehrenren629@gmail.com',now(),'{}');update private.member_roles set role='admin' where user_id='${admin}';insert into auth.identities values('${owner}','google','{"email":"ehrenren629@gmail.com","email_verified":true}');insert into public.books(id,title,drive_id,status) values('30000000-0000-4000-8000-000000000001','Publicado','abcdefghijklmnopqrstuv','published'),('30000000-0000-4000-8000-000000000002','Rascunho','zyxwvutsrqponmlkjihgfed','draft');`,
  );
  async function role(id: string | null) {
    await db.exec("reset role");
    await db.query("select set_config('request.jwt.claim.sub',$1,false)", [
      id || "",
    ]);
    await db.exec("set role " + (id ? "authenticated" : "anon"));
  }
  await role(null);
  await assert.rejects(db.query("select public.my_role()"));
  assert.equal((await db.query("select * from public.books")).rows.length, 1);
  await role(member);
  assert.equal(
    (await db.query<{ role: string }>("select public.claim_owner() as role"))
      .rows[0].role,
    "member",
  );
  assert.equal(
    (await db.query("update public.books set title='Hacked' returning id")).rows
      .length,
    0,
  );
  await assert.rejects(
    db.query("select public.set_member_role($1,'admin')", [member]),
  );
  await assert.rejects(
    db.query(
      "insert into public.comments(user_id,book_id,body) values($1,'30000000-0000-4000-8000-000000000002','Rascunho proibido')",
      [member],
    ),
  );
  const c = await db.query(
    "insert into public.comments(user_id,book_id,body) values($1,'30000000-0000-4000-8000-000000000001','Uma leitura interessante.') returning id",
    [member],
  );
  const comment = (c.rows[0] as any).id;
  await assert.rejects(
    db.query(
      "insert into public.comments(user_id,book_id,body) values($1,'30000000-0000-4000-8000-000000000001','Muito rápido')",
      [member],
    ),
  );
  await role(admin);
  assert.equal((await db.query("select * from public.books")).rows.length, 2);
  await assert.rejects(
    db.query("select public.set_member_role($1,'admin')", [member]),
  );
  await db.query("select public.remove_comment($1)", [comment]);
  assert.equal(
    (await db.query("select * from public.comments")).rows.length,
    0,
  );
  await role(owner);
  assert.equal(
    (await db.query<{ role: string }>("select public.claim_owner() as role"))
      .rows[0].role,
    "owner",
  );
  await db.query("select public.set_member_role($1,'member')", [admin]);
  await assert.rejects(
    db.query("select public.set_member_role($1,'member')", [owner]),
  );
  await role(admin);
  assert.equal(
    (await db.query("update public.books set title='Not allowed' returning id"))
      .rows.length,
    0,
  );
  await role(null);
  assert.equal(
    (await db.query("select * from public.comments")).rows.length,
    0,
  );
  await db.exec("reset role");
  assert.equal(
    (await db.query("select * from private.audit_log")).rows.length,
    2,
  );
  await db.close();
});
