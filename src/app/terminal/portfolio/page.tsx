import Link from "next/link";
import { ArrowDown, ArrowUp, Wallet, Copy, ExternalLink, PiggyBank, Coins, Activity } from "lucide-react";
import type { Chain } from "@prisma/client";
import { db } from "@/lib/db";
import { jsonSafe } from "@/lib/serialize";
import { CHAINS } from "@/lib/chains";
import { formatPct, formatUsd, shortAddress, timeAgo } from "@/lib/format";
import { cn } from "@/lib/utils";
import { PageHeader } from "@/components/terminal/page-header";
import { WalletInput } from "@/components/terminal/wallet-input";
import { StatCard } from "@/components/terminal/stat-card";
import { ChainBadge } from "@/components/terminal/chain-badge";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Donut, DONUT_COLORS } from "@/components/chart/donut";
import { MagentaAreaChart } from "@/components/chart/area-chart";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { EmptyState } from "@/components/terminal/empty-state";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

export const dynamic = "force-dynamic";

async function loadWallet(addressOrEns: string | null) {
  const where = addressOrEns
    ? { OR: [{ ens: addressOrEns }, { address: addressOrEns.toLowerCase() }] }
    : undefined;

  const wallet = await db.wallet.findFirst({
    where,
    orderBy: where ? undefined : { netWorthUsd: "desc" },
    include: {
      holdings: { include: { token: true }, orderBy: { valueUsd: "desc" } },
      transactions: { orderBy: { timestamp: "desc" }, take: 18 },
    },
  });
  return wallet ? jsonSafe(wallet) : null;
}

