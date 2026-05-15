import Link from "next/link";
import { ScanSearch, ShieldAlert, ShieldCheck, FileSearch } from "lucide-react";
import { db } from "@/lib/db";
import { jsonSafe } from "@/lib/serialize";
import { CHAINS } from "@/lib/chains";
import { shortAddress, timeAgo } from "@/lib/format";
import { PageHeader } from "@/components/terminal/page-header";
import { StatCard } from "@/components/terminal/stat-card";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AuditForm } from "@/components/terminal/audit-form";
import type { Chain, RiskLevel } from "@prisma/client";

export const dynamic = "force-dynamic";

async function loadRecentReports() {
  const reports = await db.auditReport.findMany({
    orderBy: { createdAt: "desc" },
    take: 12,
    include: { findings: true },
  });
  return jsonSafe(reports);
}

const RISK_BADGE: Record<RiskLevel, "success" | "warning" | "destructive"> = {
  LOW: "success",
  MEDIUM: "warning",
  HIGH: "destructive",
  CRITICAL: "destructive",
};

export default async function AuditPage() {
  const reports = await loadRecentReports();
  const totalFindings = reports.reduce((a, r) => a + r.findings.length, 0);
  const critical = reports.filter((r) => r.overallRisk === "CRITICAL" || r.overallRisk === "HIGH").length;

  return (
    <div className="space-y-6 pb-4">
      <PageHeader
        eyebrow="Defense"
        title="Smart Contract Audit"
        description="Paste a contract address & source — get a deterministic, rule-based risk profile in seconds. Built on 12+ honey-pot, rug-pull and reentrancy heuristics."
      />

      <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Reports run" value={String(reports.length)} icon={FileSearch} hint="Last 30 days" />
        <StatCard label="Total findings" value={String(totalFindings)} icon={ScanSearch} />
        <StatCard label="Critical/High" value={String(critical)} icon={ShieldAlert} hint="Across recent runs" />
        <StatCard label="Rules" value="12" icon={ShieldCheck} hint="Static-analysis heuristics" />
      </div>

      <div className="grid gap-4 lg:grid-cols-[1.2fr_1fr]">
        <AuditForm />

        <Card>
          <CardHeader>
            <div className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Recent reports</div>
          </CardHeader>
          <CardContent className="space-y-2">
            {reports.length === 0 ? (
              <p className="text-sm text-muted-foreground">No reports yet.</p>
            ) : (
              reports.map((r) => (
                <div key={r.id} className="flex items-start gap-3 rounded-lg border border-white/5 bg-white/[0.02] p-3">
                  <div className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-magenta-500/10 ring-1 ring-magenta-500/20">
                    <ScanSearch className="h-4 w-4 text-magenta-300" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5 text-xs">
                      <span className="font-display font-semibold truncate">{r.contractName}</span>
                      <Badge variant={RISK_BADGE[r.overallRisk as RiskLevel]} className="text-[9px]">
                        {r.overallRisk}
                      </Badge>
                      <span className="ml-auto whitespace-nowrap text-[10px] text-muted-foreground">{timeAgo(r.createdAt)}</span>
                    </div>
                    <Link
                      href={CHAINS[r.chain as Chain].explorer(r.address)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-0.5 block font-mono text-[10px] text-muted-foreground hover:text-magenta-300"
                    >
                      {shortAddress(r.address, 8, 6)} · {r.chain}
                    </Link>
                    <div className="mt-2 grid grid-cols-3 gap-2 text-[10px]">
                      <div>
                        <span className="text-muted-foreground">Score</span>{" "}
                        <span className="num font-semibold">{r.riskScore}/100</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Findings</span>{" "}
                        <span className="num font-semibold">{r.findings.length}</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Verified</span>{" "}
                        <span className={r.verified ? "text-emerald-300" : "text-rose-300"}>{r.verified ? "yes" : "no"}</span>
                      </div>
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
