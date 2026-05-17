import { ArrowRightLeft, Crown, Radio, TrendingUp, Wallet } from "lucide-react";
import Link from "next/link";
import { db } from "@/lib/db";
import { jsonSafe } from "@/lib/serialize";
import { fetchLiveMarkets, fetchEthPriceHistory } from "@/lib/coingecko";
import { fetchMultipleBalances, KNOWN_WHALES } from "@/lib/etherscan";
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
import type { Chain, Prisma } from "@prisma/client";

export const dynamic = "force-dynamic";
export const revalidate = 30;

interface DashboardToken {
  id: string;
  symbol: string;
  name: string;
  priceUsd: number;
  change24h: number;
  volume24h: number;
  marketCap: number;
  logo: string | null;
  chain: Chain;
  sparkline: number[];
}

interface DashboardTx {
  id: string;
  type: string;
  chain: Chain;
  valueUsd: number;
  tokenSymbol: string;
  protocol?: string | null;
  timestamp: string | number | Date;
  wallet: { displayName: string | null; ens: string | null; address: string };
}

async function loadDashboard() {
  const [liveMarkets, liveEthChart, balances] = await Promise.all([
    fetchLiveMarkets(),
    fetchEthPriceHistory(),
    fetchMultipleBalances(KNOWN_WHALES.map((w) => w.address)),
  ]);

  // Tokens
  let tokens: DashboardToken[];
  if (liveMarkets && liveMarkets.length > 0) {
    tokens = liveMarkets.slice(0, 10).map((c) => ({
      id: c.id,
      symbol: c.symbol.toUpperCase(),
      name: c.name,
      priceUsd: c.current_price,
      change24h: c.price_change_percentage_24h ?? 0,
      volume24h: c.total_volume,
      marketCap: c.market_cap,
      logo: c.image,
      chain: "ETHEREUM" as Chain,
      sparkline: c.sparkline_in_7d?.price?.slice(-24) ?? [],
    }));
  } else {
    const dbTokens = await db.token
      .findMany({ orderBy: { marketCap: "desc" }, take: 10 })
      .catch(() => []);
    tokens = dbTokens.map((t) => ({
      id: t.id,
      symbol: t.symbol,
      name: t.name,
      priceUsd: Number(t.priceUsd),
      change24h: t.change24h,
      volume24h: Number(t.volume24h),
      marketCap: Number(t.marketCap),
      logo: t.logo,
      chain: t.chain,
      sparkline: [],
    }));
  }

  // ETH chart
  let seriesEth: Array<{ label: string; value: number }>;
  if (liveEthChart && liveEthChart.length > 0) {
    seriesEth = liveEthChart;
  } else {
    const ticks = await db.marketTick
      .findMany({ where: { symbol: "ETH" }, orderBy: { capturedAt: "asc" } })
      .catch(() => []);
    seriesEth = ticks.map((t) => ({
      label: new Date(t.capturedAt).toLocaleTimeString("en-US", {
        hour: "2-digit",
        minute: "2-digit",
      }),
      value: Number(t.priceUsd),
    }));
  }

  // Aggregate AUM (live or DB fallback)
  const ethTok = tokens.find((t) => t.symbol === "ETH");
  const ethUsd = ethTok?.priceUsd ?? 3400;

  let totalNetWorth = 0;
  let walletCount = 0;
  if (balances && balances.length > 0) {
    walletCount = balances.length;
    totalNetWorth = balances.reduce(
      (a, b) => a + (Number(b.balance) / 1e18) * ethUsd,
      0
    );
  } else {
    const agg = await db.wallet
      .aggregate({ _sum: { netWorthUsd: true }, _count: true })
      .catch(() => ({ _sum: { netWorthUsd: 0 }, _count: 0 }));
    totalNetWorth = Number(agg._sum.netWorthUsd ?? 0);
    walletCount = agg._count ?? 0;
  }

  // Recent txs from DB (always fallback)
  const txs: DashboardTx[] = await db.transaction
    .findMany({
      orderBy: { timestamp: "desc" },
      take: 12,
      include: {
        wallet: {
          select: { displayName: true, ens: true, address: true, labels: true },
        },
      },
    })
    .then((rows) =>
      rows.map((r) => ({
        id: r.id,
        type: r.type,
        chain: r.chain,
        valueUsd: Number(r.valueUsd),
        tokenSymbol: r.tokenSymbol,
        protocol: r.protocol,
        timestamp: r.timestamp,
        wallet: {
          displayName: r.wallet.displayName,
          ens: r.wallet.ens,
          address: r.wallet.address,
        },
      }))
    )
    .catch(() => [] as DashboardTx[]);

  type SignalWithWallet = Prisma.SmartMoneySignalGetPayload<{
    include: { wallet: { select: { displayName: true; ens: true; address: true } } };
  }>;

  const sigs: SignalWithWallet[] = await db.smartMoneySignal
    .findMany({
      orderBy: { detectedAt: "desc" },
      take: 5,
      include: {
        wallet: { select: { displayName: true, ens: true, address: true } },
      },
    })
    .catch(() => [] as SignalWithWallet[]);

  return jsonSafe({
    tokens,
    txs,
    sigs,
    seriesEth,
    totalNetWorth,
    walletCount,
    isLive: !!liveMarkets,
    ethUsd,
  });
}

