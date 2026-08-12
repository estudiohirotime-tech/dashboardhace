import { NextRequest, NextResponse } from "next/server";
import { readShopifyConfig } from "@/lib/data-sources/shopify/config";
import { verifyHmac, isKnownTopic } from "@/lib/data-sources/shopify/webhook";
import { enqueueWebhook } from "@/lib/data-sources/shopify/webhook-queue";

export const dynamic = "force-dynamic";

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

  // Enfileira e responde 200 imediatamente; o processamento roda em background.
  enqueueWebhook(topic, payload);
  return NextResponse.json({ ok: true, topic });
}
