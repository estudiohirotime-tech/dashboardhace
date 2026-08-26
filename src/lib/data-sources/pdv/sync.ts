// -----------------------------------------------------------------------------
// Backfill/sincronização PDV -> banco local (sourceSystem "pdv", canal "fisica").
// Paginação por número de página; mapper isolado por sistema. A dashboard lê
// do banco. Incremental via SyncCursor (maior data já processada).
// -----------------------------------------------------------------------------

import { prisma } from "@/lib/prisma";
import { PdvClient } from "./client";
import { getPdvMapper } from "./mappers";
import { readPdvConfig } from "./config";
import type { Order } from "../types";

export interface PdvSyncResult {
  imported: number;
  pages: number;
  lastSyncedAt: string | null;
  fixture: boolean;
  system: string;
}

interface Collected {
  order: Order;
  externalId: string;
  updatedAt: string;
}

const orderPk = (ext: string) => `pdv_${ext}`;
const customerPk = (ext: string) => `pdvc_${ext}`;

async function chunked<T>(rows: T[], size: number, fn: (chunk: T[]) => Promise<unknown>): Promise<void> {
  for (let i = 0; i < rows.length; i += size) await fn(rows.slice(i, i + size));
}

async function bulkInsert(collected: Collected[]): Promise<void> {
  await prisma.orderItem.deleteMany({ where: { order: { sourceSystem: "pdv" } } });
  await prisma.attributionRecord.deleteMany({ where: { order: { sourceSystem: "pdv" } } });
  await prisma.order.deleteMany({ where: { sourceSystem: "pdv" } });
  await prisma.customer.deleteMany({ where: { sourceSystem: "pdv" } });

  const customerMap = new Map<string, { name: string | null; email: string | null }>();
  for (const { order } of collected) {
    if (order.customer.id) {
      customerMap.set(order.customer.id, { name: order.customer.name, email: order.customer.email });
    }
  }
  await chunked(Array.from(customerMap.entries()), 400, (chunk) =>
    prisma.customer.createMany({
      skipDuplicates: true,
      data: chunk.map(([externalId, c]) => ({
        id: customerPk(externalId),
        sourceSystem: "pdv",
        externalId,
        name: c.name,
        email: c.email,
        isReturning: false,
      })),
    }),
  );

  await chunked(collected, 400, (chunk) =>
    prisma.order.createMany({
      skipDuplicates: true,
      data: chunk.map(({ order, externalId, updatedAt }) => ({
        id: orderPk(externalId),
        externalId,
        sourceSystem: "pdv",
        channel: "fisica",
        createdAt: new Date(order.createdAt),
        updatedAt: new Date(updatedAt),
        total: order.total,
        currency: order.currency,
        itemsCount: order.itemsCount,
        financialStatus: order.financialStatus,
        vendedor: order.vendedor ?? null,
        unidade: order.unidade ?? null,
        formaPagamento: order.formaPagamento ?? null,
        customerId: order.customer.id ? customerPk(order.customer.id) : null,
      })),
    }),
  );

  const items = collected.flatMap(({ order, externalId }) =>
    order.items.map((it) => ({
      orderId: orderPk(externalId),
      externalId: it.id,
      productId: it.productId,
      title: it.title,
      quantity: it.quantity,
      unitPrice: it.unitPrice,
      total: it.total,
    })),
  );
  await chunked(items, 400, (chunk) => prisma.orderItem.createMany({ data: chunk }));

  const attrs = collected.map(({ order, externalId }) => ({
    orderId: orderPk(externalId),
    utmSource: order.attribution.utmSource,
    utmMedium: order.attribution.utmMedium,
    utmCampaign: order.attribution.utmCampaign,
    utmContent: null,
    utmTerm: null,
    landingPage: null,
    referrer: null,
    channelGroup: order.attribution.channelGroup,
    firstTouch: null,
    lastTouch: null,
  }));
  await chunked(attrs, 400, (chunk) => prisma.attributionRecord.createMany({ data: chunk }));
}

