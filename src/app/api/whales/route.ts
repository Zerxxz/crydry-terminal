import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { jsonSafe } from "@/lib/serialize";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const limit = Math.min(100, Math.max(1, Number(url.searchParams.get("limit") ?? 50)));
    const wallets = await db.wallet.findMany({
      orderBy: { netWorthUsd: "desc" },
      take: limit,
    });
    return NextResponse.json({ wallets: jsonSafe(wallets) });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Failed to load whales" },
      { status: 500 }
    );
  }
}
