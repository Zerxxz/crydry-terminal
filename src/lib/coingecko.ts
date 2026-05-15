/**
 * CoinGecko free API client for real-time market data.
 * Falls back to DB seed data when the API is unreachable or rate-limited.
 */

const BASE_URL = "https://api.coingecko.com/api/v3";

// Map our token symbols to CoinGecko IDs
const COINGECKO_IDS: Record<string, string> = {
  ETH: "ethereum",
  WBTC: "wrapped-bitcoin",
  USDC: "usd-coin",
  USDT: "tether",
  ARB: "arbitrum",
  OP: "optimism",
  MATIC: "matic-network",
  SOL: "solana",
  PEPE: "pepe",
  WIF: "dogwifhat",
  LINK: "chainlink",
  UNI: "uniswap",
  AAVE: "aave",
  ENA: "ethena",
  JUP: "jupiter-exchange-solana",
  BONK: "bonk",
  AVAX: "avalanche-2",
  BNB: "binancecoin",
  BASE: "base-protocol",
};

export interface LiveMarketData {
  id: string;
  symbol: string;
  name: string;
  current_price: number;
  price_change_percentage_24h: number;
  total_volume: number;
  market_cap: number;
  fully_diluted_valuation: number | null;
  sparkline_in_7d?: { price: number[] };
  image: string;
}

export interface LivePriceSimple {
  [id: string]: {
    usd: number;
    usd_24h_change: number;
    usd_24h_vol: number;
    usd_market_cap: number;
  };
}

/**
 * Fetch live market data for all tracked tokens from CoinGecko
 */
export async function fetchLiveMarkets(): Promise<LiveMarketData[] | null> {
  try {
    const ids = Object.values(COINGECKO_IDS).join(",");
    const url = `${BASE_URL}/coins/markets?vs_currency=usd&ids=${ids}&order=market_cap_desc&per_page=50&page=1&sparkline=true&price_change_percentage=24h`;

    const res = await fetch(url, {
      next: { revalidate: 30 }, // Cache for 30s in Next.js
      headers: { Accept: "application/json" },
    });

    if (!res.ok) {
      console.warn(`[CoinGecko] markets endpoint returned ${res.status}`);
      return null;
    }

    return res.json();
  } catch (e) {
    console.warn("[CoinGecko] Failed to fetch markets:", e);
    return null;
  }
}

/**
 * Fetch simple prices for specific coins
 */
export async function fetchSimplePrices(symbols: string[]): Promise<LivePriceSimple | null> {
  try {
    const ids = symbols
      .map((s) => COINGECKO_IDS[s.toUpperCase()])
      .filter(Boolean)
      .join(",");

    if (!ids) return null;

    const url = `${BASE_URL}/simple/price?ids=${ids}&vs_currencies=usd&include_24hr_change=true&include_24hr_vol=true&include_market_cap=true`;

    const res = await fetch(url, {
      next: { revalidate: 30 },
      headers: { Accept: "application/json" },
    });

    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}

/**
 * Fetch ETH price history (last 24h, hourly intervals)
 */
export async function fetchEthPriceHistory(): Promise<Array<{ label: string; value: number }> | null> {
  try {
    const url = `${BASE_URL}/coins/ethereum/market_chart?vs_currency=usd&days=1`;

    const res = await fetch(url, {
      next: { revalidate: 60 },
      headers: { Accept: "application/json" },
    });

    if (!res.ok) return null;

    const data: { prices: [number, number][] } = await res.json();

    return data.prices.map(([timestamp, price]) => ({
      label: new Date(timestamp).toLocaleTimeString("en-US", {
        hour: "2-digit",
        minute: "2-digit",
      }),
      value: price,
    }));
  } catch {
    return null;
  }
}

/**
 * Get CoinGecko ID from symbol
 */
export function getCoingeckoId(symbol: string): string | undefined {
  return COINGECKO_IDS[symbol.toUpperCase()];
}

export const SYMBOL_TO_CG_ID = COINGECKO_IDS;
