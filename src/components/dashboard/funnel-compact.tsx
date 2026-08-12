"use client";

import { Card, CardTitle, DemoBadge, Badge, Skeleton } from "@/components/ui/primitives";
import { ErrorState } from "@/components/ui/states";
import { useFunnel } from "@/hooks/use-analytics";
import { formatInt, formatPercent } from "@/lib/format";

export function FunnelCompact() {
  const { data, isLoading, isError, refetch } = useFunnel();
  const stages = data?.stages ?? [];

  return (
    <Card className="flex flex-col">
      <div className="mb-4 flex items-center gap-2">
        <CardTitle className="text-base">Funil de conversão</CardTitle>
        {data?.isMock && <DemoBadge />}
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-9 w-full" />
          ))}
        </div>
      ) : isError ? (
        <ErrorState onRetry={() => refetch()} />
      ) : (
        <div className="flex flex-col gap-2.5">
          {stages.map((s) => (
            <div key={s.key} className="flex items-center gap-3">
              <div className="w-36 shrink-0 text-sm" style={{ color: "var(--text-secondary)" }}>
                {s.label}
              </div>
              <div className="relative h-8 flex-1 overflow-hidden rounded-[8px]" style={{ background: "var(--bg-inset)" }}>
                <div
                  className="flex h-full items-center rounded-[8px] px-2"
                  style={{
                    width: `${Math.max(4, s.conversionFromTop * 100)}%`,
                    background: s.isBottleneck ? "var(--highlight-gradient)" : "var(--accent-soft)",
                    transition: "width 300ms ease",
                  }}
                >
                  <span
                    className="font-mono text-xs font-semibold"
                    style={{ color: s.isBottleneck ? "#fff" : "var(--accent-bright)" }}
                  >
                    {formatInt(s.count)}
                  </span>
                </div>
              </div>
              <div className="w-28 shrink-0 text-right">
                <span className="font-mono text-xs" style={{ color: "var(--text-muted)" }}>
                  {formatPercent(s.conversionFromPrevious)}
                </span>
                {s.isBottleneck && (
                  <Badge tone="accent" className="ml-1 text-[10px]">
                    Maior gargalo
                  </Badge>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}
