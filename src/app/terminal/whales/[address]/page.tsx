import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowUpRight,
  Copy,
  ExternalLink,
  Users,
  Wallet,
  TrendingUp,
  Activity,
  Radio,
} from "lucide-react";
import type { Chain } from "@prisma/client";
import { db } from "@/lib/db";
import { jsonSafe } from "@/lib/serialize";
import { CHAINS } from "@/lib/chains";
import {
  fetchEthBalance,
  fetchRecentTxs,
  KNOWN_WHALES,
  type EtherscanTx,
} from "@/lib/etherscan";
import { fetchSimplePrices } from "@/lib/coingecko";
import { formatUsd, shortAddress, timeAgo } from "@/lib/format";
import { cn } from "@/lib/utils";
import { PageHeader } from "@/components/terminal/page-header";
import { StatCard } from "@/components/terminal/stat-card";
import { ChainBadge } from "@/components/terminal/chain-badge";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { FlowBar } from "@/components/chart/flow-bar";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

export const dynamic = "force-dynamic";
export const revalidate = 60;

interface NormalizedTx {
  hash: string;
  type: "TRANSFER_IN" | "TRANSFER_OUT";
  fromAddr: string;
  toAddr: string;
  valueEth: number;
  valueUsd: number;
  timestamp: number;
  functionName: string;
  chain: Chain;
}

interface NormalizedWallet {
  address: string;
  displayName: string | null;
  ens: string | null;
  bio: string | null;
  chain: Chain;
  labels: string[];
  netWorthUsd: number;
  balanceEth: number | null;
  pnl30dUsd: number;
  pnl30dPct: number;
  winRate: number;
  followers: number;
}

async function loadWhale(address: string): Promise<{
  wallet: NormalizedWallet;
  transactions: NormalizedTx[];
  ethUsd: number;
  isLive: boolean;
} | null> {
  // Try live data first via Etherscan
  const meta = KNOWN_WHALES.find(
    (w) => w.address.toLowerCase() === address.toLowerCase()
  );

  const [balance, txs, ethPrice] = await Promise.all([
    fetchEthBalance(address),
    fetchRecentTxs(address, 1, 50),
    fetchSimplePrices(["ETH"]),
  ]);

  const ethUsd = ethPrice?.ethereum?.usd ?? 3400;

  if (balance) {
    const netWorthUsd = balance.balanceEth * ethUsd;
    const transactions: NormalizedTx[] = (txs ?? []).slice(0, 30).map((tx: EtherscanTx) => {
      const valueEth = Number(tx.value) / 1e18;
      return {
        hash: tx.hash,
        type: tx.from.toLowerCase() === address.toLowerCase() ? "TRANSFER_OUT" : "TRANSFER_IN",
        fromAddr: tx.from,
        toAddr: tx.to,
        valueEth,
        valueUsd: valueEth * ethUsd,
        timestamp: Number(tx.timeStamp) * 1000,
        functionName: tx.functionName?.split("(")[0] || "transfer",
        chain: "ETHEREUM" as Chain,
      };
    });

    return {
      wallet: {
        address,
        displayName: meta?.label ?? null,
        ens: meta?.ens ?? null,
        bio: null,
        chain: (meta?.chain as Chain) ?? "ETHEREUM",
        labels: ["WHALE"],
        netWorthUsd,
        balanceEth: balance.balanceEth,
        pnl30dUsd: 0,
        pnl30dPct: 0,
        winRate: 0,
        followers: 0,
      },
      transactions,
      ethUsd,
      isLive: true,
    };
  }

  // Fallback to DB
  const dbWallet = await db.wallet
    .findFirst({
      where: { OR: [{ address: address.toLowerCase() }, { ens: address }] },
      include: {
        transactions: { orderBy: { timestamp: "desc" }, take: 30 },
      },
    })
    .catch(() => null);

  if (!dbWallet) return null;

  const safe = jsonSafe(dbWallet) as typeof dbWallet;

  return {
    wallet: {
      address: safe.address,
      displayName: safe.displayName,
      ens: safe.ens,
      bio: safe.bio,
      chain: safe.chain as Chain,
      labels: safe.labels,
      netWorthUsd: Number(safe.netWorthUsd),
      balanceEth: null,
      pnl30dUsd: Number(safe.pnl30dUsd),
      pnl30dPct: safe.pnl30dPct,
      winRate: safe.winRate,
      followers: safe.followers,
    },
    transactions: safe.transactions.map((t) => ({
      hash: t.hash,
      type: (t.type === "TRANSFER_OUT" ? "TRANSFER_OUT" : "TRANSFER_IN") as "TRANSFER_IN" | "TRANSFER_OUT",
      fromAddr: t.fromAddr,
      toAddr: t.toAddr,
      valueEth: Number(t.tokenAmount),
      valueUsd: Number(t.valueUsd),
      timestamp: new Date(t.timestamp as unknown as string).getTime(),
      functionName: t.type.toLowerCase(),
      chain: t.chain as Chain,
    })),
    ethUsd,
    isLive: false,
  };
}

