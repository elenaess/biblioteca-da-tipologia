import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { avatarImageType } from "../../domain/src/avatar";
import type {
  Book,
  Publication,
  Comment,
  Role,
  Profile,
} from "../../domain/src/types";
import {
  validateComment,
  validatePdf,
  editorialImagePath,
} from "../../domain/src/index";
export type { Book, Publication, Comment, Role, Profile };
export function makeClient(
  url: string,
  key: string,
  options?: Parameters<typeof createClient>[2],
) {
  return url && key ? createClient(url, key, options) : null;
}
export class Repository {
  constructor(public client: SupabaseClient) {}
  private avatarCache = new Map<string, { url: string; expires: number }>();
  private async resolvedProfile(profile: Profile): Promise<Profile> {
    if (!profile.avatar_path) return profile;
    const cached = this.avatarCache.get(profile.avatar_path);
    if (cached && cached.expires > Date.now())
      return { ...profile, avatar_url: cached.url };
    const { data, error } = await this.client.storage
      .from("profile-photos")
      .createSignedUrl(profile.avatar_path, 3600);
    if (error) return profile;
    const url = data.signedUrl + "&v=" + Date.now();
    this.avatarCache.set(profile.avatar_path, {
      url,
      expires: Date.now() + 50 * 60 * 1000,
    });
    return { ...profile, avatar_url: url };
  }
  async uploadAvatar(bytes: ArrayBuffer) {
    const { mime, extension } = avatarImageType(bytes);
    const {
      data: { user },
      error: authError,
    } = await this.client.auth.getUser();
    if (authError || !user)
      throw new Error("Entre na sua conta para trocar a foto.");
    const path = user.id + "/profile." + extension;
    const { error } = await this.client.storage
      .from("profile-photos")
      .upload(path, bytes, {
        contentType: mime,
        cacheControl: "0",
        upsert: true,
      });
    if (error) throw error;
    const { error: profileError } = await this.client
      .from("profiles")
      .update({ avatar_path: path })
      .eq("id", user.id);
    if (profileError) throw profileError;
    this.avatarCache.delete(path);
    return this.profile(user.id);
  }
  private get imageBase() {
    return this.client.storage.from("editorial-images").getPublicUrl("").data
      .publicUrl;
  }
  private canonicalImage(value: string) {
    const path = editorialImagePath(value, this.imageBase);
    return path ? this.imageBase + path : value;
  }
  private canonicalHtml(html: string) {
    return html.replace(
      /\bsrc=(["'])(.*?)\1/g,
      (_match, quote, url) => "src=" + quote + this.canonicalImage(url) + quote,
    );
  }
  private async signedImage(value: string) {
    const path = editorialImagePath(value, this.imageBase);
    if (!path) return value;
    const { data, error } = await this.client.storage
      .from("editorial-images")
      .createSignedUrl(path, 3600);
    if (error) throw error;
    return data.signedUrl;
  }
  private async signedHtml(html: string) {
    const urls = [
      ...new Set(
        Array.from(html.matchAll(/\bsrc=["']([^"']+)["']/g), (m) => m[1]),
      ),
    ];
    const pairs = await Promise.all(
      urls.map(async (url) => [url, await this.signedImage(url)] as const),
    );
    const signed = new Map(pairs);
    return html.replace(
      /\bsrc=(["'])(.*?)\1/g,
      (_match, quote, url) => "src=" + quote + (signed.get(url) || url) + quote,
    );
  }
  async books() {
    const { data, error } = await this.client
      .from("books")
      .select("*")
      .order("title");
    if (error) throw error;
    return Promise.all(
      (data as Book[]).map(async (book) => ({
        ...book,
        cover_url: book.cover_url
          ? await this.signedImage(book.cover_url)
          : null,
      })),
    );
  }
  async publications() {
    const { data, error } = await this.client
      .from("publications")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) throw error;
    return Promise.all(
      (data as Publication[]).map(async (publication) => ({
        ...publication,
        html: await this.signedHtml(publication.html),
      })),
    );
  }
  async role() {
    const { data, error } = await this.client.rpc("my_role");
    if (error) throw error;
    return data as Role | null;
  }
  async profile(id: string) {
    const { data, error } = await this.client
      .from("profiles")
      .select("id,display_name,avatar_url,avatar_path")
      .eq("id", id)
      .single();
    if (error) throw error;
    return this.resolvedProfile(data as Profile);
  }
  async comments(kind: "book" | "publication", id: string) {
    const { data, error } = await this.client
      .from("comments")
      .select("*,profiles(id,display_name,avatar_url,avatar_path)")
      .eq(kind === "book" ? "book_id" : "publication_id", id)
      .order("created_at");
    if (error) throw error;
    const rows = data as unknown as Comment[];
    const profiles = new Map<string, Promise<Profile>>();
    for (const row of rows)
      if (row.profiles && !profiles.has(row.profiles.id))
        profiles.set(row.profiles.id, this.resolvedProfile(row.profiles));
    return Promise.all(
      rows.map(async (row) => ({
        ...row,
        profiles: row.profiles ? await profiles.get(row.profiles.id)! : null,
      })),
    );
  }
  async addComment(kind: "book" | "publication", id: string, body: string) {
    const {
      data: { user },
    } = await this.client.auth.getUser();
    if (!user) throw new Error("Entre para comentar.");
    const { error } = await this.client.from("comments").insert({
      user_id: user.id,
      [kind === "book" ? "book_id" : "publication_id"]: id,
      body: validateComment(body),
    });
    if (error) throw error;
  }
  async deleteComment(id: string) {
    const { error } = await this.client.rpc("remove_comment", {
      comment_id: id,
    });
    if (error) throw error;
  }
  async saveBook(book: Partial<Book>) {
    const { error } = await this.client.from("books").upsert({
      ...book,
      ...(book.cover_url
        ? { cover_url: this.canonicalImage(book.cover_url) }
        : {}),
    });
    if (error) throw error;
  }
  async uploadPdf(file: File, bookId: string) {
    await validatePdf(file);
    if (!/^[a-f0-9-]{36}$/.test(bookId)) throw new Error("Ficha inválida.");
    const file_path = bookId + "/" + crypto.randomUUID() + ".pdf";
    const { error } = await this.client.storage
      .from("library-files")
      .upload(file_path, file, {
        contentType: "application/pdf",
        upsert: false,
      });
    if (error) throw error;
    return { file_path, file_name: file.name, file_size: file.size };
  }
  async uploadBook(file: File, bookId: string, format: string) {
    if (
      !file.size ||
      file.size > 25 * 1024 * 1024 ||
      !/^[a-f0-9-]{36}$/.test(bookId)
    )
      throw Error("Use um arquivo de até 25 MB.");
    const formats: Record<string, [string, string]> = {
      pdf: ["pdf", "application/pdf"],
      epub: ["epub", "application/epub+zip"],
      html: ["html", "text/html"],
      markdown: ["md", "text/markdown"],
      txt: ["txt", "text/plain"],
    };
    const value = formats[format];
    if (!value) throw Error("Formato incompatível.");
    const file_path = bookId + "/" + crypto.randomUUID() + "." + value[0];
    const { error } = await this.client.storage
      .from("library-files")
      .upload(file_path, file, { contentType: value[1], upsert: false });
    if (error) throw error;
    return { file_path, file_name: file.name, file_size: file.size };
  }
  async pdfUrl(book: Book) {
    if (book.source_type !== "upload" || !book.file_path)
      throw new Error("PDF indisponível.");
    const { data, error } = await this.client.storage
      .from("library-files")
      .createSignedUrl(book.file_path, 300);
    if (error) throw error;
    return data.signedUrl;
  }
  async savePublication(publication: Partial<Publication>) {
    const { error } = await this.client.from("publications").upsert({
      ...publication,
      ...(publication.html
        ? { html: this.canonicalHtml(publication.html) }
        : {}),
    });
    if (error) throw error;
  }
  async members() {
    const { data, error } = await this.client.rpc("list_members");
    if (error) throw error;
    return data as (Profile & { role: Role })[];
  }
  async setRole(id: string, role: "admin" | "member") {
    const { error } = await this.client.rpc("set_member_role", {
      target_user: id,
      new_role: role,
    });
    if (error) throw error;
  }
  async saveProfile(profile: Pick<Profile, "display_name">) {
    const {
      data: { user },
    } = await this.client.auth.getUser();
    if (!user) throw new Error("Entre na sua conta.");
    const { error } = await this.client
      .from("profiles")
      .update(profile)
      .eq("id", user.id);
    if (error) throw error;
  }
  async uploadImage(file: File) {
    if (
      !["image/png", "image/jpeg", "image/webp"].includes(file.type) ||
      file.size > 5 * 1024 * 1024
    )
      throw new Error("Use PNG, JPEG ou WebP de até 5 MB.");
    const ext = file.type === "image/jpeg" ? "jpg" : file.type.split("/")[1];
    const path = crypto.randomUUID() + "." + ext;
    const { error } = await this.client.storage
      .from("editorial-images")
      .upload(path, file, { contentType: file.type, upsert: false });
    if (error) throw error;
    return this.signedImage(this.imageBase + path);
  }
}
