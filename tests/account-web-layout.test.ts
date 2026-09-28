import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const account = fs.readFileSync("apps/web/src/pages/Account.tsx", "utf8");
const styles = fs.readFileSync("apps/web/src/styles.css", "utf8");
const localeCss = fs.readFileSync("apps/web/src/i18n/i18n.css", "utf8");

test("web account mirrors the app-style profile hierarchy", () => {
  assert.match(account, /className="account-profile-card"/);
  assert.match(account, /className="account-avatar-wrap"/);
  assert.match(account, /className="account-photo-edit"/);
  assert.match(account, /<Pencil size=\{16\}/);
  assert.match(account, /className="account-name-editor"/);
  assert.match(account, /className="account-name-confirm"/);
  assert.match(account, /<Check size=\{20\}/);
  assert.doesNotMatch(account, /<Camera\b/);
  assert.doesNotMatch(account, /className="avatar-upload"/);
});

test("web account keeps its existing behavior hooks", () => {
  assert.match(account, /repository\.uploadAvatar/);
  assert.match(account, /repository\?\.saveProfile/);
  assert.match(account, /canManage\(role\)/);
  assert.match(account, /onClick=\{logout\}/);
  assert.match(account, /<LocaleFlags \/>/);
});

test("web account has dedicated desktop and mobile app-style layout rules", () => {
  assert.match(styles, /BDT_ACCOUNT_APP_STYLE_V1/);
  assert.match(styles, /\.account-profile-card\s*\{/);
  assert.match(styles, /\.account-photo-edit\s*\{/);
  assert.match(styles, /\.account-name-editor\s*\{/);
  assert.match(styles, /@media \(max-width: 620px\)/);
  assert.match(localeCss, /BDT_ACCOUNT_LOCALE_APP_STYLE_V1/);
  assert.match(localeCss, /\.account-page \.locale-option/);
  assert.match(localeCss, /\.account-page \.locale-flag/);
});
