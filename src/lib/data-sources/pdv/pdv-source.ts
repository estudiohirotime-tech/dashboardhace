// -----------------------------------------------------------------------------
// PdvDataSource — loja física. Lê SEMPRE do banco (sourceSystem "pdv").
// O banco é alimentado pelo backfill (sync.ts). No modo fixture, faz backfill
// preguiçoso na primeira leitura. Independente da loja online.
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
} from "../types";
import { applyFilters, attributionBreakdown, buildFunnelStages, isRevenue, topProducts } from "../aggregations";
import { PdvClient } from "./client";
import { syncPdv } from "./sync";
import type { PdvConfig } from "./config";

export type { PdvConfig, PdvSystem, PdvAuthType } from "./config";
export { readPdvConfig } from "./config";

let backfillPromise: Promise<unknown> | null = null;

async function fetchDbOrders(range: DateRange) {
  return prisma.order.findMany({
    where: { sourceSystem: "pdv", createdAt: { gte: new Date(range.from), lte: new Date(range.to) } },
    include: { items: true, attribution: true, customer: true },
    orderBy: { createdAt: "desc" },
  });
}

type DbOrder = Awaited<ReturnType<typeof fetchDbOrders>>[number];

function toOrder(row: DbOrder): Order {
  const a = row.attribution;
  return {
    id: `pdv-${row.externalId}`,
    channel: "fisica",
    sourceSystem: "pdv",
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
      utmSource: null,
      utmMedium: null,
      utmCampaign: a?.utmCampaign ?? null,
      utmContent: null,
      utmTerm: null,
      landingPage: null,
      referrer: null,
      channelGroup: "loja_fisica",
      firstTouch: null,
      lastTouch: null,
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
    vendedor: row.vendedor,
    unidade: row.unidade,
    formaPagamento: row.formaPagamento,
  };
}

export class PdvDataSource implements DataSource {
  readonly sourceSystem = "pdv" as const;
  readonly channel: Channel = "fisica";

  constructor(private readonly config: PdvConfig) {}

  private async ensureBackfilled(): Promise<void> {
    if (!this.config.fixture) return;
    const count = await prisma.order.count({ where: { sourceSystem: "pdv" } });
    if (count > 0) return;
    if (!backfillPromise) {
      backfillPromise = syncPdv({ full: true }).catch((e) => {
        backfillPromise = null;
        throw e;
      });
    }
    await backfillPromise;
  }

  private async orders(range: DateRange): Promise<Order[]> {
    await this.ensureBackfilled();
    return (await fetchDbOrders(range)).map(toOrder);
  }

  async getOrders(range: DateRange, filters?: OrderFilters): Promise<Order[]> {
    const orders = await this.orders(range);
    return applyFilters(orders, filters).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }

  async getFunnel(range: DateRange, filters?: OrderFilters): Promise<FunnelSnapshot> {
    const orders = applyFilters(await this.orders(range), filters);
    const purchases = orders.filter(isRevenue).length;
    // Loja física não tem etapas pré-compra.
    const stages = buildFunnelStages(purchases, { hasPreStages: false, purchaseIsMock: false });
    return { period: range, channel: "fisica", stages, isMock: false };
  }

  async getAttributionBreakdown(range: DateRange): Promise<AttributionRow[]> {
    return attributionBreakdown(await this.orders(range));
  }

  async getTopProducts(range: DateRange, limit = 10): Promise<ProductRow[]> {
    return topProducts(await this.orders(range), limit);
  }

  async healthCheck(): Promise<HealthCheckResult> {
    const client = new PdvClient(this.config);
    const ping = await client.ping();
    if (!ping.ok) {
      return { ok: false, isMock: false, status: "demo", message: ping.message, lastSyncedAt: null };
    }
    const cursor = await prisma.syncCursor.findUnique({ where: { sourceSystem: "pdv" } });
    const label = this.config.fixture ? " (modo fixture — dados fictícios via pipeline real)" : "";
    return {
      ok: true,
      isMock: false,
      status: "connected",
      message: `PDV ${this.config.system} conectado${label}.`,
      lastSyncedAt: cursor?.lastSyncedAt?.toISOString() ?? null,
    };
  }
}
