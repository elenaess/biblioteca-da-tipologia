import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Search, ArrowUpRight, SlidersHorizontal, LibraryBig, LayoutGrid, Rows3, Pencil } from "lucide-react";
import { useLibrary } from "../context";
import { TOPICS, SCHOOLS, filterBooks, prioritizeBooksByLocale, topicLabelLocalized, canManage } from "../../../../packages/domain/src";
import { useLocale } from "../i18n/LocaleContext";
import BookCover from "../components/BookCover";
export default function Library() {
  const { books, loading, error, reload, role } = useLibrary();
  const { locale, t } = useLocale();
  const [q, setQ] = useState("");
  const [topic, setTopic] = useState("");
  const [school, setSchool] = useState("");
  const [view, setView] = useState("grid");
  const visible = useMemo(
    () => prioritizeBooksByLocale(
      filterBooks(books, q, topic, school),
      locale,
    ),
    [books, q, topic, school, locale],
  );
  useEffect(() => {
    const context = (document as any).modelContext;
    if (!context?.registerTool) return;
    const controller = new AbortController();
    Promise.resolve(context.registerTool({
      name: "search_library", title: t("library.searchLabel"), description: t("library.searchPlaceholder"),
      inputSchema: { type: "object", properties: { query: { type: "string" }, topic: { type: "string", enum: ["", ...TOPICS.map((x) => x.id)] } }, required: ["query"], additionalProperties: false },
      annotations: { readOnlyHint: false },
      execute(input: any) {
        if (typeof input?.query !== "string" || (input.topic && !TOPICS.some((x) => x.id === input.topic))) throw Error("Invalid filter");
        setQ(input.query); setTopic(input.topic || ""); setSchool("");
        return { count: filterBooks(books, input.query, input.topic || "", "").length };
      },
    }, { signal: controller.signal })).catch(() => {});
    return () => controller.abort();
  }, [books, t]);
  return <>
    <header className="page-heading"><div><div className="eyebrow">{t("library.eyebrow")}</div><h1>{t("library.title")}</h1><p>{t("library.subtitle")}</p></div>
      <span className="collection-stamp"><LibraryBig size={23}/><strong>{books.length}</strong><span>{t("library.booksInCollection")}</span></span>
    </header>
    <div className="search-bar"><Search size={21}/><input aria-label={t("library.searchLabel")} placeholder={t("library.searchPlaceholder")} value={q} onChange={(e)=>setQ(e.target.value)}/><kbd>⌕</kbd></div>
    <div className="topic-tabs" aria-label={t("library.allTopics")}><button className={!topic?"active":""} onClick={()=>{setTopic("");setSchool("")}}>{t("library.allTopics")}</button>
      {TOPICS.map((x)=><button key={x.id} className={topic===x.id?"active":""} onClick={()=>{setTopic(x.id);setSchool("")}}>{topicLabelLocalized(x.id, locale)}</button>)}
    </div>
    {topic==="socionics"&&<div className="school-tabs"><span>{t("library.school")}</span>{["",...SCHOOLS].map((x)=><button key={x} className={school===x?"active":""} onClick={()=>setSchool(x)}>{x||t("library.allSchools")}</button>)}</div>}
    <div className="catalogue-heading"><div><h2>{q?t("library.searchResults"):topic?topicLabelLocalized(topic, locale):t("library.explore")}</h2><span>{visible.length} {visible.length===1?t("library.bookOne"):t("library.bookMany")}</span></div>
      <div className="view-switch"><button aria-label={t("library.grid")} aria-pressed={view==="grid"} onClick={()=>setView("grid")}><LayoutGrid size={18}/></button><button aria-label={t("library.list")} aria-pressed={view==="list"} onClick={()=>setView("list")}><Rows3 size={18}/></button></div>
    </div>
    {loading?<div className="empty">{t("library.loading")}</div>:error?<div className="empty" role="alert"><p>{error}</p><button className="button" onClick={reload}>{t("common.retry")}</button></div>:visible.length?<div className={"books "+view}>
      {visible.map((book)=><div className="book-item" key={book.id}><Link to={"/livro/"+book.id} className="book-card"><BookCover book={book}/><div className="book-info"><span className="book-category">{topicLabelLocalized(book.topics[0], locale)}</span><h3 data-no-i18n>{book.title}</h3><p data-no-i18n>{book.authors.join(", ")||t("common.authorPending")}</p>{book.status==="draft"&&<span className="badge">{t("common.draft")}</span>}</div><ArrowUpRight className="card-arrow" size={18}/></Link>{canManage(role)&&<Link className="edit-pencil" to={"/admin/livro/"+book.id} aria-label={t("common.edit")+" "+book.title} title={t("common.edit")}><Pencil size={17}/></Link>}</div>)}
    </div>:<div className="empty"><SlidersHorizontal size={30}/><h3>{t("library.emptyTitle")}</h3><p>{q?t("library.emptySearch"):t("library.emptyTopic")}</p><button className="button secondary" onClick={()=>{setTopic("");setSchool("");setQ("")}}>{t("library.showAll")}</button></div>}
  </>;
}
