// -----------------------------------------------------------------------------
// ShopifyDataSource — lê SEMPRE do banco local (nunca da API em tempo de request).
// O banco é alimentado pelo backfill (sync.ts) + webhooks (Fase 4).
// No modo fixture, faz um backfill preguiçoso na primeira leitura para a
// demonstração funcionar sem passo manual.
// -----------------------------------------------------------------------------

import "server-only";
import { prisma } from "@/lib/prisma";
import type {
  DataSource,
  DateRange,
  OrderFilters,
  Order,
  FunnelSnapshot,
  AttributionRow,
  ProductRow,
  HealthCheckResult,
  Channel,
  FinancialStatus,
  TouchPoint,
  ChannelGroup,
} from "../types";
import { applyFilters, attributionBreakdown, buildFunnelStages, isRevenue, topProducts } from "../aggregations";
import { ShopifyGraphQLClient } from "./graphql";
import { syncShopify } from "./sync";
import type { ShopifyConfig } from "./config";

export type { ShopifyConfig } from "./config";
export { readShopifyConfig } from "./config";

let backfillPromise: Promise<unknown> | null = null;

function parseTouch(json: string | null): TouchPoint | null {
  if (!json) return null;
  try {
    return JSON.parse(json) as TouchPoint;
  } catch {
    return null;
  }
}

type DbOrder = Awaited<ReturnType<typeof fetchDbOrders>>[number];

async function fetchDbOrders(range: DateRange) {
  return prisma.order.findMany({
    where: {
      sourceSystem: "shopify",
      createdAt: { gte: new Date(range.from), lte: new Date(range.to) },
    },
    include: { items: true, attribution: true, customer: true },
    orderBy: { createdAt: "desc" },
  });
}

function toOrder(row: DbOrder): Order {
  const a = row.attribution;
  return {
    id: `shopify-${row.externalId}`,
    channel: row.channel as Channel,
    sourceSystem: "shopify",
    createdAt: row.createdAt.toISOString(),
    total: row.total,
    currency: row.currency,
    itemsCount: row.itemsCount,
    customer: {
      id: row.customer?.externalId ?? null,
      name: row.customer?.name ?? null,
      email: row.customer?.email ?? null,
      isReturning: row.customer?.isReturning ?? false,
    },
    attribution: {
      utmSource: a?.utmSource ?? null,
      utmMedium: a?.utmMedium ?? null,
      utmCampaign: a?.utmCampaign ?? null,
      utmContent: a?.utmContent ?? null,
      utmTerm: a?.utmTerm ?? null,
      landingPage: a?.landingPage ?? null,
      referrer: a?.referrer ?? null,
      channelGroup: (a?.channelGroup as ChannelGroup) ?? "unknown",
      firstTouch: parseTouch(a?.firstTouch ?? null),
      lastTouch: parseTouch(a?.lastTouch ?? null),
    },
    items: row.items.map((it) => ({
      id: it.externalId ?? it.id,
      productId: it.productId,
      title: it.title,
      quantity: it.quantity,
      unitPrice: it.unitPrice,
      total: it.total,
    })),
    financialStatus: row.financialStatus as FinancialStatus,
  };
}

export class ShopifyDataSource implements DataSource {
  readonly sourceSystem = "shopify" as const;
  readonly channel: Channel = "online";

  constructor(private readonly config: ShopifyConfig) {}

  /** No modo fixture, garante que o banco tenha sido populado ao menos uma vez. */
  private async ensureBackfilled(): Promise<void> {
    if (!this.config.fixture) return;
    const count = await prisma.order.count({ where: { sourceSystem: "shopify" } });
    if (count > 0) return;
    if (!backfillPromise) {
      backfillPromise = syncShopify({ full: true }).catch((e) => {
        backfillPromise = null;
        throw e;
      });
    }
    await backfillPromise;
  }

  private async orders(range: DateRange): Promise<Order[]> {
    await this.ensureBackfilled();
    const rows = await fetchDbOrders(range);
    return rows.map(toOrder);
  }

  async getOrders(range: DateRange, filters?: OrderFilters): Promise<Order[]> {
    const orders = await this.orders(range);
    return applyFilters(orders, filters).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }

  async getFunnel(range: DateRange, filters?: OrderFilters): Promise<FunnelSnapshot> {
    const orders = applyFilters(await this.orders(range), filters);
    const purchases = orders.filter(isRevenue).length;
    // Opção C: compra é real (do banco); etapas pré-compra são estimadas
    // (Admin API não expõe sessão/carrinho) até a Web Pixels Extension (Fase 6).
    const stages = buildFunnelStages(purchases, { hasPreStages: true, purchaseIsMock: false });
    return { period: range, channel: "online", stages, isMock: stages.some((s) => s.isMock) };
  }

  async getAttributionBreakdown(range: DateRange): Promise<AttributionRow[]> {
    return attributionBreakdown(await this.orders(range));
  }

  async getTopProducts(range: DateRange, limit = 10): Promise<ProductRow[]> {
    return topProducts(await this.orders(range), limit);
  }

  async healthCheck(): Promise<HealthCheckResult> {
    const client = new ShopifyGraphQLClient(this.config);
    const ping = await client.ping();
    if (!ping.ok) {
      return { ok: false, isMock: false, status: "demo", message: ping.message, lastSyncedAt: null };
    }
    const cursor = await prisma.syncCursor.findUnique({ where: { sourceSystem: "shopify" } });
    const lastSyncedAt = cursor?.lastSyncedAt?.toISOString() ?? null;
    const label = this.config.fixture ? " (modo fixture — dados fictícios via pipeline real)" : "";
    return {
      ok: true,
      isMock: false,
      status: "connected",
      message: `Shopify conectada${label}.`,
      lastSyncedAt,
    };
  }
}
