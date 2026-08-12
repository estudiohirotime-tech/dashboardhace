"use client";

import { ArrowDownRight, ArrowUpRight } from "lucide-react";
import { Card, DemoBadge, Skeleton } from "@/components/ui/primitives";
import { ErrorState } from "@/components/ui/states";
import { useOverview } from "@/hooks/use-analytics";
import type { KpiValue } from "@/lib/services/analytics";
import { formatBRL, formatBRLCompact, formatInt, formatDelta, formatPercent } from "@/lib/format";

interface KpiDef {
  label: string;
  format: (v: number) => string;
  splitFormat: (v: number) => string;
  pick: (o: NonNullable<ReturnType<typeof useOverview>["data"]>) => KpiValue;
}

const KPIS: KpiDef[] = [
  {
    label: "Receita total",
    format: formatBRL,
    splitFormat: formatBRLCompact,
    pick: (o) => o.revenue,
  },
  {
    label: "Pedidos",
    format: formatInt,
    splitFormat: formatInt,
    pick: (o) => o.orders,
  },
  {
    label: "Ticket médio",
    format: formatBRL,
    splitFormat: formatBRLCompact,
    pick: (o) => o.averageTicket,
  },
  {
    label: "Taxa de conversão",
    format: (v) => formatPercent(v),
    splitFormat: (v) => formatPercent(v),
    pick: (o) => o.conversion,
  },
];

function Delta({ value }: { value: number }) {
  const positive = value >= 0;
  const color = positive ? "var(--positive)" : "var(--negative)";
  const Icon = positive ? ArrowUpRight : ArrowDownRight;
  return (
    <span className="inline-flex items-center gap-1 text-xs font-medium" style={{ color }}>
      <Icon size={13} />
      {formatDelta(value)}
    </span>
  );
}

export function KpiRow() {
  const { data, isLoading, isError, refetch } = useOverview();

  if (isError) {
    return <ErrorState message="Não foi possível carregar os indicadores." onRetry={() => refetch()} />;
  }

  return (
    <section
      className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4"
      aria-label="Indicadores principais"
    >
      {KPIS.map((kpi) => {
        const v = data ? kpi.pick(data) : null;
        return (
          <Card key={kpi.label} className="flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <span className="label-caps">{kpi.label}</span>
              {data?.isMock && <DemoBadge />}
            </div>
            {isLoading || !v ? (
              <>
                <Skeleton className="h-9 w-32" />
                <Skeleton className="h-3 w-40" />
              </>
            ) : (
              <>
                <div className="flex items-baseline gap-2">
                  <span
                    className="font-mono text-[40px] font-semibold leading-none"
                    style={{ color: "var(--text-primary)" }}
                  >
                    {kpi.format(v.value)}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <Delta value={v.delta} />
                  <span className="text-xs" style={{ color: "var(--text-muted)" }}>
                    vs. período anterior
                  </span>
                </div>
                <div
                  className="mt-1 flex items-center gap-3 border-t pt-2 text-xs"
                  style={{ borderColor: "var(--border)", color: "var(--text-secondary)" }}
                >
                  <span>
                    Online <span className="font-mono" style={{ color: "var(--text-primary)" }}>{kpi.splitFormat(v.online)}</span>
                  </span>
                  <span aria-hidden style={{ color: "var(--border-strong)" }}>·</span>
                  <span>
                    Física <span className="font-mono" style={{ color: "var(--text-primary)" }}>{kpi.splitFormat(v.fisica)}</span>
                  </span>
                </div>
              </>
            )}
          </Card>
        );
      })}
    </section>
  );
}
