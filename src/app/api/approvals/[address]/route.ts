import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { jsonSafe } from "@/lib/serialize";

export const dynamic = "force-dynamic";

export async function GET(_: Request, { params }: { params: { address: string } }) {
  try {
    const addr = decodeURIComponent(params.address);
    const wallet = await db.wallet.findFirst({
      where: { OR: [{ address: addr.toLowerCase() }, { ens: addr }] },
      select: { id: true, address: true, chain: true, ens: true, displayName: true },
    });
    if (!wallet) return NextResponse.json({ error: "Wallet not found" }, { status: 404 });

    const approvals = await db.tokenApproval.findMany({
      where: { walletId: wallet.id, revokedAt: null },
      include: { token: true },
      orderBy: [{ riskLevel: "desc" }, { approvedAt: "desc" }],
    });
    return NextResponse.json({ wallet: jsonSafe(wallet), approvals: jsonSafe(approvals) });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Failed to load approvals" },
      { status: 500 }
    );
  }
}