export async function syncPdv(opts: { full?: boolean } = {}): Promise<PdvSyncResult> {
  const config = readPdvConfig();
  if (!config) throw new Error("PDV não configurado (nem credenciais nem modo fixture).");
  const client = new PdvClient(config);
  const mapper = getPdvMapper(config.system);

  const cursorRow = await prisma.syncCursor.findUnique({ where: { sourceSystem: "pdv" } });
  const isFull = opts.full || !cursorRow?.lastSyncedAt;
  const updatedAtMin = isFull ? null : cursorRow!.lastSyncedAt!.toISOString();

  const collected: Collected[] = [];
  let page = 1;
  let pages = 0;
  let maxUpdatedAt: string | null = cursorRow?.lastSyncedAt?.toISOString() ?? null;

  // eslint-disable-next-line no-constant-condition
  while (true) {
    const { sales, hasNext } = await client.fetchSalesPage({ page, updatedAtMin });
    pages++;
    for (const raw of sales) {
      const { order, externalId, updatedAt } = mapper(raw);
      collected.push({ order, externalId, updatedAt });
      if (!maxUpdatedAt || updatedAt > maxUpdatedAt) maxUpdatedAt = updatedAt;
    }
    if (!hasNext || sales.length === 0) break;
    page++;
  }

  if (isFull) {
    await bulkInsert(collected);
  } else {
    for (const c of collected) await upsertPdvOrder(c);
  }

  await prisma.syncCursor.upsert({
    where: { sourceSystem: "pdv" },
    update: { lastSyncedAt: maxUpdatedAt ? new Date(maxUpdatedAt) : cursorRow?.lastSyncedAt ?? null },
    create: { sourceSystem: "pdv", lastSyncedAt: maxUpdatedAt ? new Date(maxUpdatedAt) : null },
  });

  return { imported: collected.length, pages, lastSyncedAt: maxUpdatedAt, fixture: config.fixture, system: config.system };
}

/** Upsert de uma venda (sync incremental). */
async function upsertPdvOrder({ order, externalId, updatedAt }: Collected): Promise<void> {
  let customerId: string | null = null;
  if (order.customer.id) {
    const c = await prisma.customer.upsert({
      where: { sourceSystem_externalId: { sourceSystem: "pdv", externalId: order.customer.id } },
      update: { name: order.customer.name, email: order.customer.email },
      create: {
        sourceSystem: "pdv",
        externalId: order.customer.id,
        name: order.customer.name,
        email: order.customer.email,
        isReturning: false,
      },
    });
    customerId = c.id;
  }

  const saved = await prisma.order.upsert({
    where: { sourceSystem_externalId: { sourceSystem: "pdv", externalId } },
    update: {
      createdAt: new Date(order.createdAt),
      updatedAt: new Date(updatedAt),
      total: order.total,
      itemsCount: order.itemsCount,
      financialStatus: order.financialStatus,
      vendedor: order.vendedor ?? null,
      unidade: order.unidade ?? null,
      formaPagamento: order.formaPagamento ?? null,
      customerId,
    },
    create: {
      externalId,
      sourceSystem: "pdv",
      channel: "fisica",
      createdAt: new Date(order.createdAt),
      updatedAt: new Date(updatedAt),
      total: order.total,
      currency: order.currency,
      itemsCount: order.itemsCount,
      financialStatus: order.financialStatus,
      vendedor: order.vendedor ?? null,
      unidade: order.unidade ?? null,
      formaPagamento: order.formaPagamento ?? null,
      customerId,
    },
  });

  await prisma.orderItem.deleteMany({ where: { orderId: saved.id } });
  if (order.items.length) {
    await prisma.orderItem.createMany({
      data: order.items.map((it) => ({
        orderId: saved.id,
        externalId: it.id,
        productId: it.productId,
        title: it.title,
        quantity: it.quantity,
        unitPrice: it.unitPrice,
        total: it.total,
      })),
    });
  }

  await prisma.attributionRecord.upsert({
    where: { orderId: saved.id },
    update: { utmCampaign: order.attribution.utmCampaign, channelGroup: order.attribution.channelGroup },
    create: {
      orderId: saved.id,
      utmCampaign: order.attribution.utmCampaign,
      channelGroup: order.attribution.channelGroup,
    },
  });
}
