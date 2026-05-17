"use client";

import { useAccount, useBalance, useChainId } from "wagmi";
import { useQuery } from "@tanstack/react-query";
import { ArrowDown, ArrowUp, Copy, ExternalLink, PiggyBank, Coins, Activity, Wallet, Radio } from "lucide-react";
import { useMemo } from "react";
import type { Address } from "viem";
import { formatPct, formatUsd, shortAddress } from "@/lib/format";
import { cn } from "@/lib/utils";
import { CHAINS } from "@/lib/chains";
import { apiFetch } from "@/lib/api";
import { StatCard } from "@/components/terminal/stat-card";
import { ChainBadge } from "@/components/terminal/chain-badge";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/terminal/empty-state";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { MagentaAreaChart } from "@/components/chart/area-chart";
import type { Chain } from "@prisma/client";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import { toast } from "sonner";

interface MarketsResponse {
  source: string;
  tokens: Array<{
    id: string;
    symbol: string;
    name: string;
    priceUsd: number;
    change24h: number;
    sparkline?: number[];
  }>;
}

const EVM_CHAIN_TO_PRISMA: Record<number, Chain> = {
  1: "ETHEREUM",
  42161: "ARBITRUM",
  10: "OPTIMISM",
  8453: "BASE",
  137: "POLYGON",
  56: "BSC",
};

