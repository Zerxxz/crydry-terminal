"use client";

import { useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import { ERC20_ABI } from "@/lib/contracts";
import type { Address } from "viem";

/**
 * Hook that executes a real on-chain revoke (approve(spender, 0)) transaction.
 */
export function useRevoke() {
  const {
    writeContract,
    data: hash,
    isPending: isWriting,
    error: writeError,
    reset,
  } = useWriteContract();

  const {
    isLoading: isConfirming,
    isSuccess: isConfirmed,
    error: confirmError,
  } = useWaitForTransactionReceipt({ hash });

  /**
   * Execute revoke: calls token.approve(spender, 0)
   */
  function revoke(tokenAddress: string, spenderAddress: string) {
    writeContract({
      address: tokenAddress as Address,
      abi: ERC20_ABI,
      functionName: "approve",
      args: [spenderAddress as Address, 0n],
    });
  }

  return {
    revoke,
    hash,
    isWriting,
    isConfirming,
    isConfirmed,
    error: writeError ?? confirmError,
    reset,
  };
}
