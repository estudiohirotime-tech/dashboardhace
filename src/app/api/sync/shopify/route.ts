import { NextRequest, NextResponse } from "next/server";
import { syncShopify } from "@/lib/data-sources/shopify/sync";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function POST(req: NextRequest) {
  const full = req.nextUrl.searchParams.get("full") === "1";
  try {
    const result = await syncShopify({ full });
    return NextResponse.json({ ok: true, ...result });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
