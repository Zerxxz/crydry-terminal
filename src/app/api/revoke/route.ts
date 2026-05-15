import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { jsonSafe } from "@/lib/serialize";

export const dynamic = "force-dynamic";

const revokeSchema = z.object({
  approvalId: z.string().min(1).optional(),
  // For real on-chain revokes, client sends token + spender + txHash
  tokenAddress: z.string().optional(),
  spenderAddress: z.string().optional(),
  txHash: z.string().regex(/^0x[a-fA-F0-9]{64}$/).optional(),
  walletAddress: z.string().optional(),
});

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const parsed = revokeSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues.map((i) => i.message).join(", ") },
        { status: 400 }
      );
    }

    const { approvalId, tokenAddress, spenderAddress, txHash, walletAddress } = parsed.data;

    // Case 1: Real on-chain revoke (client already submitted tx, just recording it)
    if (txHash && tokenAddress && spenderAddress) {
      // Try to find and update matching DB record if exists
      if (walletAddress) {
        const wallet = await db.wallet.findFirst({
          where: { address: walletAddress.toLowerCase() },
        });

        if (wallet) {
          // Update any matching approval in DB
          await db.tokenApproval.updateMany({
            where: {
              walletId: wallet.id,
              spender: spenderAddress.toLowerCase(),
              revokedAt: null,
            },
            data: {
              revokedAt: new Date(),
              allowance: "0",
              isUnlimited: false,
            },
          });
        }
      }

      return NextResponse.json({
        ok: true,
        source: "on-chain",
        txHash,
        message: `Approval revoked on-chain. Tx: ${txHash}`,
      });
    }

    // Case 2: DB-only revoke (for seeded/demo data)
    if (approvalId) {
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

      return NextResponse.json({ ok: true, source: "database", approval: jsonSafe(updated) });
    }

    return NextResponse.json({ error: "Provide either approvalId or txHash + tokenAddress + spenderAddress" }, { status: 400 });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Failed to revoke" },
      { status: 500 }
    );
  }
}
