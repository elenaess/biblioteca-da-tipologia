import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import {
  Check,
  LoaderCircle,
  LogOut,
  PenLine,
  Pencil,
  ShieldCheck,
  UserRound,
} from "lucide-react";
import { useLibrary, repository } from "../context";
import { canManage } from "../../../../packages/domain/src";
import { MAX_AVATAR_BYTES } from "../../../../packages/domain/src/avatar";
import { useLocale } from "../i18n/LocaleContext";
import LocaleFlags from "../i18n/LocaleFlags";

export default function Account() {
  const {
    user,
    profile,
    refreshProfile,
    role,
    login,
    logout,
    preview,
    notice,
  } = useLibrary();
  const { t } = useLocale();

  const [name, setName] = useState(user?.user_metadata.full_name || "");
  const [uploading, setUploading] = useState(false);
  const photoInput = useRef<HTMLInputElement>(null);

  async function changePhoto(file?: File) {
    if (!file || !repository || !user) return;
    setUploading(true);
    try {
      if (file.size > MAX_AVATAR_BYTES) throw new Error("3 MB");
      await repository.uploadAvatar(await file.arrayBuffer());
      await refreshProfile();
      notice(t("account.changePhoto"));
    } catch (error) {
      notice(error instanceof Error ? error.message : "Upload failed");
    } finally {
      setUploading(false);
      if (photoInput.current) photoInput.current.value = "";
    }
  }

  useEffect(() => {
    setName(profile?.display_name || user?.user_metadata.full_name || "");
  }, [profile?.display_name, user?.id]);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    try {
      await repository?.saveProfile({ display_name: name.trim() });
      await refreshProfile();
      notice(t("account.saveName"));
    } catch {
      notice(t("common.retry"));
    }
  }

  const displayName =
    profile?.display_name || user?.user_metadata.full_name || t("common.reader");
  const roleLabel =
    role === "owner"
      ? t("account.owner")
      : role === "admin"
        ? t("account.admin")
        : t("account.member");

  return (
    <div className="account-page account-page-appstyle">
      <div className="eyebrow">{t("account.eyebrow")}</div>
      <h1>{user ? t("account.title") : t("account.guestTitle")}</h1>

      {user ? (
        <section className="account-profile-card">
          <div className="account-avatar-wrap">
            <div className="account-avatar account-avatar-large">
              {profile?.avatar_url ? (
                <img
                  src={profile.avatar_url}
                  alt=""
                  referrerPolicy="no-referrer"
                />
              ) : (
                <UserRound size={44} />
              )}
            </div>

            <input
              ref={photoInput}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              hidden
              aria-label={t("account.changePhoto")}
              disabled={uploading}
              onChange={(e) => void changePhoto(e.target.files?.[0])}
            />

            <button
              className="account-photo-edit"
              type="button"
              aria-label={t("account.changePhoto")}
              aria-busy={uploading}
              disabled={uploading}
              onClick={() => photoInput.current?.click()}
            >
              {uploading ? (
                <LoaderCircle className="account-spin" size={16} />
              ) : (
                <Pencil size={16} />
              )}
            </button>
          </div>

          <h2 className="account-profile-name" data-no-i18n>
            {displayName}
          </h2>
          <span className="badge account-role-badge">{roleLabel}</span>
          <p className="account-profile-email" data-no-i18n>
            {user.email}
          </p>

          <form className="account-name-editor" onSubmit={save}>
            <button
              className="account-name-confirm"
              type="submit"
              aria-label={t("account.saveName")}
              title={t("account.saveName")}
            >
              <Check size={20} />
            </button>
            <input
              aria-label={t("account.displayName")}
              value={name}
              maxLength={80}
              required
              placeholder={t("account.displayName")}
              onChange={(e) => setName(e.target.value)}
            />
          </form>

          <small className="account-photo-hint">{t("account.photoHint")}</small>

          {canManage(role) && (
            <Link className="button primary account-admin-button" to="/admin">
              <ShieldCheck size={18} />
              {t("account.openAdmin")}
            </Link>
          )}

          <button className="account-logout-button" type="button" onClick={logout}>
            <LogOut size={18} />
            {t("account.logout")}
          </button>
        </section>
      ) : (
        <section className="account-profile-card account-guest-card">
          <div className="account-avatar account-avatar-large account-avatar-fallback">
            <UserRound size={44} />
          </div>
          <h2 className="account-profile-name">{t("account.welcome")}</h2>
          <p className="account-guest-copy">{t("account.guestDescription")}</p>
          <button
            className="button google-button account-google-button"
            type="button"
            onClick={login}
            disabled={preview}
          >
            <img
              className="google-icon"
              src="./google.svg"
              alt=""
              width="20"
              height="20"
            />
            {t("account.continueGoogle")}
          </button>
        </section>
      )}

      <LocaleFlags />

      {preview && (
        <Link className="editor-preview-link" to="/editor">
          <PenLine size={18} />
          {t("common.edit")}
        </Link>
      )}
    </div>
  );
}
