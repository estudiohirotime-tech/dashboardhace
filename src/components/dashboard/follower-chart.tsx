"use client";

import { useState } from "react";
import { Area, AreaChart, ResponsiveContainer, Tooltip, XAxis, YAxis, CartesianGrid } from "recharts";
import { Card, CardTitle, DemoBadge, Skeleton } from "@/components/ui/primitives";
import { EmptyState, ErrorState } from "@/components/ui/states";
import { useIgFollowers } from "@/hooks/use-ig";
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
  const p = payload[0].payload;
  return (
    <div className="rounded-[10px] border px-3 py-2 text-xs" style={{ background: "var(--bg-elevated)", borderColor: "var(--border-strong)" }}>
      <div className="mb-1 font-medium" style={{ color: "var(--text-primary)" }}>{label}</div>
      <div style={{ color: "var(--series-1)" }}>Seguidores: {formatInt(p.followers)}</div>
      <div className="font-mono" style={{ color: p.netChange >= 0 ? "var(--positive)" : "var(--negative)" }}>
        {p.netChange >= 0 ? "+" : ""}{formatInt(p.netChange)} no período
      </div>
    </div>
  );
}

export function FollowerChart() {
  const [gran, setGran] = useState<Granularity>("day");
  const { data, isLoading, isError, refetch } = useIgFollowers(gran);
  const points = data?.points.map((p) => ({ ...p, label: labelFor(p.bucket, gran) })) ?? [];

  const min = points.length ? Math.min(...points.map((p) => p.followers)) : 0;
  const max = points.length ? Math.max(...points.map((p) => p.followers)) : 0;
  const pad = Math.max(50, Math.round((max - min) * 0.15));

  return (
    <Card className="flex flex-col">
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <CardTitle className="text-base">Crescimento de seguidores</CardTitle>
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
              <linearGradient id="gFollowers" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="var(--series-1)" stopOpacity={0.5} />
                <stop offset="100%" stopColor="var(--series-1)" stopOpacity={0.04} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
            <XAxis dataKey="label" tick={{ fill: "var(--text-muted)", fontSize: 11 }} tickLine={false} axisLine={{ stroke: "var(--border)" }} minTickGap={24} />
            <YAxis
              domain={[Math.max(0, min - pad), max + pad]}
              tick={{ fill: "var(--text-muted)", fontSize: 11 }}
              tickLine={false}
              axisLine={false}
              width={52}
              tickFormatter={(v) => formatNumberCompact(v)}
            />
            <Tooltip content={<ChartTooltip />} />
            <Area type="monotone" dataKey="followers" stroke="var(--series-1)" fill="url(#gFollowers)" strokeWidth={2} />
          </AreaChart>
        </ResponsiveContainer>
      )}
    </Card>
  );
}
