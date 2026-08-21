import { NextRequest, NextResponse } from "next/server";
import { syncShopify } from "@/lib/data-sources/shopify/sync";
import { isSyncAuthorized } from "@/lib/sync-auth";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

async function run(req: NextRequest) {
  if (!isSyncAuthorized(req)) {
    return NextResponse.json({ ok: false, error: "Não autorizado." }, { status: 401 });
  }
  const full = req.nextUrl.searchParams.get("full") === "1";
  try {
    const result = await syncShopify({ full });
    return NextResponse.json({ ok: true, ...result });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}

// GET para permitir agendamento via Vercel Cron; POST para uso manual.
export const GET = run;
export const POST = run;
