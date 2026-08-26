// -----------------------------------------------------------------------------
// Parceiros/influenciadores no BANCO (não em arquivo — o filesystem é read-only
// em serverless). partners.json vira apenas o seed inicial.
// -----------------------------------------------------------------------------

import { prisma } from "@/lib/prisma";
import { setPartnerSources } from "./channel-grouping";
import partnersJson from "./partners.json";

export interface PartnersView {
  influencers: string[];
  affiliates: string[];
}

/** Semeia a tabela Partner a partir do partners.json, se estiver vazia. */
export async function ensurePartnersSeeded(): Promise<void> {
  const count = await prisma.partner.count();
  if (count > 0) return;
  const influencers = (partnersJson.influencers ?? []) as string[];
  const affiliates = (partnersJson.affiliates ?? []) as string[];
  const data = [
    ...influencers.map((source) => ({ source, label: source, kind: "influencer" })),
    ...affiliates.map((source) => ({ source, label: source, kind: "affiliate" })),
  ];
  if (data.length) {
    await prisma.partner.createMany({ data, skipDuplicates: true });
  }
}

/** Lê os parceiros do banco, atualiza o set em memória e retorna agrupado. */
export async function loadPartnersFromDb(): Promise<PartnersView> {
  await ensurePartnersSeeded();
  const rows = await prisma.partner.findMany();
  const influencers = rows.filter((r) => r.kind === "influencer").map((r) => r.source);
  const affiliates = rows.filter((r) => r.kind === "affiliate").map((r) => r.source);
  setPartnerSources([...influencers, ...affiliates]);
  return { influencers, affiliates };
}

export async function addPartner(source: string, kind: "influencer" | "affiliate"): Promise<void> {
  const value = source.trim().toLowerCase();
  await prisma.partner.upsert({
    where: { source: value },
    update: { kind, label: value },
    create: { source: value, label: value, kind },
  });
  await loadPartnersFromDb();
}

export async function removePartner(source: string): Promise<void> {
  const value = source.trim().toLowerCase();
  await prisma.partner.deleteMany({ where: { source: value } });
  await loadPartnersFromDb();
}
