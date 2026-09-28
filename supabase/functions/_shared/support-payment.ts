export const ALLOWED_SUPPORT_AMOUNTS = [250, 500, 1000, 1500] as const;
export type SupportAmount = (typeof ALLOWED_SUPPORT_AMOUNTS)[number];

export const ALLOWED_ORIGINS = [
  "https://elenaess.github.io",
  "http://localhost:4173",
  "http://127.0.0.1:4173",
] as const;

export function isAllowedSupportAmount(value: unknown): value is SupportAmount {
  return typeof value === "number"
    && Number.isInteger(value)
    && (ALLOWED_SUPPORT_AMOUNTS as readonly number[]).includes(value);
}

export function isAllowedOrigin(origin: string | null): boolean {
  if (!origin) return true;
  return (ALLOWED_ORIGINS as readonly string[]).includes(origin);
}

export function corsHeadersForOrigin(origin: string | null): Record<string, string> {
  const allowOrigin = origin && isAllowedOrigin(origin)
    ? origin
    : ALLOWED_ORIGINS[0];
  return {
    "Access-Control-Allow-Origin": allowOrigin,
    "Access-Control-Allow-Headers": "apikey, authorization, content-type, x-client-info",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Vary": "Origin",
  };
}
