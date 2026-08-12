"use client";

import { Radio } from "lucide-react";
import { DemoBadge, Skeleton, Badge } from "@/components/ui/primitives";
import { EmptyState } from "@/components/ui/states";
import { useRecentOrders } from "@/hooks/use-analytics";
import { channelGroupLabel } from "@/lib/labels";
import { formatBRL } from "@/lib/format";
import { formatRelative } from "@/lib/date";

export function RecentOrdersPanel() {
  const { data, isLoading, isFetching } = useRecentOrders();
  const orders = data?.orders ?? [];

  return (
    <div className="flex h-full flex-col">
      <div
        className="flex items-center justify-between border-b px-4 py-4"
        style={{ borderColor: "var(--border)" }}
      >
        <div className="flex items-center gap-2">
          <span className="relative flex h-2 w-2">
            <span
              className="absolute inline-flex h-full w-full rounded-full opacity-75"
              style={{ background: "var(--positive)", animation: isFetching ? "ping 1s ease infinite" : "none" }}
            />
            <span className="relative inline-flex h-2 w-2 rounded-full" style={{ background: "var(--positive)" }} />
          </span>
          <span className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
            Pedidos em tempo real
          </span>
        </div>
        <Radio size={15} style={{ color: "var(--text-muted)" }} />
      </div>

      {data?.isMock && (
        <div className="px-4 pt-3">
          <DemoBadge />
        </div>
      )}

      <div className="flex-1 space-y-1 overflow-y-auto p-3">
        {isLoading ? (
          Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-14 w-full" />)
        ) : orders.length === 0 ? (
          <EmptyState message="Nenhum pedido recente neste período." />
        ) : (
          orders.map((o) => (
            <div
              key={o.id}
              className="flex items-center gap-3 rounded-[12px] px-3 py-2.5"
              style={{ background: "var(--bg-inset)" }}
            >
              <span
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xs font-semibold"
                style={{ background: "var(--accent-soft)", color: "var(--accent-bright)" }}
              >
                {(o.customer.name ?? "?").charAt(0).toUpperCase()}
              </span>
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm" style={{ color: "var(--text-primary)" }}>
                  {o.customer.name ?? "Cliente não identificado"}
                </div>
                <div className="flex items-center gap-1.5 text-[11px]" style={{ color: "var(--text-muted)" }}>
                  <Badge tone={o.channel === "online" ? "accent" : "muted"} className="px-1.5 py-0 text-[10px]">
                    {o.channel === "online" ? "Online" : "Física"}
                  </Badge>
                  <span className="truncate">{channelGroupLabel(o.attribution.channelGroup)}</span>
                  <span>·</span>
                  <span>{formatRelative(o.createdAt)}</span>
                </div>
              </div>
              <span className="shrink-0 font-mono text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
                {formatBRL(o.total)}
              </span>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
