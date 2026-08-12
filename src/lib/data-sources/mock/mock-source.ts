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
  AttributionRow,
  ProductRow,
  HealthCheckResult,
  Channel,
} from "../types";
import { generateOrders } from "./generator";
import {
  applyFilters,
  attributionBreakdown,
  buildFunnelStages,
  isRevenue,
  topProducts,
} from "../aggregations";

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
    return applyFilters(orders, filters).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }

  async getFunnel(range: DateRange, filters?: OrderFilters): Promise<FunnelSnapshot> {
    const orders = applyFilters(this.ordersForChannel(range), filters);
    const purchases = orders.filter(isRevenue).length;
    const stages = buildFunnelStages(purchases, {
      hasPreStages: this.channel === "online",
      purchaseIsMock: true,
    });
    return { period: range, channel: this.channel, stages, isMock: true };
  }

  async getAttributionBreakdown(range: DateRange): Promise<AttributionRow[]> {
    return attributionBreakdown(this.ordersForChannel(range));
  }

  async getTopProducts(range: DateRange, limit = 10): Promise<ProductRow[]> {
    return topProducts(this.ordersForChannel(range), limit);
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
