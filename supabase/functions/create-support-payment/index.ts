import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import {
  corsHeadersForOrigin,
  isAllowedOrigin,
  isAllowedSupportAmount,
} from "../_shared/support-payment.ts";

const STRIPE_PAYMENT_INTENTS_URL = "https://api.stripe.com/v1/payment_intents";

function json(body: unknown, status: number, headers: Record<string, string>) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...headers,
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store",
    },
  });
}

Deno.serve(async (req: Request) => {
  const origin = req.headers.get("origin");
  const cors = corsHeadersForOrigin(origin);

  if (!isAllowedOrigin(origin)) {
    return json({ error: "origin_not_allowed" }, 403, cors);
  }

  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: cors });
  }

  if (req.method !== "POST") {
    return json({ error: "method_not_allowed" }, 405, cors);
  }

  let payload: unknown;
  try {
    payload = await req.json();
  } catch {
    return json({ error: "invalid_json" }, 400, cors);
  }

  const amount = typeof payload === "object" && payload !== null
    ? (payload as { amount?: unknown }).amount
    : undefined;

  if (!isAllowedSupportAmount(amount)) {
    return json({ error: "invalid_amount" }, 400, cors);
  }

  const stripeSecret = Deno.env.get("STRIPE_SECRET_KEY")?.trim();
  if (!stripeSecret || !stripeSecret.startsWith("sk_")) {
    console.error("create-support-payment: STRIPE_SECRET_KEY is unavailable");
    return json({ error: "payment_unavailable" }, 503, cors);
  }

  const form = new URLSearchParams();
  form.set("amount", String(amount));
  form.set("currency", "brl");
  form.set("automatic_payment_methods[enabled]", "true");
  form.set("description", "Apoio à Biblioteca da Tipologia");
  form.set("metadata[project]", "biblioteca-da-tipologia");
  form.set("metadata[kind]", "project_support");

  let stripeResponse: Response;
  try {
    stripeResponse = await fetch(STRIPE_PAYMENT_INTENTS_URL, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${stripeSecret}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: form,
    });
  } catch {
    console.error("create-support-payment: Stripe request failed before receiving a response");
    return json({ error: "payment_provider_unavailable" }, 502, cors);
  }

  if (!stripeResponse.ok) {
    console.error(`create-support-payment: Stripe returned HTTP ${stripeResponse.status}`);
    return json({ error: "payment_provider_rejected_request" }, 502, cors);
  }

  const stripePayload = await stripeResponse.json() as { client_secret?: unknown };
  if (typeof stripePayload.client_secret !== "string" || !stripePayload.client_secret) {
    console.error("create-support-payment: Stripe response did not contain a client secret");
    return json({ error: "payment_provider_invalid_response" }, 502, cors);
  }

  return json({ clientSecret: stripePayload.client_secret }, 200, cors);
});
