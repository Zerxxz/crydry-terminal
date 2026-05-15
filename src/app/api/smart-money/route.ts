import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { jsonSafe } from "@/lib/serialize";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const [wallets, signals] = await Promise.all([
      db.wallet.findMany({
        where: { labels: { has: "SMART_MONEY" } },
        orderBy: { pnl30dPct: "desc" },
        take: 50,
      }),
      db.smartMoneySignal.findMany({
        orderBy: { detectedAt: "desc" },
        take: 100,
        include: { wallet: { select: { address: true, displayName: true, ens: true } } },
      }),
    ]);
    return NextResponse.json({ wallets: jsonSafe(wallets), signals: jsonSafe(signals) });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Failed to load smart money" },
      { status: 500 }
    );
  }
}
