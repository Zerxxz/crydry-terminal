import { NextResponse } from "next/server";
import { fetchMultipleBalances, KNOWN_WHALES } from "@/lib/etherscan";
import { fetchSimplePrices } from "@/lib/coingecko";
import { db } from "@/lib/db";
import { jsonSafe } from "@/lib/serialize";

export const dynamic = "force-dynamic";
export const revalidate = 60;

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const limit = Math.min(100, Math.max(1, Number(url.searchParams.get("limit") ?? 20)));

    // Try fetching real-time balances from Etherscan
    const addresses = KNOWN_WHALES.slice(0, limit).map((w) => w.address);
    const [balances, ethPrice] = await Promise.all([
      fetchMultipleBalances(addresses),
      fetchSimplePrices(["ETH"]),
    ]);

    const ethUsd = ethPrice?.ethereum?.usd ?? 3400;

    if (balances && balances.length > 0) {
      const wallets = balances.map((b) => {
        const meta = KNOWN_WHALES.find(
          (w) => w.address.toLowerCase() === b.account.toLowerCase()
        );
        const balanceEth = Number(b.balance) / 1e18;
        const netWorthUsd = balanceEth * ethUsd;

        return {
          address: b.account,
          displayName: meta?.label ?? null,
          ens: meta?.ens ?? null,
          chain: meta?.chain ?? "ETHEREUM",
          labels: ["WHALE"],
          netWorthUsd,
          balanceEth,
          pnl30dUsd: 0,
          pnl30dPct: 0,
          winRate: 0,
          followers: 0,
        };
      });

      // Sort by net worth descending
      wallets.sort((a, b) => b.netWorthUsd - a.netWorthUsd);

      return NextResponse.json({
        source: "live",
        updatedAt: new Date().toISOString(),
        ethPriceUsd: ethUsd,
        wallets,
      });
    }

    // Fallback to DB
    const dbWallets = await db.wallet.findMany({
      orderBy: { netWorthUsd: "desc" },
      take: limit,
    });

    return NextResponse.json({
      source: "database",
      updatedAt: new Date().toISOString(),
      wallets: jsonSafe(dbWallets),
    });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Failed to load whales" },
      { status: 500 }
    );
  }
}
