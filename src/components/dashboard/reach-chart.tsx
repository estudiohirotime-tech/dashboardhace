"use client";

import { useState } from "react";
import { Area, AreaChart, ResponsiveContainer, Tooltip, XAxis, YAxis, CartesianGrid } from "recharts";
import { Card, CardTitle, DemoBadge, Skeleton } from "@/components/ui/primitives";
import { EmptyState, ErrorState } from "@/components/ui/states";
import { useIgReach } from "@/hooks/use-ig";
import type { Granularity } from "@/lib/instagram/types";
import { formatInt, formatNumberCompact } from "@/lib/format";

const GRAN: { key: Granularity; label: string }[] = [
  { key: "day", label: "Dia" },
  { key: "week", label: "Semana" },
  { key: "month", label: "Mês" },
];

function labelFor(bucket: string, g: Granularity): string {
  const [y, m, d] = bucket.split("-");
  if (g === "month") return `${m}/${y}`;
  return `${d}/${m}`;
}

function ChartTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  const reach = payload.find((p: any) => p.dataKey === "reach")?.value ?? 0;
  const views = payload.find((p: any) => p.dataKey === "views")?.value ?? 0;
  return (
    <div className="rounded-[10px] border px-3 py-2 text-xs" style={{ background: "var(--bg-elevated)", borderColor: "var(--border-strong)" }}>
      <div className="mb-1 font-medium" style={{ color: "var(--text-primary)" }}>{label}</div>
      <div style={{ color: "var(--series-1)" }}>Alcance: {formatInt(reach)}</div>
      <div style={{ color: "var(--series-4)" }}>Visualizações: {formatInt(views)}</div>
    </div>
  );
}

export function ReachChart() {
  const [gran, setGran] = useState<Granularity>("day");
  const { data, isLoading, isError, refetch } = useIgReach(gran);
  const points = data?.points.map((p) => ({ ...p, label: labelFor(p.bucket, gran) })) ?? [];

  return (
    <Card className="flex flex-col">
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <CardTitle className="text-base">Alcance e visualizações</CardTitle>
          {data?.isMock && <DemoBadge />}
        </div>
        <div className="flex rounded-[10px] border p-0.5" style={{ borderColor: "var(--border)" }}>
          {GRAN.map((g) => (
            <button
              key={g.key}
              onClick={() => setGran(g.key)}
              className="rounded-[8px] px-2.5 py-1 text-xs font-medium"
              style={{ background: gran === g.key ? "var(--accent-soft)" : "transparent", color: gran === g.key ? "var(--accent-bright)" : "var(--text-muted)" }}
            >
              {g.label}
            </button>
          ))}
        </div>
      </div>

      {isLoading ? (
        <Skeleton className="h-[260px] w-full" />
      ) : isError ? (
        <ErrorState onRetry={() => refetch()} />
      ) : points.length === 0 ? (
        <EmptyState />
      ) : (
        <ResponsiveContainer width="100%" height={260}>
          <AreaChart data={points} margin={{ top: 8, right: 8, left: 8, bottom: 0 }}>
            <defs>
              <linearGradient id="gReach" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="var(--series-1)" stopOpacity={0.45} />
                <stop offset="100%" stopColor="var(--series-1)" stopOpacity={0.03} />
              </linearGradient>
              <linearGradient id="gViews" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="var(--series-4)" stopOpacity={0.4} />
                <stop offset="100%" stopColor="var(--series-4)" stopOpacity={0.03} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
            <XAxis dataKey="label" tick={{ fill: "var(--text-muted)", fontSize: 11 }} tickLine={false} axisLine={{ stroke: "var(--border)" }} minTickGap={24} />
            <YAxis tick={{ fill: "var(--text-muted)", fontSize: 11 }} tickLine={false} axisLine={false} width={52} tickFormatter={(v) => formatNumberCompact(v)} />
            <Tooltip content={<ChartTooltip />} />
            <Area type="monotone" dataKey="views" stroke="var(--series-4)" fill="url(#gViews)" strokeWidth={2} />
            <Area type="monotone" dataKey="reach" stroke="var(--series-1)" fill="url(#gReach)" strokeWidth={2} />
          </AreaChart>
        </ResponsiveContainer>
      )}
    </Card>
  );
}
