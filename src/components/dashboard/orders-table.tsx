"use client";

import { useMemo, useState } from "react";
import { Search, Download, ChevronLeft, ChevronRight } from "lucide-react";
import { Card, DemoBadge, Skeleton, Badge, Button } from "@/components/ui/primitives";
import { EmptyState, ErrorState } from "@/components/ui/states";
import { useOrders } from "@/hooks/use-analytics";
import { usePeriod } from "@/hooks/use-period";
import { channelGroupLabel, CHANNEL_LABELS, FINANCIAL_LABELS } from "@/lib/labels";
import type { FinancialStatus } from "@/lib/data-sources/types";
import { formatBRL, formatInt } from "@/lib/format";
import { formatDateTime } from "@/lib/date";

const PAGE_SIZE = 20;

const STATUS_TONE: Record<FinancialStatus, "positive" | "warning" | "negative" | "muted"> = {
  paid: "positive",
  pending: "warning",
  refunded: "negative",
  partially_refunded: "muted",
};

function selectStyle(): React.CSSProperties {
  return { background: "var(--bg-inset)", borderColor: "var(--border-strong)", color: "var(--text-primary)" };
}

export function OrdersTable() {
  const { periodQuery } = usePeriod();
  const [search, setSearch] = useState("");
  const [channel, setChannel] = useState("all");
  const [status, setStatus] = useState("");
  const [page, setPage] = useState(0);

  const { data, isLoading, isError, refetch } = useOrders({
    channel: channel !== "all" ? channel : undefined,
    financialStatus: status || undefined,
    search: search || undefined,
  });

  const orders = data?.orders ?? [];
  const pageCount = Math.max(1, Math.ceil(orders.length / PAGE_SIZE));
  const current = Math.min(page, pageCount - 1);
  const pageRows = useMemo(
    () => orders.slice(current * PAGE_SIZE, current * PAGE_SIZE + PAGE_SIZE),
    [orders, current],
  );

  const exportParams = new URLSearchParams(periodQuery);
  if (channel !== "all") exportParams.set("channel", channel);
  if (status) exportParams.set("financialStatus", status);
  if (search) exportParams.set("search", search);
  const exportUrl = `/api/export?${exportParams.toString()}`;

  return (
    <Card className="flex flex-col">
      {/* Controles */}
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: "var(--text-muted)" }} />
          <input
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(0);
            }}
            placeholder="Buscar por cliente, e-mail, pedido ou campanha"
            className="w-full rounded-[10px] border py-2 pl-9 pr-3 text-sm"
            style={selectStyle()}
          />
        </div>
        <select
          value={channel}
          onChange={(e) => { setChannel(e.target.value); setPage(0); }}
          className="rounded-[10px] border px-3 py-2 text-sm"
          style={selectStyle()}
        >
          <option value="all">Todos os canais</option>
          <option value="online">Loja online</option>
          <option value="fisica">Loja física</option>
        </select>
        <select
          value={status}
          onChange={(e) => { setStatus(e.target.value); setPage(0); }}
          className="rounded-[10px] border px-3 py-2 text-sm"
          style={selectStyle()}
        >
          <option value="">Todos os status</option>
          {Object.entries(FINANCIAL_LABELS).map(([k, v]) => (
            <option key={k} value={k}>{v}</option>
          ))}
        </select>
        <a href={exportUrl} download>
          <Button variant="primary">
            <Download size={15} /> Exportar CSV
          </Button>
        </a>
      </div>

      {data?.isMock && <div className="mb-3"><DemoBadge /></div>}

      {isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 10 }).map((_, i) => <Skeleton key={i} className="h-11 w-full" />)}
        </div>
      ) : isError ? (
        <ErrorState onRetry={() => refetch()} />
      ) : orders.length === 0 ? (
        <EmptyState message="Nenhum pedido encontrado. Ajuste os filtros ou amplie o período." />
      ) : (
        <>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[820px] text-sm">
              <thead>
                <tr className="text-left" style={{ color: "var(--text-muted)" }}>
                  <th className="pb-2 font-medium">Pedido</th>
                  <th className="pb-2 font-medium">Data</th>
                  <th className="pb-2 font-medium">Cliente</th>
                  <th className="pb-2 font-medium">Canal</th>
                  <th className="pb-2 font-medium">Origem</th>
                  <th className="pb-2 text-right font-medium">Itens</th>
                  <th className="pb-2 text-right font-medium">Total</th>
                  <th className="pb-2 text-right font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {pageRows.map((o) => (
                  <tr key={o.id} style={{ borderTop: "1px solid var(--border)" }}>
                    <td className="py-2.5 font-mono text-xs" style={{ color: "var(--text-muted)" }}>
                      {o.id.slice(-10)}
                    </td>
                    <td className="py-2.5" style={{ color: "var(--text-secondary)" }}>
                      {formatDateTime(o.createdAt)}
                    </td>
                    <td className="py-2.5" style={{ color: "var(--text-primary)" }}>
                      {o.customer.name ?? "—"}
                    </td>
                    <td className="py-2.5">
                      <Badge tone={o.channel === "online" ? "accent" : "muted"}>
                        {CHANNEL_LABELS[o.channel]}
                      </Badge>
                    </td>
                    <td className="py-2.5" style={{ color: "var(--text-secondary)" }}>
                      {channelGroupLabel(o.attribution.channelGroup)}
                    </td>
                    <td className="py-2.5 text-right font-mono" style={{ color: "var(--text-secondary)" }}>
                      {formatInt(o.itemsCount)}
                    </td>
                    <td className="py-2.5 text-right font-mono" style={{ color: "var(--text-primary)" }}>
                      {formatBRL(o.total)}
                    </td>
                    <td className="py-2.5 text-right">
                      <Badge tone={STATUS_TONE[o.financialStatus]}>{FINANCIAL_LABELS[o.financialStatus]}</Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Paginação */}
          <div className="mt-4 flex items-center justify-between">
            <span className="text-xs" style={{ color: "var(--text-muted)" }}>
              {formatInt(orders.length)} pedidos · página {current + 1} de {pageCount}
            </span>
            <div className="flex items-center gap-2">
              <Button variant="outline" disabled={current === 0} onClick={() => setPage(current - 1)}>
                <ChevronLeft size={15} />
              </Button>
              <Button variant="outline" disabled={current >= pageCount - 1} onClick={() => setPage(current + 1)}>
                <ChevronRight size={15} />
              </Button>
            </div>
          </div>
        </>
      )}
    </Card>
  );
}
