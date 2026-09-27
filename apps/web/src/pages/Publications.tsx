import { useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import {
  ArrowLeft,
  ArrowUpRight,
  FileText,
  ExternalLink,
  Pencil,
} from "lucide-react";
import { useLibrary } from "../context";
import { canManage, topicLabel, TOPICS } from "../../../../packages/domain/src";
import { sanitizeHtml } from "../rich-content";
import Comments from "../components/Comments";
export function Publications({ base = false }: { base?: boolean }) {
  const { publications, preview, role } = useLibrary();
  const [topic, setTopic] = useState("");
  const list = publications.filter(
    (p) =>
      (base ? p.kind === "base_text" : p.kind !== "base_text") &&
      (!topic || p.topics.includes(topic)),
  );
  return (
    <>
      <header className="page-heading">
        <div>
          <div className="eyebrow">{base ? "FUNDAMENTOS" : "PERSPECTIVAS"}</div>
          <h1>{base ? "Leituras" : "Artigos e escritos"}</h1>
          <p>
            {base
              ? "Um ponto de partida para cada teoria."
              : "Ideias, leituras e discussões sobre tipologia."}
          </p>
        </div>
        <FileText className="heading-icon" size={42} />
      </header>
      <div className="topic-tabs">
        <button className={!topic ? "active" : ""} onClick={() => setTopic("")}>
          Todos os temas
        </button>
        {TOPICS.map((t) => (
          <button
            key={t.id}
            className={topic === t.id ? "active" : ""}
            onClick={() => setTopic(t.id)}
          >
            {t.label}
          </button>
        ))}
      </div>
      <div className="publication-list">
        {list.map((p, i) => (
          <div className="publication-item" key={p.id}>
          <Link className="publication-card" to={"/texto/" + p.id}>
            <span className="publication-number">
              {String(i + 1).padStart(2, "0")}
            </span>
            <div>
              <span className="book-category">
                {p.topics.map(topicLabel).join(" · ")}
              </span>
              <h2>{p.title}</h2>
              <p>{p.summary}</p>
              <span className="muted">
                {p.author_name || "Texto do acervo"}
                {p.status === "draft" ? " · Rascunho" : ""}
              </span>
            </div>
            <ArrowUpRight size={23} />
          </Link>
          {canManage(role) && <Link className="edit-pencil" to={"/admin/texto/" + p.id} aria-label={"Editar " + p.title} title="Editar"><Pencil size={17} /></Link>}
          </div>
        ))}
      </div>
      {!list.length && (
        <div className="empty">
          <FileText size={32} />
          <h2>Um espaço para novas ideias.</h2>
          <p>As publicações aparecerão aqui assim que forem adicionadas.</p>
          {preview && (
            <Link className="button secondary" to="/editor">
              Experimentar o editor
            </Link>
          )}
        </div>
      )}
    </>
  );
}
export function PublicationDetail() {
  const { id } = useParams();
  const { publications, role, loading } = useLibrary();
  const p = publications.find((x) => x.id === id);
  const html = useMemo(() => sanitizeHtml(p?.html || ""), [p?.html]);
  const [font, setFont] = useState(18);
  if (loading) return <p>Carregando…</p>;
  if (!p)
    return (
      <div className="empty">
        <h1>Texto não encontrado</h1>
        <Link to="/textos-base">Voltar aos textos</Link>
      </div>
    );
  return (
    <article className="article-page">
      <Link
        className="back-link"
        to={p.kind === "base_text" ? "/textos-base" : "/artigos"}
      >
        <ArrowLeft size={16} />
        Voltar aos textos
      </Link>
      <div className="pills">
        {p.topics.map((t) => (
          <span key={t}>{topicLabel(t)}</span>
        ))}
      </div>
      <h1>{p.title}</h1>
      <p className="byline">
        {p.author_name || "Texto do acervo"}
        {p.published_at
          ? " · " + new Date(p.published_at).toLocaleDateString("pt-BR")
          : ""}
      </p>
      <div className="article-tools">
        <div>
          <button
            aria-label="Diminuir texto"
            onClick={() => setFont(Math.max(16, font - 2))}
          >
            A−
          </button>
          <button
            aria-label="Aumentar texto"
            onClick={() => setFont(Math.min(26, font + 2))}
          >
            A+
          </button>
        </div>
        {p.source_url && (
          <a href={p.source_url} target="_blank" rel="noreferrer">
            <ExternalLink size={15} />
            Documento original
          </a>
        )}
        {canManage(role) && (
          <Link to={"/admin/texto/" + p.id}>
            <Pencil size={16} />
            Editar
          </Link>
        )}
      </div>
      <div
        className="rich-content"
        style={{ fontSize: font }}
        dangerouslySetInnerHTML={{ __html: html }}
      />
      <Comments kind="publication" id={p.id} />
    </article>
  );
}
