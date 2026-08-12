// -----------------------------------------------------------------------------
// Mapeador Shopify OrderNode -> Order (nosso contrato).
// Aplica: parser de UTM em cascata, agrupamento de canal, jornada do cliente
// (first/last touch quando disponível) e conversão para centavos.
// -----------------------------------------------------------------------------

import type { Order, OrderItem, FinancialStatus, TouchPoint, Attribution } from "../types";
import { parseUtm, type RawUtm } from "../utm-parser";
import { classifyChannelGroup } from "../channel-grouping";
import { toCents, type OrderNode } from "./schemas";

function mapFinancialStatus(status: string | null): FinancialStatus {
  switch ((status ?? "").toUpperCase()) {
    case "PAID":
      return "paid";
    case "PARTIALLY_REFUNDED":
      return "partially_refunded";
    case "REFUNDED":
      return "refunded";
    case "PENDING":
    case "AUTHORIZED":
    case "PARTIALLY_PAID":
    default:
      return status?.toUpperCase() === "PAID" ? "paid" : "pending";
  }
}

/** Extrai o id numérico de um GID "gid://shopify/Order/123" -> "123". */
export function gidToId(gid: string | null | undefined): string {
  if (!gid) return "";
  const parts = gid.split("/");
  return parts[parts.length - 1] || gid;
}

function customAttributesToRecord(
  attrs: { key: string; value: string | null }[],
): Record<string, string | null> {
  const rec: Record<string, string | null> = {};
  for (const a of attrs) rec[a.key] = a.value;
  return rec;
}

function fillUtmFrom(
  target: RawUtm,
  utm?: { source: string | null; medium: string | null; campaign: string | null; content: string | null; term: string | null } | null,
): RawUtm {
  if (!utm) return target;
  return {
    utmSource: target.utmSource ?? (utm.source ? utm.source.toLowerCase() : null),
    utmMedium: target.utmMedium ?? (utm.medium ? utm.medium.toLowerCase() : null),
    utmCampaign: target.utmCampaign ?? (utm.campaign ? utm.campaign.toLowerCase() : null),
    utmContent: target.utmContent ?? (utm.content ? utm.content.toLowerCase() : null),
    utmTerm: target.utmTerm ?? (utm.term ? utm.term.toLowerCase() : null),
  };
}

function detectPos(node: OrderNode): boolean {
  const appName = node.app?.name?.toLowerCase() ?? "";
  return appName.includes("point of sale") || appName === "pos";
}

function visitToTouch(
  visit: NonNullable<OrderNode["customerJourneySummary"]>["firstVisit"],
  isPos: boolean,
): TouchPoint | null {
  if (!visit) return null;
  const utm: RawUtm = fillUtmFrom(
    { utmSource: null, utmMedium: null, utmCampaign: null, utmContent: null, utmTerm: null },
    visit.utmParameters,
  );
  const parsedFromLanding = parseUtm({ landingPageUrl: visit.landingPage });
  const merged: RawUtm = {
    utmSource: parsedFromLanding.utmSource ?? utm.utmSource,
    utmMedium: parsedFromLanding.utmMedium ?? utm.utmMedium,
    utmCampaign: parsedFromLanding.utmCampaign ?? utm.utmCampaign,
    utmContent: parsedFromLanding.utmContent ?? utm.utmContent,
    utmTerm: parsedFromLanding.utmTerm ?? utm.utmTerm,
  };
  const channelGroup = classifyChannelGroup({ utm: merged, referrerUrl: visit.referrerUrl, isPos });
  return {
    occurredAt: visit.occurredAt ?? "",
    source: merged.utmSource ?? (visit.source ? visit.source.toLowerCase() : null),
    medium: merged.utmMedium,
    campaign: merged.utmCampaign,
    landingPage: visit.landingPage,
    referrer: visit.referrerUrl,
    channelGroup,
  };
}

export interface MappedOrder {
  order: Order;
  /** true quando a jornada completa não estava disponível (só último clique). */
  lastClickOnly: boolean;
}

export function mapShopifyOrder(node: OrderNode): MappedOrder {
  const isPos = detectPos(node);
  const journey = node.customerJourneySummary;

  // Cascata de UTM: landingPageUrl -> customAttributes -> jornada (last, first).
  const attrsRecord = customAttributesToRecord(node.customAttributes);
  let utm = parseUtm({
    landingPageUrl: node.landingPageUrl,
    customAttributes: attrsRecord,
  });
  utm = fillUtmFrom(utm, journey?.lastVisit?.utmParameters);
  utm = fillUtmFrom(utm, journey?.firstVisit?.utmParameters);

  const referrer =
    node.referrerUrl ?? journey?.lastVisit?.referrerUrl ?? journey?.firstVisit?.referrerUrl ?? null;
  const landingPage =
    node.landingPageUrl ?? journey?.lastVisit?.landingPage ?? journey?.firstVisit?.landingPage ?? null;

  const channelGroup = classifyChannelGroup({ utm, referrerUrl: referrer, isPos });

  const journeyReady = Boolean(journey?.ready);
  const firstTouch = journeyReady ? visitToTouch(journey?.firstVisit ?? null, isPos) : null;
  const lastTouch = journeyReady
    ? visitToTouch(journey?.lastVisit ?? null, isPos)
    : null;

  const attribution: Attribution = {
    utmSource: utm.utmSource,
    utmMedium: utm.utmMedium,
    utmCampaign: utm.utmCampaign,
    utmContent: utm.utmContent,
    utmTerm: utm.utmTerm,
    landingPage,
    referrer,
    channelGroup,
    firstTouch,
    lastTouch,
  };

  const items: OrderItem[] = node.lineItems.edges.map((e) => {
    const n = e.node;
    const unit = toCents(n.originalUnitPriceSet);
    const total = n.originalTotalSet ? toCents(n.originalTotalSet) : unit * n.quantity;
    return {
      id: gidToId(n.id),
      productId: n.product?.id ? gidToId(n.product.id) : null,
      title: n.title,
      quantity: n.quantity,
      unitPrice: unit,
      total,
    };
  });

  const name =
    node.customer && (node.customer.firstName || node.customer.lastName)
      ? `${node.customer.firstName ?? ""} ${node.customer.lastName ?? ""}`.trim()
      : null;

  const order: Order = {
    id: `shopify-${gidToId(node.id)}`,
    channel: isPos ? "fisica" : "online",
    sourceSystem: "shopify",
    createdAt: node.createdAt,
    total: toCents(node.currentTotalPriceSet),
    currency: node.currentTotalPriceSet.shopMoney.currencyCode,
    itemsCount: items.reduce((a, it) => a + it.quantity, 0),
    customer: {
      id: node.customer?.id ? gidToId(node.customer.id) : null,
      name,
      email: node.customer?.email ?? null,
      isReturning: (node.customer?.numberOfOrders ?? 0) > 1,
    },
    attribution,
    items,
    financialStatus: mapFinancialStatus(node.displayFinancialStatus),
  };

  return { order, lastClickOnly: !journeyReady };
}
