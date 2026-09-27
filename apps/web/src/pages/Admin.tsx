import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { Plus, ArrowLeft, Save, Upload, ShieldCheck } from "lucide-react";
import { useLibrary, repository } from "../context";
import {
  canManage,
  TOPICS,
  SCHOOLS,
  parseDriveReference,
  driveUrl,
  type Book,
  type Publication,
  type Profile,
  type Role,
} from "../../../../packages/domain/src";
import { ReaderRepository } from "../../../../packages/data/src/reader";
import type { NormalizedBook } from "../../../../packages/domain/src/reader";
import { bookFormat, parseBook } from "../book-parser";
import RichEditor from "../components/RichEditor";
import { sanitizeHtml } from "../rich-content";
export function AdminGate({ children }: { children: React.ReactNode }) {
  const { user, role, loading, preview } = useLibrary();
  if (loading) return <p>Carregando…</p>;
  if (!user || !canManage(role))
    return (
      <div className="empty">
        <ShieldCheck size={36} />
        <h1>Área administrativa</h1>
        <p>Entre com uma conta autorizada para gerenciar o acervo.</p>
        <Link className="button primary" to="/conta">
          Ir para minha conta
        </Link>
      </div>
    );
  return <>{children}</>;
}
export function Admin() {
  const { books, publications, role, notice } = useLibrary();
  const [members, setMembers] = useState<(Profile & { role: Role })[]>([]);
  useEffect(() => {
    if (role === "owner")
      repository
        ?.members()
        .then(setMembers)
        .catch(() => notice("Não foi possível carregar as contas."));
  }, [role]);
  async function change(id: string, next: "member" | "admin") {
    if (
      !confirm(
        next === "admin"
          ? "Conceder administração a esta conta?"
          : "Remover administração desta conta?",
      )
    )
      return;
    try {
      await repository!.setRole(id, next);
      setMembers(await repository!.members());
      notice("Permissão atualizada.");
    } catch (e) {
      notice(e instanceof Error ? e.message : "Não foi possível alterar.");
    }
  }
  return (
    <AdminGate>
      <header className="page-heading">
        <div>
          <div className="eyebrow">CURADORIA</div>
          <h1>Administração</h1>
          <p>Cuide do acervo e das conversas da biblioteca.</p>
        </div>
      </header>
      <div className="admin-actions">
        <Link className="button primary" to="/admin/livro/novo">
          <Plus size={17} />
          Adicionar livro
        </Link>
        <Link className="button secondary" to="/admin/texto/novo">
          <Plus size={17} />
          Criar publicação
        </Link>
      </div>
      <section className="admin-section">
        <h2>
          Livros <span>{books.length}</span>
        </h2>
        <div className="admin-list">
          {books.map((b) => (
            <Link to={"/admin/livro/" + b.id} key={b.id}>
              <strong>{b.title}</strong>
              <span className="badge">
                {b.status === "published" ? "Publicado" : "Rascunho"}
              </span>
              <span>Editar →</span>
            </Link>
          ))}
        </div>
      </section>
      <section className="admin-section">
        <h2>Textos e artigos</h2>
        <div className="admin-list">
          {publications.map((p) => (
            <Link to={"/admin/texto/" + p.id} key={p.id}>
              <strong>{p.title}</strong>
              <span className="badge">
                {p.status === "published" ? "Publicado" : "Rascunho"}
              </span>
              <span>Editar →</span>
            </Link>
          ))}
        </div>
      </section>
      {role === "owner" && (
        <section className="admin-section">
          <h2>Administradores</h2>
          <p>
            A conta precisa ter entrado uma vez na biblioteca para aparecer
            aqui.
          </p>
          {members.map((m) => (
            <div className="member" key={m.id}>
              <div>
                <strong>{m.display_name}</strong>
                <small>{m.id}</small>
              </div>
              <span>
                {m.role === "owner"
                  ? "Proprietária"
                  : m.role === "admin"
                    ? "Administrador"
                    : "Membro"}
              </span>
              {m.role !== "owner" && (
                <button
                  className="button secondary"
                  onClick={() =>
                    change(m.id, m.role === "admin" ? "member" : "admin")
                  }
                >
                  {m.role === "admin"
                    ? "Remover administração"
                    : "Tornar administrador"}
                </button>
              )}
            </div>
          ))}
        </section>
      )}
    </AdminGate>
  );
}
function TopicFields({
  topics,
  schools,
  onTopics,
  onSchools,
}: {
  topics: string[];
  schools: string[];
  onTopics: (v: string[]) => void;
  onSchools: (v: string[]) => void;
}) {
  return (
    <>
      <fieldset>
        <legend>Temas</legend>
        <div className="check-grid">
          {TOPICS.map((t) => (
            <label key={t.id}>
              <input
                type="checkbox"
                checked={topics.includes(t.id)}
                onChange={(e) => {
                  const next = e.target.checked
                    ? [...topics, t.id]
                    : topics.filter((x) => x !== t.id);
                  onTopics(next);
                  if (!next.includes("socionics")) onSchools([]);
                }}
              />
              {t.label}
            </label>
          ))}
        </div>
      </fieldset>
      {topics.includes("socionics") && (
        <fieldset>
          <legend>Escolas de Socionics</legend>
          <div className="check-grid">
            {SCHOOLS.map((s) => (
              <label key={s}>
                <input
                  type="checkbox"
                  checked={schools.includes(s)}
                  onChange={(e) =>
                    onSchools(
                      e.target.checked
                        ? [...schools, s]
                        : schools.filter((x) => x !== s),
                    )
                  }
                />
                {s}
              </label>
            ))}
          </div>
        </fieldset>
      )}
    </>
  );
}
const emptyBook: Book = {
  id: "",
  title: "",
  authors: [],
  translators: [],
  published_date: "",
  translation_date: "",
  edition: "",
  language: "",
  description: "",
  topics: [],
  schools: [],
  source_type: "drive",
  drive_id: null,
  resource_key: null,
  file_path: null,
  file_name: null,
  file_size: null,
  cover_url: null,
  status: "draft",
  source_title: "",
};
export function BookEditor() {
  const { loading, books } = useLibrary();
  const { id } = useParams();
  if (loading) return <p>Carregando ficha…</p>;
  if (id !== "novo" && !books.some((b) => b.id === id))
    return <p>Livro não encontrado.</p>;
  return <BookEditorForm key={id} />;
}
function BookEditorForm() {
  const { id } = useParams();
  const { books, reload, notice } = useLibrary();
  const nav = useNavigate();
  const [b, setB] = useState<Book>(
    () =>
      books.find((x) => x.id === id) || {
        ...emptyBook,
        id: crypto.randomUUID(),
      },
  );
  const [prepared, setPrepared] = useState<{
    book: NormalizedBook | null;
    revision: string;
    format: string;
    message: string;
  } | null>(null);
  const [processing, setProcessing] = useState("");
  const [drive, setDrive] = useState(b.drive_id ? driveUrl(b) : "");
  const [authors, setAuthors] = useState(b.authors.join("; "));
  const [translators, setTranslators] = useState(b.translators.join("; "));
  const [busy, setBusy] = useState(false);
  const [uploading, setUploading] = useState(false);
  const set = (key: keyof Book, value: any) =>
    setB((x) => ({ ...x, [key]: value }));
  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (uploading) return;
    setBusy(true);
    try {
      const source =
        b.source_type === "drive"
          ? {
              drive_id: parseDriveReference(drive).id,
              resource_key: parseDriveReference(drive).resourceKey,
              file_path: null,
              file_name: null,
              file_size: null,
            }
          : { drive_id: null, resource_key: null };
      if (b.source_type === "upload" && !b.file_path)
        throw Error("Envie o arquivo antes de salvar.");
      await repository!.saveBook({
        ...b,
        ...source,
        title: b.title.trim(),
        authors: authors
          .split(";")
          .map((x) => x.trim())
          .filter(Boolean),
        translators: translators
          .split(";")
          .map((x) => x.trim())
          .filter(Boolean),
      });
      if (prepared && b.source_type === "upload" && b.file_path)
        await new ReaderRepository(repository!.client).publish(
          b.id,
          b.file_path,
          prepared.revision,
          prepared.book,
          prepared.format,
          prepared.message,
        );
      await reload();
      notice("Ficha salva.");
      nav("/admin");
    } catch (e) {
      notice(e instanceof Error ? e.message : "Não foi possível salvar.");
    } finally {
      setBusy(false);
    }
  }
  async function pdf(file?: File) {
    if (!file || uploading) return;
    setUploading(true);
    try {
      const format = bookFormat(file.name),
        revision = crypto.randomUUID();
      setProcessing("Enviando arquivo original…");
      const uploaded = await repository!.uploadBook(file, b.id, format);
      let result: NormalizedBook | null = null,
        message = "";
      try {
        result = await parseBook(
          file,
          (bytes, mime) =>
            new ReaderRepository(repository!.client).asset(
              b.id,
              revision,
              bytes,
              mime,
            ),
          setProcessing,
        );
      } catch (error) {
        message =
          error instanceof Error
            ? error.message
            : "Não foi possível preparar a leitura. O original continua disponível.";
      }
      setPrepared({ book: result, revision, format, message });
      setB((x) => ({
        ...x,
        ...uploaded,
        source_type: "upload",
        title:
          x.title ||
          result?.metadata.title ||
          file.name.replace(/\.[^.]+$/, ""),
        language: x.language || result?.metadata.language || "",
      }));
      if (!authors && result?.metadata.author)
        setAuthors(result.metadata.author);
      if (result?.metadata.coverUrl && !b.cover_url) {
        const base = repository!.client.storage
          .from("book-assets")
          .getPublicUrl("").data.publicUrl;
        const path = result.metadata.coverUrl.slice(base.length);
        const { data: blob } = await repository!.client.storage
          .from("book-assets")
          .download(path);
        if (blob) {
          set(
            "cover_url",
            await repository!.uploadImage(
              new File([blob], "capa." + (blob.type.split("/")[1] || "png"), {
                type: blob.type,
              }),
            ),
          );
        }
      }
      setProcessing(
        result
          ? `${result.chapters.length} capítulos preparados. Salve a ficha para publicar.`
          : message,
      );
      notice(
        result
          ? "Livro preparado. Salve a ficha para concluir."
          : "Original enviado. Confira o aviso do leitor e salve a ficha.",
      );
    } catch (e) {
      notice(e instanceof Error ? e.message : "Não foi possível enviar o PDF.");
    } finally {
      setUploading(false);
    }
  }
  async function cover(file?: File) {
    if (!file || uploading) return;
    setUploading(true);
    try {
      set("cover_url", await repository!.uploadImage(file));
      notice("Capa enviada. Salve a ficha para aplicar.");
    } catch (e) {
      notice(e instanceof Error ? e.message : "Não foi possível enviar.");
    } finally {
      setUploading(false);
    }
  }
  return (
    <AdminGate>
      <Link className="back-link" to="/admin">
        <ArrowLeft size={16} />
        Administração
      </Link>
      <h1>{id === "novo" ? "Adicionar livro" : "Editar livro"}</h1>
      <form className="editor-form" onSubmit={save}>
        <label>
          Título
          <input
            value={b.title}
            onChange={(e) => set("title", e.target.value)}
            maxLength={250}
            required
          />
        </label>
        <div className="fields-two">
          <label>
            Autores (separados por ponto e vírgula)
            <input
              value={authors}
              onChange={(e) => setAuthors(e.target.value)}
            />
          </label>
          <label>
            Tradutores (separados por ponto e vírgula)
            <input
              value={translators}
              onChange={(e) => setTranslators(e.target.value)}
            />
          </label>
          <label>
            Publicação original
            <input
              placeholder="AAAA ou AAAA-MM-DD"
              value={b.published_date}
              onChange={(e) => set("published_date", e.target.value)}
            />
          </label>
          <label>
            Data da tradução
            <input
              placeholder="AAAA ou AAAA-MM-DD"
              value={b.translation_date}
              onChange={(e) => set("translation_date", e.target.value)}
            />
          </label>
          <label>
            Edição
            <input
              value={b.edition}
              onChange={(e) => set("edition", e.target.value)}
            />
          </label>
          <label>
            Idioma
            <input
              value={b.language}
              onChange={(e) => set("language", e.target.value)}
            />
          </label>
        </div>
        <label>
          Descrição
          <textarea
            value={b.description}
            onChange={(e) => set("description", e.target.value)}
          />
        </label>
        <fieldset>
          <legend>Arquivo do livro</legend>
          <p>
            Para ativar capítulos e índice em um livro do Drive, baixe o
            original e envie-o aqui. O arquivo continua disponível para
            download.
          </p>
          <label>
            Origem
            <select
              value={b.source_type}
              disabled={uploading}
              onChange={(e) => set("source_type", e.target.value)}
            >
              <option value="upload">Enviar arquivo do dispositivo</option>
              <option value="drive">Link do Google Drive</option>
            </select>
          </label>
          {b.source_type === "drive" ? (
            <label>
              Link do PDF no Google Drive
              <input
                type="url"
                value={drive}
                onChange={(e) => setDrive(e.target.value)}
                required
                placeholder="https://drive.google.com/file/d/…/view"
              />
            </label>
          ) : (
            <label className="upload-field">
              <Upload size={18} />
              {b.file_name ? "Substituir arquivo" : "Enviar arquivo"}
              <input
                type="file"
                disabled={uploading || busy}
                accept=".pdf,.epub,.html,.htm,.md,.markdown,.txt"
                onChange={(e) => void pdf(e.target.files?.[0])}
              />
              <small>
                EPUB, PDF, HTML, Markdown ou TXT de até 25 MB. O arquivo
                acompanha a visibilidade desta ficha.
              </small>
              {b.file_name && (
                <strong>
                  {b.file_name} ·{" "}
                  {((b.file_size || 0) / 1024 / 1024).toFixed(1)} MB
                </strong>
              )}
            </label>
          )}
          {processing && <p role="status">{processing}</p>}
        </fieldset>
        <label className="upload-field">
          <Upload size={18} />
          Capa do livro
          <input
            type="file"
            accept="image/png,image/jpeg,image/webp"
            disabled={uploading || busy}
            onChange={(e) => void cover(e.target.files?.[0])}
          />
          {b.cover_url && (
            <img
              className="cover-preview"
              src={b.cover_url}
              alt="Capa selecionada"
            />
          )}
        </label>
        <TopicFields
          topics={b.topics}
          schools={b.schools}
          onTopics={(v) => set("topics", v)}
          onSchools={(v) => set("schools", v)}
        />
        <label>
          Visibilidade
          <select
            value={b.status}
            onChange={(e) => set("status", e.target.value)}
          >
            <option value="draft">Rascunho — só administradores</option>
            <option value="published">Publicado — visível no acervo</option>
          </select>
        </label>
        <button className="button primary" disabled={busy || uploading}>
          <Save size={17} />
          {busy ? "Salvando…" : "Salvar ficha"}
        </button>
      </form>
    </AdminGate>
  );
}
const starter =
  '<h2>Um novo olhar sobre a personalidade</h2><p>Comece a escrever aqui. Selecione um trecho para aplicar <strong>negrito</strong>, <em>itálico</em> ou mudar o alinhamento.</p><p style="text-align:center">Uma ideia também pode ocupar o centro.</p><p style="text-align:justify">Use o botão de imagem para inserir uma foto entre os parágrafos. Você também pode colar imagens diretamente no editor.</p>';
