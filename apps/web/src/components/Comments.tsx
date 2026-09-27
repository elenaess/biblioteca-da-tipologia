import { useEffect, useState } from "react";
import { MessageSquare, Trash2, Send } from "lucide-react";
import { useLibrary, repository } from "../context";
import { canManage, type Comment } from "../../../../packages/domain/src";
export default function Comments({
  kind,
  id,
}: {
  kind: "book" | "publication";
  id: string;
}) {
  const { user, role, login, notice, preview } = useLibrary();
  const [comments, setComments] = useState<Comment[]>([]);
  const [body, setBody] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  async function load() {
    if (!repository) return;
    try {
      setComments(await repository.comments(kind, id));
      setError("");
    } catch {
      setError("Não foi possível carregar os comentários.");
    }
  }
  useEffect(() => {
    setComments([]);
    void load();
  }, [kind, id]);
  async function send(e: React.FormEvent) {
    e.preventDefault();
    if (!repository) return;
    setBusy(true);
    try {
      await repository.addComment(kind, id, body);
      setBody("");
      await load();
      notice("Comentário publicado.");
    } catch (e) {
      notice(e instanceof Error ? e.message : "Não foi possível publicar.");
    } finally {
      setBusy(false);
    }
  }
  async function remove(cid: string) {
    if (!repository || !confirm("Remover este comentário?")) return;
    try {
      await repository.deleteComment(cid);
      await load();
      notice("Comentário removido.");
    } catch {
      notice("Não foi possível remover o comentário.");
    }
  }
  return (
    <section className="comments">
      <div className="section-title">
        <h2>
          <MessageSquare size={20} /> Conversa sobre a leitura
        </h2>
        <span>{comments.length}</span>
      </div>
      {error && (
        <p role="alert">
          {error} <button onClick={load}>Tentar novamente</button>
        </p>
      )}
      {!comments.length && !error && (
        <p className="muted">
          Ainda não há comentários. Compartilhe uma ideia sobre este conteúdo.
        </p>
      )}
      {comments.map((c) => (
        <article className="comment" key={c.id}>
          <div className="avatar">{c.profiles?.avatar_url
            ? <img src={c.profiles.avatar_url} alt="" referrerPolicy="no-referrer" />
            : c.profiles?.display_name?.[0] || "L"}</div>
          <div>
            <strong>{c.profiles?.display_name || "Leitor"}</strong>
            <time>{new Date(c.created_at).toLocaleDateString("pt-BR")}</time>
            <p>{c.body}</p>
          </div>
          {(user?.id === c.user_id || canManage(role)) && (
            <button
              className="icon-button"
              aria-label="Remover comentário"
              onClick={() => remove(c.id)}
            >
              <Trash2 size={16} />
            </button>
          )}
        </article>
      ))}
      {user ? (
        <form onSubmit={send}>
          <label htmlFor="comment">Seu comentário</label>
          <textarea
            id="comment"
            value={body}
            onChange={(e) => setBody(e.target.value)}
            maxLength={3000}
            placeholder="O que chamou sua atenção nesta leitura?"
            required
          />
          <div className="form-actions">
            <span className="muted">{body.length}/3.000</span>
            <button className="button primary" disabled={busy || !body.trim()}>
              <Send size={16} />
              {busy ? "Publicando…" : "Publicar comentário"}
            </button>
          </div>
        </form>
      ) : (
        <button className="button secondary" onClick={login} disabled={preview}>
          Entre com Google para comentar
        </button>
      )}
    </section>
  );
}
