// -----------------------------------------------------------------------------
// Serviço de analytics — agrega as DUAS fontes (online + física) numa visão
// unificada. É a única coisa que as rotas de API consomem. Roda SÓ no servidor.
//
// Cada retorno carrega `isMock` (ou por-fonte) para a UI sinalizar demonstração.
// -----------------------------------------------------------------------------

import "server-only";
import { registry } from "@/lib/data-sources/registry";
import type {
  Order,
  DateRange,
  OrderFilters,
  ChannelGroup,
  Channel,
  ConnectionStatus,
  FunnelSnapshot,
  AttributionRow,
  ProductRow,
} from "@/lib/data-sources/types";
import { previousPeriod } from "@/lib/period";
import { dayKey } from "@/lib/date";
import { funnelFromEvents } from "@/lib/data-sources/pixel/funnel";

function isRevenue(o: Order): boolean {
  return o.financialStatus !== "refunded";
}

function sumRevenue(orders: Order[]): number {
  return orders.filter(isRevenue).reduce((a, o) => a + o.total, 0);
}

// --- Coleta base --------------------------------------------------------------

export interface SourceMeta {
  online: { isMock: boolean; status: ConnectionStatus; message: string; configured: boolean };
  fisica: { isMock: boolean; status: ConnectionStatus; message: string; configured: boolean };
  anyMock: boolean;
}

export async function getSourceMeta(): Promise<SourceMeta> {
  const { online, fisica } = await registry.resolveAll();
  return {
    online: {
      isMock: online.isMock,
      status: online.health.status ?? "demo",
      message: online.health.message,
      configured: online.configured,
    },
    fisica: {
      isMock: fisica.isMock,
      status: fisica.health.status ?? "demo",
      message: fisica.health.message,
      configured: fisica.configured,
    },
    anyMock: online.isMock || fisica.isMock,
  };
}

interface CollectedOrders {
  online: Order[];
  fisica: Order[];
  all: Order[];
  isMock: boolean;
}

async function collectOrders(range: DateRange, filters?: OrderFilters): Promise<CollectedOrders> {
  const { online, fisica } = await registry.resolveAll();
  const wantOnline = !filters?.channel || filters.channel === "all" || filters.channel === "online";
  const wantFisica = !filters?.channel || filters.channel === "all" || filters.channel === "fisica";

  const [onlineOrders, fisicaOrders] = await Promise.all([
    wantOnline ? online.source.getOrders(range, { ...filters, channel: undefined }) : Promise.resolve([]),
    wantFisica ? fisica.source.getOrders(range, { ...filters, channel: undefined }) : Promise.resolve([]),
  ]);

  return {
    online: onlineOrders,
    fisica: fisicaOrders,
    all: [...onlineOrders, ...fisicaOrders],
    isMock: (wantOnline && online.isMock) || (wantFisica && fisica.isMock),
  };
}

// --- KPIs / overview ----------------------------------------------------------

export interface KpiValue {
  value: number;
  previous: number;
  delta: number; // fração
  online: number;
  fisica: number;
}

export interface Overview {
  revenue: KpiValue;
  orders: KpiValue;
  averageTicket: KpiValue;
  conversion: KpiValue; // fração 0..1
  isMock: boolean;
}

function delta(current: number, previous: number): number {
  if (previous === 0) return current === 0 ? 0 : 1;
  return (current - previous) / previous;
}

export async function getOverview(range: DateRange): Promise<Overview> {
  const prev = previousPeriod(range);
  const [cur, before] = await Promise.all([collectOrders(range), collectOrders(prev)]);

  const revOnline = sumRevenue(cur.online);
  const revFisica = sumRevenue(cur.fisica);
  const rev = revOnline + revFisica;
  const revPrev = sumRevenue(before.all);

  const ordersCur = cur.all.filter(isRevenue).length;
  const ordersPrev = before.all.filter(isRevenue).length;
  const ordersOnline = cur.online.filter(isRevenue).length;
  const ordersFisica = cur.fisica.filter(isRevenue).length;

  const ticket = ordersCur ? Math.round(rev / ordersCur) : 0;
  const ticketPrev = ordersPrev ? Math.round(revPrev / ordersPrev) : 0;
  const ticketOnline = ordersOnline ? Math.round(revOnline / ordersOnline) : 0;
  const ticketFisica = ordersFisica ? Math.round(revFisica / ordersFisica) : 0;

  // Conversão geral = compras online / sessões (do funil online).
  const [funCur, funPrev] = await Promise.all([getFunnel(range), getFunnel(prev)]);
  const convCur = funnelConversion(funCur);
  const convPrev = funnelConversion(funPrev);

  return {
    revenue: {
      value: rev,
      previous: revPrev,
      delta: delta(rev, revPrev),
      online: revOnline,
      fisica: revFisica,
    },
    orders: {
      value: ordersCur,
      previous: ordersPrev,
      delta: delta(ordersCur, ordersPrev),
      online: ordersOnline,
      fisica: ordersFisica,
    },
    averageTicket: {
      value: ticket,
      previous: ticketPrev,
      delta: delta(ticket, ticketPrev),
      online: ticketOnline,
      fisica: ticketFisica,
    },
    conversion: {
      value: convCur,
      previous: convPrev,
      delta: delta(convCur, convPrev),
      online: convCur,
      fisica: 0,
    },
    isMock: cur.isMock,
  };
}

