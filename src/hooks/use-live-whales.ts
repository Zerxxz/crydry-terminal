"use client";

import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api";

interface WhaleWallet {
  address: string;
  displayName: string | null;
  ens: string | null;
  chain: string;
  labels: string[];
  netWorthUsd: number;
  balanceEth?: number;
  pnl30dUsd: number;
  pnl30dPct: number;
  winRate: number;
  followers: number;
}

interface WhalesResponse {
  source: string;
  updatedAt: string;
  ethPriceUsd?: number;
  wallets: WhaleWallet[];
}

/**
 * Hook for real-time whale wallet data with 60s polling.
 */
export function useLiveWhales(limit = 20) {
  return useQuery<WhalesResponse>({
    queryKey: ["live-whales", limit],
    queryFn: () => apiFetch<WhalesResponse>(`/api/whales?limit=${limit}`),
    refetchInterval: 60_000, // Poll every 60 seconds
    staleTime: 55_000,
    refetchOnWindowFocus: true,
  });
}

/**
 * Hook for a single whale's real-time data.
 */
export function useLiveWhaleProfile(address: string) {
  return useQuery({
    queryKey: ["live-whale", address],
    queryFn: () => apiFetch(`/api/whales/${encodeURIComponent(address)}`),
    refetchInterval: 60_000,
    staleTime: 55_000,
    enabled: !!address,
  });
}
