import { marked } from "marked";
import { normalizeHtml, escapeHtml } from "./normalize";
import type {
  NormalizedBook,
  ReaderFormat,
} from "../../../../packages/domain/src/reader";
export type AssetWriter = (
  bytes: Uint8Array,
  mime: string,
  name: string,
) => Promise<string>;
export function bookFormat(name: string): ReaderFormat {
  const ext = name.toLowerCase().split(".").pop();
  const format = (
    {
      epub: "epub",
      pdf: "pdf",
      html: "html",
      htm: "html",
      md: "markdown",
      markdown: "markdown",
      txt: "txt",
    } as const
  )[ext as "epub"];
  if (!format) throw Error("Use EPUB, PDF, HTML, Markdown ou TXT.");
  return format;
}
export const bookMime = (f: ReaderFormat) =>
  ({
    epub: "application/epub+zip",
    pdf: "application/pdf",
    html: "text/html",
    markdown: "text/markdown",
    txt: "text/plain",
  })[f];
export async function parseBook(
  file: File,
  asset: AssetWriter,
  onProgress: (s: string) => void = () => {},
): Promise<NormalizedBook> {
  if (!file.size || file.size > 25 * 1024 * 1024)
    throw Error("Use um arquivo de até 25 MB.");
  const format = bookFormat(file.name),
    bytes = new Uint8Array(await file.arrayBuffer()),
    title = file.name.replace(/\.[^.]+$/, "");
  onProgress("Processando estrutura…");
  if (format === "epub")
    return (await import("./epub")).parseEpub(bytes, asset, onProgress);
  if (format === "pdf") {
    if (new TextDecoder().decode(bytes.slice(0, 5)) !== "%PDF-")
      throw Error("O arquivo não é um PDF válido.");
    return (await import("./pdf")).parsePdf(bytes, title, onProgress);
  }
  const text = new TextDecoder().decode(bytes);
  if (text.includes("\u0000"))
    throw Error("Este arquivo não contém texto compatível.");
  let html = text;
  if (format === "markdown") html = await marked.parse(text, { gfm: true });
  if (format === "txt")
    html = text
      .split(/\n\s*\n/)
      .map((p) => {
        const t = p.trim();
        return /^(cap[íi]tulo\s+[\divxlc]+(?:\s*[—–:.-].*)?|introdu[çc][ãa]o|conclus[ãa]o)$/i.test(
          t,
        ) && t.length < 140
          ? `<h1>${escapeHtml(t)}</h1>`
          : `<p>${escapeHtml(t).replace(/\n/g, "<br>")}</p>`;
      })
      .join("");
  const result = normalizeHtml(html, title, format);
  if (!result.chapters.length)
    throw Error("Não encontramos conteúdo de leitura neste arquivo.");
  return result;
}
