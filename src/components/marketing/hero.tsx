"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowRight, Sparkles, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";

const STATS = [
  { label: "Wallets indexed",    value: "12.4M" },
  { label: "Whale flows / day",  value: "$8.2B" },
  { label: "Smart-money cohorts", value: "240" },
  { label: "Approvals revoked",  value: "1.1M" },
];

export function Hero() {
  return (
    <section className="relative overflow-hidden">
      <div className="container relative z-10 grid gap-12 pb-20 pt-24 lg:grid-cols-[1.1fr_0.9fr] lg:gap-16 lg:pb-32 lg:pt-32">
        <div className="flex flex-col justify-center">
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="mb-6 inline-flex items-center gap-2 self-start rounded-full border border-magenta-500/30 bg-magenta-500/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-wider text-magenta-200"
          >
            <Sparkles className="h-3 w-3" />
            Autumn ‘26 — Now in public beta
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.05 }}
            className="font-display text-5xl font-semibold leading-[1.05] tracking-tight md:text-6xl lg:text-7xl"
          >
            The <span className="text-gradient-magenta">on-chain terminal</span>
            <br />
            for everyone who moves <span className="italic text-autumn-amber">money on-chain.</span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.12 }}
            className="mt-6 max-w-xl text-base leading-relaxed text-muted-foreground md:text-lg"
          >
            Track whales, decode smart-money rotations, revoke risky approvals, and audit
            contracts before they touch your wallet. Crydry brings every Web3 workflow into one
            calm, beautifully fast operations terminal.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.18 }}
            className="mt-8 flex flex-wrap items-center gap-3"
          >
            <Button asChild size="xl" className="gap-2">
              <Link href="/terminal">
                Launch terminal <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
            <Button asChild size="xl" variant="glass">
              <Link href="/terminal/audit">Try the audit tool</Link>
            </Button>
            <div className="ml-1 flex items-center gap-2 text-xs text-muted-foreground">
              <ShieldCheck className="h-3.5 w-3.5 text-emerald-300" />
              No-custody · read-only by default
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.7, delay: 0.4 }}
            className="mt-12 grid grid-cols-2 gap-6 sm:grid-cols-4"
          >
            {STATS.map((s) => (
              <div key={s.label} className="border-l border-magenta-500/30 pl-3">
                <div className="num font-display text-2xl font-semibold">{s.value}</div>
                <div className="mt-1 text-[11px] uppercase tracking-wider text-muted-foreground">
                  {s.label}
                </div>
              </div>
            ))}
          </motion.div>
        </div>

        <HeroPreview />
      </div>
    </section>
  );
}

function HeroPreview() {
  const data = [
    { sym: "ETH",  px: 3420.55, ch: 2.41 },
    { sym: "WBTC", px: 67812.4, ch: 1.12 },
    { sym: "SOL",  px: 168.92,  ch: 6.74 },
    { sym: "ARB",  px: 0.91,    ch: -3.4 },
    { sym: "PEPE", px: 0.0000128, ch: 12.3 },
    { sym: "WIF",  px: 2.18,    ch: -8.9 },
  ];

  const flow = [44, 62, 38, 71, 55, 82, 48, 67, 91, 73, 58, 84, 49, 76];
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.7, delay: 0.2 }}
      className="relative"
    >
      <div className="pointer-events-none absolute -inset-6 rounded-[28px] bg-magenta-500/10 blur-3xl" />
      <div className="relative glass-strong rounded-2xl p-4 md:p-5">
        {/* fake terminal head */}
        <div className="mb-4 flex items-center gap-2 border-b border-white/5 pb-3">
          <div className="h-2.5 w-2.5 rounded-full bg-rose-400/70" />
          <div className="h-2.5 w-2.5 rounded-full bg-amber-300/70" />
          <div className="h-2.5 w-2.5 rounded-full bg-emerald-400/70" />
          <span className="ml-2 text-[10px] uppercase tracking-wider text-muted-foreground">
            crydry · whale flow · last 24h
          </span>
          <span className="ml-auto inline-flex items-center gap-1.5 rounded-md border border-emerald-500/30 bg-emerald-500/10 px-1.5 py-0.5 text-[10px] font-semibold text-emerald-300">
            <span className="relative flex h-1.5 w-1.5">
              <span className="absolute inset-0 animate-ping rounded-full bg-emerald-400/60" />
              <span className="relative inline-block h-1.5 w-1.5 rounded-full bg-emerald-400" />
            </span>
            LIVE
          </span>
        </div>

        {/* fake mini chart */}
        <div className="mb-4 flex h-32 items-end gap-1.5">
          {flow.map((v, i) => (
            <motion.div
              key={i}
              initial={{ height: 0 }}
              animate={{ height: `${v}%` }}
              transition={{ duration: 0.6, delay: 0.4 + i * 0.04 }}
              className="flex-1 rounded-t-md bg-gradient-to-t from-magenta-700 via-magenta-500 to-autumn-amber/80"
              style={{ minHeight: 6 }}
            />
          ))}
        </div>

        {/* fake watchlist */}
        <div className="space-y-1.5">
          <div className="grid grid-cols-[1fr_1fr_auto] gap-3 px-2 pb-1 text-[10px] uppercase tracking-wider text-muted-foreground">
            <span>Asset</span>
            <span className="text-right">Price</span>
            <span className="text-right">24h</span>
          </div>
          {data.map((d) => (
            <div
              key={d.sym}
              className="grid grid-cols-[1fr_1fr_auto] items-center gap-3 rounded-md border border-white/5 bg-white/[0.02] px-2 py-1.5 text-xs"
            >
              <div className="flex items-center gap-2">
                <span className="grid h-5 w-5 place-items-center rounded-full bg-gradient-to-br from-magenta-500/40 to-autumn-amber/30 text-[9px] font-bold">
                  {d.sym[0]}
                </span>
                <span className="font-display font-semibold">{d.sym}</span>
              </div>
              <span className="text-right num">${d.px.toLocaleString()}</span>
              <span
                className={`text-right num font-semibold ${
                  d.ch >= 0 ? "text-emerald-300" : "text-rose-300"
                }`}
              >
                {d.ch >= 0 ? "+" : ""}{d.ch.toFixed(2)}%
              </span>
            </div>
          ))}
        </div>
      </div>
    </motion.div>
  );
}
