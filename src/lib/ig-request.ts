import type { NextRequest } from "next/server";
import { parsePeriodParams } from "./period";
import type { DateRange, Granularity } from "./instagram/types";

export function rangeFromRequest(req: NextRequest): DateRange {
  const p = req.nextUrl.searchParams;
  return parsePeriodParams({ preset: p.get("preset"), from: p.get("from"), to: p.get("to") }).range;
}

export function granularityFromRequest(req: NextRequest): Granularity {
  const g = req.nextUrl.searchParams.get("granularity");
  return g === "week" || g === "month" ? g : "day";
}
