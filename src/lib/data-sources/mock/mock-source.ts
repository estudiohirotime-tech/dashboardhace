// -----------------------------------------------------------------------------
// MockDataSource — implementa DataSource com dados fictícios realistas.
// Sempre funciona, nunca depende de credencial. Uma instância por canal.
// -----------------------------------------------------------------------------

import type {
  DataSource,
  Order,
  DateRange,
  OrderFilters,
  FunnelSnapshot,
  FunnelStage,
  FunnelStageKey,
  AttributionRow,
  ProductRow,
  HealthCheckResult,
  Channel,
  ChannelGroup,
} from "../types";
import { generateOrders } from "./generator";

// Taxas plausíveis do funil (mock).
const FUNNEL_RATES = {
  sessionToProduct: 0.42,
  productToCart: 0.11,
  cartToCheckout: 0.58,
  checkoutToInfo: 0.71,
  infoToPurchase: 0.64,
} as const;

const STAGE_LABELS: Record<FunnelStageKey, string> = {
  sessions: "Sessões",
  product_view: "Visualizou produto",
  add_to_cart: "Adicionou ao carrinho",
  checkout_started: "Iniciou checkout",
  checkout_info: "Preencheu dados",
  purchase: "Comprou",
};

function isRevenue(o: Order): boolean {
  return o.financialStatus !== "refunded";
}

function applyFilters(orders: Order[], filters?: OrderFilters): Order[] {
  if (!filters) return orders;
  return orders.filter((o) => {
    if (filters.channel && filters.channel !== "all" && o.channel !== filters.channel) return false;
    if (filters.channelGroup && o.attribution.channelGroup !== filters.channelGroup) return false;
    if (filters.utmCampaign && o.attribution.utmCampaign !== filters.utmCampaign) return false;
    if (filters.utmSource && o.attribution.utmSource !== filters.utmSource) return false;
    if (filters.financialStatus && o.financialStatus !== filters.financialStatus) return false;
    if (filters.search) {
      const q = filters.search.toLowerCase();
      const hay = `${o.id} ${o.customer.name ?? ""} ${o.customer.email ?? ""} ${o.attribution.utmCampaign ?? ""}`.toLowerCase();
      if (!hay.includes(q)) return false;
    }
    return true;
  });
}

/** Constrói as 6 etapas a partir do número de compras (bottom-up). */
function buildFunnelStages(purchases: number, hasPreStages: boolean): FunnelStage[] {
  const r = FUNNEL_RATES;
  let counts: Record<FunnelStageKey, number>;

  if (hasPreStages) {
    const info = purchases / r.infoToPurchase;
    const checkout = info / r.checkoutToInfo;
    const cart = checkout / r.cartToCheckout;
    const product = cart / r.productToCart;
    const sessions = product / r.sessionToProduct;
    counts = {
      sessions: Math.round(sessions),
      product_view: Math.round(product),
      add_to_cart: Math.round(cart),
      checkout_started: Math.round(checkout),
      checkout_info: Math.round(info),
      purchase: purchases,
    };
  } else {
    // Loja física: sem etapas pré-compra.
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

  const stages: FunnelStage[] = order.map((key, i) => {
    const count = counts[key];
    const prev = i === 0 ? count : counts[order[i - 1]!];
    const conversionFromPrevious = i === 0 ? 1 : prev === 0 ? 0 : count / prev;
    const conversionFromTop = top === 0 ? 0 : count / top;
    const dropOff = i === 0 ? 0 : Math.max(0, prev - count);
    return {
      key,
      label: STAGE_LABELS[key],
      count,
      conversionFromPrevious,
      conversionFromTop,
      dropOff,
      isMock: true,
    };
  });

  // Maior gargalo = maior queda percentual (entre etapas com anterior).
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

export class MockDataSource implements DataSource {
  readonly sourceSystem = "mock" as const;
  readonly channel: Channel;

  constructor(channel: Channel) {
    this.channel = channel;
  }

  private ordersForChannel(range: DateRange): Order[] {
    return generateOrders(range).filter((o) => o.channel === this.channel);
  }

  async getOrders(range: DateRange, filters?: OrderFilters): Promise<Order[]> {
    const orders = this.ordersForChannel(range);
    return applyFilters(orders, filters).sort((a, b) =>
      b.createdAt.localeCompare(a.createdAt),
    );
  }

  async getFunnel(range: DateRange, filters?: OrderFilters): Promise<FunnelSnapshot> {
    const orders = applyFilters(this.ordersForChannel(range), filters);
    const purchases = orders.filter(isRevenue).length;
    const hasPreStages = this.channel === "online";
    const stages = buildFunnelStages(purchases, hasPreStages);
    return {
      period: range,
      channel: this.channel,
      stages,
      isMock: true,
    };
  }

  async getAttributionBreakdown(range: DateRange): Promise<AttributionRow[]> {
    const orders = this.ordersForChannel(range).filter(isRevenue);
    const totalRevenue = orders.reduce((a, o) => a + o.total, 0) || 1;

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

    for (const o of orders) {
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

  async getTopProducts(range: DateRange, limit = 10): Promise<ProductRow[]> {
    const orders = this.ordersForChannel(range).filter(isRevenue);
    const map = new Map<
      string,
      { title: string; units: number; revenue: number; orders: number; online: number; fisica: number }
    >();

    for (const o of orders) {
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

  async healthCheck(): Promise<HealthCheckResult> {
    return {
      ok: true,
      isMock: true,
      status: "demo",
      message: `Fonte ${this.channel} em modo demonstração (dados fictícios).`,
      lastSyncedAt: null,
    };
  }
}
