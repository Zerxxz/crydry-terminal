"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";

export function CtaBand() {
  return (
    <section className="container py-20">
      <div className="relative overflow-hidden rounded-3xl border border-magenta-500/30 bg-gradient-to-br from-magenta-700/30 via-background/80 to-autumn-amber/15 p-10 lg:p-14">
        <div className="pointer-events-none absolute -right-24 -top-24 h-64 w-64 rounded-full bg-magenta-500/40 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-32 -left-12 h-72 w-72 rounded-full bg-autumn-amber/30 blur-3xl" />
        <div className="relative grid items-end gap-8 lg:grid-cols-[1.4fr_1fr]">
          <div>
            <div className="text-[11px] font-semibold uppercase tracking-[0.25em] text-magenta-200">
              Get started
            </div>
            <h3 className="mt-3 font-display text-3xl font-semibold leading-tight tracking-tight md:text-4xl">
              Spend less time tab-switching.
              <br />
              <span className="text-gradient-magenta">Spend more time being right.</span>
            </h3>
            <p className="mt-3 max-w-xl text-sm text-muted-foreground">
              Free up to $250k portfolio. No card. No KYC. Read-only by default — your keys
              never leave your wallet.
            </p>
          </div>
          <div className="flex flex-col items-start gap-3 lg:items-end">
            <Button asChild size="xl" className="gap-2">
              <Link href="/terminal">Launch terminal <ArrowRight className="h-4 w-4" /></Link>
            </Button>
            <Button asChild size="lg" variant="glass">
              <Link href="/terminal/audit">Audit a contract</Link>
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
}
