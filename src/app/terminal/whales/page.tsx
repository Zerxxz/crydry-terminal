import Link from "next/link";
import { ArrowUpRight, Crown, TrendingUp, Users, Waves, Radio } from "lucide-react";
import type { Chain } from "@prisma/client";
import { db } from "@/lib/db";
import { jsonSafe } from "@/lib/serialize";
import { fetchMultipleBalances, KNOWN_WHALES } from "@/lib/etherscan";
import { fetchSimplePrices } from "@/lib/coingecko";
import { formatPct, formatUsd, shortAddress } from "@/lib/format";
import { cn } from "@/lib/utils";
import { PageHeader } from "@/components/terminal/page-header";
import { StatCard } from "@/components/terminal/stat-card";
import { ChainBadge } from "@/components/terminal/chain-badge";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { FlowBar } from "@/components/chart/flow-bar";
import { Sparkline } from "@/components/chart/sparkline";

export const dynamic = "force-dynamic";
export const revalidate = 60;

interface WhaleRow {
  id: string;
  address: string;
  ens: string | null;
  displayName: string | null;
  chain: Chain;
  labels: string[];
  netWorthUsd: number;
  balanceEth: number | null;
  pnl30dUsd: number;
  pnl30dPct: number;
  winRate: number;
  followers: number;
}

async function loadWhales() {
  // Try live Etherscan + CoinGecko first
  const addresses = KNOWN_WHALES.map((w) => w.address);
  const [balances, ethPrice] = await Promise.all([
    fetchMultipleBalances(addresses),
    fetchSimplePrices(["ETH"]),
  ]);

  const ethUsd = ethPrice?.ethereum?.usd ?? 3400;

  let wallets: WhaleRow[];
  let isLive = false;

  if (balances && balances.length > 0) {
    isLive = true;
    wallets = balances
      .map((b) => {
        const meta = KNOWN_WHALES.find(
          (w) => w.address.toLowerCase() === b.account.toLowerCase()
        );
        const balanceEth = Number(b.balance) / 1e18;
        const netWorthUsd = balanceEth * ethUsd;
        return {
          id: b.account,
          address: b.account,
          ens: meta?.ens ?? null,
          displayName: meta?.label ?? null,
          chain: (meta?.chain as Chain) ?? "ETHEREUM",
          labels: ["WHALE"],
          netWorthUsd,
          balanceEth,
          pnl30dUsd: 0,
          pnl30dPct: 0,
          winRate: 0,
          followers: 0,
        };
      })
      .sort((a, b) => b.netWorthUsd - a.netWorthUsd);
  } else {
    // Fallback to seeded DB
    const dbWallets = await db.wallet.findMany({
      orderBy: { netWorthUsd: "desc" },
      take: 50,
    });
    wallets = dbWallets.map((w) => ({
      id: w.id,
      address: w.address,
      ens: w.ens,
      displayName: w.displayName,
      chain: w.chain,
      labels: w.labels,
      netWorthUsd: Number(w.netWorthUsd),
      balanceEth: null,
      pnl30dUsd: Number(w.pnl30dUsd),
      pnl30dPct: w.pnl30dPct,
      winRate: w.winRate,
      followers: w.followers,
    }));
  }

  // Build flow buckets from DB transactions (always works)
  const txs = await db.transaction.findMany({
    orderBy: { timestamp: "desc" },
    take: 1000,
  });
  const day = 24 * 60 * 60 * 1000;
  const now = Date.now();
  const buckets = Array.from({ length: 7 }).map((_, i) => {
    const start = now - (6 - i) * day;
    const end = start + day;
    const inDay = txs.filter((t) => {
      const ts = new Date(t.timestamp).getTime();
      return ts >= start && ts < end;
    });
    return {
      label: new Date(start).toLocaleDateString("en-US", { weekday: "short" }),
      inflow: inDay
        .filter((t) => t.type === "TRANSFER_IN" || t.type === "SWAP" || t.type === "ADD_LIQUIDITY")
        .reduce((a, t) => a + Number(t.valueUsd), 0),
      outflow: inDay
        .filter((t) => t.type === "TRANSFER_OUT" || t.type === "REMOVE_LIQUIDITY")
        .reduce((a, t) => a + Number(t.valueUsd), 0),
    };
  });

  return jsonSafe({ wallets, buckets, isLive, ethUsd });
}

