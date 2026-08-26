"use client";

import { ArrowDownRight, ArrowUpRight, Users, Eye, Heart, Play } from "lucide-react";
import { Card, DemoBadge, Skeleton } from "@/components/ui/primitives";
import { ErrorState } from "@/components/ui/states";
import { useIgOverview } from "@/hooks/use-ig";
import type { Overview, KpiValue } from "@/lib/instagram/types";
import { formatInt, formatNumberCompact, formatPercent, formatDelta } from "@/lib/format";

interface Def {
  label: string;
  icon: typeof Users;
  pick: (o: Overview) => KpiValue;
  format: (v: number) => string;
  sub?: (o: Overview) => string;
}

const KPIS: Def[] = [
  {
    label: "Seguidores",
    icon: Users,
    pick: (o) => o.followers,
    format: (v) => formatInt(v),
    sub: (o) => `${o.netFollowers.value >= 0 ? "+" : ""}${formatInt(o.netFollowers.value)} no período`,
  },
  { label: "Alcance", icon: Eye, pick: (o) => o.reach, format: (v) => formatNumberCompact(v) },
  { label: "Engajamento", icon: Heart, pick: (o) => o.engagementRate, format: (v) => formatPercent(v) },
  { label: "Visualizações", icon: Play, pick: (o) => o.views, format: (v) => formatNumberCompact(v) },
];

function Delta({ value }: { value: number }) {
  const positive = value >= 0;
  const Icon = positive ? ArrowUpRight : ArrowDownRight;
  return (
    <span className="inline-flex items-center gap-1 text-xs font-medium" style={{ color: positive ? "var(--positive)" : "var(--negative)" }}>
      <Icon size={13} />
      {formatDelta(value)}
    </span>
  );
}

export function IgKpiRow() {
  const { data, isLoading, isError, refetch } = useIgOverview();
  if (isError) return <ErrorState message="Não foi possível carregar os indicadores." onRetry={() => refetch()} />;

  return (
    <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4" aria-label="Indicadores principais">
      {KPIS.map((kpi) => {
        const v = data ? kpi.pick(data) : null;
        return (
          <Card key={kpi.label} className="flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <span className="label-caps flex items-center gap-1.5">
                <kpi.icon size={13} style={{ color: "var(--accent-bright)" }} /> {kpi.label}
              </span>
              {data?.isMock && <DemoBadge />}
            </div>
            {isLoading || !v ? (
              <>
                <Skeleton className="h-9 w-28" />
                <Skeleton className="h-3 w-36" />
              </>
            ) : (
              <>
                <span className="font-mono text-[40px] font-semibold leading-none" style={{ color: "var(--text-primary)" }}>
                  {kpi.format(v.value)}
                </span>
                <div className="flex items-center gap-2">
                  <Delta value={v.delta} />
                  <span className="text-xs" style={{ color: "var(--text-muted)" }}>vs. período anterior</span>
                </div>
                {kpi.sub && data && (
                  <div className="border-t pt-2 text-xs" style={{ borderColor: "var(--border)", color: "var(--text-secondary)" }}>
                    {kpi.sub(data)}
                  </div>
                )}
              </>
            )}
          </Card>
        );
      })}
    </section>
  );
}
