import { getDocument, GlobalWorkerOptions, OPS } from "pdfjs-dist";
import workerUrl from "pdfjs-dist/build/pdf.worker.min.mjs?url";
import { normalizeHtml, escapeHtml } from "./normalize";
GlobalWorkerOptions.workerSrc = workerUrl;
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
      usable = 0,
      empty = 0,
      hasImages = false;
    for (let pageNo = 1; pageNo <= pdf.numPages; pageNo++) {
      progress(`Lendo página ${pageNo} de ${pdf.numPages}…`);
      const page = await pdf.getPage(pageNo),
        content = await page.getTextContent();
      const items = content.items.filter(
        (x): x is import("pdfjs-dist/types/src/display/api").TextItem =>
          "str" in x && !!x.str.trim(),
      );
      const ops = await page.getOperatorList();
      if (
        ops.fnArray.some(
          (op) =>
            op === OPS.paintImageXObject || op === OPS.paintInlineImageXObject,
        )
      )
        hasImages = true;
      if (items.reduce((n, x) => n + x.str.length, 0) < 40) {
        empty++;
        continue;
      }
      usable++;
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
      if (suspicious > 2)
        throw Error(
          "Este PDF possui diagramação complexa. Use o visualizador original.",
        );
      let paragraph = "";
      const flush = () => {
        if (paragraph) {
          html += "<p>" + paragraph.trim() + "</p>";
          paragraph = "";
        }
      };
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i],
          raw = line.items
            .map((x) => x.str)
            .join(" ")
            .trim(),
          size = Math.max(
            ...line.items.map((x) => Math.abs(x.transform[3]) || x.height),
          );
        const gap = i ? lines[i - 1].y - line.y : base * 3;
        const obvious =
          /^(cap[íi]tulo\s+[\divxlc]+\b|introdu[çc][ãa]o$|conclus[ãa]o$|\d+(\.\d+)*[.)]?\s+\S)/i.test(
            raw,
          );
        const heading =
          obvious &&
          raw.length < 140 &&
          ((size > base * 1.2 && gap > base * 1.3) ||
            /^cap[íi]tulo/i.test(raw));
        let text = "",
          lastEnd = 0;
        for (const item of line.items) {
          const family = content.styles[item.fontName]?.fontFamily || "";
          const font = page.commonObjs.has(item.fontName)
            ? (page.commonObjs.get(item.fontName) as { name?: string })
            : null;
          const name = family + " " + (font?.name || item.fontName);
          let part = escapeHtml(item.str);
          if (/bold|black|heavy/i.test(name))
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
          html += `<${/^cap[íi]tulo/i.test(raw) ? "h1" : "h2"}>${text}</${/^cap[íi]tulo/i.test(raw) ? "h1" : "h2"}>`;
        } else {
          if (gap > base * 1.8) flush();
          paragraph += (paragraph ? " " : "") + text;
        }
      }
      flush();
      page.cleanup();
      await new Promise((r) => setTimeout(r, 0));
    }
    if (!usable || empty > pdf.numPages * 0.4)
      throw Error(
        "PDF detectado como documento digitalizado. Continue pelo visualizador de PDF.",
      );
    if (hasImages)
      throw Error(
        "Este PDF contém imagens ou páginas escaneadas. Use o visualizador original para preservar a diagramação.",
      );
    const result = normalizeHtml(html, title, "pdf");
    const meta = await pdf.getMetadata();
    const info = meta.info as { Title?: string; Author?: string };
    result.metadata = { title: info.Title || title, author: info.Author };
    return result;
  } finally {
    await task.destroy();
  }
}
