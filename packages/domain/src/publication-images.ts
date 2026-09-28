export type PublicationImageSource =
  | { kind: "local"; key: string }
  | { kind: "remote"; uri: string }
  | { kind: "data"; uri: string }
  | { kind: "missing" };

const DATA_IMAGE = /^data:image\/(png|jpeg|jpg|webp|gif|svg\+xml);base64,[a-zA-Z0-9+/=\s]+$/i;
const CONTROL_OR_NULL = /[\0-\x1F\x7F]/;

function safeDecode(value: string) {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

function normalizePath(value: string) {
  return value.replace(/\\/g, "/").replace(/\/+/g, "/");
}

export function normalizePublicationImageKey(src: string): string | null {
  let value = (src || "").trim();
  if (!value) return null;

  if (DATA_IMAGE.test(value)) return null;

  value = normalizePath(value);

  try {
    const asUrl = new URL(value, "https://biblioteca.invalid/");
    value = normalizePath(asUrl.pathname || value);
  } catch {
    value = value.replace(/[?#].*$/, "");
  }

  value = safeDecode(value).replace(/[?#].*$/, "");

  const match = value.match(/(?:^|\/)source-images\/(.+)$/i);
  if (!match) return null;

  const rawKey = match[1]
    .split("/")
    .map((part) => safeDecode(part).trim())
    .filter(Boolean)
    .join("/");

  if (!rawKey) return null;
  if (CONTROL_OR_NULL.test(rawKey)) return null;

  const segments = rawKey.split("/");
  if (segments.some((segment) => segment === "." || segment === "..")) return null;

  return rawKey;
}

export function classifyPublicationImageSource(src: string): PublicationImageSource {
  const value = (src || "").trim();
  const key = normalizePublicationImageKey(value);
  if (key) return { kind: "local", key };
  if (DATA_IMAGE.test(value)) return { kind: "data", uri: value };
  try {
    const url = new URL(value);
    if (url.protocol === "https:" || url.protocol === "http:") return { kind: "remote", uri: url.toString() };
  } catch {}
  return { kind: "missing" };
}
