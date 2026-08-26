"use client";

import { useSearchParams } from "next/navigation";
import { useMemo } from "react";
import type { PeriodPreset } from "@/lib/period";

export interface UsePeriod {
  preset: PeriodPreset;
  from: string | null;
  to: string | null;
  /** query string dos parâmetros de período, para as chamadas de API */
  periodQuery: string;
}

export function usePeriod(): UsePeriod {
  const params = useSearchParams();
  const preset = (params.get("preset") as PeriodPreset | null) ?? "30d";
  const from = params.get("from");
  const to = params.get("to");

  const periodQuery = useMemo(() => {
    const sp = new URLSearchParams();
    sp.set("preset", preset);
    if (preset === "custom" && from && to) {
      sp.set("from", from);
      sp.set("to", to);
    }
    return sp.toString();
  }, [preset, from, to]);

  return { preset, from, to, periodQuery };
}
