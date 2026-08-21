import { NextRequest, NextResponse } from "next/server";
import { syncPdv } from "@/lib/data-sources/pdv/sync";
import { isSyncAuthorized } from "@/lib/sync-auth";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

async function run(req: NextRequest) {
  if (!isSyncAuthorized(req)) {
    return NextResponse.json({ ok: false, error: "Não autorizado." }, { status: 401 });
  }
  const full = req.nextUrl.searchParams.get("full") === "1";
  try {
    const result = await syncPdv({ full });
    return NextResponse.json({ ok: true, ...result });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}

export const GET = run;
export const POST = run;