export function LivePortfolio({ addressOverride }: { addressOverride?: string }) {
  const { address: connectedAddress, isConnected } = useAccount();
  const chainId = useChainId();

  // Use override (URL param) if provided, otherwise the connected wallet
  const targetAddress = (addressOverride || connectedAddress) as Address | undefined;

  // Fetch native token balance for the connected chain
  const { data: balance, isLoading: balanceLoading } = useBalance({
    address: targetAddress,
    query: { enabled: !!targetAddress, refetchInterval: 30_000 },
  });

  // Fetch live token prices to convert balance to USD
  const { data: markets } = useQuery<MarketsResponse>({
    queryKey: ["live-markets-portfolio"],
    queryFn: () => apiFetch<MarketsResponse>("/api/markets"),
    refetchInterval: 30_000,
    staleTime: 25_000,
  });

  const nativeSymbol = balance?.symbol ?? "ETH";
  const nativePrice = useMemo(() => {
    const tk = markets?.tokens.find((t) => t.symbol.toUpperCase() === nativeSymbol.toUpperCase());
    return tk?.priceUsd ?? 0;
  }, [markets, nativeSymbol]);

  const nativeChange = useMemo(() => {
    const tk = markets?.tokens.find((t) => t.symbol.toUpperCase() === nativeSymbol.toUpperCase());
    return tk?.change24h ?? 0;
  }, [markets, nativeSymbol]);

  const nativeBalance = balance ? Number(balance.formatted) : 0;
  const valueUsd = nativeBalance * nativePrice;

  const series = useMemo(() => {
    const tk = markets?.tokens.find((t) => t.symbol.toUpperCase() === nativeSymbol.toUpperCase());
    const sp = tk?.sparkline ?? [];
    return sp.length > 0
      ? sp.map((v, i) => ({ label: `T${i}`, value: v * nativeBalance }))
      : Array.from({ length: 24 }).map((_, i) => ({
          label: `T${i}`,
          value: valueUsd * (1 + Math.sin(i / 3) * 0.04),
        }));
  }, [markets, nativeSymbol, nativeBalance, valueUsd]);

  const prismaChain = EVM_CHAIN_TO_PRISMA[chainId] ?? "ETHEREUM";
  const explorerUrl = targetAddress
    ? CHAINS[prismaChain].explorer(targetAddress)
    : "#";

  // No wallet connected and no override
  if (!targetAddress) {
    return (
      <EmptyState
        icon={Wallet}
        title="Connect your wallet to view portfolio"
        description="Connect via MetaMask, WalletConnect, Coinbase, or Rainbow to see real-time on-chain holdings — or paste an EVM address above."
        action={
          <div className="mt-3">
            <ConnectButton />
          </div>
        }
      />
    );
  }

  function copyAddress() {
    if (!targetAddress) return;
    navigator.clipboard.writeText(targetAddress);
    toast.success("Address copied");
  }

  return (
    <>
      <div className="flex flex-wrap items-center gap-2">
        <ChainBadge chain={prismaChain} />
        {isConnected && targetAddress === connectedAddress && (
          <Badge variant="success" className="gap-1.5">
            <Radio className="h-3 w-3" /> Connected wallet
          </Badge>
        )}
        <Badge variant="secondary" className="font-mono text-[10px]">
          {shortAddress(targetAddress)}
        </Badge>
        <Button size="sm" variant="ghost" className="ml-auto gap-2" asChild>
          <a href={explorerUrl} target="_blank" rel="noopener noreferrer">
            <ExternalLink className="h-3.5 w-3.5" /> Explorer
          </a>
        </Button>
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button size="icon" variant="ghost" aria-label="Copy address" onClick={copyAddress}>
                <Copy className="h-3.5 w-3.5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Copy {shortAddress(targetAddress)}</TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>

      <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label={`${nativeSymbol} Balance`}
          value={
            balanceLoading
              ? "Loading…"
              : `${nativeBalance.toLocaleString("en-US", { maximumFractionDigits: 6 })} ${nativeSymbol}`
          }
          delta={nativeChange}
          icon={Wallet}
          hint={`On ${CHAINS[prismaChain].name}`}
        />
        <StatCard
          label="Value (USD)"
          value={formatUsd(valueUsd, { compact: true })}
          delta={nativeChange}
          icon={PiggyBank}
          hint={`@ ${formatUsd(nativePrice)} per ${nativeSymbol}`}
        />
        <StatCard
          label={`${nativeSymbol} Price`}
          value={formatUsd(nativePrice)}
          delta={nativeChange}
          icon={Coins}
          hint="Live · CoinGecko"
        />
        <StatCard
          label="Chain"
          value={CHAINS[prismaChain].name}
          icon={Activity}
          hint={`Chain ID ${chainId}`}
        />
      </div>

      <Card>
        <CardHeader className="flex-row items-end justify-between space-y-0">
          <div>
            <div className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              Portfolio value · 7d
            </div>
            <div className="num font-display text-2xl font-semibold">
              {formatUsd(valueUsd, { compact: true })}
            </div>
          </div>
          <Badge variant={nativeChange >= 0 ? "success" : "destructive"}>
            {formatPct(nativeChange)}
          </Badge>
        </CardHeader>
        <CardContent>
          {balanceLoading ? (
            <Skeleton className="h-[260px] w-full" />
          ) : (
            <MagentaAreaChart data={series} height={260} />
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            Holdings
          </div>
        </CardHeader>
        <CardContent>
          <div className="rounded-lg border border-white/5 bg-white/[0.02] p-4">
            <div className="grid grid-cols-[1.4fr_1fr_1fr_1fr_1fr] items-center gap-3 text-xs">
              <div className="flex items-center gap-2.5">
                <span className="grid h-9 w-9 place-items-center rounded-full bg-gradient-to-br from-magenta-500/40 to-autumn-amber/30 font-display text-xs font-bold">
                  {nativeSymbol[0]}
                </span>
                <div>
                  <div className="font-display text-sm font-semibold leading-tight">
                    {nativeSymbol}
                  </div>
                  <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
                    Native · <ChainBadge chain={prismaChain} />
                  </div>
                </div>
              </div>
              <span className="num text-right text-sm">
                {nativeBalance.toLocaleString("en-US", { maximumFractionDigits: 6 })}
              </span>
              <span className="num text-right text-sm">{formatUsd(nativePrice)}</span>
              <span className="num text-right text-sm font-semibold">
                {formatUsd(valueUsd, { compact: true })}
              </span>
              <span
                className={cn(
                  "num text-right text-sm font-semibold",
                  nativeChange >= 0 ? "text-emerald-300" : "text-rose-300"
                )}
              >
                <span className="inline-flex items-center gap-1">
                  {nativeChange >= 0 ? (
                    <ArrowUp className="h-3 w-3" />
                  ) : (
                    <ArrowDown className="h-3 w-3" />
                  )}
                  {formatPct(nativeChange)}
                </span>
              </span>
            </div>
          </div>
          <p className="mt-3 text-xs text-muted-foreground">
            Native balance shown. ERC-20 token discovery via on-chain scanning is enabled in
            the <strong className="text-foreground/90">Revoke</strong> tab — or connect your
            wallet for full multi-token tracking.
          </p>
        </CardContent>
      </Card>
    </>
  );
}
