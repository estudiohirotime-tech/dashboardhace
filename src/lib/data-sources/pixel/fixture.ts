// -----------------------------------------------------------------------------
// Fixture de eventos da Web Pixels Extension: gera um stream determinístico de
// eventos de comportamento (sessão -> ... -> compra) coerente com as taxas do
// funil, para que o funil das 6 etapas fique REAL (não estimado) na demo.
// Seed fixa. Janela de 35 dias (cobre os presets comuns de período).
// -----------------------------------------------------------------------------

import { prisma } from "@/lib/prisma";
import { Rng } from "../mock/rng";
import { CAMPAIGNS } from "../mock/catalog";

const SEED = "pixel-fixture-2026";
const WINDOW_DAYS = 35;
const SESSIONS_PER_DAY = 1200;

// Mesmas taxas plausíveis usadas no restante do projeto.
const RATES = {
  sessionToProduct: 0.42,
  productToCart: 0.11,
  cartToCheckout: 0.58,
  checkoutToInfo: 0.71,
  infoToPurchase: 0.64,
};

const GROUP_MIX: { group: string; weight: number }[] = [
  { group: "paid_social", weight: 0.35 },
  { group: "organic_social", weight: 0.2 },
  { group: "paid_search", weight: 0.15 },
  { group: "direct", weight: 0.12 },
  { group: "email", weight: 0.1 },
  { group: "organic_search", weight: 0.08 },
];

const HOUR_WEIGHTS = [
  0.4, 0.25, 0.15, 0.1, 0.1, 0.15, 0.3, 0.5, 0.7, 0.9, 1.0, 1.1, 1.15, 1.05, 1.0, 1.0, 1.1, 1.2,
  1.4, 1.7, 2.4, 2.6, 2.2, 1.2,
];

interface EventRow {
  sourceSystem: string;
  sessionId: string;
  stage: string;
  channel: string;
  occurredAt: Date;
  utmSource: string | null;
  utmMedium: string | null;
  utmCampaign: string | null;
}

function isoAt(day: string, hour: number, rng: Rng): Date {
  const mm = String(rng.int(0, 59)).padStart(2, "0");
  const hh = String(hour).padStart(2, "0");
  return new Date(`${day}T${hh}:${mm}:00-03:00`);
}

function generateEvents(): EventRow[] {
  const rng = new Rng(SEED);
  const rows: EventRow[] = [];
  const now = new Date();

  for (let d = WINDOW_DAYS - 1; d >= 0; d--) {
    const dayDate = new Date(now.getTime() - d * 86400 * 1000);
    const day = new Date(dayDate.getTime() - 3 * 3600 * 1000).toISOString().slice(0, 10);
    const weekday = new Date(`${day}T12:00:00-03:00`).getDay();
    const factor = weekday === 1 ? 0.7 : weekday === 3 || weekday === 0 ? 1.3 : 1.0;
    const sessions = Math.round(SESSIONS_PER_DAY * factor * (0.9 + rng.float() * 0.2));

    for (let s = 0; s < sessions; s++) {
      const group = rng.weighted(
        GROUP_MIX.map((g) => g.group),
        GROUP_MIX.map((g) => g.weight),
      );
      const cfg = CAMPAIGNS[group] ?? CAMPAIGNS.direct!;
      const hasUtm = group !== "direct" && group !== "organic_search";
      const utmSource = hasUtm ? cfg.source || null : null;
      const utmMedium = hasUtm ? cfg.medium || null : null;
      const utmCampaign = hasUtm ? rng.pick(cfg.campaigns) : null;

      const hour = rng.weighted(
        Array.from({ length: 24 }, (_, h) => h),
        HOUR_WEIGHTS,
      );
      const baseTime = isoAt(day, hour, rng);
      const sessionId = `sess-${day}-${s}`;

      const push = (stage: string, offsetMin: number) =>
        rows.push({
          sourceSystem: "shopify_pixel",
          sessionId,
          stage,
          channel: "online",
          occurredAt: new Date(baseTime.getTime() + offsetMin * 60 * 1000),
          utmSource,
          utmMedium,
          utmCampaign,
        });

      // Progressão pelas etapas conforme as taxas.
      push("sessions", 0);
      if (!rng.chance(RATES.sessionToProduct)) continue;
      push("product_view", 1);
      if (!rng.chance(RATES.productToCart)) continue;
      push("add_to_cart", 3);
      if (!rng.chance(RATES.cartToCheckout)) continue;
      push("checkout_started", 5);
      if (!rng.chance(RATES.checkoutToInfo)) continue;
      push("checkout_info", 7);
      if (!rng.chance(RATES.infoToPurchase)) continue;
      push("purchase", 9);
    }
  }

  return rows;
}

let seedPromise: Promise<void> | null = null;

/** Popula FunnelEvent com o fixture, se estiver vazio (idempotente). */
export async function seedPixelFixtureIfEmpty(): Promise<void> {
  const count = await prisma.funnelEvent.count({ where: { sourceSystem: "shopify_pixel" } });
  if (count > 0) return;
  if (!seedPromise) {
    seedPromise = (async () => {
      const rows = generateEvents();
      for (let i = 0; i < rows.length; i += 500) {
        await prisma.funnelEvent.createMany({ data: rows.slice(i, i + 500) });
      }
    })().catch((e) => {
      seedPromise = null;
      throw e;
    });
  }
  await seedPromise;
}
