import { useEffect, useRef, useState } from "react";
import {
  getDocument,
  GlobalWorkerOptions,
  type PDFDocumentProxy,
  type RenderTask,
} from "pdfjs-dist";
import workerUrl from "pdfjs-dist/build/pdf.worker.min.mjs?url";
import { repository } from "../context";
import type { Book } from "../../../../packages/domain/src";
GlobalWorkerOptions.workerSrc = workerUrl;

export default function PdfReader({ book }: { book: Book }) {
  const [doc, setDoc] = useState<PDFDocumentProxy | null>(null),
    [page, setPage] = useState(1),
    [zoom, setZoom] = useState(1),
    [error, setError] = useState(""),
    [url, setUrl] = useState("");
  const canvas = useRef<HTMLCanvasElement>(null),
    container = useRef<HTMLDivElement>(null);
  useEffect(() => {
    let alive = true,
      task: ReturnType<typeof getDocument> | undefined;
    const controller = new AbortController();
    void (async () => {
      try {
        if (!repository)
          throw Error(
            "O leitor estará disponível após a configuração da biblioteca.",
          );
        const signed = await repository.pdfUrl(book);
        if (!alive) return;
        setUrl(signed);
        const response = await fetch(signed, { signal: controller.signal });
        if (!response.ok) throw Error("Não foi possível carregar o arquivo.");
        const data = new Uint8Array(await response.arrayBuffer());
        if (!alive) return;
        task = getDocument({ data });
        const document = await task.promise;
        if (alive) setDoc(document);
      } catch (e) {
        if (alive)
          setError(
            e instanceof Error ? e.message : "Não foi possível abrir este PDF.",
          );
      }
    })();
    return () => {
      alive = false;
      controller.abort();
      void task?.destroy();
    };
  }, [book.file_path]);
  useEffect(() => {
    if (!doc || !canvas.current || !container.current) return;
    let alive = true,
      render: RenderTask | undefined;
    void doc
      .getPage(page)
      .then((p) => {
        if (!alive || !canvas.current) return;
        const c = canvas.current,
          base = p.getViewport({ scale: 1 });
        const scale =
          Math.min((container.current!.clientWidth - 24) / base.width, 1.5) *
          zoom;
        const viewport = p.getViewport({
          scale: scale * Math.min(devicePixelRatio || 1, 2),
        });
        c.width = viewport.width;
        c.height = viewport.height;
        c.style.width =
          viewport.width / Math.min(devicePixelRatio || 1, 2) + "px";
        c.style.height =
          viewport.height / Math.min(devicePixelRatio || 1, 2) + "px";
        render = p.render({ canvas: c, viewport });
        return render.promise;
      })
      .catch((e) => {
        if (alive && e.name !== "RenderingCancelledException")
          setError("Esta página não pôde ser exibida. Tente abrir o arquivo.");
      });
    return () => {
      alive = false;
      render?.cancel();
    };
  }, [doc, page, zoom]);
  async function open() {
    try {
      const fresh = await repository!.pdfUrl(book);
      setUrl(fresh);
      const a = document.createElement("a");
      a.href = fresh;
      a.target = "_blank";
      a.rel = "noopener noreferrer";
      a.click();
    } catch {
      setError("Não foi possível abrir o arquivo. Reabra o leitor.");
    }
  }
  return (
    <div className="pdf-viewer">
      <div className="pdf-controls">
        <button
          className="button secondary"
          disabled={!doc || page <= 1}
          onClick={() => setPage((p) => p - 1)}
        >
          Anterior
        </button>
        <label>
          Página{" "}
          <input
            aria-label="Página"
            type="number"
            min={1}
            max={doc?.numPages || 1}
            value={page}
            onChange={(e) =>
              setPage(
                Math.max(
                  1,
                  Math.min(doc?.numPages || 1, Number(e.target.value) || 1),
                ),
              )
            }
          />{" "}
          de {doc?.numPages || "…"}
        </label>
        <button
          className="button secondary"
          disabled={!doc || page >= doc.numPages}
          onClick={() => setPage((p) => p + 1)}
        >
          Próxima
        </button>
        <select
          aria-label="Zoom"
          value={zoom}
          onChange={(e) => setZoom(Number(e.target.value))}
        >
          <option value={0.75}>75%</option>
          <option value={1}>100%</option>
          <option value={1.5}>150%</option>
          <option value={2}>200%</option>
        </select>
        {url && (
          <button className="button secondary" onClick={() => void open()}>
            Abrir arquivo ↗
          </button>
        )}
      </div>
      {error ? (
        <p role="alert" className="error">
          {error}
        </p>
      ) : !doc ? (
        <p className="reader-note">Carregando PDF…</p>
      ) : null}
      <div ref={container} className="pdf-canvas">
        <canvas
          ref={canvas}
          aria-label={"Página " + page + " de " + book.title}
        />
      </div>
    </div>
  );
}
