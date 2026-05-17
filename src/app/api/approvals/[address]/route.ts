import { NextResponse } from "next/server";
import { fetchOnChainApprovals } from "@/lib/approvals";
import { db } from "@/lib/db";
import { jsonSafe } from "@/lib/serialize";

export const dynamic = "force-dynamic";

export async function GET(
  req: Request,
  { params }: { params: { address: string } }
) {
  try {
    const addr = decodeURIComponent(params.address);
    const url = new URL(req.url);
    const chain = url.searchParams.get("chain") ?? "ETHEREUM";

    // Validate EVM address format
    if (!/^0x[a-fA-F0-9]{40}$/.test(addr)) {
      return NextResponse.json({ error: "Invalid EVM address" }, { status: 400 });
    }

    // Try real on-chain approval scanning
    const liveApprovals = await fetchOnChainApprovals(addr, chain);

    if (liveApprovals.length > 0) {
      return NextResponse.json({
        source: "live",
        updatedAt: new Date().toISOString(),
        wallet: { address: addr, chain },
        approvals: liveApprovals.sort((a, b) => {
          const riskOrder: Record<string, number> = {
            CRITICAL: 0,
            HIGH: 1,
            MEDIUM: 2,
            LOW: 3,
          };
          return riskOrder[a.riskLevel] - riskOrder[b.riskLevel];
        }),
      });
    }

    // No on-chain approvals found — try DB fallback
    const wallet = await db.wallet
      .findFirst({
        where: { OR: [{ address: addr.toLowerCase() }, { ens: addr }] },
        select: { id: true, address: true, chain: true, ens: true, displayName: true },
      })
      .catch(() => null);

    if (!wallet) {
      return NextResponse.json({
        source: "live",
        updatedAt: new Date().toISOString(),
        wallet: { address: addr, chain },
        approvals: [],
        message:
          "No on-chain approvals detected. This wallet has no active ERC-20 allowances against the tracked spenders.",
      });
    }

    const approvals = await db.tokenApproval.findMany({
      where: { walletId: wallet.id, revokedAt: null },
      include: { token: true },
      orderBy: [{ riskLevel: "desc" }, { approvedAt: "desc" }],
    });

    return NextResponse.json({
      source: "database",
      updatedAt: new Date().toISOString(),
      wallet: jsonSafe(wallet),
      approvals: jsonSafe(approvals),
    });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Failed to load approvals" },
      { status: 500 }
    );
  }
}
