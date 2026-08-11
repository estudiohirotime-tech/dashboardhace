import { registry } from "@/lib/data-sources/registry";
import type { ConnectionStatus, DateRange, Order } from "@/lib/data-sources/types";
import { formatBRL, formatBRLCompact, formatInt } from "@/lib/format";
import { formatRelative } from "@/lib/date";

export const dynamic = "force-dynamic";

const STATUS_META: Record<ConnectionStatus, { color: string; label: string }> = {
  connected: { color: "var(--positive)", label: "Conectado" },
  delayed: { color: "var(--warning)", label: "Atraso na sincronização" },
  demo: { color: "var(--text-muted)", label: "Demonstração" },
};

function StatusDot({ status }: { status: ConnectionStatus }) {
  const meta = STATUS_META[status];
  return (
    <span className="inline-flex items-center gap-2">
      <span
        aria-hidden
        style={{ backgroundColor: meta.color }}
        className="inline-block h-2.5 w-2.5 rounded-full"
      />
      <span style={{ color: "var(--text-secondary)" }} className="text-sm">
        {meta.label}
      </span>
    </span>
  );
}

function DemoBadge() {
  return (
    <span
      className="rounded-[8px] px-2 py-1 text-xs font-medium"
      style={{ background: "var(--accent-soft)", color: "var(--accent-bright)" }}
    >
      Dados de demonstração
    </span>
  );
}

function last30Days(): DateRange {
  const to = new Date();
  const from = new Date(to.getTime() - 30 * 86400 * 1000);
  return { from: from.toISOString(), to: to.toISOString() };
}

function sumRevenue(orders: Order[]): number {
  return orders
    .filter((o) => o.financialStatus !== "refunded")
    .reduce((a, o) => a + o.total, 0);
}

export default async function Home() {
  const range = last30Days();
  const { online, fisica } = await registry.resolveAll();

  const [onlineOrders, fisicaOrders] = await Promise.all([
    online.source.getOrders(range),
    fisica.source.getOrders(range),
  ]);

  const revenueOnline = sumRevenue(onlineOrders);
  const revenueFisica = sumRevenue(fisicaOrders);
  const revenueTotal = revenueOnline + revenueFisica;
  const totalOrders = onlineOrders.length + fisicaOrders.length;
  const anyMock = online.isMock || fisica.isMock;

  const recent = [...onlineOrders, ...fisicaOrders]
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .slice(0, 6);

  return (
    <main className="mx-auto max-w-5xl px-6 py-10">
      <header className="mb-8 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold" style={{ color: "var(--text-primary)" }}>
            Dashboard Omnichannel
          </h1>
          <p className="mt-1 text-sm" style={{ color: "var(--text-secondary)" }}>
            Fase 1 concluída — arquitetura de dados, mock realista e schema prontos. UI completa
            na Fase 2.
          </p>
        </div>
        <div className="flex flex-col items-end gap-2">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <span className="label-caps">Online</span>
              <StatusDot status={online.health.status ?? "demo"} />
            </div>
            <div className="flex items-center gap-2">
              <span className="label-caps">Física</span>
              <StatusDot status={fisica.health.status ?? "demo"} />
            </div>
          </div>
          {anyMock && <DemoBadge />}
        </div>
      </header>

      {/* KPIs de amostra (últimos 30 dias) */}
      <section
        className="grid grid-cols-1 gap-4 sm:grid-cols-3"
        aria-label="Indicadores dos últimos 30 dias"
      >
        <Card
          label="Receita total (30d)"
          value={formatBRL(revenueTotal)}
          sub={`Online ${formatBRLCompact(revenueOnline)} · Física ${formatBRLCompact(revenueFisica)}`}
          demo={anyMock}
        />
        <Card
          label="Pedidos (30d)"
          value={formatInt(totalOrders)}
          sub={`Online ${formatInt(onlineOrders.length)} · Física ${formatInt(fisicaOrders.length)}`}
          demo={anyMock}
        />
        <Card
          label="Ticket médio (30d)"
          value={totalOrders ? formatBRL(Math.round(revenueTotal / totalOrders)) : "—"}
          sub={`Participação física ${revenueTotal ? Math.round((revenueFisica / revenueTotal) * 100) : 0}%`}
          demo={anyMock}
        />
      </section>

      {/* Últimos pedidos */}
      <section className="mt-8">
        <h2 className="mb-3 text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
          Últimos pedidos
        </h2>
        <div
          className="overflow-hidden rounded-[16px] border"
          style={{ background: "var(--bg-surface)", borderColor: "var(--border)" }}
        >
          {recent.map((o, i) => (
            <div
              key={o.id}
              className="flex items-center justify-between px-6 py-3"
              style={{ borderTop: i === 0 ? "none" : "1px solid var(--border)" }}
            >
              <div className="flex items-center gap-3">
                <span
                  className="flex h-8 w-8 items-center justify-center rounded-full text-xs font-semibold"
                  style={{ background: "var(--accent-soft)", color: "var(--accent-bright)" }}
                >
                  {(o.customer.name ?? "?").charAt(0).toUpperCase()}
                </span>
                <div>
                  <div className="text-sm" style={{ color: "var(--text-primary)" }}>
                    {o.customer.name ?? "Cliente não identificado"}
                  </div>
                  <div className="text-xs" style={{ color: "var(--text-muted)" }}>
                    {o.channel === "online" ? "Loja online" : "Loja física"} ·{" "}
                    {o.attribution.channelGroup} · {formatRelative(o.createdAt)}
                  </div>
                </div>
              </div>
              <span className="font-mono text-sm" style={{ color: "var(--text-primary)" }}>
                {formatBRL(o.total)}
              </span>
            </div>
          ))}
        </div>
      </section>

      <footer className="mt-10 text-xs" style={{ color: "var(--text-muted)" }}>
        {online.health.message} · {fisica.health.message}
      </footer>
    </main>
  );
}

function Card({
  label,
  value,
  sub,
  demo,
}: {
  label: string;
  value: string;
  sub: string;
  demo: boolean;
}) {
  return (
    <div
      className="rounded-[16px] border p-6"
      style={{ background: "var(--bg-surface)", borderColor: "var(--border)" }}
    >
      <div className="flex items-center justify-between">
        <span className="label-caps">{label}</span>
        {demo && (
          <span
            className="rounded-[8px] px-1.5 py-0.5 text-[10px] font-medium"
            style={{ background: "var(--accent-soft)", color: "var(--accent-bright)" }}
          >
            demo
          </span>
        )}
      </div>
      <div className="mt-2 font-mono text-3xl font-semibold" style={{ color: "var(--text-primary)" }}>
        {value}
      </div>
      <div className="mt-2 text-xs" style={{ color: "var(--text-secondary)" }}>
        {sub}
      </div>
    </div>
  );
}
