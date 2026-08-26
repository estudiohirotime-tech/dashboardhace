// -----------------------------------------------------------------------------
// Período global — presets, parsing a partir da URL e comparação com anterior.
// Datas internas em ISO (UTC); os limites de dia respeitam America/Sao_Paulo.
// -----------------------------------------------------------------------------

import { fromZonedTime, toZonedTime } from "date-fns-tz";
import type { DateRange } from "./data-sources/types";
import { APP_TZ } from "./date";

export type PeriodPreset =
  | "today"
  | "yesterday"
  | "7d"
  | "30d"
  | "this_month"
  | "last_month"
  | "custom";

export const PRESET_LABELS: Record<PeriodPreset, string> = {
  today: "Hoje",
  yesterday: "Ontem",
  "7d": "Últimos 7 dias",
  "30d": "Últimos 30 dias",
  this_month: "Este mês",
  last_month: "Mês passado",
  custom: "Personalizado",
};

/** Início do dia (00:00:00) em SP, retornado como ISO UTC. */
function startOfDaySP(d: Date): string {
  const zoned = toZonedTime(d, APP_TZ);
  zoned.setHours(0, 0, 0, 0);
  return fromZonedTime(zoned, APP_TZ).toISOString();
}

/** Fim do dia (23:59:59.999) em SP, retornado como ISO UTC. */
function endOfDaySP(d: Date): string {
  const zoned = toZonedTime(d, APP_TZ);
  zoned.setHours(23, 59, 59, 999);
  return fromZonedTime(zoned, APP_TZ).toISOString();
}

function addDays(d: Date, days: number): Date {
  return new Date(d.getTime() + days * 86400 * 1000);
}

/** Resolve um preset em um DateRange concreto (relativo a agora). */
export function resolvePreset(preset: PeriodPreset, now: Date = new Date()): DateRange {
  const zonedNow = toZonedTime(now, APP_TZ);
  switch (preset) {
    case "today":
      return { from: startOfDaySP(now), to: endOfDaySP(now) };
    case "yesterday": {
      const y = addDays(now, -1);
      return { from: startOfDaySP(y), to: endOfDaySP(y) };
    }
    case "7d":
      return { from: startOfDaySP(addDays(now, -6)), to: endOfDaySP(now) };
    case "30d":
      return { from: startOfDaySP(addDays(now, -29)), to: endOfDaySP(now) };
    case "this_month": {
      const first = new Date(zonedNow.getFullYear(), zonedNow.getMonth(), 1);
      return { from: startOfDaySP(first), to: endOfDaySP(now) };
    }
    case "last_month": {
      const first = new Date(zonedNow.getFullYear(), zonedNow.getMonth() - 1, 1);
      const last = new Date(zonedNow.getFullYear(), zonedNow.getMonth(), 0);
      return { from: startOfDaySP(first), to: endOfDaySP(last) };
    }
    default:
      return { from: startOfDaySP(addDays(now, -29)), to: endOfDaySP(now) };
  }
}

export interface ParsedPeriod {
  preset: PeriodPreset;
  range: DateRange;
}

/** Lê o período dos search params (?preset=... ou ?from=&to=). */
export function parsePeriodParams(params: {
  preset?: string | null;
  from?: string | null;
  to?: string | null;
}): ParsedPeriod {
  const { preset, from, to } = params;
  if (preset === "custom" && from && to) {
    return {
      preset: "custom",
      range: { from: startOfDaySP(new Date(from)), to: endOfDaySP(new Date(to)) },
    };
  }
  const valid: PeriodPreset[] = [
    "today",
    "yesterday",
    "7d",
    "30d",
    "this_month",
    "last_month",
  ];
  const chosen = (valid.includes(preset as PeriodPreset) ? preset : "30d") as PeriodPreset;
  return { preset: chosen, range: resolvePreset(chosen) };
}

/** Intervalo imediatamente anterior, de mesma duração (para comparação). */
export function previousPeriod(range: DateRange): DateRange {
  const duration = new Date(range.to).getTime() - new Date(range.from).getTime();
  const to = new Date(new Date(range.from).getTime() - 1);
  const from = new Date(to.getTime() - duration);
  return { from: from.toISOString(), to: to.toISOString() };
}
