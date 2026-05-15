import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowUpRight, Copy, ExternalLink, Users, Wallet, TrendingUp, Activity } from "lucide-react";
import type { Chain } from "@prisma/client";
import { db } from "@/lib/db";
import { jsonSafe } from "@/lib/serialize";
import { CHAINS } from "@/lib/chains";
import { formatPct, formatUsd, shortAddress, timeAgo } from "@/lib/format";
import { cn } from "@/lib/utils";
import { PageHeader } from "@/components/terminal/page-header";
import { StatCard } from "@/components/terminal/stat-card";
import { ChainBadge } from "@/components/terminal/chain-badge";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Donut, DONUT_COLORS } from "@/components/chart/donut";
import { FlowBar } from "@/components/chart/flow-bar";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

export const dynamic = "force-dynamic";

async function loadWhale(address: string) {
  const wallet = await db.wallet.findFirst({
    where: { OR: [{ address: address.toLowerCase() }, { ens: address }] },
    include: {
      holdings: { include: { token: true }, orderBy: { valueUsd: "desc" } },
      transactions: { orderBy: { timestamp: "desc" }, take: 30 },
      signals: { orderBy: { detectedAt: "desc" }, take: 10 },
    },
  });
  return wallet ? jsonSafe(wallet) : null;
}

