import Link from "next/link";
import { ArrowUpRight, Brain, Crown, Target, Zap } from "lucide-react";
import { db } from "@/lib/db";
import { jsonSafe } from "@/lib/serialize";
import { formatPct, formatUsd, shortAddress, timeAgo } from "@/lib/format";
import { cn } from "@/lib/utils";
import { PageHeader } from "@/components/terminal/page-header";
import { StatCard } from "@/components/terminal/stat-card";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

export const dynamic = "force-dynamic";

async function loadSmartMoney() {
  const [wallets, signals] = await Promise.all([
    db.wallet.findMany({
      where: { labels: { has: "SMART_MONEY" } },
      orderBy: { pnl30dPct: "desc" },
    }),
    db.smartMoneySignal.findMany({
      orderBy: { detectedAt: "desc" },
      take: 60,
      include: { wallet: { select: { address: true, displayName: true, ens: true } } },
    }),
  ]);
  return jsonSafe({ wallets, signals });
}

export default async function SmartMoneyPage() {
  const { wallets, signals } = await loadSmartMoney();

  // Cohort aggregation
  type Agg = { name: string; size: number; signals: number; longShare: number; bestAsset: string; bestSize: number };
  const cohortMap = new Map<string, Agg>();
  for (const s of signals) {
    if (!cohortMap.has(s.cohort)) {
      cohortMap.set(s.cohort, { name: s.cohort, size: 0, signals: 0, longShare: 0, bestAsset: s.asset, bestSize: 0 });
    }
    const c = cohortMap.get(s.cohort)!;
    c.size += Number(s.sizeUsd);
    c.signals += 1;
    if (s.direction === "LONG" || s.direction === "ACCUMULATE") c.longShare += 1;
    if (Number(s.sizeUsd) > c.bestSize) {
      c.bestSize = Number(s.sizeUsd);
      c.bestAsset = s.asset;
    }
  }
  const cohorts = Array.from(cohortMap.values()).map((c) => ({
    ...c,
    longShare: c.signals === 0 ? 0 : (c.longShare / c.signals) * 100,
  })).sort((a, b) => b.size - a.size);

  // Asset rotation: which assets is the cohort accumulating now?
  const assetMap = new Map<string, { sym: string; size: number; signals: number; net: number }>();
  for (const s of signals) {
    const sign = s.direction === "LONG" || s.direction === "ACCUMULATE" ? 1 : s.direction === "DISTRIBUTE" || s.direction === "SHORT" ? -1 : 0;
    if (!assetMap.has(s.asset)) assetMap.set(s.asset, { sym: s.asset, size: 0, signals: 0, net: 0 });
    const a = assetMap.get(s.asset)!;
    a.size += Number(s.sizeUsd);
    a.signals += 1;
    a.net += sign * Number(s.sizeUsd);
  }
  const assetRotation = Array.from(assetMap.values()).sort((a, b) => Math.abs(b.net) - Math.abs(a.net)).slice(0, 10);

  const totalSize = signals.reduce((a, s) => a + Number(s.sizeUsd), 0);
  const avgConviction = signals.length === 0 ? 0 : (signals.reduce((a, s) => a + Number(s.conviction), 0) / signals.length) * 100;

  return (
    <div className="space-y-6 pb-4">
      <PageHeader
        eyebrow="Cohorts"
        title="Smart Money"
        description="AI-clustered cohorts of consistently profitable wallets, with rotation signals and conviction scoring."
      >
        <Badge variant="autumn" className="gap-1.5"><Brain className="h-3 w-3" />AI cohort engine</Badge>
      </PageHeader>

      <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Smart wallets" value={String(wallets.length)} icon={Crown} hint="Profitable, consistent, classified" />
        <StatCard label="Active cohorts" value={String(cohorts.length)} icon={Target} />
        <StatCard label="24h capital flow" value={formatUsd(totalSize, { compact: true })} delta={4.2} icon={Zap} />
        <StatCard label="Avg conviction" value={`${avgConviction.toFixed(0)}%`} delta={2.1} icon={Brain} />
      </div>

      <Tabs defaultValue="cohorts">
        <TabsList>
          <TabsTrigger value="cohorts">Cohorts</TabsTrigger>
          <TabsTrigger value="leaderboard">Leaderboard</TabsTrigger>
          <TabsTrigger value="rotation">Asset rotation</TabsTrigger>
          <TabsTrigger value="signals">Live signals</TabsTrigger>
        </TabsList>

        <TabsContent value="cohorts">
          <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
            {cohorts.map((c) => (
              <Card key={c.name} className="p-5">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Cohort</div>
                    <div className="font-display text-base font-semibold">{c.name}</div>
                  </div>
                  <Badge variant={c.longShare >= 50 ? "success" : "destructive"}>
                    {c.longShare >= 50 ? "Long-biased" : "Short-biased"}
                  </Badge>
                </div>
                <div className="mt-4 grid grid-cols-3 gap-3 text-xs">
                  <div>
                    <div className="text-muted-foreground text-[10px] uppercase tracking-wider">Capital</div>
                    <div className="num font-display text-sm font-semibold">{formatUsd(c.size, { compact: true })}</div>
                  </div>
                  <div>
                    <div className="text-muted-foreground text-[10px] uppercase tracking-wider">Signals</div>
                    <div className="num font-display text-sm font-semibold">{c.signals}</div>
                  </div>
                  <div>
                    <div className="text-muted-foreground text-[10px] uppercase tracking-wider">Top asset</div>
                    <div className="font-display text-sm font-semibold">{c.bestAsset}</div>
                  </div>
                </div>
                <div className="mt-4 space-y-1">
                  <div className="flex items-center justify-between text-[10px] text-muted-foreground">
                    <span>Long bias</span>
                    <span className="num">{c.longShare.toFixed(0)}%</span>
                  </div>
                  <Progress value={c.longShare} />
                </div>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="leaderboard">
          <Card>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">#</TableHead>
                  <TableHead>Wallet</TableHead>
                  <TableHead className="text-right">30d PnL</TableHead>
                  <TableHead className="text-right">Win rate</TableHead>
                  <TableHead className="text-right">Net Worth</TableHead>
                  <TableHead className="text-right">Followers</TableHead>
                  <TableHead className="text-right" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {wallets.map((w, i) => (
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
                    <TableCell className={cn("num text-right text-sm font-semibold", Number(w.pnl30dUsd) >= 0 ? "text-emerald-300" : "text-rose-300")}>
                      {formatUsd(Number(w.pnl30dUsd), { compact: true })} <span className="text-[10px] opacity-70">({formatPct(Number(w.pnl30dPct))})</span>
                    </TableCell>
                    <TableCell className="num text-right text-sm">{(Number(w.winRate) * 100).toFixed(0)}%</TableCell>
                    <TableCell className="num text-right text-sm">{formatUsd(Number(w.netWorthUsd), { compact: true })}</TableCell>
                    <TableCell className="num text-right text-sm text-muted-foreground">{(w.followers ?? 0).toLocaleString()}</TableCell>
                    <TableCell className="text-right">
                      <Link href={`/terminal/whales/${w.address}`} className="inline-flex items-center gap-1 text-xs text-magenta-300 hover:text-magenta-200">
                        Open <ArrowUpRight className="h-3 w-3" />
                      </Link>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
        </TabsContent>

        <TabsContent value="rotation">
          <Card>
            <CardHeader>
              <div className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Smart-money rotation · last 14d</div>
            </CardHeader>
            <CardContent className="space-y-3">
              {assetRotation.map((a) => {
                const pct = totalSize === 0 ? 0 : (Math.abs(a.net) / totalSize) * 100;
                const positive = a.net >= 0;
                return (
                  <div key={a.sym} className="grid grid-cols-[110px_1fr_auto] items-center gap-3">
                    <div className="flex items-center gap-2">
                      <span className="grid h-7 w-7 place-items-center rounded-full bg-gradient-to-br from-magenta-500/40 to-autumn-amber/30 font-display text-[10px] font-bold">
                        {a.sym[0]}
                      </span>
                      <span className="font-display text-sm font-semibold">{a.sym}</span>
                    </div>
                    <div className="relative h-2 overflow-hidden rounded-full bg-white/[0.05]">
                      <span
                        className={cn(
                          "absolute inset-y-0 rounded-full",
                          positive
                            ? "left-1/2 bg-gradient-to-r from-emerald-500 to-emerald-400"
                            : "right-1/2 bg-gradient-to-l from-rose-500 to-rose-400"
                        )}
                        style={{ width: `${Math.min(50, pct / 2)}%` }}
                      />
                      <span className="absolute inset-y-0 left-1/2 w-px bg-white/20" />
                    </div>
                    <div className={cn("num text-right text-xs font-semibold", positive ? "text-emerald-300" : "text-rose-300")}>
                      {positive ? "+" : "-"}{formatUsd(Math.abs(a.net), { compact: true })}
                    </div>
                  </div>
                );
              })}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="signals">
          <Card>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Wallet</TableHead>
                  <TableHead>Cohort</TableHead>
                  <TableHead>Action</TableHead>
                  <TableHead>Asset</TableHead>
                  <TableHead className="text-right">Size</TableHead>
                  <TableHead className="text-right">Conviction</TableHead>
                  <TableHead className="text-right">When</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {signals.slice(0, 30).map((s) => (
                  <TableRow key={s.id}>
                    <TableCell>
                      <Link href={`/terminal/whales/${s.wallet.address}`} className="text-sm font-display font-semibold hover:text-magenta-200">
                        {s.wallet.displayName ?? s.wallet.ens ?? shortAddress(s.wallet.address)}
                      </Link>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">{s.cohort}</TableCell>
                    <TableCell>
                      <Badge variant={s.direction === "LONG" || s.direction === "ACCUMULATE" ? "success" : "destructive"} className="text-[9px]">
                        {s.direction}
                      </Badge>
                    </TableCell>
                    <TableCell className="font-display text-sm font-semibold">{s.asset}</TableCell>
                    <TableCell className="num text-right text-sm">{formatUsd(Number(s.sizeUsd), { compact: true })}</TableCell>
                    <TableCell className="text-right">
                      <div className="ml-auto flex w-24 items-center gap-2">
                        <Progress value={Number(s.conviction) * 100} className="flex-1" />
                        <span className="num text-[10px] text-muted-foreground">{(Number(s.conviction) * 100).toFixed(0)}%</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-right text-[11px] text-muted-foreground">{timeAgo(s.detectedAt)}</TableCell>
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
