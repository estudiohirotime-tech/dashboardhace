// -----------------------------------------------------------------------------
// Gerador determinístico de pedidos mock, com cara de e-commerce brasileiro:
//   - Sazonalidade semanal (pico qua/dom, vale seg)
//   - Curva horária concentrada entre 20h e 23h
//   - Mix de canais realista
//   - Ticket log-normal (não uniforme)
//   - Loja física ~30% da receita, ticket 18% maior, sem funil
//   - Seed fixa: os números não mudam a cada refresh
// -----------------------------------------------------------------------------

import type {
  Order,
  OrderItem,
  Channel,
  ChannelGroup,
  Attribution,
  FinancialStatus,
  DateRange,
  TouchPoint,
} from "../types";
import { Rng } from "./rng";
import {
  PRODUCTS,
  FIRST_NAMES,
  LAST_NAMES,
  EMAIL_DOMAINS,
  VENDEDORES,
  UNIDADES,
  FORMAS_PAGAMENTO,
  CAMPAIGNS,
} from "./catalog";

const SEED = "hace-omnichannel-2026";
const WINDOW_DAYS = 180;

// Distribuição de canal (online). Soma = 1.0
const CHANNEL_MIX: { group: ChannelGroup; weight: number }[] = [
  { group: "paid_social", weight: 0.35 },
  { group: "organic_social", weight: 0.2 },
  { group: "paid_search", weight: 0.15 },
  { group: "direct", weight: 0.12 },
  { group: "email", weight: 0.1 },
  { group: "organic_search", weight: 0.08 },
];

const WEEKDAY_FACTOR: Record<number, number> = {
  0: 1.3, // domingo — pico
  1: 0.7, // segunda — vale
  2: 0.9,
  3: 1.3, // quarta — pico
  4: 1.0,
  5: 1.05,
  6: 1.1,
};

// Curva horária (0..23) — peso maior entre 20h e 23h.
const HOUR_WEIGHTS: number[] = [
  0.4, 0.25, 0.15, 0.1, 0.1, 0.15, 0.3, 0.5, 0.7, 0.9, 1.0, 1.1, 1.15, 1.05, 1.0,
  1.0, 1.1, 1.2, 1.4, 1.7, 2.4, 2.6, 2.2, 1.2,
];

const FINANCIAL: { status: FinancialStatus; weight: number }[] = [
  { status: "paid", weight: 0.88 },
  { status: "pending", weight: 0.06 },
  { status: "refunded", weight: 0.03 },
  { status: "partially_refunded", weight: 0.03 },
];

// --- Helpers de data ----------------------------------------------------------

function todaySP(): Date {
  return new Date();
}

/** yyyy-mm-dd de uma data, no fuso -03:00 (Brasil sem horário de verão). */
function dayString(d: Date): string {
  const off = new Date(d.getTime() - 3 * 3600 * 1000);
  return off.toISOString().slice(0, 10);
}

/** Constrói ISO em UTC a partir de dia + hora local SP (-03:00). */
function isoAt(day: string, hour: number, minute: number, second: number): string {
  const hh = String(hour).padStart(2, "0");
  const mm = String(minute).padStart(2, "0");
  const ss = String(second).padStart(2, "0");
  return new Date(`${day}T${hh}:${mm}:${ss}-03:00`).toISOString();
}

function weekdayOf(day: string): number {
  return new Date(`${day}T12:00:00-03:00`).getDay();
}

/** Lista de dias (yyyy-mm-dd) que intersectam o range, dentro da janela. */
function daysInRange(range: DateRange): string[] {
  const now = todaySP();
  const windowStart = new Date(now.getTime() - WINDOW_DAYS * 86400 * 1000);
  const start = new Date(
    Math.max(new Date(range.from).getTime(), windowStart.getTime()),
  );
  const end = new Date(Math.min(new Date(range.to).getTime(), now.getTime()));
  const days: string[] = [];
  const cursor = new Date(`${dayString(start)}T12:00:00-03:00`);
  const endDay = dayString(end);
  while (dayString(cursor) <= endDay) {
    days.push(dayString(cursor));
    cursor.setDate(cursor.getDate() + 1);
  }
  return days;
}