export default async function WhaleProfilePage({
  params,
}: {
  params: { address: string };
}) {
  const w = await loadWhale(decodeURIComponent(params.address));
  if (!w) notFound();

  const allocation = w.holdings.map((h) => ({ name: h.token.symbol, value: Number(h.valueUsd) }));
  const totalValue = allocation.reduce((a, x) => a + x.value, 0);

  // Build flow buckets from this wallet's txs across last 7 days
  const day = 24 * 60 * 60 * 1000;
  const now = Date.now();
  const buckets = Array.from({ length: 7 }).map((_, i) => {
    const start = now - (6 - i) * day;
    const end = start + day;
    const inDay = w.transactions.filter((t) => {
      const ts = new Date(t.timestamp).getTime();
      return ts >= start && ts < end;
    });
    return {
      label: new Date(start).toLocaleDateString("en-US", { weekday: "short" }),
      inflow: inDay.filter((t) => t.type === "TRANSFER_IN" || t.type === "SWAP" || t.type === "ADD_LIQUIDITY").reduce((a, t) => a + Number(t.valueUsd), 0),
      outflow: inDay.filter((t) => t.type === "TRANSFER_OUT" || t.type === "REMOVE_LIQUIDITY").reduce((a, t) => a + Number(t.valueUsd), 0),
    };
  });

  const chainMeta = CHAINS[w.chain as Chain];

  return (
    <div className="space-y-6 pb-4">
      <PageHeader
        eyebrow="Whale Profile"
        title={w.displayName ?? w.ens ?? shortAddress(w.address)}
        description={<span className="font-mono text-xs">{w.address}</span>}
      >
        <Button asChild size="sm" variant="ghost" className="gap-1.5">
          <a href={chainMeta.explorer(w.address)} target="_blank" rel="noopener noreferrer">
            <ExternalLink className="h-3.5 w-3.5" />
            Explorer
          </a>
        </Button>
        <Button size="sm" variant="outline" className="gap-1.5">
          <Copy className="h-3.5 w-3.5" />
          Follow
        </Button>
      </PageHeader>

      <div className="flex flex-wrap items-center gap-2">
        <ChainBadge chain={w.chain as Chain} />
        {w.labels.map((l: string) => (
          <Badge key={l} variant="autumn">{l.replace("_", " ")}</Badge>
        ))}
        {w.bio && <span className="text-sm text-muted-foreground">— {w.bio}</span>}
      </div>

      <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Net Worth" value={formatUsd(Number(w.netWorthUsd), { compact: true })} delta={Number(w.pnl30dPct)} icon={Wallet} />
        <StatCard label="30d PnL" value={formatUsd(Number(w.pnl30dUsd), { compact: true })} delta={Number(w.pnl30dPct)} icon={TrendingUp} />
        <StatCard label="Win rate" value={`${(Number(w.winRate) * 100).toFixed(1)}%`} icon={Activity} />
        <StatCard label="Followers" value={(w.followers ?? 0).toLocaleString()} icon={Users} />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <div className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">7d Flow</div>
          </CardHeader>
          <CardContent><FlowBar data={buckets} height={240} /></CardContent>
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
                  <span className="ml-auto num text-muted-foreground">{((a.value / totalValue) * 100).toFixed(1)}%</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="activity">
        <TabsList>
          <TabsTrigger value="activity">Activity</TabsTrigger>
          <TabsTrigger value="signals">Smart-money signals</TabsTrigger>
          <TabsTrigger value="holdings">Holdings</TabsTrigger>
        </TabsList>

        <TabsContent value="activity">
          <Card>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Type</TableHead>
                  <TableHead>Asset</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                  <TableHead className="text-right">Value</TableHead>
                  <TableHead>Counterparty</TableHead>
                  <TableHead>Hash</TableHead>
                  <TableHead className="text-right">When</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {w.transactions.map((tx) => (
                  <TableRow key={tx.id}>
                    <TableCell>
                      <Badge variant={tx.type === "TRANSFER_OUT" ? "destructive" : "default"} className="text-[9px]">
                        {tx.type.replace("_", " ")}
                      </Badge>
                    </TableCell>
                    <TableCell className="font-display font-semibold text-sm">{tx.tokenSymbol}</TableCell>
                    <TableCell className="num text-right text-sm">{Number(tx.tokenAmount).toLocaleString("en-US", { maximumFractionDigits: 2 })}</TableCell>
                    <TableCell className="num text-right text-sm">{formatUsd(Number(tx.valueUsd), { compact: true })}</TableCell>
                    <TableCell className="font-mono text-[11px] text-muted-foreground">{shortAddress(tx.type === "TRANSFER_IN" ? tx.fromAddr : tx.toAddr)}</TableCell>
                    <TableCell>
                      <Link
                        href={CHAINS[tx.chain as Chain].txExplorer(tx.hash)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="num text-xs text-magenta-300 hover:text-magenta-200 inline-flex items-center gap-1"
                      >
                        {shortAddress(tx.hash, 8, 6)} <ArrowUpRight className="h-3 w-3" />
                      </Link>
                    </TableCell>
                    <TableCell className="text-right text-[11px] text-muted-foreground">{timeAgo(tx.timestamp)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
        </TabsContent>

        <TabsContent value="signals">
          <Card>
            <CardContent className="p-5">
              {w.signals.length === 0 ? (
                <p className="text-sm text-muted-foreground">No smart-money signals attached.</p>
              ) : (
                <div className="space-y-2">
                  {w.signals.map((s) => (
                    <div key={s.id} className="flex items-start gap-3 rounded-lg border border-white/5 bg-white/[0.02] p-3">
                      <div className={cn(
                        "grid h-8 w-8 place-items-center rounded-full text-[10px] font-bold",
                        s.direction === "LONG" || s.direction === "ACCUMULATE" ? "bg-emerald-500/10 text-emerald-300 ring-1 ring-emerald-500/30" : "bg-rose-500/10 text-rose-300 ring-1 ring-rose-500/30"
                      )}>
                        {s.direction[0]}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-1.5 text-xs">
                          <Badge variant="default" className="text-[9px]">{s.direction}</Badge>
                          <span className="font-display font-semibold">{s.asset}</span>
                          <span className="text-muted-foreground">·</span>
                          <span className="num">{formatUsd(Number(s.sizeUsd), { compact: true })}</span>
                          <span className="ml-auto text-[10px] text-muted-foreground">{timeAgo(s.detectedAt)}</span>
                        </div>
                        <div className="mt-1 text-xs text-muted-foreground">{s.thesis}</div>
                        <div className="mt-1.5 flex items-center gap-3 text-[10px] text-muted-foreground">
                          <span>Cohort: <span className="text-foreground/80">{s.cohort}</span></span>
                          <span>Conviction: <span className="text-magenta-300 font-semibold">{(Number(s.conviction) * 100).toFixed(0)}%</span></span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="holdings">
          <Card>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Asset</TableHead>
                  <TableHead className="text-right">Balance</TableHead>
                  <TableHead className="text-right">Price</TableHead>
                  <TableHead className="text-right">Value</TableHead>
                  <TableHead className="text-right">PnL</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {w.holdings.map((h) => (
                  <TableRow key={h.id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <span className="grid h-7 w-7 place-items-center rounded-full bg-gradient-to-br from-magenta-500/40 to-autumn-amber/30 font-display text-[10px] font-bold">
                          {h.token.symbol[0]}
                        </span>
                        <div>
                          <div className="font-display text-sm font-semibold leading-tight">{h.token.symbol}</div>
                          <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
                            <ChainBadge chain={h.token.chain as Chain} />
                          </div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="num text-right text-sm">{Number(h.amount).toLocaleString("en-US", { maximumFractionDigits: 4 })}</TableCell>
                    <TableCell className="num text-right text-sm">{formatUsd(Number(h.token.priceUsd))}</TableCell>
                    <TableCell className="num text-right text-sm font-semibold">{formatUsd(Number(h.valueUsd), { compact: true })}</TableCell>
                    <TableCell className={cn("num text-right text-sm font-semibold", Number(h.pnlUsd) >= 0 ? "text-emerald-300" : "text-rose-300")}>
                      {formatUsd(Number(h.pnlUsd), { compact: true })} <span className="opacity-60 text-[10px]">({formatPct(Number(h.pnlPct))})</span>
                    </TableCell>
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
