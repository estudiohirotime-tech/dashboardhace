"use client";

import { useState } from "react";
import {
  Area,
  AreaChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  CartesianGrid,
} from "recharts";
import { Card, CardTitle, DemoBadge, Skeleton } from "@/components/ui/primitives";
import { EmptyState, ErrorState } from "@/components/ui/states";
import { useTimeseries } from "@/hooks/use-analytics";
import type { Granularity } from "@/lib/services/analytics";
import { formatBRL, formatBRLCompact } from "@/lib/format";

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
  const online = payload.find((p: any) => p.dataKey === "online")?.value ?? 0;
  const fisica = payload.find((p: any) => p.dataKey === "fisica")?.value ?? 0;
  return (
    <div
      className="rounded-[10px] border px-3 py-2 text-xs"
      style={{ background: "var(--bg-elevated)", borderColor: "var(--border-strong)" }}
    >
      <div className="mb-1 font-medium" style={{ color: "var(--text-primary)" }}>{label}</div>
      <div style={{ color: "var(--series-1)" }}>Online: {formatBRL(online)}</div>
      <div style={{ color: "var(--series-4)" }}>Física: {formatBRL(fisica)}</div>
      <div className="mt-1 font-mono" style={{ color: "var(--text-secondary)" }}>
        Total: {formatBRL(online + fisica)}
      </div>
    </div>
  );
}

export function RevenueChart() {
  const [gran, setGran] = useState<Granularity>("day");
  const { data, isLoading, isError, refetch } = useTimeseries(gran);

  const points = data?.points.map((p) => ({ ...p, label: labelFor(p.bucket, gran) })) ?? [];

  return (
    <Card className="flex flex-col">
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <CardTitle className="text-base">Receita ao longo do tempo</CardTitle>
          {data?.isMock && <DemoBadge />}
        </div>
        <div className="flex rounded-[10px] border p-0.5" style={{ borderColor: "var(--border)" }}>
          {GRAN.map((g) => (
            <button
              key={g.key}
              onClick={() => setGran(g.key)}
              className="rounded-[8px] px-2.5 py-1 text-xs font-medium"
              style={{
                background: gran === g.key ? "var(--accent-soft)" : "transparent",
                color: gran === g.key ? "var(--accent-bright)" : "var(--text-muted)",
              }}
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
              <linearGradient id="gOnline" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="var(--series-1)" stopOpacity={0.5} />
                <stop offset="100%" stopColor="var(--series-1)" stopOpacity={0.04} />
              </linearGradient>
              <linearGradient id="gFisica" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="var(--series-4)" stopOpacity={0.5} />
                <stop offset="100%" stopColor="var(--series-4)" stopOpacity={0.04} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
            <XAxis
              dataKey="label"
              tick={{ fill: "var(--text-muted)", fontSize: 11 }}
              tickLine={false}
              axisLine={{ stroke: "var(--border)" }}
              minTickGap={20}
            />
            <YAxis
              tick={{ fill: "var(--text-muted)", fontSize: 11 }}
              tickLine={false}
              axisLine={false}
              width={64}
              tickFormatter={(v) => formatBRLCompact(v)}
            />
            <Tooltip content={<ChartTooltip />} />
            <Area
              type="monotone"
              dataKey="online"
              stackId="1"
              stroke="var(--series-1)"
              fill="url(#gOnline)"
              strokeWidth={2}
            />
            <Area
              type="monotone"
              dataKey="fisica"
              stackId="1"
              stroke="var(--series-4)"
              fill="url(#gFisica)"
              strokeWidth={2}
            />
          </AreaChart>
        </ResponsiveContainer>
      )}
    </Card>
  );
}
