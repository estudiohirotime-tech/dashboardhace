"use client";

import { Card, CardTitle, DemoBadge, Skeleton } from "@/components/ui/primitives";
import { EmptyState, ErrorState } from "@/components/ui/states";
import { useIgAudience } from "@/hooks/use-ig";
import type { DemographicRow } from "@/lib/instagram/types";
import { formatInt, formatPercent } from "@/lib/format";

const SERIES = ["var(--series-1)", "var(--series-2)", "var(--series-3)", "var(--series-4)", "var(--series-5)", "var(--series-6)", "#818cf8", "#38bdf8"];

function Bars({ rows, limit = 8 }: { rows: DemographicRow[]; limit?: number }) {
  const top = rows.slice(0, limit);
  const max = top.reduce((m, r) => Math.max(m, r.share), 0) || 1;
  if (!top.length) return <EmptyState title="Sem dados de demografia" message="A demografia aparece quando a conta tem seguidores suficientes e a API libera o recorte." />;
  return (
    <div className="flex flex-col gap-2.5">
      {top.map((r, i) => (
        <div key={r.label} className="flex items-center gap-3">
          <div className="w-28 shrink-0 truncate text-sm" style={{ color: "var(--text-secondary)" }}>{r.label}</div>
          <div className="h-6 flex-1 overflow-hidden rounded-[6px]" style={{ background: "var(--bg-inset)" }}>
            <div className="h-full rounded-[6px]" style={{ width: `${Math.max(3, (r.share / max) * 100)}%`, background: SERIES[i % SERIES.length] }} />
          </div>
          <div className="w-24 shrink-0 text-right">
            <span className="font-mono text-xs" style={{ color: "var(--text-primary)" }}>{formatPercent(r.share)}</span>
            <span className="ml-1 font-mono text-[11px]" style={{ color: "var(--text-muted)" }}>{formatInt(r.value)}</span>
          </div>
        </div>
      ))}
    </div>
  );
}

function Block({ title, rows, isMock }: { title: string; rows: DemographicRow[]; isMock?: boolean }) {
  return (
    <Card className="flex flex-col">
      <div className="mb-4 flex items-center gap-2">
        <CardTitle className="text-base">{title}</CardTitle>
        {isMock && <DemoBadge />}
      </div>
      <Bars rows={rows} />
    </Card>
  );
}

export function AudiencePanel() {
  const { data, isLoading, isError, refetch } = useIgAudience();

  if (isError) return <ErrorState message="Não foi possível carregar a audiência." onRetry={() => refetch()} />;
  if (isLoading || !data) {
    return (
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-64 w-full" />)}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
      <Block title="Faixa etária" rows={data.byAge} isMock={data.isMock} />
      <Block title="Gênero" rows={data.byGender} isMock={data.isMock} />
      <Block title="Principais cidades" rows={data.byCity} isMock={data.isMock} />
      <Block title="Países" rows={data.byCountry} isMock={data.isMock} />
    </div>
  );
}
