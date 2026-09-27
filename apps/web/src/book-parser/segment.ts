export const SEMANTIC_CHAPTER_TARGET = 12000;

export function shouldSplitSemanticGroup(
  currentSize: number,
  nextTagName: string,
  nextTextLength: number,
): boolean {
  if (currentSize <= 0) return false;
  const tag = nextTagName.toUpperCase();
  if (tag === "H1") return true;
  // H2 remains a TOC entry inside the current chapter unless the current chunk
  // is already substantial. This preserves existing Markdown/EPUB chapter semantics.
  if (tag === "H2" && currentSize >= 8000) return true;
  return currentSize + Math.max(0, nextTextLength) > SEMANTIC_CHAPTER_TARGET;
}

export function hasSufficientPdfTextLayer(
  pageCount: number,
  usablePages: number,
  lowTextPages: number,
  totalTextCharacters: number,
): boolean {
  if (pageCount <= 0 || usablePages <= 0) return false;
  if (lowTextPages > pageCount * 0.55) return false;
  return totalTextCharacters >= Math.max(250, pageCount * 45);
}


export function hasAcceptablePdfLayout(
  pageCount: number,
  complexPages: number,
): boolean {
  if (pageCount <= 0) return false;
  // A few tables, covers or two-column pages should not throw the entire book
  // back to the PDF viewer. Fallback only when complex layout is recurrent.
  return complexPages <= Math.max(3, Math.floor(pageCount * 0.25));
}
