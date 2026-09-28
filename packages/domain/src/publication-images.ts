export type PublicationImageSource =
  | { kind: "local"; key: string }
  | { kind: "remote"; uri: string }
  | { kind: "data"; uri: string }
  | { kind: "missing" };

const DATA_IMAGE = /^data:image\/(png|jpeg|webp);base64,[a-zA-Z0-9+/=]+$/i;
const SAFE_KEY = /^[a-zA-Z0-9_./-]+$/;

export function normalizePublicationImageKey(src: string): string | null {
  const value = src.trim().replace(/\\/g, "/");
  const direct = value.match(/^(?:\.\/|\/)?source-images\/(.+)$/i)?.[1];
  const nested = value.match(/^\/(?:[^?#]+\/)?source-images\/(.+)$/i)?.[1];
  const key = direct || nested;
  if (!key || !SAFE_KEY.test(key) || key.includes("..") || key.startsWith("/")) return null;
  return key;
}

export function classifyPublicationImageSource(src: string): PublicationImageSource {
  const value = src.trim();
  const key = normalizePublicationImageKey(value);
  if (key) return { kind: "local", key };
  if (DATA_IMAGE.test(value)) return { kind: "data", uri: value };
  try {
    const url = new URL(value);
    if (url.protocol === "https:") return { kind: "remote", uri: url.toString() };
  } catch {}
  return { kind: "missing" };
}
