// Seed opcional — popula o banco com pedidos mock dos últimos 30 dias.
// Serve para validar o schema Prisma end-to-end. A dashboard NÃO depende disto
// na Fase 1 (ela lê direto do MockDataSource); os leitores de banco entram nas
// Fases 3+ quando a Shopify passa a persistir localmente.
//
//   npm run db:push && npm run db:seed

import { PrismaClient } from "@prisma/client";
import { generateOrders } from "../src/lib/data-sources/mock/generator";
import partners from "../src/lib/data-sources/partners.json";

const prisma = new PrismaClient();

async function main() {
  const to = new Date();
  const from = new Date(to.getTime() - 30 * 86400 * 1000);
  const orders = generateOrders({ from: from.toISOString(), to: to.toISOString() });

  console.log(`Semeando ${orders.length} pedidos mock...`);

  // Limpa dados anteriores (idempotente).
  await prisma.orderItem.deleteMany();
  await prisma.attributionRecord.deleteMany();
  await prisma.order.deleteMany();
  await prisma.customer.deleteMany();
  await prisma.partner.deleteMany();

  // Parceiros a partir do JSON.
  const influencers = (partners.influencers ?? []) as string[];
  const affiliates = (partners.affiliates ?? []) as string[];
  for (const source of influencers) {
    await prisma.partner.create({ data: { source, label: source, kind: "influencer" } });
  }
  for (const source of affiliates) {
    await prisma.partner.create({ data: { source, label: source, kind: "affiliate" } });
  }

  for (const o of orders) {
    let customerId: string | null = null;
    if (o.customer.id) {
      const customer = await prisma.customer.upsert({
        where: { sourceSystem_externalId: { sourceSystem: "mock", externalId: o.customer.id } },
        update: { isReturning: o.customer.isReturning },
        create: {
          sourceSystem: "mock",
          externalId: o.customer.id,
          name: o.customer.name,
          email: o.customer.email,
          isReturning: o.customer.isReturning,
        },
      });
      customerId = customer.id;
    }

    await prisma.order.create({
      data: {
        externalId: o.id,
        sourceSystem: "mock",
        channel: o.channel,
        createdAt: new Date(o.createdAt),
        updatedAt: new Date(o.createdAt),
        total: o.total,
        currency: o.currency,
        itemsCount: o.itemsCount,
        financialStatus: o.financialStatus,
        vendedor: o.vendedor ?? null,
        unidade: o.unidade ?? null,
        formaPagamento: o.formaPagamento ?? null,
        customerId,
        items: {
          create: o.items.map((it) => ({
            externalId: it.id,
            productId: it.productId,
            title: it.title,
            quantity: it.quantity,
            unitPrice: it.unitPrice,
            total: it.total,
          })),
        },
        attribution: {
          create: {
            utmSource: o.attribution.utmSource,
            utmMedium: o.attribution.utmMedium,
            utmCampaign: o.attribution.utmCampaign,
            utmContent: o.attribution.utmContent,
            utmTerm: o.attribution.utmTerm,
            landingPage: o.attribution.landingPage,
            referrer: o.attribution.referrer,
            channelGroup: o.attribution.channelGroup,
            firstTouch: o.attribution.firstTouch ? JSON.stringify(o.attribution.firstTouch) : null,
            lastTouch: o.attribution.lastTouch ? JSON.stringify(o.attribution.lastTouch) : null,
          },
        },
      },
    });
  }

  console.log("Seed concluído.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
