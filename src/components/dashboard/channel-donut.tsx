"use client";

import { PieChart, Pie, Cell, ResponsiveContainer } from "recharts";
import { Card, CardTitle, DemoBadge, Skeleton } from "@/components/ui/primitives";
import { EmptyState, ErrorState } from "@/components/ui/states";
import { useChannelSplit } from "@/hooks/use-analytics";
import { channelGroupLabel, CHANNEL_GROUP_COLORS } from "@/lib/labels";
import { formatBRLCompact, formatPercent } from "@/lib/format";

export function ChannelDonut() {
  const { data, isLoading, isError, refetch } = useChannelSplit();
  const slices = data?.slices ?? [];

  return (
    <Card className="flex flex-col">
      <div className="mb-4 flex items-center gap-2">
        <CardTitle className="text-base">Origem das vendas</CardTitle>
        {data?.isMock && <DemoBadge />}
      </div>

      {isLoading ? (
        <Skeleton className="h-[220px] w-full" />
      ) : isError ? (
        <ErrorState onRetry={() => refetch()} />
      ) : slices.length === 0 ? (
        <EmptyState />
      ) : (
        <div className="flex flex-col items-center gap-4 sm:flex-row">
          <div className="relative h-[180px] w-[180px] shrink-0">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={slices}
                  dataKey="revenue"
                  nameKey="channelGroup"
                  innerRadius={58}
                  outerRadius={84}
                  paddingAngle={2}
                  stroke="none"
                >
                  {slices.map((s) => (
                    <Cell key={s.channelGroup} fill={CHANNEL_GROUP_COLORS[s.channelGroup]} />
                  ))}
                </Pie>
              </PieChart>
            </ResponsiveContainer>
            <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
              <span className="label-caps">Total</span>
              <span className="font-mono text-lg font-semibold" style={{ color: "var(--text-primary)" }}>
                {formatBRLCompact(data?.totalRevenue ?? 0)}
              </span>
            </div>
          </div>

          <ul className="flex-1 space-y-2">
            {slices.map((s) => (
              <li key={s.channelGroup} className="flex items-center justify-between gap-2 text-sm">
                <span className="flex items-center gap-2">
                  <span
                    className="inline-block h-2.5 w-2.5 rounded-[3px]"
                    style={{ background: CHANNEL_GROUP_COLORS[s.channelGroup] }}
                  />
                  <span style={{ color: "var(--text-secondary)" }}>
                    {channelGroupLabel(s.channelGroup)}
                  </span>
                </span>
                <span className="flex items-center gap-2">
                  <span className="font-mono" style={{ color: "var(--text-primary)" }}>
                    {formatBRLCompact(s.revenue)}
                  </span>
                  <span className="font-mono text-xs" style={{ color: "var(--text-muted)" }}>
                    {formatPercent(s.share)}
                  </span>
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </Card>
  );
}
