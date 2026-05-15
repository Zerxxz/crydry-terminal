import Link from "next/link";
import { ArrowUpRight, Crown, TrendingUp, Users, Waves } from "lucide-react";
import type { Chain } from "@prisma/client";
import { db } from "@/lib/db";
import { jsonSafe } from "@/lib/serialize";
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

async function loadWhales() {
  const wallets = await db.wallet.findMany({
    orderBy: { netWorthUsd: "desc" },
    take: 50,
  });

  const txs = await db.transaction.findMany({
    where: { walletId: { in: wallets.map((w) => w.id) } },
    orderBy: { timestamp: "desc" },
    take: 1000,
  });

  // Build last-7-days flow buckets
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
      inflow: inDay.filter((t) => t.type === "TRANSFER_IN" || t.type === "SWAP" || t.type === "ADD_LIQUIDITY").reduce((a, t) => a + Number(t.valueUsd), 0),
      outflow: inDay.filter((t) => t.type === "TRANSFER_OUT" || t.type === "REMOVE_LIQUIDITY").reduce((a, t) => a + Number(t.valueUsd), 0),
    };
  });

  return jsonSafe({ wallets, buckets });
}

export default async function WhalesPage() {
  const data = await loadWhales();

  const totalAum = data.wallets.reduce((a, w) => a + Number(w.netWorthUsd), 0);
  const totalPnl = data.wallets.reduce((a, w) => a + Number(w.pnl30dUsd), 0);
  const inflow = data.buckets.reduce((a, b) => a + b.inflow, 0);
  const outflow = data.buckets.reduce((a, b) => a + b.outflow, 0);

  return (
    <div className="space-y-6 pb-4">
      <PageHeader
        eyebrow="Tracker"
        title="Whale Tracker"
        description="The top 50 wallets we track — sorted by on-chain net worth. Click any wallet for a full activity profile."
      />

      <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Aggregate AUM" value={formatUsd(totalAum, { compact: true })} icon={Crown} hint={`${data.wallets.length} wallets`} />
        <StatCard label="30d Net PnL" value={formatUsd(totalPnl, { compact: true })} delta={(totalPnl / totalAum) * 100} icon={TrendingUp} />
        <StatCard label="7d Inflow" value={formatUsd(inflow, { compact: true })} delta={(inflow / (inflow + outflow)) * 100 - 50} icon={Waves} />
        <StatCard label="Followers" value={data.wallets.reduce((a, w) => a + (w.followers ?? 0), 0).toLocaleString()} icon={Users} hint="Across tracked wallets" />
      </div>

      <Card>
        <CardHeader className="flex-row items-center justify-between space-y-0">
          <div>
            <div className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">7-day flow</div>
            <div className="num font-display text-xl font-semibold">
              <span className="text-emerald-300">+{formatUsd(inflow, { compact: true })}</span>{" "}
              <span className="text-muted-foreground">·</span>{" "}
              <span className="text-rose-300">-{formatUsd(outflow, { compact: true })}</span>
            </div>
          </div>
          <div className="flex items-center gap-3 text-[11px] text-muted-foreground">
            <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded bg-emerald-400" /> Inflow</span>
            <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded bg-magenta-500" /> Outflow</span>
          </div>
        </CardHeader>
        <CardContent>
          <FlowBar data={data.buckets} height={220} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex-row items-center justify-between space-y-0">
          <div className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Leaderboard</div>
          <Badge variant="secondary">{data.wallets.length} wallets</Badge>
        </CardHeader>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-12">#</TableHead>
              <TableHead>Wallet</TableHead>
              <TableHead>Labels</TableHead>
              <TableHead className="text-right">Net Worth</TableHead>
              <TableHead className="text-right">30d PnL</TableHead>
              <TableHead className="text-right">Win rate</TableHead>
              <TableHead className="text-right">Trend</TableHead>
              <TableHead className="text-right" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.wallets.map((w, i) => {
              const series = Array.from({ length: 18 }).map((_, k) => ({
                value: Number(w.netWorthUsd) * (1 + Math.sin(k / 3 + (w.address?.length ?? 0)) * 0.06 + (Number(w.pnl30dPct) / 100) * (k / 18)),
              }));
              return (
                <TableRow key={w.id}>
                  <TableCell className="num text-muted-foreground">{(i + 1).toString().padStart(2, "0")}</TableCell>
                  <TableCell>
                    <Link href={`/terminal/whales/${w.address}`} className="group flex items-center gap-2.5">
                      <span className="grid h-9 w-9 place-items-center rounded-full bg-gradient-to-br from-magenta-500/40 to-autumn-amber/30 font-display text-xs font-bold uppercase">
                        {(w.displayName ?? w.ens ?? "??").slice(0, 2)}
                      </span>
                      <div>
                        <div className="font-display text-sm font-semibold leading-tight transition group-hover:text-magenta-200">
                          {w.displayName ?? w.ens ?? shortAddress(w.address)}
                        </div>
                        <div className="font-mono text-[10px] text-muted-foreground">{shortAddress(w.address, 8, 6)}</div>
                      </div>
                    </Link>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {w.labels.slice(0, 2).map((l) => (
                        <Badge key={l} variant="autumn" className="text-[9px]">{l.replace("_", " ")}</Badge>
                      ))}
                      <ChainBadge chain={w.chain as Chain} />
                    </div>
                  </TableCell>
                  <TableCell className="num text-right text-sm font-semibold">{formatUsd(Number(w.netWorthUsd), { compact: true })}</TableCell>
                  <TableCell className={cn("num text-right text-sm font-semibold", Number(w.pnl30dUsd) >= 0 ? "text-emerald-300" : "text-rose-300")}>
                    {Number(w.pnl30dUsd) === 0 ? "—" : (
                      <>
                        {formatUsd(Number(w.pnl30dUsd), { compact: true })}{" "}
                        <span className="text-[10px] opacity-70">({formatPct(Number(w.pnl30dPct))})</span>
                      </>
                    )}
                  </TableCell>
                  <TableCell className="num text-right text-sm">
                    {w.winRate ? `${(Number(w.winRate) * 100).toFixed(0)}%` : "—"}
                  </TableCell>
                  <TableCell>
                    <div className="ml-auto h-9 w-24"><Sparkline data={series} positive={Number(w.pnl30dPct) >= 0} /></div>
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
