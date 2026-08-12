import { NextRequest, NextResponse } from "next/server";
import { getChannelSplit } from "@/lib/services/analytics";
import { rangeFromRequest, attributionModelFromRequest } from "@/lib/api-request";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const data = await getChannelSplit(rangeFromRequest(req), attributionModelFromRequest(req));
  return NextResponse.json(data);
}
