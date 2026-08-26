// -----------------------------------------------------------------------------
// Schemas Zod para o payload da Admin API GraphQL da Shopify (2025-01).
// Todo dado externo é validado aqui ANTES de virar Order / tocar o banco.
// Campos desconhecidos são ignorados (passthrough leniente onde faz sentido).
// -----------------------------------------------------------------------------

import { z } from "zod";

const nullableString = z.string().nullish().transform((v) => v ?? null);

export const moneyBagSchema = z.object({
  shopMoney: z.object({
    amount: z.string(),
    currencyCode: z.string(),
  }),
});

export const utmParametersSchema = z
  .object({
    source: nullableString,
    medium: nullableString,
    campaign: nullableString,
    content: nullableString,
    term: nullableString,
  })
  .nullish()
  .transform((v) => v ?? null);

export const visitSchema = z
  .object({
    occurredAt: nullableString,
    landingPage: nullableString,
    referrerUrl: nullableString,
    source: nullableString,
    sourceType: nullableString,
    utmParameters: utmParametersSchema,
  })
  .nullish()
  .transform((v) => v ?? null);

export const customerJourneySummarySchema = z
  .object({
    ready: z.boolean().nullish().transform((v) => v ?? false),
    momentsCount: z.number().nullish().transform((v) => v ?? null),
    firstVisit: visitSchema,
    lastVisit: visitSchema,
  })
  .nullish()
  .transform((v) => v ?? null);

export const customAttributeSchema = z.object({
  key: z.string(),
  value: nullableString,
});

export const customerSchema = z
  .object({
    id: nullableString,
    firstName: nullableString,
    lastName: nullableString,
    email: nullableString,
    numberOfOrders: z.union([z.string(), z.number()]).nullish().transform((v) => {
      if (v == null) return 0;
      return typeof v === "string" ? parseInt(v, 10) || 0 : v;
    }),
  })
  .nullish()
  .transform((v) => v ?? null);

export const lineItemNodeSchema = z.object({
  id: z.string(),
  title: z.string(),
  quantity: z.number(),
  product: z
    .object({ id: nullableString })
    .nullish()
    .transform((v) => v ?? null),
  originalUnitPriceSet: moneyBagSchema.nullish().transform((v) => v ?? null),
  originalTotalSet: moneyBagSchema.nullish().transform((v) => v ?? null),
});

export const orderNodeSchema = z.object({
  id: z.string(),
  name: z.string().nullish().transform((v) => v ?? null),
  createdAt: z.string(),
  updatedAt: z.string(),
  displayFinancialStatus: nullableString,
  currentTotalPriceSet: moneyBagSchema,
  landingPageUrl: nullableString,
  referrerUrl: nullableString,
  note: nullableString,
  customAttributes: z.array(customAttributeSchema).nullish().transform((v) => v ?? []),
  customerJourneySummary: customerJourneySummarySchema,
  customer: customerSchema,
  app: z
    .object({ name: nullableString })
    .nullish()
    .transform((v) => v ?? null),
  lineItems: z
    .object({
      edges: z.array(z.object({ node: lineItemNodeSchema })),
    })
    .nullish()
    .transform((v) => v ?? { edges: [] }),
});

export const ordersConnectionSchema = z.object({
  edges: z.array(z.object({ cursor: z.string(), node: orderNodeSchema })),
  pageInfo: z.object({
    hasNextPage: z.boolean(),
    endCursor: nullableString,
  }),
});

export const ordersQueryResponseSchema = z.object({
  data: z
    .object({
      orders: ordersConnectionSchema.nullish().transform((v) => v ?? null),
    })
    .nullish()
    .transform((v) => v ?? null),
  extensions: z
    .object({
      cost: z
        .object({
          throttleStatus: z
            .object({
              currentlyAvailable: z.number(),
              maximumAvailable: z.number(),
              restoreRate: z.number(),
            })
            .nullish()
            .transform((v) => v ?? null),
        })
        .nullish()
        .transform((v) => v ?? null),
    })
    .nullish()
    .transform((v) => v ?? null),
  errors: z
    .array(z.object({ message: z.string(), extensions: z.record(z.unknown()).nullish() }))
    .nullish()
    .transform((v) => v ?? null),
});

export type OrderNode = z.infer<typeof orderNodeSchema>;
export type OrdersQueryResponse = z.infer<typeof ordersQueryResponseSchema>;
export type ShopMoney = z.infer<typeof moneyBagSchema>;

/** Converte valor monetário (string em reais) para centavos inteiros. */
export function toCents(money: ShopMoney | null | undefined): number {
  if (!money) return 0;
  const amount = parseFloat(money.shopMoney.amount);
  return Number.isFinite(amount) ? Math.round(amount * 100) : 0;
}
