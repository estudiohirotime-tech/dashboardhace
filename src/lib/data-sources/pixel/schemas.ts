// -----------------------------------------------------------------------------
// Eventos da Web Pixels Extension da Shopify -> etapas do funil.
// A extensão escuta os eventos padrão do storefront e envia este shape
// normalizado (já com as UTMs carimbadas na sessão) ao nosso endpoint.
// -----------------------------------------------------------------------------

import { z } from "zod";
import type { FunnelStageKey } from "../types";

export const PIXEL_EVENT_NAMES = [
  "page_viewed",
  "product_viewed",
  "product_added_to_cart",
  "checkout_started",
  "checkout_contact_info_submitted",
  "checkout_completed",
] as const;

export type PixelEventName = (typeof PIXEL_EVENT_NAMES)[number];

const nullableString = z.string().nullish().transform((v) => v ?? null);

export const pixelEventSchema = z.object({
  event: z.enum(PIXEL_EVENT_NAMES),
  sessionId: z.string().min(1),
  occurredAt: z.string().nullish().transform((v) => v ?? new Date().toISOString()),
  channel: z.enum(["online", "fisica"]).nullish().transform((v) => v ?? "online"),
  utmSource: nullableString,
  utmMedium: nullableString,
  utmCampaign: nullableString,
});

export const pixelBatchSchema = z.union([
  pixelEventSchema,
  z.array(pixelEventSchema),
  z.object({ events: z.array(pixelEventSchema) }),
]);

export type PixelEvent = z.infer<typeof pixelEventSchema>;

/** Evento padrão do storefront -> chave de etapa do funil. */
export const EVENT_TO_STAGE: Record<PixelEventName, FunnelStageKey> = {
  page_viewed: "sessions",
  product_viewed: "product_view",
  product_added_to_cart: "add_to_cart",
  checkout_started: "checkout_started",
  checkout_contact_info_submitted: "checkout_info",
  checkout_completed: "purchase",
};

export function normalizeBatch(parsed: z.infer<typeof pixelBatchSchema>): PixelEvent[] {
  if (Array.isArray(parsed)) return parsed;
  if ("events" in parsed) return parsed.events;
  return [parsed];
}
