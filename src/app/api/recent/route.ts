import { NextRequest, NextResponse } from "next/server";
import { getRecentOrders } from "@/lib/services/analytics";
import { rangeFromRequest } from "@/lib/api-request";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const data = await getRecentOrders(rangeFromRequest(req), 8);
  return NextResponse.json(data);
}
