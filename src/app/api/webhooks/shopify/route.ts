import { NextRequest, NextResponse } from "next/server";
import { readShopifyConfig } from "@/lib/data-sources/shopify/config";
import { verifyHmac, isKnownTopic } from "@/lib/data-sources/shopify/webhook";
import { processWebhook } from "@/lib/data-sources/shopify/webhook-queue";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

export async function POST(req: NextRequest) {
  const config = readShopifyConfig();
  if (!config?.webhookSecret) {
    return NextResponse.json({ error: "Webhook não configurado (SHOPIFY_WEBHOOK_SECRET)." }, { status: 503 });
  }

  // Corpo BRUTO é obrigatório para validar o HMAC.
  const rawBody = await req.text();
  const hmac = req.headers.get("x-shopify-hmac-sha256");

  if (!verifyHmac(rawBody, hmac, config.webhookSecret)) {
    return NextResponse.json({ error: "HMAC inválido." }, { status: 401 });
  }

  const topic = req.headers.get("x-shopify-topic");
  if (!isKnownTopic(topic)) {
    // 200 para não gerar reentrega de tópicos que não tratamos.
    return NextResponse.json({ ok: true, ignored: topic });
  }

  let payload: unknown;
  try {
    payload = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ error: "JSON inválido." }, { status: 400 });
  }

  // Serverless: processa de forma síncrona (uma função morre após responder,
  // então não dá para "processar em background"). É um upsert rápido.
  try {
    await processWebhook({ topic, payload, receivedAt: Date.now() });
  } catch (err) {
    // 200 mesmo assim: o backfill incremental (cron) reconcilia depois, e um 5xx
    // faria a Shopify reentregar em loop. Registra o erro.
    console.error(`[webhook] falha ao processar ${topic}:`, err);
    return NextResponse.json({ ok: true, topic, deferred: true });
  }
  return NextResponse.json({ ok: true, topic });
}
