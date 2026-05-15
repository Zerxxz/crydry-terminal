"use client";

import { motion } from "framer-motion";
import { Brain, Crown, ScanSearch, ShieldOff, Wallet, Activity } from "lucide-react";
import { cn } from "@/lib/utils";

const FEATURES = [
  {
    icon: Crown,
    title: "Whale Tracker",
    desc: "Follow the top 100 wallets across 8 chains. Real-time inflow/outflow charts, cluster detection, and ENS-resolved profiles.",
    accent: "from-magenta-500/40 to-magenta-700/10",
  },
  {
    icon: Wallet,
    title: "Wallet Portfolios",
    desc: "Multi-chain holdings, realised vs unrealised PnL, cost-basis tracking, and exportable performance reports.",
    accent: "from-autumn-amber/40 to-autumn-rust/10",
  },
  {
    icon: ShieldOff,
    title: "Approval Revoke",
    desc: "Audit every ERC-20 / ERC-721 allowance you ever signed. Risk-score by spender, batch-revoke in one transaction.",
    accent: "from-rose-500/40 to-magenta-700/10",
  },
  {
    icon: Brain,
    title: "Smart Money",
    desc: "AI-detected cohorts of consistently profitable wallets. See what they're rotating into before the headlines.",
    accent: "from-emerald-500/40 to-emerald-700/10",
  },
  {
    icon: ScanSearch,
    title: "Contract Audit",
    desc: "Static analysis with 12+ honey-pot, rug-pull and reentrancy heuristics. Deterministic risk scoring you can trust.",
    accent: "from-amber-500/40 to-amber-700/10",
  },
  {
    icon: Activity,
    title: "Live Flow",
    desc: "Sub-second WebSocket feed. Set alerts on wallets, contracts, or token thresholds — never miss a move.",
    accent: "from-fuchsia-500/40 to-violet-700/10",
  },
];

export function Features() {
  return (
    <section className="container py-24 lg:py-32">
      <div className="mx-auto max-w-2xl text-center">
        <div className="text-[11px] font-semibold uppercase tracking-[0.25em] text-magenta-400/80">
          Workflows
        </div>
        <h2 className="mt-3 font-display text-3xl font-semibold tracking-tight md:text-4xl">
          Six surfaces. <span className="text-gradient-magenta">One terminal.</span>
        </h2>
        <p className="mt-4 text-sm text-muted-foreground md:text-base">
          Built by traders who hated tab-switching between Etherscan, Debank, Revoke.cash and
          three Discord channels. Crydry collapses the stack.
        </p>
      </div>

      <div className="mt-14 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {FEATURES.map((f, i) => {
          const Icon = f.icon;
          return (
            <motion.div
              key={f.title}
              initial={{ opacity: 0, y: 18 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-80px" }}
              transition={{ duration: 0.5, delay: i * 0.04 }}
              className="group relative overflow-hidden rounded-2xl border border-white/5 bg-card/40 p-6 backdrop-blur-xl transition hover:-translate-y-0.5 hover:border-magenta-500/30"
            >
              <div className={cn(
                "pointer-events-none absolute -right-16 -top-16 h-40 w-40 rounded-full bg-gradient-to-br opacity-30 blur-2xl",
                f.accent
              )} />
              <div className="relative">
                <div className="grid h-10 w-10 place-items-center rounded-xl bg-gradient-to-br from-white/[0.06] to-white/[0.02] ring-1 ring-white/10">
                  <Icon className="h-4.5 w-4.5 text-magenta-300" />
                </div>
                <h3 className="mt-4 font-display text-lg font-semibold">{f.title}</h3>
                <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{f.desc}</p>
              </div>
            </motion.div>
          );
        })}
      </div>
    </section>
  );
}