// --- Construção de um pedido --------------------------------------------------

function pickHour(rng: Rng): number {
  return rng.weighted(
    Array.from({ length: 24 }, (_, i) => i),
    HOUR_WEIGHTS,
  );
}

function makeCustomer(rng: Rng, channel: Channel) {
  const isReturning = rng.chance(0.35);
  // Loja física tem alta taxa de venda anônima (walk-in).
  const anonymous = channel === "fisica" && rng.chance(0.55);
  if (anonymous) {
    return { id: null, name: null, email: null, isReturning };
  }
  const first = rng.pick(FIRST_NAMES);
  const last = rng.pick(LAST_NAMES);
  const name = `${first} ${last}`;
  const email = `${first}.${last}`.toLowerCase().replace(/[^a-z.]/g, "") + `@${rng.pick(EMAIL_DOMAINS)}`;
  const idSuffixPool = isReturning ? 40 : 100000; // recorrentes vêm de um pool menor
  const id = `cust-${channel}-${rng.int(1, idSuffixPool)}`;
  return { id, name, email, isReturning };
}

function buildItems(rng: Rng, total: number): { items: OrderItem[]; itemsCount: number } {
  const nLines = rng.weighted([1, 2, 3], [0.6, 0.3, 0.1]);
  const chosen: typeof PRODUCTS = [];
  const used = new Set<string>();
  while (chosen.length < nLines) {
    const p = rng.pick(PRODUCTS);
    if (used.has(p.id)) continue;
    used.add(p.id);
    chosen.push(p);
  }
  // Distribui o total (log-normal) entre as linhas, com pesos aleatórios.
  const weights = chosen.map(() => rng.float() + 0.2);
  const wsum = weights.reduce((a, b) => a + b, 0);
  const items: OrderItem[] = [];
  let allocated = 0;
  chosen.forEach((product, i) => {
    const isLast = i === chosen.length - 1;
    const lineTotal = isLast
      ? total - allocated
      : Math.round((weights[i]! / wsum) * total);
    allocated += lineTotal;
    const quantity = rng.weighted([1, 2], [0.8, 0.2]);
    const unitPrice = Math.max(100, Math.round(lineTotal / quantity));
    items.push({
      id: `${product.id}-${i}`,
      productId: product.id,
      title: product.title,
      quantity,
      unitPrice,
      total: unitPrice * quantity,
    });
  });
  const itemsCount = items.reduce((a, it) => a + it.quantity, 0);
  return { items, itemsCount };
}

function buildOnlineAttribution(rng: Rng, group: ChannelGroup, occurredAt: string): Attribution {
  const cfg = CAMPAIGNS[group] ?? CAMPAIGNS.direct!;
  const campaign = rng.pick(cfg.campaigns);
  const hasUtm = group !== "direct" && group !== "organic_search";

  const utmSource = hasUtm ? cfg.source || null : null;
  const utmMedium = hasUtm ? cfg.medium || null : null;
  const utmCampaign = hasUtm ? campaign : null;

  let referrer: string | null = null;
  let landingPage: string | null = null;
  if (group === "organic_search") {
    referrer = "https://www.google.com/";
    landingPage = "https://loja.com.br/";
  } else if (group === "organic_social") {
    referrer = "https://l.instagram.com/";
    landingPage = "https://loja.com.br/";
  } else if (group === "direct") {
    referrer = null;
    landingPage = "https://loja.com.br/";
  } else {
    landingPage = `https://loja.com.br/?utm_source=${utmSource}&utm_medium=${utmMedium}&utm_campaign=${utmCampaign}`;
  }

  const touch: TouchPoint = {
    occurredAt,
    source: utmSource,
    medium: utmMedium,
    campaign: utmCampaign,
    landingPage,
    referrer,
    channelGroup: group,
  };

  return {
    utmSource,
    utmMedium,
    utmCampaign,
    utmContent: hasUtm && rng.chance(0.4) ? rng.pick(["imagem-1", "video-a", "carrossel"]) : null,
    utmTerm: group === "paid_search" ? rng.pick(["tenis corrida", "legging", "whey"]) : null,
    landingPage,
    referrer,
    channelGroup: group,
    firstTouch: touch,
    lastTouch: touch,
  };
}

