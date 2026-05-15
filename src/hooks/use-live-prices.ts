"use client";

import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api";

interface MarketToken {
  id: string;
  symbol: string;
  name: string;
  priceUsd: number;
  change24h: number;
  volume24h: number;
  marketCap: number;
  fdvUsd: number | null;
  logo: string;
  sparkline?: number[];
}

interface MarketsResponse {
  source: string;
  updatedAt: string;
  tokens: MarketToken[];
}

/**
 * Hook for real-time market prices with 30s polling.
 */
export function useLivePrices() {
  return useQuery<MarketsResponse>({
    queryKey: ["live-markets"],
    queryFn: () => apiFetch<MarketsResponse>("/api/markets"),
    refetchInterval: 30_000, // Poll every 30 seconds
    staleTime: 25_000,
    refetchOnWindowFocus: true,
  });
}
