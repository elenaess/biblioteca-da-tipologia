import { lazy, Suspense, useState, useEffect } from "react";
import { Link, useParams } from "react-router-dom";
import { ArrowLeft, BookOpen, ExternalLink, X, Pencil } from "lucide-react";
import { useLibrary, repository } from "../context";
import {
  canManage,
  driveUrl,
  topicLabel,
} from "../../../../packages/domain/src";
import { ReaderRepository } from "../../../../packages/data/src/reader";
import BookCover from "../components/BookCover";
import Comments from "../components/Comments";
const PdfReader = lazy(() => import("../components/PdfReader"));
export default function Book() {
  const { id } = useParams();
  const { books, role, loading, user } = useLibrary();
  const book = books.find((b) => b.id === id);
  const [reader, setReader] = useState(false);
  const [compatible, setCompatible] = useState(false),
    [progress, setProgress] = useState(0);
  useEffect(() => {
    let alive = true;
    if (repository && id) {
      const r = new ReaderRepository(repository.client);
      void Promise.all([r.manifest(id), r.position(id).catch(()=>null)])
        .then(([m, p]) => {
          if (alive) {
            setCompatible(m?.processing_status === "ready");
            let saved=p;
            try { const local=JSON.parse(localStorage.getItem(`reading:${user?.id||'guest'}:${id}`)||'null');if(local&&(!saved||local.updatedAt>saved.updatedAt))saved=local; } catch {}
            setProgress(saved?.revision === m?.revision ? saved?.progress || 0 : 0);
          }
        })
        .catch(() => {});
    }
    return () => {
      alive = false;
    };
  }, [id,user?.id]);
  if (loading) return <p>Carregando…</p>;
  if (!book)
    return (
      <div className="empty">
        <h1>Livro não encontrado</h1>
        <Link to="/">Voltar ao acervo</Link>
      </div>
    );
  if (reader)
    return (
      <div className="reader">
        <div className="reader-toolbar">
          <button className="button secondary" onClick={() => setReader(false)}>
            <ArrowLeft size={18} /> Voltar
          </button>
          <strong>{book.title}</strong>
          {book.source_type === "drive" && (
            <a
              className="button secondary"
              href={driveUrl(book)}
              target="_blank"
              rel="noreferrer"
            >
              <ExternalLink size={16} />
              <span>Abrir no Drive</span>
            </a>
          )}
        </div>
        {book.source_type === "upload" ? (
          <Suspense fallback={<p>Carregando leitor…</p>}>
            <PdfReader book={book} />
          </Suspense>
        ) : (
          <>
            <p className="reader-note">
              Se o arquivo pedir acesso ou não carregar, use “Abrir no Drive”.
            </p>
            <iframe
              src={driveUrl(book, true)}
              title={"Leitor: " + book.title}
              allow="fullscreen"
              referrerPolicy="no-referrer"
              allowFullScreen
            />
          </>
        )}
      </div>
    );
  return (
    <>
      <Link className="back-link" to="/">
        <ArrowLeft size={16} /> Voltar à biblioteca
      </Link>
      <div className="book-detail">
        <BookCover book={book} />
        <div className="book-summary">
          <div className="pills">
            {book.topics.map((t) => (
              <span key={t}>{topicLabel(t)}</span>
            ))}
            {book.schools.map((s) => (
              <span key={s}>{s}</span>
            ))}
          </div>
          <h1>{book.title}</h1>
          <p className="byline">
            {book.authors.join(", ") || "Autoria a conferir"}
          </p>
          <dl>
            <div>
              <dt>Tradução</dt>
              <dd>{book.translators.join(", ") || "Não informada"}</dd>
            </div>
            <div>
              <dt>Publicação</dt>
              <dd>{book.published_date || "Não informada"}</dd>
            </div>
            <div>
              <dt>Edição</dt>
              <dd>{book.edition || "Não informada"}</dd>
            </div>
            <div>
              <dt>Idioma</dt>
              <dd>{book.language || "Não informado"}</dd>
            </div>
            {book.translation_date && (
              <div>
                <dt>Data da tradução</dt>
                <dd>{book.translation_date}</dd>
              </div>
            )}
          </dl>
          <div className="form-actions">
            {compatible ? (
              <Link
                className="button primary"
                to={"/livro/" + book.id + "/ler"}
              >
                <BookOpen size={19} />
                {progress > 0 && progress < 0.995
                  ? `Continuar lendo — ${Math.round(progress * 100)}%`
                  : "Ler agora"}
              </Link>
            ) : null}
            <button
              className={"button " + (compatible ? "secondary" : "primary")}
              onClick={() => {
                if (
                  book.source_type === "upload" &&
                  book.file_path &&
                  !book.file_path.endsWith(".pdf")
                ) {
                  void repository!
                    .pdfUrl(book)
                    .then((url) => window.open(url, "_blank", "noopener"));
                } else setReader(true);
              }}
            >
              <BookOpen size={19} />{" "}
              {compatible ? "Ver arquivo original" : "Abrir livro"}
            </button>
            {canManage(role) && (
              <Link className="button secondary" to={"/admin/livro/" + book.id}>
                <Pencil size={17} />
                Editar ficha
              </Link>
            )}
          </div>
          <p className="source-note">
            {book.source_type === "upload"
              ? "Arquivo enviado pela curadoria da biblioteca."
              : "PDF disponível no acervo do Google Drive."}
          </p>
        </div>
      </div>
      {book.description && (
        <section className="synopsis">
          <h2>Sobre o livro</h2>
          <p>{book.description}</p>
        </section>
      )}
      <Comments kind="book" id={book.id} />
    </>
  );
}
