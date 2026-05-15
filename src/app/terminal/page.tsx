import { ArrowRightLeft, Crown, Sparkles, TrendingUp, Wallet } from "lucide-react";
import Link from "next/link";
import { db } from "@/lib/db";
import { jsonSafe } from "@/lib/serialize";
import { PageHeader } from "@/components/terminal/page-header";
import { StatCard } from "@/components/terminal/stat-card";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { ChainBadge } from "@/components/terminal/chain-badge";
import { MagentaAreaChart } from "@/components/chart/area-chart";
import { Sparkline } from "@/components/chart/sparkline";
import { formatPct, formatUsd, shortAddress, timeAgo } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { Chain } from "@prisma/client";

export const dynamic = "force-dynamic";

async function loadDashboard() {
  const [tokens, txs, sigs, ticks, whaleAggregate] = await Promise.all([
    db.token.findMany({ orderBy: { marketCap: "desc" }, take: 10 }),
    db.transaction.findMany({
      orderBy: { timestamp: "desc" },
      take: 12,
      include: { wallet: { select: { displayName: true, ens: true, address: true, labels: true } } },
    }),
    db.smartMoneySignal.findMany({
      orderBy: { detectedAt: "desc" },
      take: 5,
      include: { wallet: { select: { displayName: true, ens: true, address: true } } },
    }),
    db.marketTick.findMany({ where: { symbol: "ETH" }, orderBy: { capturedAt: "asc" } }),
    db.wallet.aggregate({ _sum: { netWorthUsd: true }, _count: true }),
  ]);

  const totalNetWorth = Number(whaleAggregate._sum.netWorthUsd ?? 0);
  const seriesEth = ticks.map((t) => ({
    label: new Date(t.capturedAt).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" }),
    value: Number(t.priceUsd),
  }));

  return jsonSafe({
    tokens, txs, sigs, seriesEth,
    totalNetWorth,
    walletCount: whaleAggregate._count,
  });
}

