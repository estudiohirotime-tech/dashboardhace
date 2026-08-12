"use client";

import { useMemo, useState } from "react";
import { AlertTriangle } from "lucide-react";
import { Card, CardTitle, DemoBadge, Badge, Skeleton } from "@/components/ui/primitives";
import { EmptyState, ErrorState } from "@/components/ui/states";
import { useFunnel, useAttribution } from "@/hooks/use-analytics";
import type { FunnelSnapshot } from "@/lib/data-sources/types";
import { formatInt, formatPercent } from "@/lib/format";

type ChannelOpt = "all" | "online" | "fisica";

function selectStyle(): React.CSSProperties {
  return {
    background: "var(--bg-inset)",
    borderColor: "var(--border-strong)",
    color: "var(--text-primary)",
  };
}

function MiniFunnel({ snapshot, title }: { snapshot?: FunnelSnapshot; title: string }) {
  const stages = snapshot?.stages ?? [];
  return (
    <div className="flex-1">
      <div className="mb-2 label-caps">{title}</div>
      <div className="flex flex-col gap-1.5">
        {stages.map((s) => (
          <div key={s.key} className="flex items-center gap-2">
            <div className="w-32 shrink-0 truncate text-xs" style={{ color: "var(--text-secondary)" }}>
              {s.label}
            </div>
            <div className="h-6 flex-1 overflow-hidden rounded-[6px]" style={{ background: "var(--bg-inset)" }}>
              <div
                className="h-full rounded-[6px]"
                style={{
                  width: `${Math.max(3, s.conversionFromTop * 100)}%`,
                  background: s.isBottleneck ? "var(--highlight-gradient)" : "var(--accent-soft)",
                }}
              />
            </div>
            <div className="w-16 shrink-0 text-right font-mono text-xs" style={{ color: "var(--text-muted)" }}>
              {formatInt(s.count)}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function FunnelDetailed() {
  const [channel, setChannel] = useState<ChannelOpt>("all");
  const [campaign, setCampaign] = useState<string>("");

  const attribution = useAttribution();
  const campaigns = useMemo(() => {
    const set = new Set<string>();
    for (const r of attribution.data?.rows ?? []) {
      if (r.utmCampaign) set.add(r.utmCampaign);
    }
    return Array.from(set).sort();
  }, [attribution.data]);

  const main = useFunnel({
    channel,
    utmCampaign: campaign || undefined,
  });
  const baseline = useFunnel({ channel });

  const snap = main.data;
  const stages = snap?.stages ?? [];
  const bottleneck = stages.find((s) => s.isBottleneck);

  return (
    <div className="space-y-4">
      {/* Filtros */}
      <Card className="flex flex-wrap items-end gap-4">
        <div className="flex flex-col gap-1">
          <label className="label-caps">Canal</label>
          <select
            value={channel}
            onChange={(e) => setChannel(e.target.value as ChannelOpt)}
            className="rounded-[10px] border px-3 py-2 text-sm"
            style={selectStyle()}
          >
            <option value="all">Todos</option>
            <option value="online">Loja online</option>
            <option value="fisica">Loja física</option>
          </select>
        </div>
        <div className="flex flex-col gap-1">
          <label className="label-caps">Campanha</label>
          <select
            value={campaign}
            onChange={(e) => setCampaign(e.target.value)}
            className="min-w-[220px] rounded-[10px] border px-3 py-2 text-sm"
            style={selectStyle()}
          >
            <option value="">Todas as campanhas</option>
            {campaigns.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>
        {snap?.isMock && (
          <div className="ml-auto">
            <DemoBadge />
          </div>
        )}
      </Card>

      {/* Card de gargalo — único uso do gradiente nesta tela */}
      {bottleneck && (
        <Card highlight className="flex items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wider opacity-90">
              <AlertTriangle size={14} /> Maior gargalo
            </div>
            <div className="mt-1 text-2xl font-semibold">{bottleneck.label}</div>
            <div className="mt-1 text-sm opacity-90">
              Perda de {formatPercent(1 - bottleneck.conversionFromPrevious)} em relação à etapa
              anterior · {formatInt(bottleneck.dropOff)} pessoas
            </div>
          </div>
          <div className="text-right">
            <div className="font-mono text-4xl font-semibold">
              {formatPercent(bottleneck.conversionFromPrevious)}
            </div>
            <div className="text-xs opacity-90">taxa de conversão desta etapa</div>
          </div>
        </Card>
      )}

      {/* Tabela de etapas com métricas completas */}
      <Card>
        <div className="mb-4 flex items-center gap-2">
          <CardTitle className="text-base">Etapas do funil</CardTitle>
          {snap?.isMock && <DemoBadge />}
        </div>
        {main.isLoading ? (
          <div className="space-y-2">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-11 w-full" />
            ))}
          </div>
        ) : main.isError ? (
          <ErrorState onRetry={() => main.refetch()} />
        ) : stages.every((s) => s.count === 0) ? (
          <EmptyState message="Sem dados de funil para este filtro. A loja física não possui etapas pré-compra." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-sm">
              <thead>
                <tr className="text-left" style={{ color: "var(--text-muted)" }}>
                  <th className="pb-2 font-medium">Etapa</th>
                  <th className="pb-2 text-right font-medium">Total</th>
                  <th className="pb-2 text-right font-medium">Conv. anterior</th>
                  <th className="pb-2 text-right font-medium">Conv. topo</th>
                  <th className="pb-2 text-right font-medium">Perda</th>
                </tr>
              </thead>
              <tbody>
                {stages.map((s) => (
                  <tr key={s.key} style={{ borderTop: "1px solid var(--border)" }}>
                    <td className="py-3">
                      <span className="flex items-center gap-2" style={{ color: "var(--text-primary)" }}>
                        {s.label}
                        {s.isBottleneck && <Badge tone="accent" className="text-[10px]">Maior gargalo</Badge>}
                      </span>
                    </td>
                    <td className="py-3 text-right font-mono" style={{ color: "var(--text-primary)" }}>
                      {formatInt(s.count)}
                    </td>
                    <td className="py-3 text-right font-mono" style={{ color: "var(--text-secondary)" }}>
                      {formatPercent(s.conversionFromPrevious)}
                    </td>
                    <td className="py-3 text-right font-mono" style={{ color: "var(--text-secondary)" }}>
                      {formatPercent(s.conversionFromTop)}
                    </td>
                    <td className="py-3 text-right font-mono" style={{ color: "var(--text-muted)" }}>
                      {formatInt(s.dropOff)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Comparação lado a lado */}
      <Card>
        <CardTitle className="mb-4 text-base">Comparação lado a lado</CardTitle>
        <div className="flex flex-col gap-6 md:flex-row">
          <MiniFunnel snapshot={main.data} title={campaign ? `Campanha: ${campaign}` : "Filtro atual"} />
          <div className="hidden w-px shrink-0 md:block" style={{ background: "var(--border)" }} />
          <MiniFunnel snapshot={baseline.data} title="Todas as campanhas" />
        </div>
      </Card>
    </div>
  );
}
