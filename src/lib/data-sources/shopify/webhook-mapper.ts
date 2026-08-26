// -----------------------------------------------------------------------------
// Mapeia o payload REST de webhook -> Order. Reaproveita o parser de UTM e o
// agrupamento de canal. Webhooks não trazem a jornada completa, então a
// atribuição é de último clique (firstTouch/lastTouch nulos).
// -----------------------------------------------------------------------------

import type { Order, OrderItem, FinancialStatus, Attribution } from "../types";
import { parseUtm } from "../utm-parser";
import { classifyChannelGroup } from "../channel-grouping";
import type { WebhookOrder } from "./webhook-schemas";

function toCents(value: string | null | undefined): number {
  if (!value) return 0;
  const n = parseFloat(value);
  return Number.isFinite(n) ? Math.round(n * 100) : 0;
}

function mapStatus(status: string | null, cancelled = false): FinancialStatus {
  if (cancelled) return "refunded";
  switch ((status ?? "").toLowerCase()) {
    case "paid":
      return "paid";
    case "refunded":
    case "voided":
      return "refunded";
    case "partially_refunded":
      return "partially_refunded";
    default:
      return "pending";
  }
}

export interface MappedWebhookOrder {
  order: Order;
  externalId: string;
  updatedAt: string;
}

export function mapWebhookOrder(payload: WebhookOrder, opts: { cancelled?: boolean } = {}): MappedWebhookOrder {
  const attrsRecord: Record<string, string | null> = {};
  for (const na of payload.note_attributes) attrsRecord[na.name] = na.value;

  const utm = parseUtm({ landingPageUrl: payload.landing_site, customAttributes: attrsRecord });
  const isPos = (payload.source_name ?? "").toLowerCase() === "pos";
  const channelGroup = classifyChannelGroup({ utm, referrerUrl: payload.referring_site, isPos });

  const attribution: Attribution = {
    utmSource: utm.utmSource,
    utmMedium: utm.utmMedium,
    utmCampaign: utm.utmCampaign,
    utmContent: utm.utmContent,
    utmTerm: utm.utmTerm,
    landingPage: payload.landing_site,
    referrer: payload.referring_site,
    channelGroup,
    firstTouch: null,
    lastTouch: null,
  };

  const items: OrderItem[] = payload.line_items.map((li, i) => {
    const unit = toCents(li.price);
    return {
      id: li.id ?? `${payload.id}-${i}`,
      productId: li.product_id,
      title: li.title,
      quantity: li.quantity,
      unitPrice: unit,
      total: unit * li.quantity,
    };
  });

  const name =
    payload.customer && (payload.customer.first_name || payload.customer.last_name)
      ? `${payload.customer.first_name ?? ""} ${payload.customer.last_name ?? ""}`.trim()
      : null;

  const order: Order = {
    id: `shopify-${payload.id}`,
    channel: isPos ? "fisica" : "online",
    sourceSystem: "shopify",
    createdAt: payload.created_at,
    total: toCents(payload.total_price),
    currency: payload.currency,
    itemsCount: items.reduce((a, it) => a + it.quantity, 0),
    customer: {
      id: payload.customer?.id ?? null,
      name,
      email: payload.customer?.email ?? null,
      isReturning: (payload.customer?.orders_count ?? 0) > 1,
    },
    attribution,
    items,
    financialStatus: mapStatus(payload.financial_status, opts.cancelled),
  };

  return { order, externalId: payload.id, updatedAt: payload.updated_at };
}
