// -----------------------------------------------------------------------------
// Schemas Zod dos payloads REST entregues pelos webhooks da Shopify.
// (Webhooks usam o shape REST snake_case, diferente do GraphQL.)
// -----------------------------------------------------------------------------

import { z } from "zod";

const nullableString = z.string().nullish().transform((v) => v ?? null);
const idField = z.union([z.number(), z.string()]).transform((v) => String(v));

export const noteAttributeSchema = z.object({
  name: z.string(),
  value: nullableString,
});

export const webhookLineItemSchema = z.object({
  id: idField.nullish().transform((v) => v ?? null),
  title: z.string(),
  quantity: z.number(),
  price: z.string().nullish().transform((v) => v ?? "0"),
  product_id: z.union([z.number(), z.string()]).nullish().transform((v) => (v == null ? null : String(v))),
});

export const webhookCustomerSchema = z
  .object({
    id: z.union([z.number(), z.string()]).nullish().transform((v) => (v == null ? null : String(v))),
    first_name: nullableString,
    last_name: nullableString,
    email: nullableString,
    orders_count: z.number().nullish().transform((v) => v ?? 0),
  })
  .nullish()
  .transform((v) => v ?? null);

export const webhookOrderSchema = z.object({
  id: idField,
  created_at: z.string(),
  updated_at: z.string(),
  financial_status: nullableString,
  total_price: z.string().nullish().transform((v) => v ?? "0"),
  currency: z.string().nullish().transform((v) => v ?? "BRL"),
  landing_site: nullableString,
  referring_site: nullableString,
  source_name: nullableString,
  note_attributes: z.array(noteAttributeSchema).nullish().transform((v) => v ?? []),
  customer: webhookCustomerSchema,
  line_items: z.array(webhookLineItemSchema).nullish().transform((v) => v ?? []),
});

export const webhookRefundSchema = z.object({
  id: idField,
  order_id: idField,
  created_at: z.string().nullish().transform((v) => v ?? new Date().toISOString()),
});

export type WebhookOrder = z.infer<typeof webhookOrderSchema>;
export type WebhookRefund = z.infer<typeof webhookRefundSchema>;
