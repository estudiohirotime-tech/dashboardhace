// -----------------------------------------------------------------------------
// Validação e roteamento de webhooks da Shopify.
// HMAC-SHA256 sobre o corpo BRUTO da request, comparado em tempo constante.
// -----------------------------------------------------------------------------

import crypto from "node:crypto";

export const SHOPIFY_WEBHOOK_TOPICS = [
  "orders/create",
  "orders/updated",
  "orders/paid",
  "orders/cancelled",
  "refunds/create",
] as const;

export type ShopifyWebhookTopic = (typeof SHOPIFY_WEBHOOK_TOPICS)[number];

/** Assina um corpo (base64) — usado pelo simulador e nos testes. */
export function signWebhook(rawBody: string, secret: string): string {
  return crypto.createHmac("sha256", secret).update(rawBody, "utf8").digest("base64");
}

/** Valida o HMAC em tempo constante. */
export function verifyHmac(rawBody: string, hmacHeader: string | null, secret: string): boolean {
  if (!hmacHeader) return false;
  const expected = signWebhook(rawBody, secret);
  const a = Buffer.from(expected, "utf8");
  const b = Buffer.from(hmacHeader, "utf8");
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}

export function isKnownTopic(topic: string | null): topic is ShopifyWebhookTopic {
  return !!topic && (SHOPIFY_WEBHOOK_TOPICS as readonly string[]).includes(topic);
}
