"use client";

import { useLivePrices } from "@/hooks/use-live-prices";
import { AestheticBar } from "./aesthetic-bar";

/**
 * Client wrapper that fetches live prices and passes them to AestheticBar.
 * Polls every 30s for real-time ticker updates.
 */
export function AestheticBarWrapper() {
  const { data } = useLivePrices();

  const ticks = (data?.tokens ?? []).slice(0, 16).map((t) => ({
    symbol: t.symbol,
    price: t.priceUsd,
    change: t.change24h,
  }));

  return <AestheticBar ticks={ticks} />;
}
