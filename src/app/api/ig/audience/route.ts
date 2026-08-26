import { NextResponse } from "next/server";
import { resolveInstagram } from "@/lib/instagram/registry";

export const dynamic = "force-dynamic";

export async function GET() {
  const { source } = await resolveInstagram();
  return NextResponse.json(await source.getAudience());
}
