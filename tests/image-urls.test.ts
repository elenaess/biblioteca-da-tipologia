import test from "node:test";
import assert from "node:assert/strict";
import { editorialImagePath } from "../packages/domain/src";
test("Private image references accept only this project and preserve stable paths", () => {
  const base =
    "https://test.supabase.co/storage/v1/object/public/editorial-images/";
  const path = "10000000-0000-4000-8000-000000000001.jpg";
  assert.equal(editorialImagePath(base + path, base), path);
  assert.equal(
    editorialImagePath(
      base.replace("/public/", "/sign/") + path + "?token=expires",
      base,
    ),
    path,
  );
  assert.equal(
    editorialImagePath(
      base.replace("test.supabase", "other.supabase") + path,
      base,
    ),
    null,
  );
  assert.equal(
    editorialImagePath("./source-images/jung/image1.png", base),
    null,
  );
});
