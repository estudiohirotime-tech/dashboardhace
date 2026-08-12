"use client";

import { UserPlus, Repeat, ShoppingCart, TrendingUp } from "lucide-react";
import { Card, DemoBadge, Skeleton } from "@/components/ui/primitives";
import { useCustomerStats } from "@/hooks/use-analytics";
import { formatInt, formatBRLCompact } from "@/lib/format";

export function CustomerCards() {
  const { data, isLoading } = useCustomerStats();

  const items = [
    { label: "Novos clientes", value: data ? formatInt(data.newCustomers) : "", icon: UserPlus, color: "var(--series-1)" },
    { label: "Clientes recorrentes", value: data ? formatInt(data.returningCustomers) : "", icon: Repeat, color: "var(--series-4)" },
    { label: "Checkouts abandonados", value: data ? formatInt(data.abandonedCheckouts) : "", icon: ShoppingCart, color: "var(--warning)" },
    { label: "Receita recuperada", value: data ? formatBRLCompact(data.recoveredRevenue) : "", icon: TrendingUp, color: "var(--positive)" },
  ];

  return (
    <Card className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <span className="label-caps">Clientes & carrinho</span>
        {data?.isMock && <DemoBadge />}
      </div>
      <div className="flex flex-col gap-2">
        {items.map((it) => (
          <div
            key={it.label}
            className="flex items-center justify-between rounded-[12px] px-3 py-2.5"
            style={{ background: "var(--bg-inset)" }}
          >
            <span className="flex items-center gap-2 text-sm" style={{ color: "var(--text-secondary)" }}>
              <it.icon size={16} style={{ color: it.color }} />
              {it.label}
            </span>
            {isLoading ? (
              <Skeleton className="h-4 w-12" />
            ) : (
              <span className="font-mono text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
                {it.value}
              </span>
            )}
          </div>
        ))}
      </div>
    </Card>
  );
}
