import { NextRequest, NextResponse } from "next/server";
import { getAttribution } from "@/lib/services/analytics";
import { rangeFromRequest, attributionModelFromRequest } from "@/lib/api-request";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const data = await getAttribution(rangeFromRequest(req), attributionModelFromRequest(req));
  return NextResponse.json(data);
}
