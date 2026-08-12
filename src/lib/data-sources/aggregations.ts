// -----------------------------------------------------------------------------
// Agregações puras sobre Order[] — compartilhadas por todas as fontes
// (mock, shopify, pdv). Recebem pedidos já materializados e derivam funil,
// atribuição e ranking de produtos. Sem I/O.
// -----------------------------------------------------------------------------

import type {
  Order,
  OrderFilters,
  FunnelStage,
  FunnelStageKey,
  AttributionRow,
  ProductRow,
  ChannelGroup,
} from "./types";

export function isRevenue(o: Order): boolean {
  return o.financialStatus !== "refunded";
}

// Taxas plausíveis usadas para estimar as etapas pré-compra quando a fonte
// não expõe eventos de comportamento (Admin API da Shopify, mock).
export const FUNNEL_RATES = {
  sessionToProduct: 0.42,
  productToCart: 0.11,
  cartToCheckout: 0.58,
  checkoutToInfo: 0.71,
  infoToPurchase: 0.64,
} as const;

export const STAGE_LABELS: Record<FunnelStageKey, string> = {
  sessions: "Sessões",
  product_view: "Visualizou produto",
  add_to_cart: "Adicionou ao carrinho",
  checkout_started: "Iniciou checkout",
  checkout_info: "Preencheu dados",
  purchase: "Comprou",
};

export function applyFilters(orders: Order[], filters?: OrderFilters): Order[] {
  if (!filters) return orders;
  return orders.filter((o) => {
    if (filters.channel && filters.channel !== "all" && o.channel !== filters.channel) return false;
    if (filters.channelGroup && o.attribution.channelGroup !== filters.channelGroup) return false;
    if (filters.utmCampaign && o.attribution.utmCampaign !== filters.utmCampaign) return false;
    if (filters.utmSource && o.attribution.utmSource !== filters.utmSource) return false;
    if (filters.financialStatus && o.financialStatus !== filters.financialStatus) return false;
    if (filters.search) {
      const q = filters.search.toLowerCase();
      const hay =
        `${o.id} ${o.customer.name ?? ""} ${o.customer.email ?? ""} ${o.attribution.utmCampaign ?? ""}`.toLowerCase();
      if (!hay.includes(q)) return false;
    }
    return true;
  });
}

export interface FunnelOptions {
  /** true quando a fonte tem etapas pré-compra (online). */
  hasPreStages: boolean;
  /** true quando a etapa de compra também é fictícia (fonte mock). */
  purchaseIsMock: boolean;
  /** Se conhecido, número real de checkouts iniciados (abandonados + compras). */
  checkoutStarted?: number;
}

/** Constrói as 6 etapas do funil a partir do nº de compras (bottom-up). */
export function buildFunnelStages(purchases: number, opts: FunnelOptions): FunnelStage[] {
  const r = FUNNEL_RATES;
  let counts: Record<FunnelStageKey, number>;

  if (opts.hasPreStages) {
    const info = purchases / r.infoToPurchase;
    const checkout = opts.checkoutStarted ?? info / r.checkoutToInfo;
    const infoFromCheckout = opts.checkoutStarted ? checkout * r.checkoutToInfo : info;
    const cart = checkout / r.cartToCheckout;
    const product = cart / r.productToCart;
    const sessions = product / r.sessionToProduct;
    counts = {
      sessions: Math.round(sessions),
      product_view: Math.round(product),
      add_to_cart: Math.round(cart),
      checkout_started: Math.round(checkout),
      checkout_info: Math.round(Math.max(purchases, infoFromCheckout)),
      purchase: purchases,
    };
  } else {
    counts = {
      sessions: 0,
      product_view: 0,
      add_to_cart: 0,
      checkout_started: 0,
      checkout_info: 0,
      purchase: purchases,
    };
  }

  const order: FunnelStageKey[] = [
    "sessions",
    "product_view",
    "add_to_cart",
    "checkout_started",
    "checkout_info",
    "purchase",
  ];
  const top = counts.sessions || 1;

  // A etapa de checkout_started é "real" quando veio de abandonedCheckouts.
  const checkoutReal = opts.checkoutStarted != null;

  const stages: FunnelStage[] = order.map((key, i) => {
    const count = counts[key];
    const prev = i === 0 ? count : counts[order[i - 1]!];
    const conversionFromPrevious = i === 0 ? 1 : prev === 0 ? 0 : count / prev;
    const conversionFromTop = top === 0 ? 0 : count / top;
    const dropOff = i === 0 ? 0 : Math.max(0, prev - count);

    let stageMock: boolean;
    if (key === "purchase") stageMock = opts.purchaseIsMock;
    else if (key === "checkout_started" && checkoutReal) stageMock = opts.purchaseIsMock;
    else stageMock = opts.hasPreStages; // pré-compra estimada
    if (!opts.hasPreStages) stageMock = key === "purchase" ? opts.purchaseIsMock : false;

    return {
      key,
      label: STAGE_LABELS[key],
      count,
      conversionFromPrevious,
      conversionFromTop,
      dropOff,
      isMock: stageMock,
    };
  });

  // Maior gargalo = maior queda percentual (entre etapas com anterior > 0).
  let bottleneckIdx = -1;
  let worst = -1;
  for (let i = 1; i < stages.length; i++) {
    const drop = 1 - stages[i]!.conversionFromPrevious;
    if (stages[i - 1]!.count > 0 && drop > worst) {
      worst = drop;
      bottleneckIdx = i;
    }
  }
  if (bottleneckIdx >= 0) stages[bottleneckIdx]!.isBottleneck = true;

  return stages;
}

