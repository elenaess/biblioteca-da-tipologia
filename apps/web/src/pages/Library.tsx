import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  Search,
  ArrowUpRight,
  SlidersHorizontal,
  LibraryBig,
  LayoutGrid,
  Rows3,
  Pencil,
} from "lucide-react";
import { useLibrary } from "../context";
import {
  TOPICS,
  SCHOOLS,
  filterBooks,
  topicLabel,
  canManage,
} from "../../../../packages/domain/src";
import BookCover from "../components/BookCover";
export default function Library() {
  const { books, loading, error, reload, role } = useLibrary();
  const [q, setQ] = useState("");
  const [topic, setTopic] = useState("");
  const [school, setSchool] = useState("");
  const [view, setView] = useState("grid");
  const visible = useMemo(
    () => filterBooks(books, q, topic, school),
    [books, q, topic, school],
  );
  useEffect(() => {
    const context = (document as any).modelContext;
    if (!context?.registerTool) return;
    const controller = new AbortController();
    Promise.resolve(
      context.registerTool(
        {
          name: "search_library",
          title: "Buscar no acervo",
          description: "Filtra os livros visíveis por texto e tema.",
          inputSchema: {
            type: "object",
            properties: {
              query: { type: "string" },
              topic: { type: "string", enum: ["", ...TOPICS.map((t) => t.id)] },
            },
            required: ["query"],
            additionalProperties: false,
          },
          annotations: { readOnlyHint: false },
          execute(input: any) {
            if (
              typeof input?.query !== "string" ||
              (input.topic && !TOPICS.some((t) => t.id === input.topic))
            )
              throw Error("Filtro inválido.");
            setQ(input.query);
            setTopic(input.topic || "");
            setSchool("");
            return {
              count: filterBooks(books, input.query, input.topic || "", "")
                .length,
            };
          },
        },
        { signal: controller.signal },
      ),
    ).catch(() => {});
    return () => controller.abort();
  }, [books]);
  return (
    <>
      <header className="page-heading">
        <div>
          <div className="eyebrow">O ACERVO</div>
          <h1>Encontre sua próxima leitura.</h1>
          <p>Perspectivas para compreender a personalidade.</p>
        </div>
        <span className="collection-stamp">
          <LibraryBig size={23} />
          <strong>{books.length}</strong>
          <span>livros no acervo</span>
        </span>
      </header>
      <div className="search-bar">
        <Search size={21} />
        <input
          aria-label="Buscar livros"
          placeholder="Busque por título, autor ou tradutor…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
        <kbd>⌕</kbd>
      </div>
      <div className="topic-tabs" aria-label="Filtrar por tema">
        <button
          className={!topic ? "active" : ""}
          onClick={() => {
            setTopic("");
            setSchool("");
          }}
        >
          Todos os temas
        </button>
        {TOPICS.map((t) => (
          <button
            key={t.id}
            className={topic === t.id ? "active" : ""}
            onClick={() => {
              setTopic(t.id);
              setSchool("");
            }}
          >
            {t.label}
          </button>
        ))}
      </div>
      {topic === "socionics" && (
        <div className="school-tabs">
          <span>Escola</span>
          {["", ...SCHOOLS].map((s) => (
            <button
              key={s}
              className={school === s ? "active" : ""}
              onClick={() => setSchool(s)}
            >
              {s || "Todas"}
            </button>
          ))}
        </div>
      )}
      <div className="catalogue-heading">
        <div>
          <h2>
            {q
              ? "Resultados da busca"
              : topic
                ? topicLabel(topic)
                : "Explore a biblioteca"}
          </h2>
          <span>
            {visible.length} {visible.length === 1 ? "livro" : "livros"}
          </span>
        </div>
        <div className="view-switch">
          <button
            aria-label="Exibir em grade"
            aria-pressed={view === "grid"}
            onClick={() => setView("grid")}
          >
            <LayoutGrid size={18} />
          </button>
          <button
            aria-label="Exibir em lista"
            aria-pressed={view === "list"}
            onClick={() => setView("list")}
          >
            <Rows3 size={18} />
          </button>
        </div>
      </div>
      {loading ? (
        <div className="empty">Carregando a biblioteca…</div>
      ) : error ? (
        <div className="empty" role="alert">
          <p>{error}</p>
          <button className="button" onClick={reload}>
            Tentar novamente
          </button>
        </div>
      ) : visible.length ? (
        <div className={"books " + view}>
          {visible.map((book) => (
            <div className="book-item" key={book.id}>
            <Link to={"/livro/" + book.id} className="book-card">
              <BookCover book={book} />
              <div className="book-info">
                <span className="book-category">
                  {topicLabel(book.topics[0])}
                </span>
                <h3>{book.title}</h3>
                <p>{book.authors.join(", ") || "Autoria a conferir"}</p>
                {book.status === "draft" && (
                  <span className="badge">Rascunho</span>
                )}
              </div>
              <ArrowUpRight className="card-arrow" size={18} />
            </Link>
            {canManage(role) && <Link className="edit-pencil" to={"/admin/livro/" + book.id} aria-label={"Editar " + book.title} title="Editar"><Pencil size={17} /></Link>}
            </div>
          ))}
        </div>
      ) : (
        <div className="empty">
          <SlidersHorizontal size={30} />
          <h3>Nenhuma leitura por aqui ainda.</h3>
          <p>
            {q
              ? "Experimente outra busca."
              : "Os materiais deste tema aparecerão aqui quando forem adicionados."}
          </p>
          <button
            className="button secondary"
            onClick={() => {
              setTopic("");
              setSchool("");
              setQ("");
            }}
          >
            Ver todo o acervo
          </button>
        </div>
      )}
    </>
  );
}
