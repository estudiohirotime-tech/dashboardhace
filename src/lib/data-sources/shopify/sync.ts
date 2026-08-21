// -----------------------------------------------------------------------------
// Backfill/sincronização Shopify -> banco local.
//   página GraphQL (cursor) -> validação Zod -> mapper -> persistência no Prisma.
// A dashboard lê do banco; este módulo é quem alimenta o banco.
// Incremental: usa SyncCursor.lastSyncedAt (maior updated_at já processado).
//
// - Backfill completo: inserção em lote (createMany em chunks) para ser rápido.
// - Incremental (webhooks/updated): upsert por pedido (volumes pequenos).
// -----------------------------------------------------------------------------

import { prisma } from "@/lib/prisma";
import { ShopifyGraphQLClient } from "./graphql";
import { mapShopifyOrder, gidToId } from "./order-mapper";
import { orderNodeSchema } from "./schemas";
import { readShopifyConfig } from "./config";
import { loadPartnersFromDb } from "../partners-db";
import type { Order } from "../types";

export interface SyncResult {
  imported: number;
  pages: number;
  lastSyncedAt: string | null;
  fixture: boolean;
}

interface CollectedOrder {
  order: Order;
  externalId: string;
  updatedAt: string;
}

const orderPk = (ext: string) => `sho_${ext}`;
const customerPk = (ext: string) => `shc_${ext}`;

async function chunked<T>(rows: T[], size: number, fn: (chunk: T[]) => Promise<unknown>): Promise<void> {
  for (let i = 0; i < rows.length; i += size) {
    await fn(rows.slice(i, i + size));
  }
}

/** Insere em lote (usado no backfill completo, após limpar os dados Shopify). */
async function bulkInsert(collected: CollectedOrder[]): Promise<void> {
  await prisma.orderItem.deleteMany({ where: { order: { sourceSystem: "shopify" } } });
  await prisma.attributionRecord.deleteMany({ where: { order: { sourceSystem: "shopify" } } });
  await prisma.order.deleteMany({ where: { sourceSystem: "shopify" } });
  await prisma.customer.deleteMany({ where: { sourceSystem: "shopify" } });

  // Clientes (dedup por externalId).
  const customerMap = new Map<string, { id: string; name: string | null; email: string | null; isReturning: boolean }>();
  for (const { order } of collected) {
    if (order.customer.id) {
      customerMap.set(order.customer.id, {
        id: customerPk(order.customer.id),
        name: order.customer.name,
        email: order.customer.email,
        isReturning: order.customer.isReturning,
      });
    }
  }
  await chunked(
    Array.from(customerMap.entries()),
    400,
    (chunk) =>
      prisma.customer.createMany({
        skipDuplicates: true,
        data: chunk.map(([externalId, c]) => ({
          id: c.id,
          sourceSystem: "shopify",
          externalId,
          name: c.name,
          email: c.email,
          isReturning: c.isReturning,
        })),
      }),
  );

  // Pedidos.
  await chunked(collected, 400, (chunk) =>
    prisma.order.createMany({
      skipDuplicates: true,
      data: chunk.map(({ order, externalId, updatedAt }) => ({
        id: orderPk(externalId),
        externalId,
        sourceSystem: "shopify",
        channel: order.channel,
        createdAt: new Date(order.createdAt),
        updatedAt: new Date(updatedAt),
        total: order.total,
        currency: order.currency,
        itemsCount: order.itemsCount,
        financialStatus: order.financialStatus,
        customerId: order.customer.id ? customerPk(order.customer.id) : null,
      })),
    }),
  );

  // Itens.
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

  // Atribuições.
  const attrs = collected.map(({ order, externalId }) => {
    const a = order.attribution;
    return {
      orderId: orderPk(externalId),
      utmSource: a.utmSource,
      utmMedium: a.utmMedium,
      utmCampaign: a.utmCampaign,
      utmContent: a.utmContent,
      utmTerm: a.utmTerm,
      landingPage: a.landingPage,
      referrer: a.referrer,
      channelGroup: a.channelGroup,
      firstTouch: a.firstTouch ? JSON.stringify(a.firstTouch) : null,
      lastTouch: a.lastTouch ? JSON.stringify(a.lastTouch) : null,
    };
  });
  await chunked(attrs, 400, (chunk) => prisma.attributionRecord.createMany({ data: chunk }));
}

