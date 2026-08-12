// -----------------------------------------------------------------------------
// Gerador de FIXTURES da Shopify — payloads GraphQL fictícios, porém realistas.
// Usado no modo SHOPIFY_FIXTURE=1 para exercitar TODO o pipeline real
// (validação Zod -> mapper de UTM -> agrupamento de canal -> persistência)
// sem depender de credenciais ou rede. Seed fixa: dados estáveis.
// -----------------------------------------------------------------------------

import { Rng } from "../mock/rng";
import { PRODUCTS, FIRST_NAMES, LAST_NAMES, EMAIL_DOMAINS } from "../mock/catalog";

const SEED = "shopify-fixture-2026";
const WINDOW_DAYS = 90;
const ORDERS_PER_DAY = 42;

type Group =
  | "paid_social"
  | "paid_search"
  | "email"
  | "organic_social"
  | "organic_search"
  | "direct";

const GROUP_MIX: { group: Group; weight: number }[] = [
  { group: "paid_social", weight: 0.35 },
  { group: "organic_social", weight: 0.2 },
  { group: "paid_search", weight: 0.15 },
  { group: "direct", weight: 0.12 },
  { group: "email", weight: 0.1 },
  { group: "organic_search", weight: 0.08 },
];

const FIN = [
  { status: "PAID", weight: 0.88 },
  { status: "PENDING", weight: 0.06 },
  { status: "REFUNDED", weight: 0.03 },
  { status: "PARTIALLY_REFUNDED", weight: 0.03 },
];

const HOUR_WEIGHTS = [
  0.4, 0.25, 0.15, 0.1, 0.1, 0.15, 0.3, 0.5, 0.7, 0.9, 1.0, 1.1, 1.15, 1.05, 1.0, 1.0, 1.1, 1.2,
  1.4, 1.7, 2.4, 2.6, 2.2, 1.2,
];

interface UtmSet {
  source: string;
  medium: string;
  campaign: string;
}

const GROUP_UTM: Record<Exclude<Group, "organic_social" | "organic_search" | "direct">, UtmSet[]> = {
  paid_social: [
    { source: "instagram", medium: "paid_social", campaign: "verao-2026" },
    { source: "facebook", medium: "cpc", campaign: "remarketing-carrinho" },
    { source: "instagram", medium: "paid_social", campaign: "prospeccao-lookalike" },
  ],
  paid_search: [
    { source: "google", medium: "cpc", campaign: "search-marca" },
    { source: "google", medium: "cpc", campaign: "search-generico-tenis" },
  ],
  email: [
    { source: "rd-station", medium: "email", campaign: "boas-vindas" },
    { source: "rd-station", medium: "newsletter", campaign: "newsletter-semanal" },
  ],
};

function isoAt(day: string, hour: number, rng: Rng): string {
  const hh = String(hour).padStart(2, "0");
  const mm = String(rng.int(0, 59)).padStart(2, "0");
  return new Date(`${day}T${hh}:${mm}:00-03:00`).toISOString();
}

function money(cents: number, currency = "BRL") {
  return { shopMoney: { amount: (cents / 100).toFixed(2), currencyCode: currency } };
}

interface RawNode {
  id: string;
  updatedAtSort: string;
  node: unknown;
}

let universe: RawNode[] | null = null;

