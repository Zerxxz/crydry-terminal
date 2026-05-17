"use client";

import { useState } from "react";
import { useAccount } from "wagmi";
import { motion, AnimatePresence } from "framer-motion";
import {
  ShieldOff,
  ShieldCheck,
  ShieldAlert,
  AlertTriangle,
  Filter,
  Loader2,
  Radio,
  Wallet,
} from "lucide-react";
import { useApprovals, type LiveApproval } from "@/hooks/use-approvals";
import { StatCard } from "@/components/terminal/stat-card";
import { ChainBadge } from "@/components/terminal/chain-badge";
import { EmptyState } from "@/components/terminal/empty-state";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { RevokeButton } from "./revoke-button";
import { cn } from "@/lib/utils";
import { shortAddress } from "@/lib/format";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import type { Chain } from "@prisma/client";

type RiskLevel = "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
type FilterValue = "ALL" | RiskLevel;

const RISK_VARIANT: Record<RiskLevel, "success" | "warning" | "destructive" | "outline"> = {
  LOW: "success",
  MEDIUM: "warning",
  HIGH: "destructive",
  CRITICAL: "destructive",
};

const RISK_ICON: Record<RiskLevel, React.ComponentType<{ className?: string }>> = {
  LOW: ShieldCheck,
  MEDIUM: ShieldAlert,
  HIGH: ShieldOff,
  CRITICAL: AlertTriangle,
};

export function LiveRevoke({ addressOverride }: { addressOverride?: string }) {
  const { address: connectedAddress, isConnected } = useAccount();
  const targetAddress = addressOverride || connectedAddress;
  const { data, isLoading, isFetching, refetch } = useApprovals(addressOverride);
  const [filter, setFilter] = useState<FilterValue>("ALL");

  if (!targetAddress) {
    return (
      <EmptyState
        icon={Wallet}
        title="Connect your wallet to scan approvals"
        description="We'll read your on-chain ERC-20 allowances against 9 known DEX routers and 10 popular tokens. No data leaves your browser."
        action={
          <div className="mt-3">
            <ConnectButton />
          </div>
        }
      />
    );
  }

  const approvals = data?.approvals ?? [];
  const visible = filter === "ALL" ? approvals : approvals.filter((a) => a.riskLevel === filter);

  const counts = approvals.reduce<Record<string, number>>((acc, a) => {
    acc[a.riskLevel] = (acc[a.riskLevel] ?? 0) + 1;
    return acc;
  }, {});

  const totalUnlimited = approvals.filter((a) => a.isUnlimited).length;

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-28 rounded-2xl" />
          ))}
        </div>
        <Skeleton className="h-96 rounded-2xl" />
      </div>
    );
  }

  return (
    <>
      <div className="flex flex-wrap items-center gap-2">
        <Badge variant="secondary" className="font-mono text-[10px]">
          {shortAddress(targetAddress)}
        </Badge>
        {isConnected && targetAddress === connectedAddress && (
          <Badge variant="success" className="gap-1.5">
            <Radio className="h-3 w-3" /> Connected wallet
          </Badge>
        )}
        {data?.source === "live" && (
          <Badge variant="success" className="gap-1.5">
            <Radio className="h-3 w-3" /> On-chain · viem
          </Badge>
        )}
        {isFetching && !isLoading && (
          <Badge variant="autumn" className="gap-1.5">
            <Loader2 className="h-3 w-3 animate-spin" /> Refreshing
          </Badge>
        )}
      </div>

      <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Active approvals"
          value={String(approvals.length)}
          icon={ShieldOff}
          hint={`${counts.CRITICAL ?? 0} critical · ${counts.HIGH ?? 0} high`}
        />
        <StatCard
          label="Unlimited allowances"
          value={String(totalUnlimited)}
          icon={AlertTriangle}
          hint="Audit every one of these"
        />
        <StatCard
          label="Safe (LOW)"
          value={String(counts.LOW ?? 0)}
          icon={ShieldCheck}
          hint="Verified, audited routers"
        />
        <StatCard
          label="Auto-refresh"
          value="2 min"
          icon={Radio}
          hint="On-chain re-scan interval"
        />
      </div>

      {approvals.length === 0 ? (
        <EmptyState
          icon={ShieldCheck}
          title="No active approvals"
          description="No outstanding ERC-20 allowances detected on the connected chain. Either you have not interacted with any DEX yet, or all approvals are already revoked."
        />
      ) : (
        <ApprovalsList
          approvals={visible}
          allApprovals={approvals}
          filter={filter}
          setFilter={setFilter}
          onRevoked={refetch}
        />
      )}
    </>
  );
}

