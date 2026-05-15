"use client";

import { useState, useEffect, useRef } from "react";
import { useAccount } from "wagmi";
import { ShieldOff, Loader2, Check, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useRevoke } from "@/hooks/use-revoke";
import { toast } from "sonner";
import { apiFetch } from "@/lib/api";

interface RevokeButtonProps {
  tokenAddress: string;
  spenderAddress: string;
  tokenSymbol: string;
  spenderName: string;
  riskLevel: string;
  approvalId?: string;
  onRevoked?: () => void;
}

export function RevokeButton({
  tokenAddress,
  spenderAddress,
  tokenSymbol,
  spenderName,
  riskLevel,
  approvalId,
  onRevoked,
}: RevokeButtonProps) {
  const { address, isConnected } = useAccount();
  const { revoke, hash, isWriting, isConfirming, isConfirmed, error, reset } = useRevoke();
  const [dbRevoking, setDbRevoking] = useState(false);
  const reportedRef = useRef(false);

  const busy = isWriting || isConfirming || dbRevoking;

  // Report successful on-chain revoke to backend (runs once)
  useEffect(() => {
    if (isConfirmed && hash && !reportedRef.current) {
      reportedRef.current = true;

      apiFetch("/api/revoke", {
        method: "POST",
        body: JSON.stringify({
          tokenAddress,
          spenderAddress,
          txHash: hash,
          walletAddress: address,
        }),
      }).catch(() => {});

      toast.success("Approval revoked on-chain!", {
        description: `${tokenSymbol} → ${spenderName}`,
      });

      onRevoked?.();
      setTimeout(() => reset(), 3000);
    }
  }, [isConfirmed, hash, tokenAddress, spenderAddress, address, tokenSymbol, spenderName, reset, onRevoked]);

  // Handle errors (runs once per error)
  useEffect(() => {
    if (error) {
      toast.error("Revoke failed", {
        description: error.message?.slice(0, 120) ?? "Transaction failed or was rejected",
      });
      setTimeout(() => reset(), 3000);
    }
  }, [error, reset]);

  async function handleRevoke() {
    reportedRef.current = false;

    if (!isConnected || !address) {
      // Fallback: DB-only revoke for demo mode
      if (approvalId) {
        setDbRevoking(true);
        try {
          await apiFetch("/api/revoke", {
            method: "POST",
            body: JSON.stringify({ approvalId }),
          });
          toast.success("Approval revoked (demo)", {
            description: `${tokenSymbol} → ${spenderName}`,
          });
          onRevoked?.();
        } catch (e) {
          toast.error("Revoke failed", {
            description: e instanceof Error ? e.message : "Unknown error",
          });
        } finally {
          setDbRevoking(false);
        }
        return;
      }

      toast.error("Connect your wallet to revoke on-chain");
      return;
    }

    // Real on-chain revoke
    revoke(tokenAddress, spenderAddress);
  }

  return (
    <Button
      size="sm"
      variant={riskLevel === "CRITICAL" || riskLevel === "HIGH" ? "default" : "outline"}
      disabled={busy || isConfirmed}
      onClick={handleRevoke}
      className="gap-1.5"
    >
      {busy ? (
        <Loader2 className="h-3.5 w-3.5 animate-spin" />
      ) : isConfirmed ? (
        <Check className="h-3.5 w-3.5 text-emerald-300" />
      ) : (
        <ShieldOff className="h-3.5 w-3.5" />
      )}
      {isWriting
        ? "Sign…"
        : isConfirming
        ? "Confirming…"
        : isConfirmed
        ? "Done"
        : "Revoke"}
      {hash && !isConfirmed && (
        <a
          href={`https://etherscan.io/tx/${hash}`}
          target="_blank"
          rel="noopener noreferrer"
          onClick={(e) => e.stopPropagation()}
          className="ml-1"
        >
          <ExternalLink className="h-3 w-3" />
        </a>
      )}
    </Button>
  );
}
