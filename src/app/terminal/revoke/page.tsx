import { Wallet, ShieldOff, ShieldAlert, ShieldCheck, AlertTriangle } from "lucide-react";
import type { Chain } from "@prisma/client";
import { db } from "@/lib/db";
import { jsonSafe } from "@/lib/serialize";
import { formatUsd, shortAddress, timeAgo } from "@/lib/format";
import { PageHeader } from "@/components/terminal/page-header";
import { StatCard } from "@/components/terminal/stat-card";
import { WalletInput } from "@/components/terminal/wallet-input";
import { EmptyState } from "@/components/terminal/empty-state";
import { ApprovalsList } from "@/components/terminal/approvals-list";

export const dynamic = "force-dynamic";

async function loadApprovals(addressOrEns: string | null) {
  const wallet = addressOrEns
    ? await db.wallet.findFirst({
        where: { OR: [{ address: addressOrEns.toLowerCase() }, { ens: addressOrEns }] },
      })
    : await db.wallet.findFirst({
        where: { approvals: { some: {} } },
        orderBy: { netWorthUsd: "desc" },
      });

  if (!wallet) return null;

  const approvals = await db.tokenApproval.findMany({
    where: { walletId: wallet.id, revokedAt: null },
    include: { token: true },
    orderBy: [{ riskLevel: "desc" }, { approvedAt: "desc" }],
  });
  return jsonSafe({ wallet, approvals });
}

const RISK_RANK: Record<string, number> = { CRITICAL: 0, HIGH: 1, MEDIUM: 2, LOW: 3 };

export default async function RevokePage({ searchParams }: { searchParams: { address?: string } }) {
  const data = await loadApprovals(searchParams.address ?? null);

  if (!data) {
    return (
      <div className="space-y-6">
        <PageHeader
          eyebrow="Wallet hygiene"
          title="Revoke Wallet Access"
          description="Audit every ERC-20 / ERC-721 approval you ever signed. Risk-scored by spender — revoke in a click."
        >
          <WalletInput basePath="/terminal/revoke" defaultValue={searchParams.address} />
        </PageHeader>
        <EmptyState
          icon={Wallet}
          title="No approvals to display"
          description="Connect a wallet or paste an address to load its current ERC-20 / ERC-721 allowances."
        />
      </div>
    );
  }

  const { wallet, approvals } = data;
  const totalExposure = approvals.reduce((a, ap) => {
    if (ap.isUnlimited) return a + Number(ap.token.priceUsd) * 1_000_000;
    return a + Number(ap.token.priceUsd) * Number(ap.allowance) / Math.pow(10, ap.token.decimals);
  }, 0);

  const counts = approvals.reduce<Record<string, number>>((acc, a) => {
    acc[a.riskLevel] = (acc[a.riskLevel] ?? 0) + 1;
    return acc;
  }, {});

  const sorted = [...approvals].sort((a, b) => (RISK_RANK[a.riskLevel] - RISK_RANK[b.riskLevel]));

  return (
    <div className="space-y-6 pb-4">
      <PageHeader
        eyebrow="Wallet hygiene"
        title="Revoke Wallet Access"
        description={
          <>
            Auditing <span className="font-mono text-xs">{wallet.address}</span> on{" "}
            <span className="text-foreground/90 font-semibold">{wallet.chain}</span>.
          </>
        }
      >
        <WalletInput basePath="/terminal/revoke" defaultValue={searchParams.address ?? wallet.ens ?? undefined} />
      </PageHeader>

      <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Active approvals"
          value={String(approvals.length)}
          icon={ShieldOff}
          hint={`${counts.CRITICAL ?? 0} critical · ${counts.HIGH ?? 0} high`}
        />
        <StatCard
          label="Total exposure"
          value={formatUsd(totalExposure, { compact: true })}
          icon={ShieldAlert}
          hint="Worst-case theoretical at-risk USD"
        />
        <StatCard
          label="Unlimited allowances"
          value={String(approvals.filter((a) => a.isUnlimited).length)}
          icon={AlertTriangle}
          hint="Audit every one of these"
        />
        <StatCard
          label="Safe spenders"
          value={String(counts.LOW ?? 0)}
          icon={ShieldCheck}
          hint="Verified, audited routers"
        />
      </div>

      {approvals.length === 0 ? (
        <EmptyState
          icon={ShieldCheck}
          title="Wallet is clean"
          description="No outstanding ERC-20 / ERC-721 approvals were detected for this wallet."
        />
      ) : (
        <ApprovalsList
          walletAddress={wallet.address}
          chain={wallet.chain as Chain}
          approvals={sorted.map((a) => ({
            id: a.id,
            symbol: a.token.symbol,
            tokenName: a.token.name,
            chain: a.token.chain as Chain,
            spender: a.spender,
            spenderName: a.spenderName ?? "Unknown spender",
            allowance: a.allowance,
            isUnlimited: a.isUnlimited,
            riskLevel: a.riskLevel,
            riskReason: a.riskReason ?? undefined,
            lastUsedLabel: a.lastUsed ? timeAgo(a.lastUsed) : "never",
            approvedAtLabel: timeAgo(a.approvedAt),
            tokenLogo: a.token.logo ?? undefined,
            spenderShort: shortAddress(a.spender),
          }))}
        />
      )}
    </div>
  );
}
