"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { ShieldOff, ShieldCheck, ShieldAlert, AlertTriangle, Loader2, Filter } from "lucide-react";
import type { Chain, RiskLevel } from "@prisma/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { ChainBadge } from "@/components/terminal/chain-badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { apiFetch } from "@/lib/api";
import { toast } from "sonner";

export interface ApprovalRow {
  id: string;
  symbol: string;
  tokenName: string;
  chain: Chain;
  spender: string;
  spenderName: string;
  allowance: string;
  isUnlimited: boolean;
  riskLevel: RiskLevel;
  riskReason?: string;
  lastUsedLabel: string;
  approvedAtLabel: string;
  tokenLogo?: string;
  spenderShort: string;
}

const RISK_VARIANT: Record<RiskLevel, "success" | "warning" | "destructive" | "outline"> = {
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

export function ApprovalsList({
  walletAddress,
  chain,
  approvals: initial,
}: {
  walletAddress: string;
  chain: Chain;
  approvals: ApprovalRow[];
}) {
  const router = useRouter();
  const [filter, setFilter] = useState<"ALL" | RiskLevel>("ALL");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [busyId, setBusyId] = useState<string | null>(null);
  const [batchBusy, setBatchBusy] = useState(false);
  const [, startTransition] = useTransition();

  const visible = filter === "ALL" ? initial : initial.filter((a) => a.riskLevel === filter);

  const toggle = (id: string) =>
    setSelected((s) => {
      const next = new Set(s);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const allVisibleSelected = visible.every((a) => selected.has(a.id)) && visible.length > 0;
  const toggleAll = () => {
    setSelected((s) => {
      const next = new Set(s);
      if (allVisibleSelected) visible.forEach((a) => next.delete(a.id));
      else visible.forEach((a) => next.add(a.id));
      return next;
    });
  };

  async function revokeOne(id: string) {
    setBusyId(id);
    try {
      await apiFetch("/api/revoke", {
        method: "POST",
        body: JSON.stringify({ approvalId: id }),
      });
      toast.success("Approval revoked", { description: "Allowance set to 0 on-chain." });
      startTransition(() => router.refresh());
    } catch (e: unknown) {
      toast.error("Revoke failed", { description: e instanceof Error ? e.message : "Unknown error" });
    } finally {
      setBusyId(null);
    }
  }

  async function revokeBatch() {
    if (selected.size === 0) return;
    setBatchBusy(true);
    let ok = 0;
    let fail = 0;
    for (const id of Array.from(selected)) {
      try {
        await apiFetch("/api/revoke", { method: "POST", body: JSON.stringify({ approvalId: id }) });
        ok++;
      } catch {
        fail++;
      }
    }
    setSelected(new Set());
    setBatchBusy(false);
    if (fail === 0) toast.success(`Revoked ${ok} approvals`);
    else toast.error(`Revoked ${ok}, ${fail} failed`);
    startTransition(() => router.refresh());
  }

  const filters: Array<"ALL" | RiskLevel> = ["ALL", "CRITICAL", "HIGH", "MEDIUM", "LOW"];

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between gap-3 space-y-0">
        <div className="flex flex-wrap items-center gap-2">
          <Filter className="h-3.5 w-3.5 text-muted-foreground" />
          {filters.map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={cn(
                "rounded-md border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider transition-colors",
                filter === f
                  ? "border-magenta-500/40 bg-magenta-500/10 text-magenta-200"
                  : "border-white/10 bg-white/[0.03] text-muted-foreground hover:text-foreground"
              )}
            >
              {f}{f !== "ALL" && (
                <span className="ml-1.5 opacity-60">
                  {initial.filter((a) => a.riskLevel === f).length}
                </span>
              )}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="secondary">{visible.length} shown</Badge>
          <Button
            size="sm"
            variant={selected.size > 0 ? "default" : "secondary"}
            disabled={selected.size === 0 || batchBusy}
            onClick={revokeBatch}
            className="gap-2"
          >
            {batchBusy && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
            Revoke selected ({selected.size})
          </Button>
        </div>
      </CardHeader>

      <div className="border-t border-white/5">
        {visible.length === 0 ? (
          <div className="p-10 text-center text-sm text-muted-foreground">No approvals match this filter.</div>
        ) : (
          <div className="divide-y divide-white/5">
            <div className="grid grid-cols-[20px_1.4fr_1.6fr_1fr_1fr_auto] items-center gap-3 px-5 py-2 text-[10px] uppercase tracking-wider text-muted-foreground">
              <button
                aria-label="Select all"
                onClick={toggleAll}
                className={cn(
                  "h-4 w-4 rounded border transition-colors",
                  allVisibleSelected ? "border-magenta-500/60 bg-magenta-500/30" : "border-white/15 bg-white/[0.03]"
                )}
              />
              <span>Token</span>
              <span>Spender</span>
              <span>Allowance</span>
              <span>Risk</span>
              <span />
            </div>
            <AnimatePresence initial={false}>
              {visible.map((a) => {
                const RiskIcon = RISK_ICON[a.riskLevel];
                const isSelected = selected.has(a.id);
                return (
                  <motion.div
                    key={a.id}
                    layout
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.98, transition: { duration: 0.18 } }}
                    transition={{ duration: 0.25 }}
                    className={cn(
                      "grid grid-cols-[20px_1.4fr_1.6fr_1fr_1fr_auto] items-center gap-3 px-5 py-3 transition-colors",
                      isSelected && "bg-magenta-500/[0.06]"
                    )}
                  >
                    <button
                      aria-label="Select row"
                      onClick={() => toggle(a.id)}
                      className={cn(
                        "h-4 w-4 rounded border transition-colors",
                        isSelected ? "border-magenta-500/60 bg-magenta-500/30" : "border-white/15 bg-white/[0.03] hover:bg-white/[0.07]"
                      )}
                    />
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-gradient-to-br from-magenta-500/40 to-autumn-amber/30 font-display text-[10px] font-bold">
                        {a.symbol[0]}
                      </span>
                      <div className="min-w-0">
                        <div className="font-display text-sm font-semibold leading-tight">{a.symbol}</div>
                        <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
                          {a.tokenName} <ChainBadge chain={a.chain} />
                        </div>
                      </div>
                    </div>

                    <div className="min-w-0">
                      <div className="text-sm font-display font-semibold truncate">{a.spenderName}</div>
                      <div className="font-mono text-[10px] text-muted-foreground">{a.spenderShort}</div>
                    </div>

                    <div className="text-sm">
                      {a.isUnlimited ? (
                        <Badge variant="destructive" className="text-[9px]">
                          Unlimited
                        </Badge>
                      ) : (
                        <span className="num text-xs">{Number(a.allowance).toLocaleString("en-US")}</span>
                      )}
                      <div className="mt-1 text-[10px] text-muted-foreground">
                        Last used {a.lastUsedLabel} · approved {a.approvedAtLabel}
                      </div>
                    </div>

                    <div>
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <span className="inline-flex items-center gap-1.5">
                              <Badge variant={RISK_VARIANT[a.riskLevel]} className="gap-1 text-[9px]">
                                <RiskIcon className="h-3 w-3" />
                                {a.riskLevel}
                              </Badge>
                            </span>
                          </TooltipTrigger>
                          {a.riskReason && (
                            <TooltipContent className="max-w-xs">{a.riskReason}</TooltipContent>
                          )}
                        </Tooltip>
                      </TooltipProvider>
                    </div>

                    <div>
                      <Button
                        size="sm"
                        variant={a.riskLevel === "CRITICAL" || a.riskLevel === "HIGH" ? "default" : "outline"}
                        disabled={busyId === a.id}
                        onClick={() => revokeOne(a.id)}
                        className="gap-1.5"
                      >
                        {busyId === a.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <ShieldOff className="h-3.5 w-3.5" />}
                        Revoke
                      </Button>
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        )}
      </div>
    </Card>
  );
}
