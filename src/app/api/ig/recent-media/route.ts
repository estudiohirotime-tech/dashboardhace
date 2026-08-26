import { NextRequest, NextResponse } from "next/server";
import { resolveInstagram } from "@/lib/instagram/registry";
import { rangeFromRequest } from "@/lib/ig-request";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const { source } = await resolveInstagram();
  const limit = Number(req.nextUrl.searchParams.get("limit")) || 12;
  return NextResponse.json(await source.getRecentMedia(rangeFromRequest(req), limit));
}
