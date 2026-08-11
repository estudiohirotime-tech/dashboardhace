// -----------------------------------------------------------------------------
// Datas — sempre no fuso America/Sao_Paulo na borda de apresentação.
// Internamente tudo trafega em ISO 8601 (UTC).
// -----------------------------------------------------------------------------

import { formatInTimeZone } from "date-fns-tz";
import type { DateRange } from "./data-sources/types";

export const APP_TZ = process.env.APP_TIMEZONE || "America/Sao_Paulo";

/** "11/08/2026" */
export function formatDate(iso: string): string {
  return formatInTimeZone(new Date(iso), APP_TZ, "dd/MM/yyyy");
}

/** "11/08/2026 20:34" */
export function formatDateTime(iso: string): string {
  return formatInTimeZone(new Date(iso), APP_TZ, "dd/MM/yyyy HH:mm");
}

/** "20:34" */
export function formatTime(iso: string): string {
  return formatInTimeZone(new Date(iso), APP_TZ, "HH:mm");
}

/** Tempo relativo em pt-BR: "agora", "há 3 min", "há 2 h", "há 4 d". */
export function formatRelative(iso: string, now: Date = new Date()): string {
  const diffMs = now.getTime() - new Date(iso).getTime();
  const sec = Math.round(diffMs / 1000);
  if (sec < 45) return "agora";
  const min = Math.round(sec / 60);
  if (min < 60) return `há ${min} min`;
  const hours = Math.round(min / 60);
  if (hours < 24) return `há ${hours} h`;
  const days = Math.round(hours / 24);
  if (days < 30) return `há ${days} d`;
  const months = Math.round(days / 30);
  return `há ${months} m`;
}

/** Chave de dia (YYYY-MM-DD) no fuso do app, para agrupar séries temporais. */
export function dayKey(iso: string): string {
  return formatInTimeZone(new Date(iso), APP_TZ, "yyyy-MM-dd");
}

/** Rótulo curto de dia para eixo de gráfico: "11/08". */
export function shortDay(iso: string): string {
  return formatInTimeZone(new Date(iso), APP_TZ, "dd/MM");
}

/** true se a data ISO está dentro do intervalo (inclusive nas duas pontas). */
export function isWithin(iso: string, range: DateRange): boolean {
  const t = new Date(iso).getTime();
  return t >= new Date(range.from).getTime() && t <= new Date(range.to).getTime();
}

/** Duração do intervalo em milissegundos. */
export function rangeDurationMs(range: DateRange): number {
  return new Date(range.to).getTime() - new Date(range.from).getTime();
}

/** Intervalo imediatamente anterior, de mesma duração (para comparação). */
export function previousRange(range: DateRange): DateRange {
  const duration = rangeDurationMs(range);
  const to = new Date(new Date(range.from).getTime() - 1);
  const from = new Date(to.getTime() - duration);
  return { from: from.toISOString(), to: to.toISOString() };
}
