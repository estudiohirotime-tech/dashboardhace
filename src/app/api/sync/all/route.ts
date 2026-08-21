import { NextRequest, NextResponse } from "next/server";
import { syncShopify } from "@/lib/data-sources/shopify/sync";
import { syncPdv } from "@/lib/data-sources/pdv/sync";
import { readShopifyConfig } from "@/lib/data-sources/shopify/config";
import { readPdvConfig } from "@/lib/data-sources/pdv/config";
import { seedPixelFixtureIfEmpty } from "@/lib/data-sources/pixel/fixture";
import { isSyncAuthorized } from "@/lib/sync-auth";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

// Endpoint agendado (Vercel Cron): sincroniza as duas fontes de forma
// independente — uma falha não derruba a outra.
async function run(req: NextRequest) {
  if (!isSyncAuthorized(req)) {
    return NextResponse.json({ ok: false, error: "Não autorizado." }, { status: 401 });
  }
  const full = req.nextUrl.searchParams.get("full") === "1";

  const result: Record<string, unknown> = {};

  if (readShopifyConfig()) {
    try {
      result.shopify = await syncShopify({ full });
    } catch (err) {
      result.shopify = { error: err instanceof Error ? err.message : String(err) };
    }
  } else {
    result.shopify = { skipped: "não configurado" };
  }

  if (readPdvConfig()) {
    try {
      result.pdv = await syncPdv({ full });
    } catch (err) {
      result.pdv = { error: err instanceof Error ? err.message : String(err) };
    }
  } else {
    result.pdv = { skipped: "não configurado" };
  }

  // Funil fictício (só no modo fixture da Shopify).
  if (readShopifyConfig()?.fixture) {
    try {
      await seedPixelFixtureIfEmpty();
      result.pixelFixture = "ok";
    } catch (err) {
      result.pixelFixture = { error: err instanceof Error ? err.message : String(err) };
    }
  }

  return NextResponse.json({ ok: true, ...result });
}

export const GET = run;
export const POST = run;
