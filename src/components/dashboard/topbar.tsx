"use client";

import { PeriodFilter } from "./period-filter";
import { DemoBadge } from "@/components/ui/primitives";
import { useSourceMeta } from "@/hooks/use-analytics";
import type { ConnectionStatus } from "@/lib/data-sources/types";

const STATUS_META: Record<ConnectionStatus, { color: string; label: string }> = {
  connected: { color: "var(--positive)", label: "conectado e sincronizado" },
  delayed: { color: "var(--warning)", label: "atraso na sincronização" },
  demo: { color: "var(--text-muted)", label: "modo demonstração" },
};

function SourceDot({ label, status }: { label: string; status: ConnectionStatus }) {
  const meta = STATUS_META[status];
  return (
    <span
      className="inline-flex items-center gap-1.5"
      title={`${label}: ${meta.label}`}
    >
      <span
        aria-hidden
        style={{ backgroundColor: meta.color, boxShadow: `0 0 0 3px color-mix(in srgb, ${meta.color} 18%, transparent)` }}
        className="inline-block h-2 w-2 rounded-full"
      />
      <span className="text-xs" style={{ color: "var(--text-secondary)" }}>
        {label}
      </span>
    </span>
  );
}

export function Topbar({ title }: { title: string }) {
  const { data } = useSourceMeta();
  const online = data?.online.status ?? "demo";
  const fisica = data?.fisica.status ?? "demo";
  const anyMock = data?.anyMock ?? true;

  return (
    <header
      className="sticky top-0 z-20 flex h-16 items-center justify-between gap-4 border-b px-4 backdrop-blur sm:px-6"
      style={{ background: "color-mix(in srgb, var(--bg-app) 82%, transparent)", borderColor: "var(--border)" }}
    >
      <h1 className="truncate text-lg font-semibold" style={{ color: "var(--text-primary)" }}>
        {title}
      </h1>
      <div className="flex items-center gap-3 sm:gap-4">
        <div className="hidden items-center gap-3 sm:flex">
          <SourceDot label="Online" status={online} />
          <SourceDot label="Física" status={fisica} />
        </div>
        {anyMock && <DemoBadge className="hidden sm:inline-flex" />}
        <PeriodFilter />
      </div>
    </header>
  );
}
