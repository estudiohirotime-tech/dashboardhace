import { NextRequest, NextResponse } from "next/server";
import { resolveInstagram } from "@/lib/instagram/registry";
import { rangeFromRequest, granularityFromRequest } from "@/lib/ig-request";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const { source } = await resolveInstagram();
  return NextResponse.json(await source.getFollowerGrowth(rangeFromRequest(req), granularityFromRequest(req)));
}
