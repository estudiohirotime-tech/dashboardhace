import { NextResponse } from "next/server";
import { getInstagramMeta } from "@/lib/instagram/registry";

export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json(await getInstagramMeta());
}
