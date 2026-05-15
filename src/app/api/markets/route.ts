import { NextResponse } from "next/server";
import { fetchLiveMarkets } from "@/lib/coingecko";
import { db } from "@/lib/db";
import { jsonSafe } from "@/lib/serialize";

export const dynamic = "force-dynamic";
export const revalidate = 30; // ISR: revalidate every 30s

export async function GET() {
  try {
    // Try live CoinGecko data first
    const liveData = await fetchLiveMarkets();

    if (liveData && liveData.length > 0) {
      const tokens = liveData.map((coin) => ({
        id: coin.id,
        symbol: coin.symbol.toUpperCase(),
        name: coin.name,
        priceUsd: coin.current_price,
        change24h: coin.price_change_percentage_24h ?? 0,
        volume24h: coin.total_volume,
        marketCap: coin.market_cap,
        fdvUsd: coin.fully_diluted_valuation,
        logo: coin.image,
        sparkline: coin.sparkline_in_7d?.price?.slice(-24) ?? [],
      }));

      return NextResponse.json({
        source: "live",
        updatedAt: new Date().toISOString(),
        tokens,
      });
    }

    // Fallback to DB seed data
    const tokens = await db.token.findMany({
      orderBy: { marketCap: "desc" },
      take: 50,
    });

    return NextResponse.json({
      source: "database",
      updatedAt: new Date().toISOString(),
      tokens: jsonSafe(tokens),
    });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Failed to load markets" },
      { status: 500 }
    );
  }
}
