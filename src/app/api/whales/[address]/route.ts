import { NextResponse } from "next/server";
import { fetchEthBalance, fetchRecentTxs, KNOWN_WHALES } from "@/lib/etherscan";
import { fetchSimplePrices } from "@/lib/coingecko";
import { db } from "@/lib/db";
import { jsonSafe } from "@/lib/serialize";

export const dynamic = "force-dynamic";
export const revalidate = 60;

export async function GET(
  _req: Request,
  { params }: { params: { address: string } }
) {
  try {
    const addr = decodeURIComponent(params.address);

    if (!/^0x[a-fA-F0-9]{40}$/.test(addr)) {
      return NextResponse.json({ error: "Invalid EVM address" }, { status: 400 });
    }

    const meta = KNOWN_WHALES.find(
      (w) => w.address.toLowerCase() === addr.toLowerCase()
    );

    // Try live Etherscan data
    const [balance, txs, ethPrice] = await Promise.all([
      fetchEthBalance(addr),
      fetchRecentTxs(addr, 1, 50),
      fetchSimplePrices(["ETH"]),
    ]);

    const ethUsd = ethPrice?.ethereum?.usd ?? 3400;

    if (balance) {
      const netWorthUsd = balance.balanceEth * ethUsd;

      const transactions = (txs ?? []).slice(0, 30).map((tx) => ({
        hash: tx.hash,
        from: tx.from,
        to: tx.to,
        valueEth: Number(tx.value) / 1e18,
        valueUsd: (Number(tx.value) / 1e18) * ethUsd,
        timestamp: new Date(Number(tx.timeStamp) * 1000).toISOString(),
        blockNumber: tx.blockNumber,
        type:
          tx.from.toLowerCase() === addr.toLowerCase() ? "TRANSFER_OUT" : "TRANSFER_IN",
        gasUsd:
          ((Number(tx.gasUsed) * Number(tx.gasPrice)) / 1e18) * ethUsd,
        functionName: tx.functionName?.split("(")[0] || "transfer",
      }));

      return NextResponse.json({
        source: "live",
        updatedAt: new Date().toISOString(),
        wallet: {
          address: addr,
          displayName: meta?.label ?? null,
          ens: meta?.ens ?? null,
          chain: meta?.chain ?? "ETHEREUM",
          labels: ["WHALE"],
          balanceEth: balance.balanceEth,
          netWorthUsd,
          pnl30dUsd: 0,
          pnl30dPct: 0,
          winRate: 0,
          followers: 0,
        },
        transactions,
        ethPriceUsd: ethUsd,
      });
    }

    // Fallback to DB
    const wallet = await db.wallet
      .findFirst({
        where: { OR: [{ address: addr.toLowerCase() }, { ens: addr }] },
        include: {
          holdings: { include: { token: true }, orderBy: { valueUsd: "desc" } },
          transactions: { orderBy: { timestamp: "desc" }, take: 100 },
          signals: { orderBy: { detectedAt: "desc" }, take: 20 },
        },
      })
      .catch(() => null);

    if (!wallet) return NextResponse.json({ error: "Wallet not found" }, { status: 404 });
    return NextResponse.json({ source: "database", wallet: jsonSafe(wallet) });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Failed to load whale" },
      { status: 500 }
    );
  }
}
