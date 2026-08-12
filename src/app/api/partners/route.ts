import { NextRequest, NextResponse } from "next/server";
import { promises as fs } from "node:fs";
import path from "node:path";
import { z } from "zod";
import { setPartnerSources } from "@/lib/data-sources/channel-grouping";

export const dynamic = "force-dynamic";

const FILE = path.join(process.cwd(), "src/lib/data-sources/partners.json");

interface PartnersFile {
  $comment?: string;
  influencers: string[];
  affiliates: string[];
}

async function read(): Promise<PartnersFile> {
  const raw = await fs.readFile(FILE, "utf-8");
  const json = JSON.parse(raw);
  return {
    $comment: json.$comment,
    influencers: Array.isArray(json.influencers) ? json.influencers : [],
    affiliates: Array.isArray(json.affiliates) ? json.affiliates : [],
  };
}

async function write(data: PartnersFile): Promise<void> {
  await fs.writeFile(FILE, JSON.stringify(data, null, 2) + "\n", "utf-8");
  setPartnerSources([...data.influencers, ...data.affiliates]);
}

export async function GET() {
  const data = await read();
  return NextResponse.json(data);
}

const mutationSchema = z.object({
  source: z.string().min(1).max(80),
  kind: z.enum(["influencer", "affiliate"]),
});

export async function POST(req: NextRequest) {
  const parsed = mutationSchema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "Payload inválido" }, { status: 400 });
  }
  const { source, kind } = parsed.data;
  const value = source.trim().toLowerCase();
  const data = await read();
  const list = kind === "influencer" ? data.influencers : data.affiliates;
  if (!list.includes(value)) list.push(value);
  await write(data);
  return NextResponse.json(data);
}

export async function DELETE(req: NextRequest) {
  const parsed = mutationSchema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "Payload inválido" }, { status: 400 });
  }
  const { source, kind } = parsed.data;
  const value = source.trim().toLowerCase();
  const data = await read();
  if (kind === "influencer") data.influencers = data.influencers.filter((s) => s !== value);
  else data.affiliates = data.affiliates.filter((s) => s !== value);
  await write(data);
  return NextResponse.json(data);
}
