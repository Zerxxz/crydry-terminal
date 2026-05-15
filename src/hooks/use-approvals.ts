"use client";

import { useQuery } from "@tanstack/react-query";
import { useAccount } from "wagmi";
import { apiFetch } from "@/lib/api";

export interface LiveApproval {
  tokenAddress: string;
  tokenSymbol: string;
  tokenName: string;
  tokenDecimals: number;
  spender: string;
  spenderName: string;
  allowance: string;
  allowanceFormatted: string;
  isUnlimited: boolean;
  riskLevel: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  riskReason: string;
  chain: string;
}

interface ApprovalsResponse {
  source: string;
  updatedAt: string;
  wallet: { address: string; chain: string };
  approvals: LiveApproval[];
  message?: string;
}

/**
 * Hook for fetching real on-chain approvals for the connected wallet.
 * Auto-refreshes every 2 minutes.
 */
export function useApprovals(addressOverride?: string) {
  const { address: connectedAddress, chain } = useAccount();
  const address = addressOverride ?? connectedAddress;

  const chainName = chain?.name?.toUpperCase().replace(" ", "_") ?? "ETHEREUM";

  return useQuery<ApprovalsResponse>({
    queryKey: ["approvals", address, chainName],
    queryFn: () =>
      apiFetch<ApprovalsResponse>(
        `/api/approvals/${encodeURIComponent(address!)}?chain=${chainName}`
      ),
    enabled: !!address,
    refetchInterval: 120_000,
    staleTime: 110_000,
  });
}
