import { projectConfig } from "../../../packages/domain/src/project-config";

export const SUPPORT_AMOUNTS = [
  { amount: 250 },
  { amount: 500 },
  { amount: 1000 },
  { amount: 1500 },
] as const;

export type SupportAmount = (typeof SUPPORT_AMOUNTS)[number]["amount"];

export function isSupportAmount(value: unknown): value is SupportAmount {
  return typeof value === "number"
    && Number.isInteger(value)
    && SUPPORT_AMOUNTS.some((item) => item.amount === value);
}

export function formatSupportAmount(amount: SupportAmount, locale: "pt" | "en" | "es") {
  const language = locale === "pt" ? "pt-BR" : locale === "es" ? "es-BR" : "en-BR";
  return new Intl.NumberFormat(language, {
    style: "currency",
    currency: "BRL",
    minimumFractionDigits: 2,
  }).format(amount / 100);
}

export async function createSupportIntent(amount: SupportAmount, signal?: AbortSignal): Promise<string> {
  if (!isSupportAmount(amount)) {
    throw new Error("invalid_support_amount");
  }

  const response = await fetch(`${projectConfig.supabaseUrl}/functions/v1/create-support-payment`, {
    method: "POST",
    signal,
    headers: {
      "Content-Type": "application/json",
      "apikey": projectConfig.supabasePublishableKey,
    },
    body: JSON.stringify({ amount }),
  });

  let body: { clientSecret?: unknown; error?: unknown } = {};
  try {
    body = await response.json();
  } catch {}

  if (!response.ok || typeof body.clientSecret !== "string" || !body.clientSecret) {
    throw new Error(typeof body.error === "string" ? body.error : "support_intent_failed");
  }

  return body.clientSecret;
}

export function stripePublishableKey(): string {
  const meta = import.meta as ImportMeta & { env?: Record<string, string | undefined> };
  return meta.env?.VITE_STRIPE_PUBLISHABLE_KEY?.trim() || "";
}