const STAGE_ORDER: FunnelStageKey[] = [
  "sessions",
  "product_view",
  "add_to_cart",
  "checkout_started",
  "checkout_info",
  "purchase",
];

/**
 * Constrói as 6 etapas a partir de CONTAGENS REAIS por etapa (ex: eventos de
 * comportamento da Web Pixels Extension). isMock=false por padrão.
 */
export function stagesFromCounts(
  counts: Partial<Record<FunnelStageKey, number>>,
  isMock = false,
): FunnelStage[] {
  const resolved = STAGE_ORDER.map((k) => counts[k] ?? 0);
  const top = resolved[0] || 1;

  const stages: FunnelStage[] = STAGE_ORDER.map((key, i) => {
    const count = resolved[i]!;
    const prev = i === 0 ? count : resolved[i - 1]!;
    const conversionFromPrevious = i === 0 ? 1 : prev === 0 ? 0 : count / prev;
    const conversionFromTop = top === 0 ? 0 : count / top;
    const dropOff = i === 0 ? 0 : Math.max(0, prev - count);
    return { key, label: STAGE_LABELS[key], count, conversionFromPrevious, conversionFromTop, dropOff, isMock };
  });

  let bottleneckIdx = -1;
  let worst = -1;
  for (let i = 1; i < stages.length; i++) {
    const drop = 1 - stages[i]!.conversionFromPrevious;
    if (stages[i - 1]!.count > 0 && drop > worst) {
      worst = drop;
      bottleneckIdx = i;
    }
  }
  if (bottleneckIdx >= 0) stages[bottleneckIdx]!.isBottleneck = true;
  return stages;
}

export function attributionBreakdown(orders: Order[]): AttributionRow[] {
  const revenue = orders.filter(isRevenue);
  const totalRevenue = revenue.reduce((a, o) => a + o.total, 0) || 1;

  const map = new Map<
    string,
    {
      channelGroup: ChannelGroup;
      utmSource: string | null;
      utmMedium: string | null;
      utmCampaign: string | null;
      orders: number;
      revenue: number;
      customers: Set<string>;
    }
  >();

  for (const o of revenue) {
    const a = o.attribution;
    const key = `${a.channelGroup}|${a.utmSource ?? ""}|${a.utmMedium ?? ""}|${a.utmCampaign ?? ""}`;
    let row = map.get(key);
    if (!row) {
      row = {
        channelGroup: a.channelGroup,
        utmSource: a.utmSource,
        utmMedium: a.utmMedium,
        utmCampaign: a.utmCampaign,
        orders: 0,
        revenue: 0,
        customers: new Set(),
      };
      map.set(key, row);
    }
    row.orders += 1;
    row.revenue += o.total;
    if (o.customer.id) row.customers.add(o.customer.id);
  }

  return Array.from(map.values())
    .map((r) => ({
      channelGroup: r.channelGroup,
      utmSource: r.utmSource,
      utmMedium: r.utmMedium,
      utmCampaign: r.utmCampaign,
      orders: r.orders,
      revenue: r.revenue,
      customers: r.customers.size,
      averageTicket: r.orders ? Math.round(r.revenue / r.orders) : 0,
      revenueShare: r.revenue / totalRevenue,
    }))
    .sort((a, b) => b.revenue - a.revenue);
}

export function topProducts(orders: Order[], limit = 10): ProductRow[] {
  const map = new Map<
    string,
    { title: string; units: number; revenue: number; orders: number; online: number; fisica: number }
  >();

  for (const o of orders.filter(isRevenue)) {
    for (const it of o.items) {
      const id = it.productId ?? it.title;
      let row = map.get(id);
      if (!row) {
        row = { title: it.title, units: 0, revenue: 0, orders: 0, online: 0, fisica: 0 };
        map.set(id, row);
      }
      row.units += it.quantity;
      row.revenue += it.total;
      row.orders += 1;
      if (o.channel === "online") row.online += it.total;
      else row.fisica += it.total;
    }
  }

  return Array.from(map.entries())
    .map(([productId, r]) => ({
      productId,
      title: r.title,
      unitsSold: r.units,
      revenue: r.revenue,
      orders: r.orders,
      revenueOnline: r.online,
      revenueFisica: r.fisica,
    }))
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, limit);
}
