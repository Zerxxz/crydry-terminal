import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { jsonSafe } from "@/lib/serialize";

export const dynamic = "force-dynamic";

export async function GET(_: Request, { params }: { params: { address: string } }) {
  try {
    const addr = decodeURIComponent(params.address);
    const wallet = await db.wallet.findFirst({
      where: { OR: [{ address: addr.toLowerCase() }, { ens: addr }] },
      include: {
        holdings: { include: { token: true }, orderBy: { valueUsd: "desc" } },
        transactions: { orderBy: { timestamp: "desc" }, take: 100 },
        signals: { orderBy: { detectedAt: "desc" }, take: 20 },
      },
    });
    if (!wallet) return NextResponse.json({ error: "Wallet not found" }, { status: 404 });
    return NextResponse.json({ wallet: jsonSafe(wallet) });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Failed to load whale" },
      { status: 500 }
    );
  }
}