export default async function WhaleProfilePage({
  params,
}: {
  params: { address: string };
}) {
  const data = await loadWhale(decodeURIComponent(params.address));
  if (!data) notFound();

  const { wallet: w, transactions, ethUsd, isLive } = data;

  // Build flow buckets from transactions
  const day = 24 * 60 * 60 * 1000;
  const now = Date.now();
  const buckets = Array.from({ length: 7 }).map((_, i) => {
    const start = now - (6 - i) * day;
    const end = start + day;
    const inDay = transactions.filter((t) => t.timestamp >= start && t.timestamp < end);
    return {
      label: new Date(start).toLocaleDateString("en-US", { weekday: "short" }),
      inflow: inDay.filter((t) => t.type === "TRANSFER_IN").reduce((a, t) => a + t.valueUsd, 0),
      outflow: inDay.filter((t) => t.type === "TRANSFER_OUT").reduce((a, t) => a + t.valueUsd, 0),
    };
  });

  const chainMeta = CHAINS[w.chain];

  return (
    <div className="space-y-6 pb-4">
      <PageHeader
        eyebrow="Whale Profile"
        title={w.displayName ?? w.ens ?? shortAddress(w.address)}
        description={<span className="font-mono text-xs">{w.address}</span>}
      >
        {isLive && (
          <Badge variant="success" className="gap-1.5">
            <Radio className="h-3 w-3" /> Live · Etherscan
          </Badge>
        )}
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
        <ChainBadge chain={w.chain} />
        {w.labels.map((l) => (
          <Badge key={l} variant="autumn">
            {l.replace("_", " ")}
          </Badge>
        ))}
        {w.bio && <span className="text-sm text-muted-foreground">— {w.bio}</span>}
      </div>

      <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Net Worth"
          value={formatUsd(w.netWorthUsd, { compact: true })}
          icon={Wallet}
          hint={w.balanceEth !== null ? `${w.balanceEth.toFixed(4)} ETH @ ${formatUsd(ethUsd)}` : undefined}
        />
        <StatCard
          label="ETH Balance"
          value={
            w.balanceEth !== null
              ? `${w.balanceEth.toLocaleString("en-US", { maximumFractionDigits: 4 })} ETH`
              : "—"
          }
          icon={TrendingUp}
        />
        <StatCard
          label="Recent Txs"
          value={String(transactions.length)}
          icon={Activity}
          hint="Last 30 transactions"
        />
        <StatCard
          label="Followers"
          value={(w.followers ?? 0).toLocaleString()}
          icon={Users}
        />
      </div>

      <Card>
        <CardHeader>
          <div className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            7d Flow
          </div>
        </CardHeader>
        <CardContent>
          <FlowBar data={buckets} height={240} />
        </CardContent>
      </Card>

      <Tabs defaultValue="activity">
        <TabsList>
          <TabsTrigger value="activity">Activity</TabsTrigger>
        </TabsList>

        <TabsContent value="activity">
          <Card>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Type</TableHead>
                  <TableHead>Function</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                  <TableHead className="text-right">Value (USD)</TableHead>
                  <TableHead>Counterparty</TableHead>
                  <TableHead>Hash</TableHead>
                  <TableHead className="text-right">When</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {transactions.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center text-sm text-muted-foreground py-8">
                      No transactions found.
                    </TableCell>
                  </TableRow>
                ) : (
                  transactions.map((tx) => (
                    <TableRow key={tx.hash}>
                      <TableCell>
                        <Badge
                          variant={tx.type === "TRANSFER_OUT" ? "destructive" : "success"}
                          className="text-[9px]"
                        >
                          {tx.type === "TRANSFER_OUT" ? "OUT" : "IN"}
                        </Badge>
                      </TableCell>
                      <TableCell className="font-mono text-xs text-muted-foreground">
                        {tx.functionName}
                      </TableCell>
                      <TableCell className="num text-right text-sm">
                        {tx.valueEth.toLocaleString("en-US", { maximumFractionDigits: 4 })} ETH
                      </TableCell>
                      <TableCell className="num text-right text-sm">
                        {formatUsd(tx.valueUsd, { compact: true })}
                      </TableCell>
                      <TableCell className="font-mono text-[11px] text-muted-foreground">
                        {shortAddress(tx.type === "TRANSFER_IN" ? tx.fromAddr : tx.toAddr)}
                      </TableCell>
                      <TableCell>
                        <Link
                          href={CHAINS[tx.chain].txExplorer(tx.hash)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className={cn(
                            "num text-xs text-magenta-300 hover:text-magenta-200 inline-flex items-center gap-1"
                          )}
                        >
                          {shortAddress(tx.hash, 8, 6)} <ArrowUpRight className="h-3 w-3" />
                        </Link>
                      </TableCell>
                      <TableCell className="text-right text-[11px] text-muted-foreground">
                        {timeAgo(tx.timestamp)}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
