import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  NormalizedBook,
  ReaderManifest,
  ReaderChapter,
  ReadingPosition,
} from "../../domain/src/reader";
export class ReaderRepository {
  constructor(public client: SupabaseClient) {}
  async manifest(bookId: string): Promise<ReaderManifest | null> {
    const { data, error } = await this.client
      .from("book_readers")
      .select("*")
      .eq("book_id", bookId)
      .maybeSingle();
    if (error) throw error;
    if (data) {
      const { data: b, error: e } = await this.client
        .from("books")
        .select("file_path")
        .eq("id", bookId)
        .single();
      if (e) throw e;
      if (data.source_path !== b.file_path) return null;
    }
    return data;
  }
  async chapter(bookId: string, id: string): Promise<ReaderChapter> {
    const { data, error } = await this.client
      .from("book_chapters")
      .select("*")
      .eq("book_id", bookId)
      .eq("id", id)
      .single();
    if (error) throw error;
    const urls = [
      ...new Set(
        Array.from(
          (data.html as string).matchAll(/src="(https:[^"]+)"/g),
          (x) => x[1],
        ),
      ),
    ];
    let html = data.html as string;
    const base = this.client.storage.from("book-assets").getPublicUrl("")
      .data.publicUrl;
    for (const url of urls) {
      if (!url.startsWith(base)) continue;
      const path = url.slice(base.length);
      if (
        !/^[a-f0-9-]+\/[a-f0-9-]+\/[a-f0-9-]+\.(png|jpg|webp|gif)$/.test(path)
      )
        continue;
      const { data: s, error: e } = await this.client.storage
        .from("book-assets")
        .createSignedUrl(path, 3600);
      if (!e) html = html.split(url).join(s.signedUrl);
    }
    return {
      id: data.id,
      title: data.title,
      order: data.order,
      html,
      plainText: data.plain_text,
      textLength: data.text_length,
      error: data.error,
    };
  }
  async position(bookId: string): Promise<ReadingPosition | null> {
    const {
      data: { user },
    } = await this.client.auth.getUser();
    if (!user) return null;
    const { data, error } = await this.client
      .from("reading_progress")
      .select("*")
      .eq("user_id", user.id)
      .eq("book_id", bookId)
      .maybeSingle();
    if (error) throw error;
    return data
      ? {
          bookId,
          revision: data.revision,
          chapterId: data.chapter_id,
          sectionId: data.section_id || undefined,
          progress: data.progress,
          chapterProgress: data.chapter_progress,
          scrollOffset: data.scroll_offset,
          updatedAt: data.updated_at,
        }
      : null;
  }
  async save(position: ReadingPosition) {
    const {
      data: { user },
    } = await this.client.auth.getUser();
    if (!user) return;
    const { error } = await this.client
      .from("reading_progress")
      .upsert({
        user_id: user.id,
        book_id: position.bookId,
        revision: position.revision,
        chapter_id: position.chapterId,
        section_id: position.sectionId || null,
        progress: position.progress,
        chapter_progress: position.chapterProgress,
        scroll_offset: position.scrollOffset || 0,
        updated_at: position.updatedAt,
      });
    if (error) throw error;
  }
  async asset(
    bookId: string,
    revision: string,
    bytes: Uint8Array,
    mime: string,
  ) {
    if (bytes.byteLength > 8 * 1024 * 1024)
      throw Error("Imagem do livro excede 8 MB.");
    const ext = (
      {
        "image/jpeg": "jpg",
        "image/png": "png",
        "image/webp": "webp",
        "image/gif": "gif",
      } as Record<string, string>
    )[mime];
    if (!ext) throw Error("Imagem incompatível.");
    const path = `${bookId}/${revision}/${crypto.randomUUID()}.${ext}`;
    const { error } = await this.client.storage
      .from("book-assets")
      .upload(path, bytes, { contentType: mime });
    if (error) throw error;
    return this.client.storage.from("book-assets").getPublicUrl(path).data
      .publicUrl;
  }
  async publish(
    bookId: string,
    sourcePath: string,
    revision: string,
    book: NormalizedBook | null,
    format: string,
    message = "",
  ) {
    const { error } = await this.client.rpc("save_book_reader", {
      p_book: bookId,
      p_manifest: {
        revision,
        source_path: sourcePath,
        format,
        processing_status: book ? "ready" : "failed",
        message,
        metadata: book?.metadata || {},
        toc: book?.toc || [],
        chapters: book?.chapters.map(({ html, plainText, ...c }) => c) || [],
      },
      p_chapters: book?.chapters || [],
    });
    if (error) throw error;
  }
}
