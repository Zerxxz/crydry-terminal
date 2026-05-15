"use client";

import { useState } from "react";
import { Loader2, ScanSearch, ShieldOff, ShieldAlert, ShieldCheck, AlertTriangle, ExternalLink, Code2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { CHAIN_LIST, CHAINS } from "@/lib/chains";
import { cn } from "@/lib/utils";
import { apiFetch } from "@/lib/api";
import { toast } from "sonner";
import type { AuditSeverity, Chain, RiskLevel } from "@prisma/client";

interface AuditResponse {
  reportId: string;
  contractName: string;
  chain: Chain;
  address: string;
  bytecodeSize: number;
  verified: boolean;
  compiler: string | null;
  riskScore: number;
  overallRisk: RiskLevel;
  summary: string;
  findings: Array<{
    rule: string;
    title: string;
    severity: AuditSeverity;
    description: string;
    recommendation: string;
    line?: number;
  }>;
}

const SAMPLE_SOURCE = `// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

contract RugStaking is ERC20, Ownable {
    uint256 public fee = 5;

    constructor() ERC20("RugStake", "RUG") {}

    function setFee(uint256 newFee) external onlyOwner {
        // no upper bound — owner can set 99%
        fee = newFee;
    }

    function mint(address to, uint256 amount) external onlyOwner {
        _mint(to, amount); // unbounded mint authority
    }

    function emergencyWithdraw() external onlyOwner {
        // drain pool
        payable(owner()).transfer(address(this).balance);
    }

    function claim(address user) external {
        // external call before state update — reentrancy
        (bool ok, ) = user.call{value: 1 ether}("");
        require(ok, "transfer failed");
        _balances[user] = 0;
    }

    function pickWinner(uint256 jackpot) external returns (address) {
        uint256 r = uint256(blockhash(block.number - 1));
        return address(uint160(r % jackpot));
    }
}
`;

const SEVERITY_VARIANT: Record<AuditSeverity, "success" | "outline" | "warning" | "destructive"> = {
  INFO: "outline",
  LOW: "success",
  MEDIUM: "warning",
  HIGH: "destructive",
  CRITICAL: "destructive",
};

const RISK_VARIANT: Record<RiskLevel, "success" | "warning" | "destructive"> = {
  LOW: "success",
  MEDIUM: "warning",
  HIGH: "destructive",
  CRITICAL: "destructive",
};

const RISK_ICON: Record<RiskLevel, React.ComponentType<{ className?: string }>> = {
  LOW: ShieldCheck,
  MEDIUM: ShieldAlert,
  HIGH: ShieldOff,
  CRITICAL: AlertTriangle,
};

export function AuditForm() {
  const [address, setAddress] = useState("0xa1c0000000000000000000000000000000000bad");
  const [chain, setChain] = useState<Chain>("ETHEREUM");
  const [source, setSource] = useState(SAMPLE_SOURCE);
  const [running, setRunning] = useState(false);
  const [report, setReport] = useState<AuditResponse | null>(null);

  async function run() {
    if (!/^0x[a-fA-F0-9]{40}$/.test(address)) {
      toast.error("Invalid EVM address");
      return;
    }
    setRunning(true);
    setReport(null);
    try {
      const res = await apiFetch<AuditResponse>("/api/audit", {
        method: "POST",
        body: JSON.stringify({ address, chain, source }),
      });
      setReport(res);
      toast.success("Audit complete", { description: `Risk: ${res.overallRisk} (${res.riskScore}/100)` });
    } catch (e: unknown) {
      toast.error("Audit failed", { description: e instanceof Error ? e.message : "Unknown error" });
    } finally {
      setRunning(false);
    }
  }

  const Icon = report ? RISK_ICON[report.overallRisk] : ScanSearch;

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            <Code2 className="h-3.5 w-3.5" />
            Run audit
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3 md:grid-cols-[2fr_1fr]">
            <div className="space-y-1.5">
              <Label htmlFor="audit-addr">Contract address</Label>
              <Input
                id="audit-addr"
                placeholder="0x…"
                className="font-mono"
                value={address}
                onChange={(e) => setAddress(e.target.value.trim())}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Chain</Label>
              <Select value={chain} onValueChange={(v) => setChain(v as Chain)}>
                <SelectTrigger><SelectValue placeholder="Chain" /></SelectTrigger>
                <SelectContent>
                  {CHAIN_LIST.map((c) => (
                    <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label htmlFor="audit-src">Solidity source (paste verified source or pragma block)</Label>
              <button
                type="button"
                onClick={() => setSource(SAMPLE_SOURCE)}
                className="text-[10px] uppercase tracking-wider text-muted-foreground transition hover:text-foreground"
              >
                Load sample
              </button>
            </div>
            <Textarea
              id="audit-src"
              value={source}
              onChange={(e) => setSource(e.target.value)}
              className="min-h-[260px] text-[12px] leading-relaxed"
              spellCheck={false}
            />
          </div>

          <div className="flex items-center gap-3">
            <Button onClick={run} disabled={running} size="lg" className="gap-2">
              {running ? <Loader2 className="h-4 w-4 animate-spin" /> : <ScanSearch className="h-4 w-4" />}
              {running ? "Analyzing…" : "Run audit"}
            </Button>
            <Button variant="ghost" size="sm" asChild>
              <a
                href={`${CHAINS[chain].explorer(address || "0x")}`}
                target="_blank"
                rel="noopener noreferrer"
                className="gap-1.5 inline-flex items-center"
              >
                <ExternalLink className="h-3.5 w-3.5" />
                View on explorer
              </a>
            </Button>
          </div>
        </CardContent>
      </Card>

      <AnimatePresence>
        {report && (
          <motion.div
            key={report.reportId}
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 14 }}
            transition={{ duration: 0.4 }}
          >
            <Card>
              <CardHeader>
                <div className="flex items-start gap-3">
                  <div
                    className={cn(
                      "grid h-12 w-12 shrink-0 place-items-center rounded-xl ring-1",
                      report.overallRisk === "LOW" && "bg-emerald-500/10 ring-emerald-500/30 text-emerald-300",
                      report.overallRisk === "MEDIUM" && "bg-amber-500/10 ring-amber-500/30 text-amber-300",
                      report.overallRisk === "HIGH" && "bg-rose-500/10 ring-rose-500/30 text-rose-300",
                      report.overallRisk === "CRITICAL" && "bg-rose-500/10 ring-rose-500/40 text-rose-300"
                    )}
                  >
                    <Icon className="h-5 w-5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-display text-lg font-semibold">{report.contractName}</span>
                      <Badge variant={RISK_VARIANT[report.overallRisk]} className="gap-1">
                        {report.overallRisk}
                      </Badge>
                      {report.verified ? (
                        <Badge variant="success">Verified</Badge>
                      ) : (
                        <Badge variant="warning">Unverified</Badge>
                      )}
                    </div>
                    <div className="mt-0.5 font-mono text-[11px] text-muted-foreground">{report.address}</div>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-5">
                <div className="grid gap-4 md:grid-cols-3">
                  <div>
                    <Label>Risk Score</Label>
                    <div className="mt-1 flex items-center gap-3">
                      <span className="num font-display text-2xl font-semibold">{report.riskScore}</span>
                      <span className="text-xs text-muted-foreground">/ 100</span>
                    </div>
                    <Progress value={report.riskScore} className="mt-2" />
                  </div>
                  <div>
                    <Label>Bytecode size</Label>
                    <div className="num font-display text-2xl font-semibold">{report.bytecodeSize.toLocaleString()} <span className="text-xs text-muted-foreground">bytes</span></div>
                  </div>
                  <div>
                    <Label>Compiler</Label>
                    <div className="font-mono text-sm">{report.compiler ?? "unknown"}</div>
                  </div>
                </div>

                <Separator />

                <div>
                  <Label>Summary</Label>
                  <p className="mt-1.5 text-sm leading-relaxed text-foreground/90">{report.summary}</p>
                </div>

                <Separator />

                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Label>Findings ({report.findings.length})</Label>
                    <div className="flex gap-1.5 text-[10px]">
                      {(["CRITICAL", "HIGH", "MEDIUM", "LOW", "INFO"] as AuditSeverity[]).map((sev) => {
                        const count = report.findings.filter((f) => f.severity === sev).length;
                        if (count === 0) return null;
                        return (
                          <Badge key={sev} variant={SEVERITY_VARIANT[sev]} className="text-[9px]">
                            {count} {sev}
                          </Badge>
                        );
                      })}
                    </div>
                  </div>

                  {report.findings.length === 0 ? (
                    <p className="rounded-lg border border-emerald-500/20 bg-emerald-500/5 p-4 text-sm text-emerald-200">
                      No rules triggered. Source appears clean against the configured rule-set, but a manual review is still recommended.
                    </p>
                  ) : (
                    <div className="space-y-2">
                      {report.findings.map((f, i) => (
                        <motion.div
                          key={`${f.rule}-${i}`}
                          initial={{ opacity: 0, x: -12 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: i * 0.04 }}
                          className="rounded-lg border border-white/5 bg-white/[0.02] p-3"
                        >
                          <div className="flex items-center gap-2">
                            <Badge variant={SEVERITY_VARIANT[f.severity]} className="text-[9px]">{f.severity}</Badge>
                            <span className="font-display text-sm font-semibold">{f.title}</span>
                            <span className="ml-auto font-mono text-[10px] text-muted-foreground">{f.rule}{f.line ? ` · L${f.line}` : ""}</span>
                          </div>
                          <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">{f.description}</p>
                          <div className="mt-2 rounded-md bg-magenta-500/[0.06] p-2 text-xs">
                            <span className="font-display font-semibold text-magenta-200">Recommendation. </span>
                            <span className="text-foreground/90">{f.recommendation}</span>
                          </div>
                        </motion.div>
                      ))}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
