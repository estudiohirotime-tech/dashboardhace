// -----------------------------------------------------------------------------
// Funil REAL a partir de eventos de comportamento (FunnelEvent).
// Conta sessões distintas por etapa. Retorna null quando não há eventos no
// período (o chamador cai no funil estimado da fonte — Opção C).
// -----------------------------------------------------------------------------

import { prisma } from "@/lib/prisma";
import type { DateRange, OrderFilters, FunnelSnapshot, FunnelStageKey } from "../types";
import { stagesFromCounts } from "../aggregations";
import { readShopifyConfig } from "../shopify/config";
import { seedPixelFixtureIfEmpty } from "./fixture";

export async function funnelFromEvents(
  range: DateRange,
  filters?: OrderFilters,
): Promise<FunnelSnapshot | null> {
  // A loja física não tem funil de comportamento.
  if (filters?.channel === "fisica") return null;

  // No modo fixture, garante que os eventos existam (backfill preguiçoso).
  if (readShopifyConfig()?.fixture) {
    await seedPixelFixtureIfEmpty();
  }

  const where = {
    channel: "online",
    occurredAt: { gte: new Date(range.from), lte: new Date(range.to) },
    ...(filters?.utmCampaign ? { utmCampaign: filters.utmCampaign } : {}),
    ...(filters?.utmSource ? { utmSource: filters.utmSource } : {}),
  };

  const grouped = await prisma.funnelEvent.groupBy({
    by: ["stage"],
    where,
    _count: { _all: true },
  });

  if (grouped.length === 0) return null;

  const counts: Partial<Record<FunnelStageKey, number>> = {};
  for (const g of grouped) {
    counts[g.stage as FunnelStageKey] = g._count._all;
  }

  // Sem eventos de topo relevantes -> deixa o chamador estimar.
  if (!counts.sessions) return null;

  const stages = stagesFromCounts(counts, false);
  return {
    period: range,
    channel: filters?.channel ?? "all",
    stages,
    isMock: false,
  };
}
