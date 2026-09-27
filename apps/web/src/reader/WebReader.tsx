import { useMemo } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { repository, useLibrary } from "../context";
import { ReaderRepository } from "../../../../packages/data/src/reader";
import { driveUrl } from "../../../../packages/domain/src";
import type {
  ReaderAPI,
  ReadingPosition,
} from "../../../../packages/domain/src/reader";
import BookReader from "./BookReader";
export default function WebReader() {
  const { id } = useParams(),
    nav = useNavigate();
  const { books, user, loading } = useLibrary();
  const book = books.find((x) => x.id === id);
  const initial = useMemo(() => {
    const q = new URLSearchParams(location.hash.split("?")[1] || "");
    return {
      chapterId: q.get("capitulo") || undefined,
      sectionId: q.get("secao") || undefined,
    };
  }, [id]);
  const api = useMemo<ReaderAPI | null>(() => {
    if (!repository || !book) return null;
    const r = new ReaderRepository(repository.client),
      key = `reading:${user?.id || "guest"}:${book.id}`;
    return {
      manifest: () => r.manifest(book.id),
      chapter: (c) => r.chapter(book.id, c),
      position: async () => {
        let local: ReadingPosition | null = null;
        try {
          local = JSON.parse(localStorage.getItem(key) || "null");
        } catch {}
        if (!user) return local;
        const remote = await r.position(book.id).catch(() => null);
        return remote && (!local || remote.updatedAt > local.updatedAt)
          ? remote
          : local;
      },
      save: async (p) => {
        try {
          localStorage.setItem(key, JSON.stringify(p));
        } catch {}
        if (user) await r.save(p);
      },
      original: async () => {
        if (book.source_type === "drive") {
          window.open(driveUrl(book), "_blank", "noopener");
          return;
        }
        const url = await repository!.pdfUrl(book);
        const a = document.createElement("a");
        a.href = url;
        a.target = "_blank";
        a.rel = "noopener noreferrer";
        a.download = book.file_name || "livro";
        a.click();
      },
    };
  }, [book, user?.id]);
  if (loading) return <p>Preparando livro…</p>;
  if (!book || !api) return <p>Livro não encontrado.</p>;
  return (
    <BookReader
      bookId={book.id}
      title={book.title}
      api={api}
      initial={initial}
      onClose={() => nav("/livro/" + book.id)}
      onLocation={(chapter, section) => {
        const q = new URLSearchParams({
          capitulo: chapter,
          ...(section ? { secao: section } : {}),
        });
        history.replaceState(
          history.state,
          "",
          location.pathname +
            location.search +
            "#/livro/" +
            book.id +
            "/ler?" +
            q,
        );
      }}
    />
  );
}
