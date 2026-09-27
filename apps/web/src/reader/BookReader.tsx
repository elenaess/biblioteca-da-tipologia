import { useEffect, useRef, useState, type CSSProperties } from "react";
import type {
  ReaderAPI,
  ReaderChapter,
  ReaderManifest,
  ReadingPosition,
  TocItem,
} from "../../../../packages/domain/src/reader";
import {
  flattenToc,
  readingProgress,
} from "../../../../packages/domain/src/reader";
import { sanitizeReaderHtml } from "../book-parser/sanitizer";
import "./reader.css";
interface Props {
  bookId: string;
  title: string;
  api: ReaderAPI;
  onClose: () => void;
  initial?: { chapterId?: string; sectionId?: string };
  onLocation?: (chapter: string, section?: string) => void;
}
export default function BookReader({
  bookId,
  title,
  api,
  onClose,
  initial,
  onLocation,
}: Props) {
  const [manifest, setManifest] = useState<ReaderManifest | null>(),
    [chapters, setChapters] = useState<Record<string, ReaderChapter>>({}),
    [active, setActive] = useState(0),
    [section, setSection] = useState(""),
    [drawer, setDrawer] = useState(false),
    [settings, setSettings] = useState(false),
    [status, setStatus] = useState(""),
    [percent, setPercent] = useState(0),
    [note, setNote] = useState<{
      html: string;
      chapter: string;
      anchor: string;
    } | null>(null);
  const [prefs, setPrefs] = useState(() => {
    try {
      return {
        ...{ size: 18, line: 1.75, width: 760, theme: "paper" },
        ...JSON.parse(localStorage.getItem("reader-preferences") || "{}"),
      };
    } catch {
      return { size: 18, line: 1.75, width: 760, theme: "paper" };
    }
  });
  const viewport = useRef<HTMLDivElement>(null),
    heights = useRef<Record<string, number>>({}),
    pending = useRef(new Set<string>()),
    restore = useRef<{
      chapter: string;
      section?: string;
      fraction?: number;
    } | null>(null),
    position = useRef<ReadingPosition | null>(null),
    timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined),
    ready = useRef(false),
    mounted = useRef(true),
    observer = useRef<IntersectionObserver | null>(null),
    latestActive = useRef(active);
  latestActive.current = active;
  const manifestRef = useRef(manifest);
  manifestRef.current = manifest;
  const save = () => {
    if (position.current)
      void api.save(position.current).catch(() => {
        if (mounted.current)
          setStatus(
            "Progresso salvo neste dispositivo. A sincronização será tentada novamente.",
          );
      });
  };
  useEffect(() => {
    mounted.current = true;
    let alive = true;
    void Promise.all([api.manifest(), api.position().catch(() => null)])
      .then(([m, p]) => {
        if (!alive) return;
        setManifest(m);
        if (!m || m.processing_status !== "ready" || !m.chapters.length) return;
        const saved = p?.revision === m.revision ? p : null;
        const chapter =
          initial?.chapterId || saved?.chapterId || m.chapters[0]?.id;
        const index = Math.max(
          0,
          m.chapters.findIndex((c) => c.id === chapter),
        );
        restore.current = {
          chapter: m.chapters[index].id,
          section: initial?.sectionId,
          fraction: initial?.chapterId ? 0 : saved?.chapterProgress,
        };
        setActive(index);
        setPercent(saved?.progress || 0);
      })
      .catch(() => {
        if (alive) {
          setManifest(null);
          setStatus(
            "Não foi possível carregar o livro. Tente abrir novamente.",
          );
        }
      });
    return () => {
      alive = false;
      mounted.current = false;
      clearTimeout(timer.current);
      save();
    };
  }, [api]);
  useEffect(() => {
    try {
      localStorage.setItem("reader-preferences", JSON.stringify(prefs));
    } catch {}
  }, [prefs]);
  const navigate = (chapter: string, anchor?: string) => {
    if (!manifest) return;
    const i = manifest.chapters.findIndex((c) => c.id === chapter);
    if (i < 0) return;
    restore.current = { chapter, section: anchor, fraction: 0 };
    ready.current = false;
    setActive(i);
    setSection(anchor || "");
    setDrawer(false);
    setNote(null);
    onLocation?.(chapter, anchor);
    if (chapters[chapter]) requestAnimationFrame(() => restorePosition());
  };
  const restorePosition = () => {
    const target = restore.current,
      root = viewport.current;
    if (!target || !root) return;
    const at =
      manifest?.chapters.findIndex((c) => c.id === target.chapter) ?? 0;
    if (at > 0 && !chapters[manifest!.chapters[at - 1].id]) return;
    const slot = root.querySelector<HTMLElement>(
      `[data-slot="${target.chapter}"]`,
    );
    if (!slot?.querySelector(".reader-document")) return;
    const heading = target.section
      ? Array.from(slot.querySelectorAll<HTMLElement>("[id]")).find(
          (el) => el.id === target.section,
        )
      : null;
    root.scrollTop +=
      (heading || slot).getBoundingClientRect().top -
      root.getBoundingClientRect().top -
      20 +
      (heading
        ? 0
        : (target.fraction || 0) *
          Math.max(0, slot.offsetHeight - root.clientHeight));
    restore.current = null;
    ready.current = true;
    requestAnimationFrame(record);
  };
  useEffect(() => {
    if (!manifest || manifest.processing_status !== "ready") return;
    for (const c of manifest.chapters.slice(
      Math.max(0, active - 1),
      active + 2,
    )) {
      if (chapters[c.id] || pending.current.has(c.id)) continue;
      pending.current.add(c.id);
      void api
        .chapter(c.id)
        .then((value) => {
          if (!mounted.current) return;
          setChapters((old) => ({
            ...old,
            [c.id]: { ...value, html: sanitizeReaderHtml(value.html) },
          }));
        })
        .catch(() => {
          if (mounted.current)
            setChapters((old) => ({
              ...old,
              [c.id]: {
                ...c,
                html: "<p>Não foi possível carregar esta seção.</p>",
                plainText: "",
                error: true,
              },
            }));
        })
        .finally(() => pending.current.delete(c.id));
    }
  }, [manifest, active, chapters, api]);
  useEffect(() => {
    if (!manifest || !viewport.current) return;
    const root = viewport.current;
    for (const el of root.querySelectorAll<HTMLElement>("[data-slot]"))
      if (el.querySelector(".reader-document"))
        heights.current[el.dataset.slot!] = el.offsetHeight;
    restorePosition();
    observer.current?.disconnect();
    if (typeof IntersectionObserver !== "undefined") {
      observer.current = new IntersectionObserver(
        (entries) => {
          if (!ready.current) return;
          const hit = entries
            .filter((e) => e.isIntersecting)
            .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)
            .at(-1);
          if (hit) {
            const el = hit.target as HTMLElement;
            if (el.dataset.slot) {
              const i = manifest.chapters.findIndex(
                (c) => c.id === el.dataset.slot,
              );
              if (i >= 0) setActive(i);
            } else {
              setSection(el.id);
            }
          }
        },
        { root, rootMargin: "-12% 0px -75% 0px", threshold: 0 },
      );
      root
        .querySelectorAll(
          "[data-slot],.reader-document h1,.reader-document h2,.reader-document h3,.reader-document h4,.reader-document h5,.reader-document h6",
        )
        .forEach((el) => observer.current!.observe(el));
    }
    return () => observer.current?.disconnect();
  }, [manifest, chapters, active, prefs]);
  const record = () => {
    const m = manifestRef.current,
      root = viewport.current;
    if (!m || !root || !ready.current) return;
    let i = latestActive.current;
    let el = root.querySelector<HTMLElement>(
      `[data-slot="${m.chapters[i]?.id}"]`,
    );
    if (!el) return;
    const top = root.getBoundingClientRect().top; // Geometric fallback also supports WebViews without IntersectionObserver.
    if (
      el.getBoundingClientRect().bottom < top + 30 &&
      i < m.chapters.length - 1
    ) {
      setActive(i + 1);
      return;
    }
    if (el.getBoundingClientRect().top > top + root.clientHeight && i > 0) {
      setActive(i - 1);
      return;
    }
    const fraction = Math.max(
      0,
      Math.min(
        1,
        (top - el.getBoundingClientRect().top) /
          Math.max(1, el.offsetHeight - root.clientHeight),
      ),
    );
    const c = m.chapters[i];
    const headings = [...el.querySelectorAll<HTMLElement>("h1,h2,h3,h4,h5,h6")];
    const current =
      headings.filter((h) => h.getBoundingClientRect().top <= top + 80).at(-1)
        ?.id || "";
    setSection(current);
    const value = readingProgress(m.chapters, c.id, fraction);
    setPercent(value);
    position.current = {
      bookId,
      revision: m.revision,
      chapterId: c.id,
      sectionId: current || undefined,
      progress: value,
      chapterProgress: fraction,
      updatedAt: new Date().toISOString(),
    };
    onLocation?.(c.id, current || undefined);
    clearTimeout(timer.current);
    timer.current = setTimeout(save, 1100);
  };
  const frame = useRef(0);
  const scroll = () => {
    if (!frame.current)
      frame.current = requestAnimationFrame(() => {
        frame.current = 0;
        record();
      });
  };
  useEffect(() => {
    const visibility = () => {
      if (document.visibilityState === "hidden") save();
    };
    document.addEventListener("visibilitychange", visibility);
    const interval = setInterval(save, 15000);
    return () => {
      document.removeEventListener("visibilitychange", visibility);
      clearInterval(interval);
      cancelAnimationFrame(frame.current);
    };
  }, [api]);
  useEffect(() => {
    if (!drawer) return;
    const root = document.querySelector<HTMLElement>(".reader-index");
    const before = document.activeElement as HTMLElement | null;
    root?.querySelector<HTMLElement>("button")?.focus();
    const key = (e: KeyboardEvent) => {
      if (e.key === "Escape") setDrawer(false);
      if (e.key === "Tab" && root) {
        const list = [
          ...root.querySelectorAll<HTMLElement>("button,a[href]"),
        ].filter((x) => x.offsetParent);
        if (!list.length) return;
        if (e.shiftKey && document.activeElement === list[0]) {
          e.preventDefault();
          list.at(-1)!.focus();
        } else if (!e.shiftKey && document.activeElement === list.at(-1)) {
          e.preventDefault();
          list[0].focus();
        }
      }
    };
    document.addEventListener("keydown", key);
    return () => {
      document.removeEventListener("keydown", key);
      before?.focus();
    };
  }, [drawer]);
  const clickContent = (event: React.MouseEvent) => {
    const a = (event.target as HTMLElement).closest<HTMLAnchorElement>("a");
    if (!a) return;
    const chapter = a.dataset.chapter || manifest?.chapters[active]?.id,
      anchor = a.dataset.anchor || a.getAttribute("href")?.replace(/^#/, "");
    if (a.getAttribute("href")?.startsWith("#") && chapter) {
      event.preventDefault();
      const target = Array.from(
        viewport.current?.querySelectorAll<HTMLElement>("[id]") || [],
      ).find((el) => el.id === anchor);
      if (a.closest("sup") && target) {
        setNote({
          html: sanitizeReaderHtml(target.innerHTML),
          chapter,
          anchor: anchor || "",
        });
      } else navigate(chapter, anchor);
    }
  };
  const current = manifest?.chapters[active];
  const tocActive = manifest
    ? flattenToc(manifest.toc).find(
        (t) => t.chapterId === current?.id && t.anchor === section,
      )
    : null;
  const original = () =>
    void api
      .original()
      .catch(() =>
        setStatus(
          "Não foi possível abrir o arquivo original. Tente novamente.",
        ),
      );
  return (
    <section
      className={`semantic-reader reader-theme-${prefs.theme}`}
      aria-label={"Leitor: " + title}
      style={
        {
          "--reader-size": Math.max(14, Math.min(28, prefs.size)) + "px",
          "--reader-line": prefs.line,
          "--reader-width": prefs.width + "px",
        } as CSSProperties
      }
    >
      <header className="semantic-toolbar">
        <button
          onClick={() => {
            save();
            onClose();
          }}
          aria-label="Fechar leitor"
        >
          ←
        </button>
        <button
          className="reader-menu"
          aria-expanded={drawer}
          aria-controls="reader-index"
          onClick={() => setDrawer(!drawer)}
        >
          ☰ <span>Índice</span>
        </button>
        <strong>{tocActive?.title || current?.title || title}</strong>
        <button aria-expanded={settings} onClick={() => setSettings(!settings)}>
          Aa
        </button>
        <button onClick={original} title="Abrir arquivo original">
          ↗
        </button>
      </header>
      {settings && (
        <div className="reader-settings">
          <label>
            Tamanho{" "}
            <input
              aria-label="Tamanho do texto"
              type="range"
              min="14"
              max="28"
              value={prefs.size}
              onChange={(e) => setPrefs({ ...prefs, size: +e.target.value })}
            />
          </label>
          <label>
            Espaçamento{" "}
            <select
              value={prefs.line}
              onChange={(e) => setPrefs({ ...prefs, line: +e.target.value })}
            >
              <option value="1.5">Compacto</option>
              <option value="1.75">Normal</option>
              <option value="2">Amplo</option>
            </select>
          </label>
          <label>
            Largura{" "}
            <select
              value={prefs.width}
              onChange={(e) => setPrefs({ ...prefs, width: +e.target.value })}
            >
              <option value="600">Estreita</option>
              <option value="760">Normal</option>
              <option value="940">Larga</option>
            </select>
          </label>
          <label>
            Tema{" "}
            <select
              value={prefs.theme}
              onChange={(e) => setPrefs({ ...prefs, theme: e.target.value })}
            >
              <option value="paper">Papel</option>
              <option value="light">Claro</option>
              <option value="dark">Escuro</option>
            </select>
          </label>
        </div>
      )}
      <div className="reader-workspace">
        {drawer && (
          <button
            className="reader-scrim"
            aria-label="Fechar índice"
            onClick={() => setDrawer(false)}
          />
        )}
        <nav
          id="reader-index"
          className={"reader-index " + (drawer ? "open" : "")}
          aria-label="Conteúdo do livro"
        >
          <button
            className="reader-index-close"
            onClick={() => setDrawer(false)}
          >
            Fechar ×
          </button>
          <h2>Conteúdo</h2>
          {manifest && (
            <Toc
              items={
                manifest.toc.length
                  ? manifest.toc
                  : manifest.chapters.map((c) => ({
                      id: c.id,
                      title: c.title,
                      level: 1,
                      chapterId: c.id,
                    }))
              }
              current={current?.id || ""}
              section={section}
              go={navigate}
            />
          )}
        </nav>
        <div
          className="reader-scroll"
          ref={viewport}
          onScroll={scroll}
          onClick={clickContent}
          tabIndex={0}
          aria-label="Texto do livro"
        >
          {manifest === undefined ? (
            <p className="reader-loading" role="status">
              Preparando livro…
            </p>
          ) : !manifest || manifest.processing_status !== "ready" ? (
            <div className="reader-loading">
              <p>
                {manifest?.message ||
                  status ||
                  "Este livro ainda não possui uma versão compatível com o leitor interno."}
              </p>
              <button onClick={original}>Abrir arquivo original</button>
            </div>
          ) : (
            manifest.chapters.map((c, i) => (
              <section
                key={c.id}
                data-slot={c.id}
                style={
                  Math.abs(i - active) > 1
                    ? {
                        height:
                          heights.current[c.id] ||
                          Math.max(600, c.textLength * 0.8),
                      }
                    : undefined
                }
                aria-label={c.title}
              >
                {Math.abs(i - active) <= 1 ? (
                  chapters[c.id] ? (
                    <>
                      <article
                        className="reader-document"
                        dangerouslySetInnerHTML={{
                          __html: chapters[c.id].html,
                        }}
                      />
                      {chapters[c.id].error && (
                        <button
                          onClick={() =>
                            setChapters((old) => {
                              const next = { ...old };
                              delete next[c.id];
                              return next;
                            })
                          }
                        >
                          Tentar carregar seção
                        </button>
                      )}
                    </>
                  ) : (
                    <p className="reader-loading" role="status">
                      Carregando capítulo…
                    </p>
                  )
                ) : null}
              </section>
            ))
          )}
        </div>
      </div>
      <div className="semantic-progress">
        <span>{tocActive?.title || current?.title || title}</span>
        <span>{Math.round(percent * 100)}%</span>
        <progress max={1} value={percent} aria-label="Progresso no livro" />
        {status && <small role="status">{status}</small>}
      </div>
      {note && (
        <div
          className="reader-footnote"
          role="dialog"
          aria-label="Nota de rodapé"
        >
          <button onClick={() => setNote(null)} aria-label="Fechar nota">
            ×
          </button>
          <div dangerouslySetInnerHTML={{ __html: note.html }} />
          <button onClick={() => navigate(note.chapter, note.anchor)}>
            Ir para a nota
          </button>
        </div>
      )}
    </section>
  );
}
function Toc({
  items,
  current,
  section,
  go,
}: {
  items: TocItem[];
  current: string;
  section: string;
  go: (c: string, a?: string) => void;
}) {
  return (
    <ul>
      {items.map((item) => (
        <li key={item.id}>
          {item.children?.length ? (
            <details open={item.chapterId === current || undefined}>
              <summary>
                <button
                  aria-current={
                    item.chapterId === current &&
                    (!item.anchor || item.anchor === section)
                      ? "location"
                      : undefined
                  }
                  onClick={() => go(item.chapterId, item.anchor)}
                >
                  {item.title}
                </button>
              </summary>
              <Toc
                items={item.children}
                current={current}
                section={section}
                go={go}
              />
            </details>
          ) : (
            <button
              aria-current={
                item.chapterId === current &&
                (!item.anchor || item.anchor === section)
                  ? "location"
                  : undefined
              }
              onClick={() => go(item.chapterId, item.anchor)}
            >
              {item.title}
            </button>
          )}
        </li>
      ))}
    </ul>
  );
}
