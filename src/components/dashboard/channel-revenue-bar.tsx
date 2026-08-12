"use client";

import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip, Cell } from "recharts";
import { Card, CardTitle, DemoBadge, Skeleton } from "@/components/ui/primitives";
import { EmptyState, ErrorState } from "@/components/ui/states";
import { useChannelSplit } from "@/hooks/use-analytics";
import { channelGroupLabel, CHANNEL_GROUP_COLORS } from "@/lib/labels";
import { formatBRL, formatBRLCompact } from "@/lib/format";

function BarTooltip({ active, payload }: any) {
  if (!active || !payload?.length) return null;
  const p = payload[0].payload;
  return (
    <div
      className="rounded-[10px] border px-3 py-2 text-xs"
      style={{ background: "var(--bg-elevated)", borderColor: "var(--border-strong)" }}
    >
      <div style={{ color: "var(--text-primary)" }}>{channelGroupLabel(p.channelGroup)}</div>
      <div className="font-mono" style={{ color: "var(--text-secondary)" }}>{formatBRL(p.revenue)}</div>
    </div>
  );
}

export function ChannelRevenueBar() {
  const { data, isLoading, isError, refetch } = useChannelSplit();
  const slices = (data?.slices ?? []).map((s) => ({ ...s, label: channelGroupLabel(s.channelGroup) }));

  return (
    <Card className="flex flex-col">
      <div className="mb-4 flex items-center gap-2">
        <CardTitle className="text-base">Receita por canal</CardTitle>
        {data?.isMock && <DemoBadge />}
      </div>

      {isLoading ? (
        <Skeleton className="h-[280px] w-full" />
      ) : isError ? (
        <ErrorState onRetry={() => refetch()} />
      ) : slices.length === 0 ? (
        <EmptyState />
      ) : (
        <ResponsiveContainer width="100%" height={40 + slices.length * 42}>
          <BarChart data={slices} layout="vertical" margin={{ left: 8, right: 16, top: 0, bottom: 0 }}>
            <XAxis type="number" hide />
            <YAxis
              type="category"
              dataKey="label"
              width={110}
              tick={{ fill: "var(--text-secondary)", fontSize: 12 }}
              tickLine={false}
              axisLine={false}
            />
            <Tooltip content={<BarTooltip />} cursor={{ fill: "var(--bg-inset)" }} />
            <Bar dataKey="revenue" radius={[0, 6, 6, 0]} barSize={20}>
              {slices.map((s) => (
                <Cell key={s.channelGroup} fill={CHANNEL_GROUP_COLORS[s.channelGroup]} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      )}
    </Card>
  );
}
