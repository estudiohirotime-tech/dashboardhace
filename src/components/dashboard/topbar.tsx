"use client";

import { Instagram } from "lucide-react";
import { PeriodFilter } from "./period-filter";
import { DemoBadge } from "@/components/ui/primitives";
import { useIgMeta } from "@/hooks/use-ig";
import type { ConnectionStatus } from "@/lib/instagram/types";

const STATUS: Record<ConnectionStatus, { color: string; label: string }> = {
  connected: { color: "var(--positive)", label: "conectado" },
  delayed: { color: "var(--warning)", label: "atraso na sincronização" },
  demo: { color: "var(--text-muted)", label: "modo demonstração" },
};

export function Topbar({ title }: { title: string }) {
  const { data } = useIgMeta();
  const status = data?.status ?? "demo";
  const meta = STATUS[status];
  const handle = data?.username ? `@${data.username}` : "Instagram";

  return (
    <header
      className="sticky top-0 z-20 flex h-16 items-center justify-between gap-4 border-b px-4 backdrop-blur sm:px-6"
      style={{ background: "color-mix(in srgb, var(--bg-app) 82%, transparent)", borderColor: "var(--border)" }}
    >
      <h1 className="truncate text-lg font-semibold" style={{ color: "var(--text-primary)" }}>
        {title}
      </h1>
      <div className="flex items-center gap-3 sm:gap-4">
        <span className="hidden items-center gap-1.5 sm:inline-flex" title={`${handle}: ${meta.label}`}>
          <Instagram size={15} style={{ color: "var(--accent-bright)" }} />
          <span
            aria-hidden
            className="inline-block h-2 w-2 rounded-full"
            style={{ backgroundColor: meta.color, boxShadow: `0 0 0 3px color-mix(in srgb, ${meta.color} 18%, transparent)` }}
          />
          <span className="text-xs" style={{ color: "var(--text-secondary)" }}>{handle}</span>
        </span>
        {data?.isMock && <DemoBadge className="hidden sm:inline-flex" />}
        <PeriodFilter />
      </div>
    </header>
  );
}
