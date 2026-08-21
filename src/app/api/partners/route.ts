import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { loadPartnersFromDb, addPartner, removePartner } from "@/lib/data-sources/partners-db";

export const dynamic = "force-dynamic";

const mutationSchema = z.object({
  source: z.string().min(1).max(80),
  kind: z.enum(["influencer", "affiliate"]),
});

export async function GET() {
  const data = await loadPartnersFromDb();
  return NextResponse.json(data);
}

export async function POST(req: NextRequest) {
  const parsed = mutationSchema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "Payload inválido" }, { status: 400 });
  }
  await addPartner(parsed.data.source, parsed.data.kind);
  return NextResponse.json(await loadPartnersFromDb());
}

export async function DELETE(req: NextRequest) {
  const parsed = mutationSchema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "Payload inválido" }, { status: 400 });
  }
  await removePartner(parsed.data.source);
  return NextResponse.json(await loadPartnersFromDb());
}
