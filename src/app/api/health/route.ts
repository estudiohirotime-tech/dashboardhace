import { NextResponse } from "next/server";
import { getSourceMeta } from "@/lib/services/analytics";

export const dynamic = "force-dynamic";

export async function GET() {
  const data = await getSourceMeta();
  return NextResponse.json(data);
}
