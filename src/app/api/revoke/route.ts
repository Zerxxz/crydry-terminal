import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { revokeRequestSchema } from "@/lib/types";
import { jsonSafe } from "@/lib/serialize";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const parsed = revokeRequestSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues.map((i) => i.message).join(", ") },
        { status: 400 }
      );
    }

    const { approvalId, txHash } = parsed.data;
    const approval = await db.tokenApproval.findUnique({ where: { id: approvalId } });
    if (!approval) {
      return NextResponse.json({ error: "Approval not found" }, { status: 404 });
    }
    if (approval.revokedAt) {
      return NextResponse.json({ error: "Approval already revoked" }, { status: 409 });
    }

    const updated = await db.tokenApproval.update({
      where: { id: approvalId },
      data: {
        revokedAt: new Date(),
        allowance: "0",
        isUnlimited: false,
      },
    });

    // Log revoke as a transaction record so it appears in activity feeds.
    if (txHash) {
      await db.transaction.create({
        data: {
          hash: txHash,
          walletId: approval.walletId,
          chain: "ETHEREUM",
          type: "REVOKE",
          blockNumber: BigInt(0),
          timestamp: new Date(),
          fromAddr: "",
          toAddr: approval.spender,
          tokenSymbol: "ALLOWANCE",
          tokenAmount: 0,
          valueUsd: 0,
          notes: `Revoked allowance for ${approval.spender}`,
        },
      });
    }

    return NextResponse.json({ ok: true, approval: jsonSafe(updated) });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Failed to revoke" },
      { status: 500 }
    );
  }
}