export default async function WhalesPage() {
  const data = await loadWhales();

  const totalAum = data.wallets.reduce((a, w) => a + w.netWorthUsd, 0);
  const totalPnl = data.wallets.reduce((a, w) => a + w.pnl30dUsd, 0);
  const inflow = data.buckets.reduce((a, b) => a + b.inflow, 0);
  const outflow = data.buckets.reduce((a, b) => a + b.outflow, 0);

  return (
    <div className="space-y-6 pb-4">
      <PageHeader
        eyebrow="Tracker"
        title="Whale Tracker"
        description="Real-time on-chain net worth for the top whale wallets. Updates every 60 seconds from Etherscan + CoinGecko."
      >
        {data.isLive ? (
          <Badge variant="success" className="gap-1.5">
            <Radio className="h-3 w-3" /> Live · Etherscan
          </Badge>
        ) : (
          <Badge variant="warning" className="gap-1.5">
            <Radio className="h-3 w-3" /> Cached
          </Badge>
        )}
      </PageHeader>

      <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Aggregate AUM"
          value={formatUsd(totalAum, { compact: true })}
          icon={Crown}
          hint={`${data.wallets.length} wallets · ETH @ ${formatUsd(data.ethUsd)}`}
        />
        <StatCard
          label="30d Net PnL"
          value={formatUsd(totalPnl, { compact: true })}
          delta={totalAum > 0 ? (totalPnl / totalAum) * 100 : 0}
          icon={TrendingUp}
        />
        <StatCard
          label="7d Inflow"
          value={formatUsd(inflow, { compact: true })}
          delta={inflow + outflow > 0 ? (inflow / (inflow + outflow)) * 100 - 50 : 0}
          icon={Waves}
        />
        <StatCard
          label="Followers"
          value={data.wallets.reduce((a, w) => a + (w.followers ?? 0), 0).toLocaleString()}
          icon={Users}
          hint="Across tracked wallets"
        />
      </div>

      <Card>
        <CardHeader className="flex-row items-center justify-between space-y-0">
          <div>
            <div className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              7-day flow
            </div>
            <div className="num font-display text-xl font-semibold">
              <span className="text-emerald-300">+{formatUsd(inflow, { compact: true })}</span>{" "}
              <span className="text-muted-foreground">·</span>{" "}
              <span className="text-rose-300">-{formatUsd(outflow, { compact: true })}</span>
            </div>
          </div>
          <div className="flex items-center gap-3 text-[11px] text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded bg-emerald-400" /> Inflow
            </span>
            <span className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded bg-magenta-500" /> Outflow
            </span>
          </div>
        </CardHeader>
        <CardContent>
          <FlowBar data={data.buckets} height={220} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex-row items-center justify-between space-y-0">
          <div className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            Leaderboard
          </div>
          <Badge variant="secondary">{data.wallets.length} wallets</Badge>
        </CardHeader>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-12">#</TableHead>
              <TableHead>Wallet</TableHead>
              <TableHead>Labels</TableHead>
              <TableHead className="text-right">Balance</TableHead>
              <TableHead className="text-right">Net Worth</TableHead>
              <TableHead className="text-right">Trend</TableHead>
              <TableHead className="text-right" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.wallets.map((w, i) => {
              const series = Array.from({ length: 18 }).map((_, k) => ({
                value:
                  w.netWorthUsd *
                  (1 +
                    Math.sin(k / 3 + (w.address?.length ?? 0)) * 0.06 +
                    (w.pnl30dPct / 100) * (k / 18)),
              }));
              return (
                <TableRow key={w.id}>
                  <TableCell className="num text-muted-foreground">
                    {(i + 1).toString().padStart(2, "0")}
                  </TableCell>
                  <TableCell>
                    <Link
                      href={`/terminal/whales/${w.address}`}
                      className="group flex items-center gap-2.5"
                    >
                      <span className="grid h-9 w-9 place-items-center rounded-full bg-gradient-to-br from-magenta-500/40 to-autumn-amber/30 font-display text-xs font-bold uppercase">
                        {(w.displayName ?? w.ens ?? "??").slice(0, 2)}
                      </span>
                      <div>
                        <div className="font-display text-sm font-semibold leading-tight transition group-hover:text-magenta-200">
                          {w.displayName ?? w.ens ?? shortAddress(w.address)}
                        </div>
                        <div className="font-mono text-[10px] text-muted-foreground">
                          {shortAddress(w.address, 8, 6)}
                        </div>
                      </div>
                    </Link>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {w.labels.slice(0, 2).map((l) => (
                        <Badge key={l} variant="autumn" className="text-[9px]">
                          {l.replace("_", " ")}
                        </Badge>
                      ))}
                      <ChainBadge chain={w.chain} />
                    </div>
                  </TableCell>
                  <TableCell className="num text-right text-sm">
                    {w.balanceEth !== null
                      ? `${w.balanceEth.toLocaleString("en-US", { maximumFractionDigits: 4 })} ETH`
                      : "—"}
                  </TableCell>
                  <TableCell className="num text-right text-sm font-semibold">
                    {formatUsd(w.netWorthUsd, { compact: true })}
                  </TableCell>
                  <TableCell>
                    <div className="ml-auto h-9 w-24">
                      <Sparkline data={series} positive={w.pnl30dPct >= 0} />
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    <Link
                      href={`/terminal/whales/${w.address}`}
                      className="inline-flex items-center gap-1 text-xs text-magenta-300 transition hover:text-magenta-200"
                    >
                      Open <ArrowUpRight className="h-3 w-3" />
                    </Link>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}
