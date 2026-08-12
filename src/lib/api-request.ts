import type { NextRequest } from "next/server";
import { parsePeriodParams } from "./period";
import type { DateRange, OrderFilters, Channel, ChannelGroup, FinancialStatus } from "./data-sources/types";
import type { Granularity } from "./services/analytics";

export function rangeFromRequest(req: NextRequest): DateRange {
  const p = req.nextUrl.searchParams;
  return parsePeriodParams({
    preset: p.get("preset"),
    from: p.get("from"),
    to: p.get("to"),
  }).range;
}

export function filtersFromRequest(req: NextRequest): OrderFilters {
  const p = req.nextUrl.searchParams;
  const filters: OrderFilters = {};
  const channel = p.get("channel");
  if (channel === "online" || channel === "fisica" || channel === "all") {
    filters.channel = channel as Channel | "all";
  }
  const cg = p.get("channelGroup");
  if (cg) filters.channelGroup = cg as ChannelGroup;
  const campaign = p.get("utmCampaign");
  if (campaign) filters.utmCampaign = campaign;
  const source = p.get("utmSource");
  if (source) filters.utmSource = source;
  const status = p.get("financialStatus");
  if (status) filters.financialStatus = status as FinancialStatus;
  const search = p.get("search");
  if (search) filters.search = search;
  return filters;
}

export function granularityFromRequest(req: NextRequest): Granularity {
  const g = req.nextUrl.searchParams.get("granularity");
  return g === "week" || g === "month" ? g : "day";
}

export function attributionModelFromRequest(req: NextRequest): "first_click" | "last_click" {
  const m = req.nextUrl.searchParams.get("attribution");
  return m === "first_click" ? "first_click" : "last_click";
}
