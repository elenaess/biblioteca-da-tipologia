export type ReaderFormat = "epub" | "pdf" | "html" | "markdown" | "txt";
export interface TocItem {
  id: string;
  title: string;
  level: number;
  chapterId: string;
  anchor?: string;
  children?: TocItem[];
}
export interface ReaderChapter {
  id: string;
  title: string;
  order: number;
  html: string;
  plainText: string;
  textLength: number;
  error?: boolean;
}
export interface NormalizedBook {
  metadata: {
    title: string;
    author?: string;
    language?: string;
    coverUrl?: string;
  };
  format: ReaderFormat;
  toc: TocItem[];
  chapters: ReaderChapter[];
}
export interface ReaderManifest {
  book_id: string;
  revision: string;
  format: ReaderFormat;
  processing_status: "pending" | "processing" | "ready" | "failed";
  message: string;
  toc: TocItem[];
  chapters: Omit<ReaderChapter, "html" | "plainText">[];
}
export interface ReadingPosition {
  bookId: string;
  revision: string;
  chapterId: string;
  sectionId?: string;
  progress: number;
  chapterProgress: number;
  scrollOffset?: number;
  updatedAt: string;
}
export interface ReaderAPI {
  manifest(): Promise<ReaderManifest | null>;
  chapter(id: string): Promise<ReaderChapter>;
  position(): Promise<ReadingPosition | null>;
  save(position: ReadingPosition): Promise<void>;
  original(): Promise<void>;
}
export function readingProgress(
  chapters: { id: string; textLength: number }[],
  id: string,
  fraction: number,
) {
  const total = chapters.reduce((n, c) => n + Math.max(1, c.textLength), 0);
  let before = 0;
  for (const c of chapters) {
    if (c.id === id)
      return Math.min(
        1,
        Math.max(0, (before + Math.max(1, c.textLength) * fraction) / total),
      );
    before += Math.max(1, c.textLength);
  }
  return 0;
}
export function flattenToc(toc: TocItem[]): TocItem[] {
  return toc.flatMap((x) => [x, ...flattenToc(x.children || [])]);
}