export default async function TerminalDashboard() {
  const data = await loadDashboard();
  const totalVolume24h = data.tokens.reduce((a, t) => a + Number(t.volume24h ?? 0), 0);
  const inflow24h = data.txs.filter((t) => t.type === "TRANSFER_IN" || t.type === "SWAP").reduce((a, t) => a + Number(t.valueUsd), 0);

  return (
    <div className="space-y-6 pb-4">
      <PageHeader
        eyebrow="Terminal"
        title="Overview"
        description="Real-time intelligence on the wallets, tokens, and contracts that move the market."
      >
        <Badge variant="autumn" className="gap-1.5"><Sparkles className="h-3 w-3" />Autumn ‘26</Badge>
      </PageHeader>

      <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Tracked AUM"
          value={formatUsd(data.totalNetWorth, { compact: true })}
          delta={4.21}
          icon={Wallet}
          hint={`${data.walletCount} wallets indexed`}
        />
        <StatCard
          label="24h Whale Volume"
          value={formatUsd(totalVolume24h, { compact: true })}
          delta={2.78}
          icon={ArrowRightLeft}
          hint="On-chain whale activity"
        />
        <StatCard
          label="Inflow 24h"
          value={formatUsd(inflow24h, { compact: true })}
          delta={-1.42}
          icon={TrendingUp}
          hint="Net positive flow into top wallets"
        />
        <StatCard
          label="Smart-money signals"
          value={String(data.sigs.length * 12)}
          delta={9.31}
          icon={Crown}
          hint="Last 24h"
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader className="flex-row items-start justify-between space-y-0">
            <div>
              <div className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                ETH Price
              </div>
              <div className="mt-1 flex items-baseline gap-2">
                <div className="num font-display text-2xl font-semibold">
                  {formatUsd(data.seriesEth.at(-1)?.value ?? 0)}
                </div>
                <Badge variant="success">{formatPct(data.tokens.find((t) => t.symbol === "ETH")?.change24h ?? 0)}</Badge>
              </div>
            </div>
            <div className="flex gap-1">
              {["1H", "24H", "7D", "30D"].map((r) => (
                <button
                  key={r}
                  className={cn(
                    "rounded-md border border-white/10 bg-white/[0.03] px-2 py-1 text-[10px] font-semibold uppercase tracking-wider",
                    r === "24H" && "border-magenta-500/40 bg-magenta-500/10 text-magenta-200"
                  )}
                >
                  {r}
                </button>
              ))}
            </div>
          </CardHeader>
          <CardContent>
            <MagentaAreaChart data={data.seriesEth} height={300} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex-row items-start justify-between space-y-0">
            <div className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              Smart Money — Latest
            </div>
            <Button asChild size="sm" variant="ghost"><Link href="/terminal/smart-money">View all</Link></Button>
          </CardHeader>
          <CardContent className="space-y-3">
            {data.sigs.length === 0 ? (
              <p className="text-sm text-muted-foreground">No signals yet.</p>
            ) : (
              data.sigs.map((s) => (
                <div key={s.id} className="flex items-start gap-3 rounded-lg border border-white/5 bg-white/[0.02] p-3">
                  <div className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-gradient-to-br from-magenta-500/40 to-autumn-amber/30 font-display text-[10px] font-bold uppercase">
                    {(s.wallet.displayName ?? s.wallet.ens ?? "??").slice(0, 2)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5 text-xs">
                      <span className="font-display font-semibold">{s.wallet.displayName ?? s.wallet.ens ?? shortAddress(s.wallet.address)}</span>
                      <Badge variant="default" className="text-[9px]">{s.direction}</Badge>
                      <span className="ml-auto text-[10px] text-muted-foreground">{timeAgo(s.detectedAt)}</span>
                    </div>
                    <div className="mt-1 text-xs text-muted-foreground">
                      <span className="text-foreground/90">{formatUsd(Number(s.sizeUsd), { compact: true })}</span> {s.direction.toLowerCase()} on{" "}
                      <span className="text-foreground/90 font-semibold">{s.asset}</span>
                    </div>
                    <div className="mt-1 text-[10px] text-muted-foreground">{s.cohort}</div>
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader className="flex-row items-start justify-between space-y-0">
            <div className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              Top Markets
            </div>
            <Button asChild size="sm" variant="ghost"><Link href="/terminal/portfolio">Open portfolio</Link></Button>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-[1.4fr_1fr_1fr_1fr_1fr] gap-3 px-2 pb-2 text-[10px] uppercase tracking-wider text-muted-foreground">
              <span>Asset</span>
              <span className="text-right">Price</span>
              <span className="text-right">24h</span>
              <span className="text-right">Volume</span>
              <span className="text-right">Sparkline</span>
            </div>
            <div className="space-y-1">
              {data.tokens.map((t) => {
                const series = Array.from({ length: 24 }).map((_, i) => ({
                  value: Number(t.priceUsd) * (1 + Math.sin(i / 3 + t.symbol.length) * 0.04 + (t.change24h / 100) * (i / 24)),
                }));
                return (
                  <div
                    key={t.id}
                    className="grid grid-cols-[1.4fr_1fr_1fr_1fr_1fr] items-center gap-3 rounded-lg border border-transparent px-2 py-2 transition hover:border-white/5 hover:bg-white/[0.03]"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-gradient-to-br from-magenta-500/40 to-autumn-amber/30 font-display text-[10px] font-bold">
                        {t.symbol[0]}
                      </span>
                      <div className="min-w-0">
                        <div className="font-display text-sm font-semibold leading-tight">{t.symbol}</div>
                        <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
                          {t.name} <ChainBadge chain={t.chain as Chain} />
                        </div>
                      </div>
                    </div>
                    <span className="num text-right text-sm">{formatUsd(Number(t.priceUsd))}</span>
                    <span className={cn("num text-right text-sm font-semibold", t.change24h >= 0 ? "text-emerald-300" : "text-rose-300")}>
                      {formatPct(t.change24h)}
                    </span>
                    <span className="num text-right text-sm text-muted-foreground">{formatUsd(Number(t.volume24h), { compact: true })}</span>
                    <div className="h-9 min-w-[80px]">
                      <Sparkline data={series} positive={t.change24h >= 0} />
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex-row items-start justify-between space-y-0">
            <div className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              Live Activity
            </div>
            <Badge variant="success" className="gap-1.5">
              <span className="relative flex h-1.5 w-1.5">
                <span className="absolute inset-0 animate-ping rounded-full bg-emerald-400/60" />
                <span className="relative inline-block h-1.5 w-1.5 rounded-full bg-emerald-400" />
              </span>
              Live
            </Badge>
          </CardHeader>
          <CardContent className="space-y-2.5">
            {data.txs.slice(0, 8).map((tx, i) => (
              <div key={tx.id} className="space-y-1">
                {i > 0 && <Separator className="opacity-50" />}
                <div className="flex items-start gap-3 pt-1">
                  <span className={cn(
                    "grid h-7 w-7 shrink-0 place-items-center rounded-full",
                    tx.type === "TRANSFER_OUT" ? "bg-rose-500/10 text-rose-300 ring-1 ring-rose-500/20" : "bg-emerald-500/10 text-emerald-300 ring-1 ring-emerald-500/20"
                  )}>
                    {tx.type === "TRANSFER_OUT" ? "↗" : "↘"}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5 text-xs">
                      <span className="font-display font-semibold truncate">
                        {tx.wallet.displayName ?? tx.wallet.ens ?? shortAddress(tx.wallet.address)}
                      </span>
                      <ChainBadge chain={tx.chain as Chain} />
                      <span className="ml-auto whitespace-nowrap text-[10px] text-muted-foreground">{timeAgo(tx.timestamp)}</span>
                    </div>
                    <div className="mt-0.5 flex items-center gap-1 text-xs text-muted-foreground">
                      <span className="text-foreground/90 font-semibold">{tx.type.replace("_", " ")}</span>
                      <span>·</span>
                      <span className="text-foreground/90 num">{formatUsd(Number(tx.valueUsd), { compact: true })}</span>
                      <span>of</span>
                      <span className="text-foreground/90 font-semibold">{tx.tokenSymbol}</span>
                    </div>
                    {tx.protocol && (
                      <div className="mt-0.5 text-[10px] text-muted-foreground">via {tx.protocol}</div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