export default async function PortfolioPage({
  searchParams,
}: {
  searchParams: { address?: string };
}) {
  const wallet = await loadWallet(searchParams.address ?? null);

  if (!wallet) {
    return (
      <div className="space-y-6">
        <PageHeader
          eyebrow="Portfolio"
          title="Wallet Portfolio"
          description="Multi-chain holdings, PnL, and on-chain history for any wallet."
        />
        <EmptyState
          icon={Wallet}
          title="No wallet found"
          description={`We couldn't find a wallet matching "${searchParams.address}". Try a different address or ENS name.`}
          action={
            <div className="mt-3 w-full max-w-sm">
              <WalletInput basePath="/terminal/portfolio" />
            </div>
          }
        />
      </div>
    );
  }

  const totalValue = wallet.holdings.reduce((a, h) => a + Number(h.valueUsd), 0);
  const allocation = wallet.holdings.map((h) => ({
    name: h.token.symbol,
    value: Number(h.valueUsd),
  }));
  const series = Array.from({ length: 30 }).map((_, i) => {
    const drift = Math.sin((i + wallet.address.length) / 4) * totalValue * 0.04;
    const trend = (Number(wallet.pnl30dPct) / 100) * (i / 30) * totalValue;
    return {
      label: `D${i + 1}`,
      value: Math.max(0, totalValue - trend + drift),
    };
  });

  return (
    <div className="space-y-6 pb-4">
      <PageHeader
        eyebrow="Portfolio"
        title={wallet.displayName ?? wallet.ens ?? "Wallet"}
        description={<span className="font-mono">{wallet.address}</span>}
      >
        <WalletInput basePath="/terminal/portfolio" defaultValue={searchParams.address ?? wallet.ens ?? undefined} />
      </PageHeader>

      <div className="flex flex-wrap items-center gap-2">
        <ChainBadge chain={wallet.chain as Chain} />
        {wallet.labels.map((l: string) => (
          <Badge key={l} variant="autumn">{l.replace("_", " ")}</Badge>
        ))}
        <Button size="sm" variant="ghost" className="ml-auto gap-2" asChild>
          <a href={CHAINS[wallet.chain as Chain].explorer(wallet.address)} target="_blank" rel="noopener noreferrer">
            <ExternalLink className="h-3.5 w-3.5" />
            Explorer
          </a>
        </Button>
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button size="icon" variant="ghost" aria-label="Copy address">
                <Copy className="h-3.5 w-3.5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>{shortAddress(wallet.address)}</TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>

      <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Net Worth" value={formatUsd(Number(wallet.netWorthUsd), { compact: true })} delta={Number(wallet.pnl30dPct)} icon={Wallet} hint="Total across chains" />
        <StatCard label="30d Realised PnL" value={formatUsd(Number(wallet.realizedUsd), { compact: true })} delta={Number(wallet.pnl30dPct) * 0.6} icon={PiggyBank} />
        <StatCard label="30d Unrealised" value={formatUsd(Number(wallet.unrealizedUsd), { compact: true })} delta={Number(wallet.pnl30dPct) * 0.4} icon={Coins} />
        <StatCard label="Win rate" value={`${(Number(wallet.winRate) * 100).toFixed(1)}%`} icon={Activity} hint="Last 90 days" />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader className="flex-row items-end justify-between space-y-0">
            <div>
              <div className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Net worth · 30d</div>
              <div className="num font-display text-2xl font-semibold">{formatUsd(totalValue, { compact: true })}</div>
            </div>
            <Badge variant={Number(wallet.pnl30dPct) >= 0 ? "success" : "destructive"}>
              {formatPct(Number(wallet.pnl30dPct))}
            </Badge>
          </CardHeader>
          <CardContent>
            <MagentaAreaChart data={series} height={260} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Allocation</div>
          </CardHeader>
          <CardContent>
            <div className="h-[180px]">
              <Donut data={allocation} size={180} />
            </div>
            <div className="mt-3 grid grid-cols-2 gap-1.5">
              {allocation.slice(0, 6).map((a, i) => (
                <div key={a.name} className="flex items-center gap-1.5 text-xs">
                  <span className="h-2 w-2 rounded-sm" style={{ backgroundColor: DONUT_COLORS[i % DONUT_COLORS.length] }} />
                  <span className="font-display font-semibold">{a.name}</span>
                  <span className="ml-auto num text-muted-foreground">
                    {((a.value / totalValue) * 100).toFixed(1)}%
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="holdings">
        <TabsList>
          <TabsTrigger value="holdings">Holdings</TabsTrigger>
          <TabsTrigger value="activity">Activity</TabsTrigger>
        </TabsList>

        <TabsContent value="holdings">
          <Card>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Asset</TableHead>
                  <TableHead className="text-right">Balance</TableHead>
                  <TableHead className="text-right">Price</TableHead>
                  <TableHead className="text-right">Value</TableHead>
                  <TableHead className="text-right">Cost basis</TableHead>
                  <TableHead className="text-right">PnL</TableHead>
                  <TableHead className="text-right">Allocation</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {wallet.holdings.map((h) => (
                  <TableRow key={h.id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <span className="grid h-7 w-7 place-items-center rounded-full bg-gradient-to-br from-magenta-500/40 to-autumn-amber/30 font-display text-[10px] font-bold">
                          {h.token.symbol[0]}
                        </span>
                        <div>
                          <div className="font-display text-sm font-semibold leading-tight">{h.token.symbol}</div>
                          <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
                            {h.token.name} <ChainBadge chain={h.token.chain as Chain} />
                          </div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="num text-right text-sm">
                      {Number(h.amount).toLocaleString("en-US", { maximumFractionDigits: 4 })}
                    </TableCell>
                    <TableCell className="num text-right text-sm">{formatUsd(Number(h.token.priceUsd))}</TableCell>
                    <TableCell className="num text-right text-sm font-semibold">{formatUsd(Number(h.valueUsd), { compact: true })}</TableCell>
                    <TableCell className="num text-right text-sm text-muted-foreground">{formatUsd(Number(h.costBasis), { compact: true })}</TableCell>
                    <TableCell className={cn("num text-right text-sm font-semibold", Number(h.pnlUsd) >= 0 ? "text-emerald-300" : "text-rose-300")}>
                      <span className="inline-flex items-center gap-1">
                        {Number(h.pnlUsd) >= 0 ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />}
                        {formatUsd(Number(h.pnlUsd), { compact: true })} <span className="opacity-60">({formatPct(Number(h.pnlPct))})</span>
                      </span>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="ml-auto flex w-32 items-center gap-2">
                        <div className="relative h-1.5 flex-1 overflow-hidden rounded-full bg-white/[0.06]">
                          <span className="absolute inset-y-0 left-0 rounded-full bg-gradient-to-r from-magenta-500 to-autumn-amber" style={{ width: `${Math.min(100, h.allocation)}%` }} />
                        </div>
                        <span className="num text-[10px] text-muted-foreground">{h.allocation.toFixed(1)}%</span>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
        </TabsContent>

        <TabsContent value="activity">
          <Card>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Type</TableHead>
                  <TableHead>Asset</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                  <TableHead className="text-right">Value</TableHead>
                  <TableHead>Protocol</TableHead>
                  <TableHead>Hash</TableHead>
                  <TableHead className="text-right">When</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {wallet.transactions.map((tx) => (
                  <TableRow key={tx.id}>
                    <TableCell>
                      <Badge variant={tx.type === "TRANSFER_OUT" ? "destructive" : "default"} className="text-[9px]">
                        {tx.type.replace("_", " ")}
                      </Badge>
                    </TableCell>
                    <TableCell className="font-display font-semibold text-sm">{tx.tokenSymbol}</TableCell>
                    <TableCell className="num text-right text-sm">{Number(tx.tokenAmount).toLocaleString("en-US", { maximumFractionDigits: 4 })}</TableCell>
                    <TableCell className="num text-right text-sm">{formatUsd(Number(tx.valueUsd), { compact: true })}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{tx.protocol ?? "—"}</TableCell>
                    <TableCell>
                      <Link
                        href={CHAINS[tx.chain as Chain].txExplorer(tx.hash)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="num text-xs text-magenta-300 hover:text-magenta-200"
                      >
                        {shortAddress(tx.hash, 8, 6)}
                      </Link>
                    </TableCell>
                    <TableCell className="text-right text-[11px] text-muted-foreground">{timeAgo(tx.timestamp)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
