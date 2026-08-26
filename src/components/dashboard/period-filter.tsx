"use client";

import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { useState, useRef, useEffect } from "react";
import { Calendar, ChevronDown } from "lucide-react";
import { PRESET_LABELS, type PeriodPreset } from "@/lib/period";
import { cn } from "@/lib/utils";

const PRESETS: PeriodPreset[] = [
  "today",
  "yesterday",
  "7d",
  "30d",
  "this_month",
  "last_month",
  "custom",
];

export function PeriodFilter() {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const current = (params.get("preset") as PeriodPreset | null) ?? "30d";
  const [open, setOpen] = useState(false);
  const [customFrom, setCustomFrom] = useState(params.get("from") ?? "");
  const [customTo, setCustomTo] = useState(params.get("to") ?? "");
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  function apply(preset: PeriodPreset, from?: string, to?: string) {
    const sp = new URLSearchParams(params.toString());
    sp.set("preset", preset);
    if (preset === "custom" && from && to) {
      sp.set("from", from);
      sp.set("to", to);
    } else {
      sp.delete("from");
      sp.delete("to");
    }
    router.push(`${pathname}?${sp.toString()}`);
    if (preset !== "custom") setOpen(false);
  }

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-2 rounded-[10px] border px-3 py-2 text-sm"
        style={{
          background: "var(--bg-inset)",
          borderColor: "var(--border-strong)",
          color: "var(--text-primary)",
        }}
      >
        <Calendar size={15} style={{ color: "var(--accent-bright)" }} />
        <span>{PRESET_LABELS[current]}</span>
        <ChevronDown size={15} style={{ color: "var(--text-muted)" }} />
      </button>

      {open && (
        <div
          className="absolute right-0 z-30 mt-2 w-64 rounded-[12px] border p-2 shadow-xl"
          style={{ background: "var(--bg-elevated)", borderColor: "var(--border-strong)" }}
        >
          {PRESETS.map((p) => (
            <button
              key={p}
              onClick={() => (p === "custom" ? null : apply(p))}
              className={cn("flex w-full items-center rounded-[8px] px-3 py-2 text-left text-sm")}
              style={{
                background: current === p ? "var(--accent-soft)" : "transparent",
                color: current === p ? "var(--accent-bright)" : "var(--text-secondary)",
              }}
            >
              {PRESET_LABELS[p]}
            </button>
          ))}
          <div className="mt-2 flex flex-col gap-2 border-t p-2" style={{ borderColor: "var(--border)" }}>
            <label className="label-caps">Personalizado</label>
            <div className="flex items-center gap-2">
              <input
                type="date"
                value={customFrom}
                onChange={(e) => setCustomFrom(e.target.value)}
                className="w-full rounded-[8px] border px-2 py-1 text-xs"
                style={{ background: "var(--bg-inset)", borderColor: "var(--border-strong)", color: "var(--text-primary)" }}
              />
              <input
                type="date"
                value={customTo}
                onChange={(e) => setCustomTo(e.target.value)}
                className="w-full rounded-[8px] border px-2 py-1 text-xs"
                style={{ background: "var(--bg-inset)", borderColor: "var(--border-strong)", color: "var(--text-primary)" }}
              />
            </div>
            <button
              disabled={!customFrom || !customTo}
              onClick={() => apply("custom", customFrom, customTo)}
              className="rounded-[8px] px-3 py-1.5 text-xs font-medium disabled:opacity-40"
              style={{ background: "var(--accent)", color: "#fff" }}
            >
              Aplicar
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
