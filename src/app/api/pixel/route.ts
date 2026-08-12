import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { pixelBatchSchema, normalizeBatch, EVENT_TO_STAGE } from "@/lib/data-sources/pixel/schemas";

export const dynamic = "force-dynamic";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

export function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS });
}

export async function POST(req: NextRequest) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "JSON inválido." }, { status: 400, headers: CORS });
  }

  const parsed = pixelBatchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Evento inválido." }, { status: 400, headers: CORS });
  }

  const events = normalizeBatch(parsed.data);
  if (events.length) {
    await prisma.funnelEvent.createMany({
      data: events.map((e) => ({
        sourceSystem: "shopify_pixel",
        sessionId: e.sessionId,
        stage: EVENT_TO_STAGE[e.event],
        channel: e.channel,
        occurredAt: new Date(e.occurredAt),
        utmSource: e.utmSource,
        utmMedium: e.utmMedium,
        utmCampaign: e.utmCampaign,
      })),
    });
  }

  // 202: aceito, processado de forma assíncrona do ponto de vista do pixel.
  return NextResponse.json({ ok: true, received: events.length }, { status: 202, headers: CORS });
}
