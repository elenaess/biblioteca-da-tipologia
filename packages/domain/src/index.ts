export * from "./types";
import type { Book, Role, DriveReference } from "./types";
export const TOPICS = [
  { id: "mbti", label: "MBTI", color: "#786149" },
  { id: "eneagrama", label: "Eneagrama", color: "#984a35" },
  { id: "protoanalise", label: "Protoanálise", color: "#796648" },
  { id: "socionics", label: "Socionics", color: "#536246" },
  { id: "jung", label: "Psicologia Junguiana", color: "#645745" },
  { id: "neurotype", label: "Neurotype", color: "#91684b" },
  { id: "psicossofia", label: "Psicossofia", color: "#766054" },
];
export const SCHOOLS = ["SHS", "SSS", "SCS", "SWS"];
export const topicLabel = (id: string) =>
  TOPICS.find((t) => t.id === id)?.label || "A classificar";
export const canManage = (role?: Role | null) =>
  role === "admin" || role === "owner";
export function parseDriveReference(input: string): DriveReference {
  const raw = input.trim();
  if (/^[a-zA-Z0-9_-]{20,150}$/.test(raw))
    return { id: raw, resourceKey: null };
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    throw new Error("Insira um link de arquivo do Google Drive.");
  }
  if (url.protocol !== "https:" || url.hostname !== "drive.google.com")
    throw new Error("Use um link seguro de arquivo do Google Drive.");
  const id =
    url.pathname.match(/^\/file\/d\/([a-zA-Z0-9_-]{20,150})(?:\/|$)/)?.[1] ||
    url.searchParams.get("id");
  if (!id || !/^[a-zA-Z0-9_-]{20,150}$/.test(id))
    throw new Error("O link precisa apontar para um arquivo, não uma pasta.");
  return { id, resourceKey: url.searchParams.get("resourcekey") };
}
export function driveUrl(
  book: Pick<Book, "drive_id" | "resource_key">,
  preview = false,
) {
  if (!book.drive_id) throw new Error("Este livro não usa o Google Drive.");
  const key = book.resource_key
    ? "?resourcekey=" + encodeURIComponent(book.resource_key)
    : "";
  return (
    "https://drive.google.com/file/d/" +
    encodeURIComponent(book.drive_id) +
    (preview ? "/preview" : "/view") +
    key
  );
}
export const normalize = (s: string) =>
  s
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
export function filterBooks(
  books: Book[],
  query: string,
  topic: string,
  school: string,
) {
  const terms = normalize(query).trim().split(/\s+/).filter(Boolean);
  return books.filter(
    (b) =>
      (!topic || b.topics.includes(topic)) &&
      (!school || b.schools.includes(school)) &&
      terms.every((t) =>
        normalize([b.title, ...b.authors, ...b.translators].join(" ")).includes(
          t,
        ),
      ),
  );
}
export function validateComment(body: string) {
  const text = body.trim();
  if (!text || text.length > 3000)
    throw new Error("Escreva de 1 a 3.000 caracteres.");
  return text;
}
export async function validatePdf(file: File) {
  if (
    !/\.pdf$/i.test(file.name) ||
    !["", "application/pdf"].includes(file.type) ||
    file.size === 0 ||
    file.size > 25 * 1024 * 1024
  )
    throw new Error("Escolha um arquivo PDF de até 25 MB.");
  const header = new TextDecoder().decode(
    await file.slice(0, 1024).arrayBuffer(),
  );
  if (!header.includes("%PDF-"))
    throw new Error("O arquivo não contém um PDF válido.");
}
export function editorialImagePath(value: string, publicBase: string) {
  try {
    const url = new URL(value),
      base = new URL(publicBase);
    if (url.origin !== base.origin) return null;
    const prefix = [
      base.pathname,
      base.pathname.replace("/public/", "/sign/"),
    ].find((p) => url.pathname.startsWith(p));
    if (!prefix) return null;
    const path = decodeURIComponent(url.pathname.slice(prefix.length));
    return /^[a-f0-9-]{36}\.(png|jpg|jpeg|webp)$/.test(path) ? path : null;
  } catch {
    return null;
  }
}
