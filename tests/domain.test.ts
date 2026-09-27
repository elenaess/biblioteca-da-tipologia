import test from "node:test";
import assert from "node:assert/strict";
import {
  parseDriveReference,
  filterBooks,
  canManage,
} from "../packages/domain/src/index.ts";
test("Drive URLs accept file IDs and resource keys, rejecting other hosts", () => {
  assert.deepEqual(
    parseDriveReference(
      "https://drive.google.com/file/d/16wLOdxiu27gyyhG3G0Qqdz-PqebxJ7x6/view?resourcekey=hello",
    ),
    { id: "16wLOdxiu27gyyhG3G0Qqdz-PqebxJ7x6", resourceKey: "hello" },
  );
  assert.throws(() =>
    parseDriveReference("https://evil.test/file/d/abcdefghijklmnop/view"),
  );
  assert.throws(() => parseDriveReference("javascript:alert(1)"));
});
test("Search matches accents and translators without leaking unselected topics", () => {
  const books = [
    {
      title: "Caráter & Neurose",
      authors: ["Cláudio"],
      translators: ["Érica"],
      topics: ["eneagrama"],
      schools: [],
    },
  ];
  assert.equal(filterBooks(books as any, "erica", "eneagrama", "").length, 1);
  assert.equal(filterBooks(books as any, "carater", "mbti", "").length, 0);
});
test("Only trusted admin and owner roles authorize management", () => {
  assert.equal(canManage("member"), false);
  assert.equal(canManage(undefined), false);
  assert.equal(canManage("admin"), true);
  assert.equal(canManage("owner"), true);
});
