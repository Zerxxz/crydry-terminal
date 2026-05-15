import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { jsonSafe } from "@/lib/serialize";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const tokens = await db.token.findMany({
      orderBy: { marketCap: "desc" },
      take: 50,
    });
    return NextResponse.json({ tokens: jsonSafe(tokens) });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Failed to load markets" },
      { status: 500 }
    );
  }
}