/** Upsert de um pedido (usado no sync incremental / webhooks). */
export async function upsertOrder(order: Order, externalId: string, updatedAt: string): Promise<void> {
  let customerId: string | null = null;
  if (order.customer.id) {
    const customer = await prisma.customer.upsert({
      where: { sourceSystem_externalId: { sourceSystem: "shopify", externalId: order.customer.id } },
      update: { name: order.customer.name, email: order.customer.email, isReturning: order.customer.isReturning },
      create: {
        sourceSystem: "shopify",
        externalId: order.customer.id,
        name: order.customer.name,
        email: order.customer.email,
        isReturning: order.customer.isReturning,
      },
    });
    customerId = customer.id;
  }

  const saved = await prisma.order.upsert({
    where: { sourceSystem_externalId: { sourceSystem: "shopify", externalId } },
    update: {
      channel: order.channel,
      createdAt: new Date(order.createdAt),
      updatedAt: new Date(updatedAt),
      total: order.total,
      currency: order.currency,
      itemsCount: order.itemsCount,
      financialStatus: order.financialStatus,
      customerId,
    },
    create: {
      externalId,
      sourceSystem: "shopify",
      channel: order.channel,
      createdAt: new Date(order.createdAt),
      updatedAt: new Date(updatedAt),
      total: order.total,
      currency: order.currency,
      itemsCount: order.itemsCount,
      financialStatus: order.financialStatus,
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

  const a = order.attribution;
  await prisma.attributionRecord.upsert({
    where: { orderId: saved.id },
    update: {
      utmSource: a.utmSource, utmMedium: a.utmMedium, utmCampaign: a.utmCampaign,
      utmContent: a.utmContent, utmTerm: a.utmTerm, landingPage: a.landingPage,
      referrer: a.referrer, channelGroup: a.channelGroup,
      firstTouch: a.firstTouch ? JSON.stringify(a.firstTouch) : null,
      lastTouch: a.lastTouch ? JSON.stringify(a.lastTouch) : null,
    },
    create: {
      orderId: saved.id,
      utmSource: a.utmSource, utmMedium: a.utmMedium, utmCampaign: a.utmCampaign,
      utmContent: a.utmContent, utmTerm: a.utmTerm, landingPage: a.landingPage,
      referrer: a.referrer, channelGroup: a.channelGroup,
      firstTouch: a.firstTouch ? JSON.stringify(a.firstTouch) : null,
      lastTouch: a.lastTouch ? JSON.stringify(a.lastTouch) : null,
    },
  });
}

export async function syncShopify(opts: { full?: boolean } = {}): Promise<SyncResult> {
  const config = readShopifyConfig();
  if (!config) throw new Error("Shopify não configurada (nem credenciais nem modo fixture).");
  await loadPartnersFromDb(); // agrupamento de canal usa a lista de parceiros do banco
  const client = new ShopifyGraphQLClient(config);

  const cursorRow = await prisma.syncCursor.findUnique({ where: { sourceSystem: "shopify" } });
  const isFull = opts.full || !cursorRow?.lastSyncedAt;
  const updatedAtMin = isFull ? null : cursorRow!.lastSyncedAt!.toISOString();

  let after: string | null = null;
  let pages = 0;
  let maxUpdatedAt: string | null = cursorRow?.lastSyncedAt?.toISOString() ?? null;
  const collected: CollectedOrder[] = [];

  // eslint-disable-next-line no-constant-condition
  while (true) {
    const res = await client.fetchOrdersPage({ first: 100, after, updatedAtMin });
    const connection = res.data?.orders;
    if (!connection) break;
    pages++;

    for (const edge of connection.edges) {
      const node = orderNodeSchema.parse(edge.node); // defesa em profundidade
      const { order } = mapShopifyOrder(node);
      collected.push({ order, externalId: gidToId(node.id), updatedAt: node.updatedAt });
      if (!maxUpdatedAt || node.updatedAt > maxUpdatedAt) maxUpdatedAt = node.updatedAt;
    }

    if (!connection.pageInfo.hasNextPage || !connection.pageInfo.endCursor) break;
    after = connection.pageInfo.endCursor;
  }

  if (isFull) {
    await bulkInsert(collected);
  } else {
    for (const c of collected) await upsertOrder(c.order, c.externalId, c.updatedAt);
  }

  await prisma.syncCursor.upsert({
    where: { sourceSystem: "shopify" },
    update: { lastCursor: after, lastSyncedAt: maxUpdatedAt ? new Date(maxUpdatedAt) : cursorRow?.lastSyncedAt ?? null },
    create: { sourceSystem: "shopify", lastCursor: after, lastSyncedAt: maxUpdatedAt ? new Date(maxUpdatedAt) : null },
  });

  return { imported: collected.length, pages, lastSyncedAt: maxUpdatedAt, fixture: config.fixture };
}
