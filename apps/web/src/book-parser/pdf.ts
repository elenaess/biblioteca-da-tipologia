import { getDocument, GlobalWorkerOptions } from "pdfjs-dist";
import workerUrl from "pdfjs-dist/build/pdf.worker.min.mjs?url";
import { normalizeHtml, escapeHtml } from "./normalize";
import { hasAcceptablePdfLayout, hasSufficientPdfTextLayer } from "./segment";

GlobalWorkerOptions.workerSrc = workerUrl;

const majorHeading = /^(cap[íi]tulo\s+[\divxlc]+\b|introdu[çc][ãa]o$|conclus[ãa]o$|pref[áa]cio$|pr[oó]logo$|ep[íi]logo$)/i;
const numberedHeading = /^\d+(?:\.\d+){0,4}[.)]?\s+\S/;

export async function parsePdf(
  bytes: Uint8Array,
  title: string,
  progress: (s: string) => void,
) {
  const task = getDocument({ data: bytes }),
    pdf = await task.promise;
  try {
    if (pdf.numPages > 700)
      throw Error("Este PDF é extenso. Use o visualizador original.");

    let html = "",
      usablePages = 0,
      lowTextPages = 0,
      totalTextCharacters = 0,
      complexPages = 0;

    for (let pageNo = 1; pageNo <= pdf.numPages; pageNo++) {
      progress(`Lendo página ${pageNo} de ${pdf.numPages}…`);
      const page = await pdf.getPage(pageNo),
        content = await page.getTextContent();
      const items = content.items.filter(
        (x): x is import("pdfjs-dist/types/src/display/api").TextItem =>
          "str" in x && !!x.str.trim(),
      );
      const pageCharacters = items.reduce((n, x) => n + x.str.length, 0);
      totalTextCharacters += pageCharacters;

      // Images are deliberately NOT treated as a parser failure. A digital PDF can
      // contain covers, diagrams or illustrations and still have a perfectly usable
      // text layer for the semantic reader.
      if (pageCharacters < 40) {
        lowTextPages++;
        page.cleanup();
        continue;
      }
      usablePages++;

      const sizes = items
          .map((x) => Math.abs(x.transform[3]) || x.height)
          .sort((a, b) => a - b),
        base = sizes[Math.floor(sizes.length / 2)] || 12;
      const lines: { y: number; items: typeof items }[] = [];

      for (const item of items) {
        const y = item.transform[5];
        let line = lines.find((l) => Math.abs(l.y - y) < base * 0.3);
        if (!line) {
          line = { y, items: [] };
          lines.push(line);
        }
        line.items.push(item);
      }
      lines.sort((a, b) => b.y - a.y);

      let suspicious = 0;
      for (const line of lines) {
        line.items.sort((a, b) => a.transform[4] - b.transform[4]);
        for (let i = 1; i < line.items.length; i++)
          if (
            line.items[i].transform[4] -
              line.items[i - 1].transform[4] -
              line.items[i - 1].width >
            base * 5
          )
            suspicious++;
      }
      if (suspicious > 2) complexPages++;

      let paragraph = "";
      const flush = () => {
        const value = paragraph.trim();
        if (value) html += "<p>" + value + "</p>";
        paragraph = "";
      };

      for (let i = 0; i < lines.length; i++) {
        const line = lines[i],
          raw = line.items
            .map((x) => x.str)
            .join(" ")
            .replace(/\s+/g, " ")
            .trim(),
          size = Math.max(
            ...line.items.map((x) => Math.abs(x.transform[3]) || x.height),
          ),
          gap = i ? lines[i - 1].y - line.y : base * 3,
          patternHeading = majorHeading.test(raw) || numberedHeading.test(raw),
          typographicHeading =
            raw.length > 0 &&
            raw.length < 140 &&
            size >= base * 1.32 &&
            gap >= base * 1.15,
          heading = raw.length < 140 && (patternHeading || typographicHeading);

        let text = "",
          lastEnd = 0;
        for (const item of line.items) {
          const family = content.styles[item.fontName]?.fontFamily || "";
          const font = page.commonObjs.has(item.fontName)
            ? (page.commonObjs.get(item.fontName) as { name?: string })
            : null;
          const name = family + " " + (font?.name || item.fontName);
          let part = escapeHtml(item.str);
          if (/bold|black|heavy|semibold|demi/i.test(name))
            part = "<strong>" + part + "</strong>";
          if (/italic|oblique/i.test(name)) part = "<em>" + part + "</em>";
          if (
            text &&
            item.transform[4] - lastEnd > base * 0.12 &&
            !text.endsWith(" ") &&
            !item.str.startsWith(" ")
          )
            text += " ";
          text += part;
          lastEnd = item.transform[4] + item.width;
        }

        if (heading) {
          flush();
          const tag = majorHeading.test(raw) ? "h1" : "h2";
          html += `<${tag}>${text}</${tag}>`;
        } else {
          if (gap > base * 1.8) flush();
          paragraph += (paragraph ? " " : "") + text;
        }
      }
      flush();
      page.cleanup();
      await new Promise((r) => setTimeout(r, 0));
    }

    if (
      !hasSufficientPdfTextLayer(
        pdf.numPages,
        usablePages,
        lowTextPages,
        totalTextCharacters,
      )
    )
      throw Error(
        "PDF detectado como documento digitalizado ou sem camada de texto suficiente. Continue pelo visualizador de PDF.",
      );

    if (!hasAcceptablePdfLayout(pdf.numPages, complexPages))
      throw Error(
        "Este PDF usa diagramação complexa em muitas páginas. Continue pelo visualizador original para preservar a ordem visual.",
      );

    const result = normalizeHtml(html, title, "pdf");
    if (!result.chapters.length || !result.chapters.some((c) => c.textLength > 80))
      throw Error(
        "Não foi possível montar uma leitura por texto confiável. Continue pelo visualizador de PDF.",
      );

    const meta = await pdf.getMetadata();
    const info = meta.info as { Title?: string; Author?: string };
    result.metadata = { title: info.Title || title, author: info.Author };
    return result;
  } finally {
    await task.destroy();
  }
}