function funnelConversion(f: FunnelSnapshot): number {
  const sessions = f.stages.find((s) => s.key === "sessions")?.count ?? 0;
  const purchase = f.stages.find((s) => s.key === "purchase")?.count ?? 0;
  return sessions > 0 ? purchase / sessions : 0;
}

// --- Série temporal de receita ------------------------------------------------

export type Granularity = "day" | "week" | "month";

export interface RevenuePoint {
  bucket: string; // chave ISO do bucket (data)
  online: number;
  fisica: number;
  total: number;
}

export interface RevenueTimeseries {
  points: RevenuePoint[];
  granularity: Granularity;
  isMock: boolean;
}

function bucketKey(iso: string, granularity: Granularity): string {
  const key = dayKey(iso); // yyyy-mm-dd em SP
  if (granularity === "day") return key;
  const d = new Date(`${key}T12:00:00-03:00`);
  if (granularity === "week") {
    const day = d.getDay();
    const monday = new Date(d.getTime() - ((day + 6) % 7) * 86400 * 1000);
    return dayKey(monday.toISOString());
  }
  return `${key.slice(0, 7)}-01`; // primeiro dia do mês
}

export async function getRevenueTimeseries(
  range: DateRange,
  granularity: Granularity = "day",
): Promise<RevenueTimeseries> {
  const cur = await collectOrders(range);
  const map = new Map<string, RevenuePoint>();

  const add = (orders: Order[], channel: Channel) => {
    for (const o of orders.filter(isRevenue)) {
      const key = bucketKey(o.createdAt, granularity);
      let p = map.get(key);
      if (!p) {
        p = { bucket: key, online: 0, fisica: 0, total: 0 };
        map.set(key, p);
      }
      p[channel] += o.total;
      p.total += o.total;
    }
  };
  add(cur.online, "online");
  add(cur.fisica, "fisica");

  const points = Array.from(map.values()).sort((a, b) => a.bucket.localeCompare(b.bucket));
  return { points, granularity, isMock: cur.isMock };
}

// --- Split por canal de origem (donut) ---------------------------------------

export interface ChannelSlice {
  channelGroup: ChannelGroup;
  revenue: number;
  orders: number;
  share: number;
}

export interface ChannelSplit {
  slices: ChannelSlice[];
  totalRevenue: number;
  isMock: boolean;
}

export async function getChannelSplit(range: DateRange): Promise<ChannelSplit> {
  const cur = await collectOrders(range);
  const map = new Map<ChannelGroup, { revenue: number; orders: number }>();
  for (const o of cur.all.filter(isRevenue)) {
    const g = o.attribution.channelGroup;
    const row = map.get(g) ?? { revenue: 0, orders: 0 };
    row.revenue += o.total;
    row.orders += 1;
    map.set(g, row);
  }
  const totalRevenue = Array.from(map.values()).reduce((a, r) => a + r.revenue, 0) || 1;
  const slices = Array.from(map.entries())
    .map(([channelGroup, r]) => ({
      channelGroup,
      revenue: r.revenue,
      orders: r.orders,
      share: r.revenue / totalRevenue,
    }))
    .sort((a, b) => b.revenue - a.revenue);
  return { slices, totalRevenue, isMock: cur.isMock };
}

// --- Cartões de clientes ------------------------------------------------------

export interface CustomerStats {
  newCustomers: number;
  returningCustomers: number;
  abandonedCheckouts: number;
  recoveredRevenue: number;
  isMock: boolean;
}

