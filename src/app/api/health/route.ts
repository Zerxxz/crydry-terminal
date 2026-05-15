import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const [walletCount, tokenCount] = await Promise.all([
      db.wallet.count(),
      db.token.count(),
    ]);
    return NextResponse.json({
      ok: true,
      time: new Date().toISOString(),
      wallets: walletCount,
      tokens: tokenCount,
      build: "crydry-terminal/0.1.0",
    });
  } catch (e) {
    return NextResponse.json(
      { ok: false, error: e instanceof Error ? e.message : "DB unreachable" },
      { status: 503 }
    );
  }
}