function ApprovalsList({
  approvals,
  allApprovals,
  filter,
  setFilter,
  onRevoked,
}: {
  approvals: LiveApproval[];
  allApprovals: LiveApproval[];
  filter: FilterValue;
  setFilter: (f: FilterValue) => void;
  onRevoked: () => void;
}) {
  const filters: FilterValue[] = ["ALL", "CRITICAL", "HIGH", "MEDIUM", "LOW"];

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between gap-3 space-y-0">
        <div className="flex flex-wrap items-center gap-2">
          <Filter className="h-3.5 w-3.5 text-muted-foreground" />
          {filters.map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={cn(
                "rounded-md border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider transition-colors",
                filter === f
                  ? "border-magenta-500/40 bg-magenta-500/10 text-magenta-200"
                  : "border-white/10 bg-white/[0.03] text-muted-foreground hover:text-foreground"
              )}
            >
              {f}
              {f !== "ALL" && (
                <span className="ml-1.5 opacity-60">
                  {allApprovals.filter((a) => a.riskLevel === f).length}
                </span>
              )}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="secondary">{approvals.length} shown</Badge>
        </div>
      </CardHeader>

      <CardContent className="p-0">
        {approvals.length === 0 ? (
          <div className="p-10 text-center text-sm text-muted-foreground">
            No approvals match this filter.
          </div>
        ) : (
          <div className="divide-y divide-white/5">
            <div className="grid grid-cols-[1.4fr_1.6fr_1fr_1fr_auto] items-center gap-3 px-5 py-2 text-[10px] uppercase tracking-wider text-muted-foreground">
              <span>Token</span>
              <span>Spender</span>
              <span>Allowance</span>
              <span>Risk</span>
              <span />
            </div>
            <AnimatePresence initial={false}>
              {approvals.map((a) => {
                const RiskIcon = RISK_ICON[a.riskLevel];
                return (
                  <motion.div
                    key={`${a.tokenAddress}-${a.spender}`}
                    layout
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.98, transition: { duration: 0.18 } }}
                    transition={{ duration: 0.25 }}
                    className="grid grid-cols-[1.4fr_1.6fr_1fr_1fr_auto] items-center gap-3 px-5 py-3"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-gradient-to-br from-magenta-500/40 to-autumn-amber/30 font-display text-[10px] font-bold">
                        {a.tokenSymbol[0]}
                      </span>
                      <div className="min-w-0">
                        <div className="font-display text-sm font-semibold leading-tight">
                          {a.tokenSymbol}
                        </div>
                        <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
                          {a.tokenName} <ChainBadge chain={a.chain as Chain} />
                        </div>
                      </div>
                    </div>

                    <div className="min-w-0">
                      <div className="text-sm font-display font-semibold truncate">
                        {a.spenderName}
                      </div>
                      <div className="font-mono text-[10px] text-muted-foreground">
                        {shortAddress(a.spender)}
                      </div>
                    </div>

                    <div className="text-sm">
                      {a.isUnlimited ? (
                        <Badge variant="destructive" className="text-[9px]">
                          Unlimited
                        </Badge>
                      ) : (
                        <span className="num text-xs">{a.allowanceFormatted}</span>
                      )}
                    </div>

                    <div>
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <span className="inline-flex items-center gap-1.5">
                              <Badge variant={RISK_VARIANT[a.riskLevel]} className="gap-1 text-[9px]">
                                <RiskIcon className="h-3 w-3" />
                                {a.riskLevel}
                              </Badge>
                            </span>
                          </TooltipTrigger>
                          {a.riskReason && (
                            <TooltipContent className="max-w-xs">{a.riskReason}</TooltipContent>
                          )}
                        </Tooltip>
                      </TooltipProvider>
                    </div>

                    <RevokeButton
                      tokenAddress={a.tokenAddress}
                      spenderAddress={a.spender}
                      tokenSymbol={a.tokenSymbol}
                      spenderName={a.spenderName}
                      riskLevel={a.riskLevel}
                      onRevoked={onRevoked}
                    />
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
