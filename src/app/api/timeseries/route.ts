import { NextRequest, NextResponse } from "next/server";
import { getRevenueTimeseries } from "@/lib/services/analytics";
import { rangeFromRequest, granularityFromRequest } from "@/lib/api-request";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const data = await getRevenueTimeseries(rangeFromRequest(req), granularityFromRequest(req));
  return NextResponse.json(data);
}
