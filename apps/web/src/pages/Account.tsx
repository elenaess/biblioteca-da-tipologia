import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { UserRound, ShieldCheck, LogOut, PenLine, Camera } from "lucide-react";
import { useLibrary, repository } from "../context";
import { canManage } from "../../../../packages/domain/src";
import { MAX_AVATAR_BYTES } from "../../../../packages/domain/src/avatar";
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
  const [name, setName] = useState(user?.user_metadata.full_name || "");
  const [uploading, setUploading] = useState(false);
  const photoInput = useRef<HTMLInputElement>(null);
  async function changePhoto(file?: File) {
    if (!file || !repository || !user) return;
    setUploading(true);
    try {
      if (file.size > MAX_AVATAR_BYTES) throw new Error("Escolha uma foto de até 3 MB.");
      await repository.uploadAvatar(await file.arrayBuffer());
      await refreshProfile();
      notice("Foto de perfil atualizada.");
    } catch (error) {
      notice(error instanceof Error ? error.message : "Não foi possível enviar a foto.");
    } finally {
      setUploading(false);
      if (photoInput.current) photoInput.current.value = "";
    }
  }
  useEffect(
    () => setName(profile?.display_name || user?.user_metadata.full_name || ""),
    [profile?.display_name, user?.id],
  );
  async function save(e: React.FormEvent) {
    e.preventDefault();
    try {
      await repository?.saveProfile({ display_name: name.trim() });
      await refreshProfile();
      notice("Nome de exibição atualizado.");
    } catch {
      notice("Não foi possível atualizar seu nome.");
    }
  }
  return (
    <div className="account-page">
      <div className="eyebrow">SEU ESPAÇO</div>
      <h1>{user ? "Sua conta" : "Uma biblioteca, muitas perspectivas."}</h1>
      <p className="lead">
        {user
          ? "Seu perfil acompanha suas conversas e leituras."
          : "Entre para participar das conversas sobre livros e textos."}
      </p>
      <div className="account-card">
        <div className="account-avatar">
          {profile?.avatar_url ? <img src={profile.avatar_url} alt="Sua foto de perfil" referrerPolicy="no-referrer" /> : <UserRound size={32} />}
        </div>
        {user ? (
          <>
            <div className="avatar-upload">
              <input ref={photoInput} type="file" accept="image/jpeg,image/png,image/webp" hidden
                aria-label="Selecionar foto de perfil" disabled={uploading}
                onChange={(event) => void changePhoto(event.target.files?.[0])} />
              <button className="button secondary" type="button" disabled={uploading}
                onClick={() => photoInput.current?.click()}>
                <Camera size={17} /> {uploading ? "Enviando foto…" : "Trocar foto"}
              </button>
              <small>JPEG, PNG ou WebP. Até 3 MB.</small>
            </div>
            <h2>
              {profile?.display_name ||
                user.user_metadata.full_name ||
                "Leitor"}
            </h2>
            <p>{user.email}</p>
            <span className="badge">
              {role === "owner"
                ? "Proprietária"
                : role === "admin"
                  ? "Administrador"
                  : "Membro"}
            </span>
            <form onSubmit={save}>
              <label>
                Nome de exibição
                <input
                  value={name}
                  maxLength={80}
                  required
                  onChange={(e) => setName(e.target.value)}
                />
              </label>
              <button className="button secondary">Salvar nome</button>
            </form>
            {canManage(role) && (
              <Link className="button primary" to="/admin">
                <ShieldCheck size={18} />
                Abrir administração
              </Link>
            )}
            <button className="text-button" onClick={logout}>
              <LogOut size={17} />
              Sair da conta
            </button>
          </>
        ) : (
          <>
            <h2>Bem-vinda à Biblioteca</h2>
            <p>Seu perfil é criado a partir da sua conta Google.</p>
            <button
              className="button google-button"
              onClick={login}
              disabled={preview}
            >
              <img className="google-icon" src="./google.svg" alt="" width="20" height="20" /> Continuar com Google
            </button>
            {preview && (
              <p className="inline-note">
                Esta é uma prévia. O login será ativado ao conectar os serviços
                da biblioteca.
              </p>
            )}
          </>
        )}
      </div>
      {preview && (
        <Link className="editor-preview-link" to="/editor">
          <PenLine size={18} /> Experimentar o editor de textos{" "}
          <span>Rascunho local, sem publicação</span>
        </Link>
      )}
    </div>
  );
}