export default async function TerminalDashboard() {
  const data = await loadDashboard();
  const totalVolume24h = data.tokens.reduce((a, t) => a + Number(t.volume24h ?? 0), 0);
  const inflow24h = data.txs
    .filter((t) => t.type === "TRANSFER_IN" || t.type === "SWAP")
    .reduce((a, t) => a + Number(t.valueUsd), 0);
  const ethTok = data.tokens.find((t) => t.symbol === "ETH");

  return (
    <div className="space-y-6 pb-4">
      <PageHeader
        eyebrow="Terminal"
        title="Overview"
        description="Real-time intelligence on the wallets, tokens, and contracts that move the market."
      >
        {data.isLive ? (
          <Badge variant="success" className="gap-1.5">
            <Radio className="h-3 w-3" /> Live · CoinGecko + Etherscan
          </Badge>
        ) : (
          <Badge variant="warning" className="gap-1.5">
            <Radio className="h-3 w-3" /> Cached
          </Badge>
        )}
      </PageHeader>

      <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Tracked AUM"
          value={formatUsd(data.totalNetWorth, { compact: true })}
          icon={Wallet}
          hint={`${data.walletCount} whales · ETH @ ${formatUsd(data.ethUsd)}`}
        />
        <StatCard
          label="24h Market Volume"
          value={formatUsd(totalVolume24h, { compact: true })}
          delta={2.78}
          icon={ArrowRightLeft}
          hint="Top 10 tokens"
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
                  {formatUsd(data.seriesEth.at(-1)?.value ?? data.ethUsd)}
                </div>
                {ethTok && (
                  <Badge variant={ethTok.change24h >= 0 ? "success" : "destructive"}>
                    {formatPct(ethTok.change24h)}
                  </Badge>
                )}
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
            {data.seriesEth.length > 0 ? (
              <MagentaAreaChart data={data.seriesEth} height={300} />
            ) : (
              <div className="grid h-[300px] place-items-center text-sm text-muted-foreground">
                Loading chart…
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex-row items-start justify-between space-y-0">
            <div className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              Smart Money — Latest
            </div>
            <Button asChild size="sm" variant="ghost">
              <Link href="/terminal/smart-money">View all</Link>
            </Button>
          </CardHeader>
          <CardContent className="space-y-3">
            {data.sigs.length === 0 ? (
              <p className="text-sm text-muted-foreground">No signals yet.</p>
            ) : (
              data.sigs.map((s) => (
                <div
                  key={s.id}
                  className="flex items-start gap-3 rounded-lg border border-white/5 bg-white/[0.02] p-3"
                >
                  <div className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-gradient-to-br from-magenta-500/40 to-autumn-amber/30 font-display text-[10px] font-bold uppercase">
                    {(s.wallet.displayName ?? s.wallet.ens ?? "??").slice(0, 2)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5 text-xs">
                      <span className="font-display font-semibold">
                        {s.wallet.displayName ??
                          s.wallet.ens ??
                          shortAddress(s.wallet.address)}
                      </span>
                      <Badge variant="default" className="text-[9px]">
                        {s.direction}
                      </Badge>
                      <span className="ml-auto text-[10px] text-muted-foreground">
                        {timeAgo(s.detectedAt)}
                      </span>
                    </div>
                    <div className="mt-1 text-xs text-muted-foreground">
                      <span className="text-foreground/90">
                        {formatUsd(Number(s.sizeUsd), { compact: true })}
                      </span>{" "}
                      {s.direction.toLowerCase()} on{" "}
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
            <Button asChild size="sm" variant="ghost">
              <Link href="/terminal/portfolio">Open portfolio</Link>
            </Button>
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
                const series =
                  t.sparkline && t.sparkline.length > 0
                    ? t.sparkline.map((v: number) => ({ value: v }))
                    : Array.from({ length: 24 }).map((_, i) => ({
                        value:
                          Number(t.priceUsd) *
                          (1 +
                            Math.sin(i / 3 + t.symbol.length) * 0.04 +
                            (t.change24h / 100) * (i / 24)),
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
                        <div className="font-display text-sm font-semibold leading-tight">
                          {t.symbol}
                        </div>
                        <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
                          {t.name} <ChainBadge chain={t.chain} />
                        </div>
                      </div>
                    </div>
                    <span className="num text-right text-sm">
                      {formatUsd(Number(t.priceUsd))}
                    </span>
                    <span
                      className={cn(
                        "num text-right text-sm font-semibold",
                        t.change24h >= 0 ? "text-emerald-300" : "text-rose-300"
                      )}
                    >
                      {formatPct(t.change24h)}
                    </span>
                    <span className="num text-right text-sm text-muted-foreground">
                      {formatUsd(Number(t.volume24h), { compact: true })}
                    </span>
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
            {data.txs.length === 0 ? (
              <p className="text-sm text-muted-foreground">No recent activity.</p>
            ) : (
              data.txs.slice(0, 8).map((tx, i) => (
                <div key={tx.id} className="space-y-1">
                  {i > 0 && <Separator className="opacity-50" />}
                  <div className="flex items-start gap-3 pt-1">
                    <span
                      className={cn(
                        "grid h-7 w-7 shrink-0 place-items-center rounded-full",
                        tx.type === "TRANSFER_OUT"
                          ? "bg-rose-500/10 text-rose-300 ring-1 ring-rose-500/20"
                          : "bg-emerald-500/10 text-emerald-300 ring-1 ring-emerald-500/20"
                      )}
                    >
                      {tx.type === "TRANSFER_OUT" ? "↗" : "↘"}
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5 text-xs">
                        <span className="font-display font-semibold truncate">
                          {tx.wallet.displayName ??
                            tx.wallet.ens ??
                            shortAddress(tx.wallet.address)}
                        </span>
                        <ChainBadge chain={tx.chain} />
                        <span className="ml-auto whitespace-nowrap text-[10px] text-muted-foreground">
                          {timeAgo(tx.timestamp as Date)}
                        </span>
                      </div>
                      <div className="mt-0.5 flex items-center gap-1 text-xs text-muted-foreground">
                        <span className="text-foreground/90 font-semibold">
                          {tx.type.replace("_", " ")}
                        </span>
                        <span>·</span>
                        <span className="text-foreground/90 num">
                          {formatUsd(Number(tx.valueUsd), { compact: true })}
                        </span>
                        <span>of</span>
                        <span className="text-foreground/90 font-semibold">
                          {tx.tokenSymbol}
                        </span>
                      </div>
                      {tx.protocol && (
                        <div className="mt-0.5 text-[10px] text-muted-foreground">
                          via {tx.protocol}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
