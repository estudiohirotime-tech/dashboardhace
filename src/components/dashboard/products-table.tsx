"use client";

import { Card, CardTitle, DemoBadge, Skeleton } from "@/components/ui/primitives";
import { EmptyState, ErrorState } from "@/components/ui/states";
import { useProducts } from "@/hooks/use-analytics";
import { formatBRL, formatInt } from "@/lib/format";

export function ProductsTable() {
  const { data, isLoading, isError, refetch } = useProducts();
  const rows = data?.rows ?? [];

  return (
    <Card className="flex flex-col">
      <div className="mb-4 flex items-center gap-2">
        <CardTitle className="text-base">Ranking de produtos</CardTitle>
        {data?.isMock && <DemoBadge />}
      </div>

      {isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 10 }).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}
        </div>
      ) : isError ? (
        <ErrorState onRetry={() => refetch()} />
      ) : rows.length === 0 ? (
        <EmptyState />
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] text-sm">
            <thead>
              <tr className="text-left" style={{ color: "var(--text-muted)" }}>
                <th className="pb-2 font-medium">#</th>
                <th className="pb-2 font-medium">Produto</th>
                <th className="pb-2 text-right font-medium">Unidades</th>
                <th className="pb-2 text-right font-medium">Pedidos</th>
                <th className="pb-2 text-right font-medium">Receita</th>
                <th className="pb-2 font-medium">Split online / física</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r, i) => {
                const total = r.revenueOnline + r.revenueFisica || 1;
                const onlinePct = (r.revenueOnline / total) * 100;
                return (
                  <tr key={r.productId} style={{ borderTop: "1px solid var(--border)" }}>
                    <td className="py-3 font-mono" style={{ color: "var(--text-muted)" }}>{i + 1}</td>
                    <td className="py-3" style={{ color: "var(--text-primary)" }}>{r.title}</td>
                    <td className="py-3 text-right font-mono" style={{ color: "var(--text-primary)" }}>
                      {formatInt(r.unitsSold)}
                    </td>
                    <td className="py-3 text-right font-mono" style={{ color: "var(--text-secondary)" }}>
                      {formatInt(r.orders)}
                    </td>
                    <td className="py-3 text-right font-mono" style={{ color: "var(--text-primary)" }}>
                      {formatBRL(r.revenue)}
                    </td>
                    <td className="py-3">
                      <div className="flex items-center gap-2">
                        <div className="h-2 w-28 overflow-hidden rounded-full" style={{ background: "var(--series-4)" }}>
                          <div
                            className="h-full rounded-full"
                            style={{ width: `${onlinePct}%`, background: "var(--series-1)" }}
                          />
                        </div>
                        <span className="font-mono text-xs" style={{ color: "var(--text-muted)" }}>
                          {Math.round(onlinePct)}% / {Math.round(100 - onlinePct)}%
                        </span>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          <div className="mt-3 flex items-center gap-4 text-xs" style={{ color: "var(--text-muted)" }}>
            <span className="flex items-center gap-1.5">
              <span className="inline-block h-2.5 w-2.5 rounded-[3px]" style={{ background: "var(--series-1)" }} /> Online
            </span>
            <span className="flex items-center gap-1.5">
              <span className="inline-block h-2.5 w-2.5 rounded-[3px]" style={{ background: "var(--series-4)" }} /> Física
            </span>
          </div>
        </div>
      )}
    </Card>
  );
}