export function PublicationEditor({ demo = false }: { demo?: boolean }) {
  const { loading, publications } = useLibrary();
  const { id } = useParams();
  if (loading) return <p>Carregando texto…</p>;
  if (!demo && id !== "novo" && !publications.some((p) => p.id === id))
    return <p>Publicação não encontrada.</p>;
  return <PublicationEditorForm key={id || "demo"} demo={demo} />;
}
function PublicationEditorForm({ demo = false }: { demo?: boolean }) {
  const { id } = useParams();
  const { publications, reload, notice } = useLibrary();
  const nav = useNavigate();
  const [p, setP] = useState<Publication>(
    () =>
      publications.find((x) => x.id === id) || {
        id: crypto.randomUUID(),
        title: demo ? "Seu espaço de escrita" : "",
        kind: "article",
        summary: "",
        html: demo ? starter : "<p></p>",
        topics: [],
        schools: [],
        author_name: "",
        published_at: null,
        status: "draft",
        source_url: null,
      },
  );
  const [busy, setBusy] = useState(false);
  const [view, setView] = useState(false);
  const [imageUploading, setImageUploading] = useState(false);
  const set = (key: keyof Publication, value: any) =>
    setP((x) => ({ ...x, [key]: value }));
  async function upload(file: File) {
    if (repository && !demo) return repository.uploadImage(file);
    if (
      !["image/png", "image/jpeg", "image/webp"].includes(file.type) ||
      file.size > 5 * 1024 * 1024
    )
      throw Error("Use PNG, JPEG ou WebP de até 5 MB.");
    return new Promise<string>((resolve, reject) => {
      const r = new FileReader();
      r.onload = () => resolve(String(r.result));
      r.onerror = () => reject(Error("Não foi possível ler a imagem."));
      r.readAsDataURL(file);
    });
  }
  async function save(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      const data = {
        ...p,
        html: sanitizeHtml(p.html),
        published_at:
          p.status === "published"
            ? p.published_at || new Date().toISOString()
            : null,
      };
      if (demo) {
        const blob = new Blob([data.html], { type: "text/html" });
        const a = document.createElement("a");
        a.href = URL.createObjectURL(blob);
        a.download = "rascunho.html";
        a.click();
        URL.revokeObjectURL(a.href);
        notice("Rascunho exportado. Nada foi publicado.");
      } else {
        await repository!.savePublication(data);
        await reload();
        notice("Publicação salva.");
        nav("/admin");
      }
    } catch (e) {
      notice(e instanceof Error ? e.message : "Não foi possível salvar.");
    } finally {
      setBusy(false);
    }
  }
  const content = (
    <>
      <Link className="back-link" to={demo ? "/artigos" : "/admin"}>
        <ArrowLeft size={16} />
        {demo ? "Voltar aos artigos" : "Administração"}
      </Link>
      <div className="editor-heading">
        <div>
          <div className="eyebrow">
            {demo ? "EXPERIMENTE" : "ESPAÇO EDITORIAL"}
          </div>
          <h1>
            {demo
              ? "Dê forma às suas ideias."
              : id === "novo"
                ? "Criar publicação"
                : "Editar publicação"}
          </h1>
        </div>
        <button className="button secondary" onClick={() => setView(!view)}>
          {view ? "Voltar à edição" : "Pré-visualizar"}
        </button>
      </div>
      {demo && (
        <p className="inline-note">
          Rascunho temporário para experimentar a formatação. Não é salvo nem
          publicado na biblioteca.
        </p>
      )}
      <form className="editor-form" onSubmit={save}>
        <label>
          Título
          <input
            value={p.title}
            maxLength={250}
            required
            onChange={(e) => set("title", e.target.value)}
          />
        </label>
        <div className="fields-two">
          <label>
            Tipo
            <select
              value={p.kind}
              onChange={(e) => set("kind", e.target.value)}
            >
              <option value="article">Artigo</option>
              <option value="base_text">Leitura</option>
              <option value="post">Post</option>
            </select>
          </label>
          <label>
            Autoria
            <input
              value={p.author_name}
              onChange={(e) => set("author_name", e.target.value)}
            />
          </label>
        </div>
        <label>
          Resumo
          <textarea
            value={p.summary}
            onChange={(e) => set("summary", e.target.value)}
          />
        </label>
        {view ? (
          <div
            className="rich-content preview-document"
            dangerouslySetInnerHTML={{ __html: sanitizeHtml(p.html) }}
          />
        ) : (
          <RichEditor
            value={p.html}
            onChange={(v) => set("html", v)}
            upload={upload}
            onBusyChange={setImageUploading}
          />
        )}
        <TopicFields
          topics={p.topics}
          schools={p.schools}
          onTopics={(v) => set("topics", v)}
          onSchools={(v) => set("schools", v)}
        />
        <label>
          Documento ou fonte original
          <input
            type="url"
            value={p.source_url || ""}
            onChange={(e) => set("source_url", e.target.value || null)}
          />
        </label>
        {!demo && (
          <label>
            Visibilidade
            <select
              value={p.status}
              onChange={(e) => set("status", e.target.value)}
            >
              <option value="draft">Rascunho — só administradores</option>
              <option value="published">
                Publicado — visível na biblioteca
              </option>
            </select>
          </label>
        )}
        <button className="button primary" disabled={busy || imageUploading}>
          <Save size={17} />
          {busy
            ? "Salvando…"
            : demo
              ? "Exportar rascunho"
              : "Salvar publicação"}
        </button>
      </form>
    </>
  );
  return demo ? content : <AdminGate>{content}</AdminGate>;
}