function buildUniverse(): RawNode[] {
  const rng = new Rng(SEED);
  const nodes: RawNode[] = [];
  const now = new Date();
  let seq = 1000;

  for (let d = WINDOW_DAYS - 1; d >= 0; d--) {
    const dayDate = new Date(now.getTime() - d * 86400 * 1000);
    const day = new Date(dayDate.getTime() - 3 * 3600 * 1000).toISOString().slice(0, 10);
    const weekday = new Date(`${day}T12:00:00-03:00`).getDay();
    const factor = weekday === 1 ? 0.7 : weekday === 3 || weekday === 0 ? 1.3 : 1.0;
    const count = Math.max(1, Math.round(ORDERS_PER_DAY * factor * (0.85 + rng.float() * 0.3)));

    for (let i = 0; i < count; i++) {
      const hour = rng.weighted(
        Array.from({ length: 24 }, (_, h) => h),
        HOUR_WEIGHTS,
      );
      const createdAt = isoAt(day, hour, rng);
      const group = rng.weighted(
        GROUP_MIX.map((g) => g.group),
        GROUP_MIX.map((g) => g.weight),
      );
      const status = rng.weighted(
        FIN.map((f) => f.status),
        FIN.map((f) => f.weight),
      );

      // Atribuição em formato bruto Shopify.
      let landingPageUrl: string | null = "https://loja-ficticia.com.br/";
      let referrerUrl: string | null = null;
      const customAttributes: { key: string; value: string }[] = [];
      let visitUtm: { source: string; medium: string; campaign: string; content: string | null; term: string | null } | null =
        null;

      if (group === "paid_social" || group === "paid_search" || group === "email") {
        const set = rng.pick(GROUP_UTM[group]);
        // ~15% dos casos gravam UTM só em customAttributes (campo oculto do tema).
        if (rng.chance(0.15)) {
          landingPageUrl = "https://loja-ficticia.com.br/produtos";
          customAttributes.push({ key: "utm_source", value: set.source });
          customAttributes.push({ key: "utm_medium", value: set.medium });
          customAttributes.push({ key: "utm_campaign", value: set.campaign });
        } else {
          landingPageUrl = `https://loja-ficticia.com.br/?utm_source=${set.source}&utm_medium=${set.medium}&utm_campaign=${set.campaign}`;
        }
        referrerUrl =
          group === "paid_search"
            ? "https://www.googleadservices.com/pagead/aclk"
            : group === "email"
              ? null
              : "https://l.instagram.com/";
        visitUtm = {
          source: set.source,
          medium: set.medium,
          campaign: set.campaign,
          content: rng.chance(0.4) ? "criativo-a" : null,
          term: group === "paid_search" ? "tenis corrida" : null,
        };
      } else if (group === "organic_social") {
        referrerUrl = "https://l.instagram.com/";
      } else if (group === "organic_search") {
        referrerUrl = "https://www.google.com/";
      } else {
        referrerUrl = null; // direct
      }

      // Jornada: ~85% das lojas expõem a jornada completa (depende do plano).
      const journeyReady = rng.chance(0.85);
      const firstVisitAt = new Date(new Date(createdAt).getTime() - rng.int(1, 6) * 86400 * 1000).toISOString();
      const lastVisitAt = new Date(new Date(createdAt).getTime() - rng.int(2, 90) * 60 * 1000).toISOString();

      const makeVisit = (occurredAt: string) => ({
        occurredAt,
        landingPage: landingPageUrl,
        referrerUrl,
        source: visitUtm?.source ?? null,
        sourceType: visitUtm ? "utm" : referrerUrl ? "referral" : "direct",
        utmParameters: visitUtm
          ? {
              source: visitUtm.source,
              medium: visitUtm.medium,
              campaign: visitUtm.campaign,
              content: visitUtm.content,
              term: visitUtm.term,
            }
          : null,
      });

      // Itens
      const nLines = rng.weighted([1, 2, 3], [0.6, 0.3, 0.1]);
      const chosen = new Set<number>();
      while (chosen.size < nLines) chosen.add(rng.int(0, PRODUCTS.length - 1));
      let total = 0;
      const lineItems = Array.from(chosen).map((idx, li) => {
        const p = PRODUCTS[idx]!;
        const qty = rng.weighted([1, 2], [0.8, 0.2]);
        const unit = p.price;
        const lineTotal = unit * qty;
        total += lineTotal;
        return {
          node: {
            id: `gid://shopify/LineItem/${seq}-${li}`,
            title: p.title,
            quantity: qty,
            product: { id: `gid://shopify/Product/${p.id.replace(/\D/g, "")}` },
            originalUnitPriceSet: money(unit),
            originalTotalSet: money(lineTotal),
          },
        };
      });

      const first = rng.pick(FIRST_NAMES);
      const last = rng.pick(LAST_NAMES);
      const returning = rng.chance(0.35);
      const hasCustomer = rng.chance(0.92);

      const node = {
        id: `gid://shopify/Order/${seq}`,
        name: `#${seq}`,
        createdAt,
        updatedAt: createdAt,
        displayFinancialStatus: status,
        currentTotalPriceSet: money(total),
        landingPageUrl,
        referrerUrl,
        note: null,
        customAttributes,
        customerJourneySummary: {
          ready: journeyReady,
          momentsCount: journeyReady ? rng.int(2, 12) : null,
          firstVisit: journeyReady ? makeVisit(firstVisitAt) : null,
          lastVisit: journeyReady ? makeVisit(lastVisitAt) : null,
        },
        customer: hasCustomer
          ? {
              id: `gid://shopify/Customer/${rng.int(1, returning ? 500 : 90000)}`,
              firstName: first,
              lastName: last,
              email: `${first}.${last}`.toLowerCase().replace(/[^a-z.]/g, "") + `@${rng.pick(EMAIL_DOMAINS)}`,
              numberOfOrders: returning ? rng.int(2, 9) : 1,
            }
          : null,
        app: { name: "Online Store" },
        lineItems: { edges: lineItems },
      };

      nodes.push({ id: node.id, updatedAtSort: createdAt, node });
      seq++;
    }
  }

  // Backfill pagina por updated_at ascendente.
  nodes.sort((a, b) => a.updatedAtSort.localeCompare(b.updatedAtSort));
  return nodes;
}

function getUniverse(): RawNode[] {
  if (!universe) universe = buildUniverse();
  return universe;
}

function decodeCursor(cursor: string | null | undefined): number {
  if (!cursor) return -1;
  const n = parseInt(Buffer.from(cursor, "base64").toString("utf-8"), 10);
  return Number.isFinite(n) ? n : -1;
}

function encodeCursor(index: number): string {
  return Buffer.from(String(index), "utf-8").toString("base64");
}

function parseUpdatedAtMin(query: string | null | undefined): string | null {
  if (!query) return null;
  const m = query.match(/updated_at:>'([^']+)'/);
  return m ? m[1]! : null;
}

/** Simula orders(first, after, query) da Admin API. */
export function getFixturePage(variables: {
  first: number;
  after: string | null;
  query: string | null;
}) {
  const all = getUniverse();
  const updatedMin = parseUpdatedAtMin(variables.query);
  const filtered = updatedMin
    ? all.filter((n) => n.updatedAtSort > updatedMin)
    : all;

  const startIdx = decodeCursor(variables.after) + 1;
  const slice = filtered.slice(startIdx, startIdx + variables.first);
  const edges = slice.map((n, i) => ({ cursor: encodeCursor(startIdx + i), node: n.node }));
  const endIndex = startIdx + slice.length - 1;
  const hasNextPage = startIdx + variables.first < filtered.length;

  return {
    data: {
      orders: {
        edges,
        pageInfo: {
          hasNextPage,
          endCursor: edges.length ? encodeCursor(endIndex) : null,
        },
      },
    },
    extensions: {
      cost: {
        throttleStatus: { currentlyAvailable: 1900, maximumAvailable: 2000, restoreRate: 100 },
      },
    },
  };
}
