"use client";

import { Card, CardTitle, DemoBadge, Skeleton, Badge } from "@/components/ui/primitives";
import { EmptyState, ErrorState } from "@/components/ui/states";
import { useAttribution } from "@/hooks/use-analytics";
import { useAttributionModel } from "@/hooks/use-attribution-model";
import { channelGroupLabel, CHANNEL_GROUP_COLORS } from "@/lib/labels";
import { formatBRL, formatInt, formatPercent } from "@/lib/format";

export function AttributionTable() {
  const { data, isLoading, isError, refetch } = useAttribution();
  const model = useAttributionModel();
  const rows = data?.rows ?? [];

  return (
    <Card className="flex flex-col">
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <CardTitle className="text-base">Atribuição por UTM</CardTitle>
        <Badge tone="muted">{model === "first_click" ? "1º clique" : "Último clique"}</Badge>
        {data?.isMock && <DemoBadge />}
      </div>

      {isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="h-10 w-full" />
          ))}
        </div>
      ) : isError ? (
        <ErrorState onRetry={() => refetch()} />
      ) : rows.length === 0 ? (
        <EmptyState />
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] text-sm">
            <thead>
              <tr style={{ color: "var(--text-muted)" }} className="text-left">
                <th className="pb-2 font-medium">Canal / Origem</th>
                <th className="pb-2 font-medium">Campanha</th>
                <th className="pb-2 text-right font-medium">Pedidos</th>
                <th className="pb-2 text-right font-medium">Receita</th>
                <th className="pb-2 text-right font-medium">Ticket</th>
                <th className="pb-2 text-right font-medium">Part.</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r, i) => (
                <tr
                  key={`${r.channelGroup}-${r.utmSource}-${r.utmCampaign}-${i}`}
                  style={{ borderTop: "1px solid var(--border)" }}
                >
                  <td className="py-2.5">
                    <span className="flex items-center gap-2">
                      <span
                        className="inline-block h-2.5 w-2.5 rounded-[3px]"
                        style={{ background: CHANNEL_GROUP_COLORS[r.channelGroup] }}
                      />
                      <span style={{ color: "var(--text-primary)" }}>
                        {channelGroupLabel(r.channelGroup)}
                      </span>
                      {r.utmSource && (
                        <span className="text-xs" style={{ color: "var(--text-muted)" }}>
                          {r.utmSource}
                        </span>
                      )}
                    </span>
                  </td>
                  <td className="py-2.5" style={{ color: "var(--text-secondary)" }}>
                    {r.utmCampaign ?? "—"}
                  </td>
                  <td className="py-2.5 text-right font-mono" style={{ color: "var(--text-primary)" }}>
                    {formatInt(r.orders)}
                  </td>
                  <td className="py-2.5 text-right font-mono" style={{ color: "var(--text-primary)" }}>
                    {formatBRL(r.revenue)}
                  </td>
                  <td className="py-2.5 text-right font-mono" style={{ color: "var(--text-secondary)" }}>
                    {formatBRL(r.averageTicket)}
                  </td>
                  <td className="py-2.5 text-right">
                    <Badge tone="muted" className="font-mono">
                      {formatPercent(r.revenueShare)}
                    </Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Card>
  );
}