function makeOrder(
  rng: Rng,
  day: string,
  channel: Channel,
  seq: number,
): Order {
  const hour = pickHour(rng);
  const createdAt = isoAt(day, hour, rng.int(0, 59), rng.int(0, 59));

  const medianReais = channel === "fisica" ? 189.9 * 1.18 : 189.9;
  const total = rng.logNormalCents(medianReais, 0.55);
  const { items, itemsCount } = buildItems(rng, total);
  const customer = makeCustomer(rng, channel);
  const financialStatus = rng.weighted(
    FINANCIAL.map((f) => f.status),
    FINANCIAL.map((f) => f.weight),
  );

  let attribution: Attribution;
  const extra: Partial<Order> = {};
  if (channel === "fisica") {
    attribution = {
      utmSource: null,
      utmMedium: null,
      utmCampaign: null,
      utmContent: null,
      utmTerm: null,
      landingPage: null,
      referrer: null,
      channelGroup: "loja_fisica",
      firstTouch: null,
      lastTouch: null,
    };
    extra.vendedor = rng.pick(VENDEDORES);
    extra.unidade = rng.pick(UNIDADES);
    extra.formaPagamento = rng.pick(FORMAS_PAGAMENTO);
  } else {
    const group = rng.weighted(
      CHANNEL_MIX.map((c) => c.group),
      CHANNEL_MIX.map((c) => c.weight),
    );
    attribution = buildOnlineAttribution(rng, group, createdAt);
  }

  return {
    id: `mock-${channel}-${day}-${seq}`,
    channel,
    sourceSystem: "mock",
    createdAt,
    total,
    currency: "BRL",
    itemsCount,
    customer,
    attribution,
    items,
    financialStatus,
    ...extra,
  };
}

// --- Geração por dia (memoizada) ----------------------------------------------

const dayCache = new Map<string, Order[]>();

function generateDay(day: string): Order[] {
  const cached = dayCache.get(day);
  if (cached) return cached;

  const rng = new Rng(`${SEED}:${day}`);
  const weekday = weekdayOf(day);
  const factor = WEEKDAY_FACTOR[weekday] ?? 1;
  const noise = 0.85 + rng.float() * 0.3;
  const onlineCount = Math.max(1, Math.round(60 * factor * noise));
  // Física ~ 0.363 * online → receita física ≈ 30% do total.
  const fisicaCount = Math.max(1, Math.round(onlineCount * 0.363));

  const orders: Order[] = [];
  for (let i = 0; i < onlineCount; i++) {
    orders.push(makeOrder(rng, day, "online", i));
  }
  for (let i = 0; i < fisicaCount; i++) {
    orders.push(makeOrder(rng, day, "fisica", i));
  }
  orders.sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  dayCache.set(day, orders);
  return orders;
}

/** Todos os pedidos que caem dentro do range (ambos os canais). */
export function generateOrders(range: DateRange): Order[] {
  const days = daysInRange(range);
  const fromT = new Date(range.from).getTime();
  const toT = new Date(range.to).getTime();
  const out: Order[] = [];
  for (const day of days) {
    for (const order of generateDay(day)) {
      const t = new Date(order.createdAt).getTime();
      if (t >= fromT && t <= toT) out.push(order);
    }
  }
  return out;
}
