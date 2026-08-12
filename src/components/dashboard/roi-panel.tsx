"use client";

import { useState, useEffect } from "react";
import { Card, CardTitle, DemoBadge, Skeleton, Badge } from "@/components/ui/primitives";
import { useChannelSplit } from "@/hooks/use-analytics";
import { channelGroupLabel, CHANNEL_GROUP_COLORS } from "@/lib/labels";
import type { ChannelGroup } from "@/lib/data-sources/types";
import { formatBRL, formatDecimal, formatPercent } from "@/lib/format";

// Canais pagos onde faz sentido informar custo de mídia.
const PAID_GROUPS: ChannelGroup[] = ["paid_social", "paid_search", "email", "influencer"];
const STORAGE_KEY = "media_costs"; // { [group]: centavos }

function loadCosts(): Record<string, number> {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}");
  } catch {
    return {};
  }
}

export function RoiPanel() {
  const { data, isLoading } = useChannelSplit();
  const [costs, setCosts] = useState<Record<string, number>>({});

  useEffect(() => setCosts(loadCosts()), []);

  function setCost(group: ChannelGroup, reais: string) {
    const cents = Math.round((parseFloat(reais.replace(",", ".")) || 0) * 100);
    const next = { ...costs, [group]: cents };
    setCosts(next);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    } catch {
      /* ignore */
    }
  }

  const revenueByGroup = new Map<ChannelGroup, number>();
  for (const s of data?.slices ?? []) revenueByGroup.set(s.channelGroup, s.revenue);

  return (
    <Card className="flex flex-col">
      <div className="mb-1 flex items-center gap-2">
        <CardTitle className="text-base">ROI por canal</CardTitle>
        {data?.isMock && <DemoBadge />}
      </div>
      <p className="mb-4 text-sm" style={{ color: "var(--text-secondary)" }}>
        Informe o custo de mídia no período para ver ROAS e retorno. Os valores ficam salvos
        neste navegador.
      </p>

      {isLoading ? (
        <Skeleton className="h-40 w-full" />
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[560px] text-sm">
            <thead>
              <tr className="text-left" style={{ color: "var(--text-muted)" }}>
                <th className="pb-2 font-medium">Canal</th>
                <th className="pb-2 text-right font-medium">Receita</th>
                <th className="pb-2 text-right font-medium">Custo (R$)</th>
                <th className="pb-2 text-right font-medium">ROAS</th>
                <th className="pb-2 text-right font-medium">ROI</th>
              </tr>
            </thead>
            <tbody>
              {PAID_GROUPS.map((group) => {
                const revenue = revenueByGroup.get(group) ?? 0;
                const cost = costs[group] ?? 0;
                const roas = cost > 0 ? revenue / cost : null;
                const roi = cost > 0 ? (revenue - cost) / cost : null;
                return (
                  <tr key={group} style={{ borderTop: "1px solid var(--border)" }}>
                    <td className="py-2.5">
                      <span className="flex items-center gap-2" style={{ color: "var(--text-primary)" }}>
                        <span
                          className="inline-block h-2.5 w-2.5 rounded-[3px]"
                          style={{ background: CHANNEL_GROUP_COLORS[group] }}
                        />
                        {channelGroupLabel(group)}
                      </span>
                    </td>
                    <td className="py-2.5 text-right font-mono" style={{ color: "var(--text-primary)" }}>
                      {formatBRL(revenue)}
                    </td>
                    <td className="py-2.5 text-right">
                      <input
                        inputMode="decimal"
                        defaultValue={cost ? (cost / 100).toString() : ""}
                        onBlur={(e) => setCost(group, e.target.value)}
                        placeholder="0,00"
                        className="w-24 rounded-[8px] border px-2 py-1 text-right font-mono text-xs"
                        style={{ background: "var(--bg-inset)", borderColor: "var(--border-strong)", color: "var(--text-primary)" }}
                      />
                    </td>
                    <td className="py-2.5 text-right font-mono" style={{ color: "var(--text-secondary)" }}>
                      {roas != null ? `${formatDecimal(roas, 2)}x` : "—"}
                    </td>
                    <td className="py-2.5 text-right">
                      {roi != null ? (
                        <Badge tone={roi >= 0 ? "positive" : "negative"} className="font-mono">
                          {formatPercent(roi)}
                        </Badge>
                      ) : (
                        <span style={{ color: "var(--text-muted)" }}>—</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </Card>
  );
}
