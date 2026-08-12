import { NextRequest, NextResponse } from "next/server";
import { getOrders } from "@/lib/services/analytics";
import { rangeFromRequest, filtersFromRequest } from "@/lib/api-request";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const data = await getOrders(rangeFromRequest(req), filtersFromRequest(req));
  return NextResponse.json(data);
}