export async function getCustomerStats(range: DateRange): Promise<CustomerStats> {
  const cur = await collectOrders(range);
  const seen = new Set<string>();
  let neu = 0;
  let returning = 0;
  for (const o of cur.all.filter(isRevenue)) {
    const id = o.customer.id;
    if (!id) {
      if (!o.customer.isReturning) neu += 1;
      continue;
    }
    if (seen.has(id)) continue;
    seen.add(id);
    if (o.customer.isReturning) returning += 1;
    else neu += 1;
  }

  const funnel = await getFunnel(range);
  const checkout = funnel.stages.find((s) => s.key === "checkout_started")?.count ?? 0;
  const purchase = funnel.stages.find((s) => s.key === "purchase")?.count ?? 0;
  const abandoned = Math.max(0, checkout - purchase);

  // Receita recuperada (mock): ~9% dos abandonos convertidos ao ticket médio.
  const ticket =
    purchase > 0 ? Math.round(sumRevenue(cur.online) / Math.max(1, cur.online.filter(isRevenue).length)) : 0;
  const recoveredRevenue = Math.round(abandoned * 0.09) * ticket;

  return {
    newCustomers: neu,
    returningCustomers: returning,
    abandonedCheckouts: abandoned,
    recoveredRevenue,
    isMock: cur.isMock,
  };
}

// --- Funil --------------------------------------------------------------------

export async function getFunnel(range: DateRange, filters?: OrderFilters): Promise<FunnelSnapshot> {
  const { online, fisica } = await registry.resolveAll();
  const channel = filters?.channel ?? "all";

  if (channel === "fisica") {
    return fisica.source.getFunnel(range, filters);
  }

  // Funil REAL por eventos de comportamento (Web Pixels Extension), quando houver.
  const eventFunnel = await funnelFromEvents(range, filters);
  if (eventFunnel) return { ...eventFunnel, channel };

  // Fallback (Opção C): funil estimado a partir dos pedidos da loja online.
  const snap = await online.source.getFunnel(range, { ...filters, channel: undefined });
  return { ...snap, channel };
}

// --- Atribuição (merge das duas fontes) --------------------------------------

export async function getAttribution(range: DateRange): Promise<{ rows: AttributionRow[]; isMock: boolean }> {
  const { online, fisica } = await registry.resolveAll();
  const [onlineRows, fisicaRows] = await Promise.all([
    online.source.getAttributionBreakdown(range),
    fisica.source.getAttributionBreakdown(range),
  ]);
  const rows = [...onlineRows, ...fisicaRows];
  const total = rows.reduce((a, r) => a + r.revenue, 0) || 1;
  const normalized = rows
    .map((r) => ({ ...r, revenueShare: r.revenue / total }))
    .sort((a, b) => b.revenue - a.revenue);
  return { rows: normalized, isMock: online.isMock || fisica.isMock };
}

// --- Produtos (merge) ---------------------------------------------------------

export async function getProducts(
  range: DateRange,
  limit = 20,
): Promise<{ rows: ProductRow[]; isMock: boolean }> {
  const { online, fisica } = await registry.resolveAll();
  const [a, b] = await Promise.all([
    online.source.getTopProducts(range, 100),
    fisica.source.getTopProducts(range, 100),
  ]);
  const map = new Map<string, ProductRow>();
  for (const r of [...a, ...b]) {
    const existing = map.get(r.productId);
    if (!existing) {
      map.set(r.productId, { ...r });
    } else {
      existing.unitsSold += r.unitsSold;
      existing.revenue += r.revenue;
      existing.orders += r.orders;
      existing.revenueOnline += r.revenueOnline;
      existing.revenueFisica += r.revenueFisica;
    }
  }
  const rows = Array.from(map.values()).sort((x, y) => y.revenue - x.revenue).slice(0, limit);
  return { rows, isMock: online.isMock || fisica.isMock };
}

// --- Pedidos ------------------------------------------------------------------

export async function getOrders(
  range: DateRange,
  filters?: OrderFilters,
): Promise<{ orders: Order[]; isMock: boolean }> {
  const cur = await collectOrders(range, filters);
  const orders = cur.all.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  return { orders, isMock: cur.isMock };
}

export async function getRecentOrders(
  range: DateRange,
  limit = 8,
): Promise<{ orders: Order[]; isMock: boolean }> {
  const { orders, isMock } = await getOrders(range);
  return { orders: orders.slice(0, limit), isMock };
}
