"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "framer-motion";
import {
  LayoutDashboard,
  Wallet,
  Crown,
  Brain,
  ShieldOff,
  ScanSearch,
  Sparkles,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Logo } from "@/components/logo";

const NAV: Array<{
  label: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: string;
}> = [
  { label: "Overview",     href: "/terminal",              icon: LayoutDashboard },
  { label: "Portfolio",    href: "/terminal/portfolio",    icon: Wallet },
  { label: "Whales",       href: "/terminal/whales",       icon: Crown },
  { label: "Smart Money",  href: "/terminal/smart-money",  icon: Brain, badge: "AI" },
  { label: "Revoke",       href: "/terminal/revoke",       icon: ShieldOff },
  { label: "Audit",        href: "/terminal/audit",        icon: ScanSearch },
];

export function Sidebar() {
  const pathname = usePathname();
  return (
    <aside className="hidden lg:flex w-64 shrink-0 flex-col border-r border-white/5 bg-card/40 backdrop-blur-xl">
      <div className="flex h-16 items-center px-6">
        <Link href="/" className="transition hover:opacity-80">
          <Logo />
        </Link>
      </div>

      <nav className="flex-1 space-y-1 px-3 py-2">
        <div className="px-3 pb-2 pt-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/70">
          Workspace
        </div>
        {NAV.map((item) => {
          const active = pathname === item.href || (item.href !== "/terminal" && pathname.startsWith(item.href));
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "group relative flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                active
                  ? "text-foreground"
                  : "text-muted-foreground hover:text-foreground hover:bg-white/[0.04]"
              )}
            >
              {active && (
                <motion.div
                  layoutId="sidebar-pill"
                  className="absolute inset-0 -z-0 rounded-lg bg-gradient-to-r from-magenta-500/15 to-magenta-500/5 ring-1 ring-magenta-500/30"
                  transition={{ type: "spring", stiffness: 380, damping: 30 }}
                />
              )}
              <Icon className={cn("relative h-4 w-4 shrink-0", active ? "text-magenta-300" : "")} />
              <span className="relative">{item.label}</span>
              {item.badge && (
                <span className="relative ml-auto rounded-md border border-magenta-500/30 bg-magenta-500/10 px-1.5 py-px text-[9px] font-semibold uppercase tracking-wider text-magenta-200">
                  {item.badge}
                </span>
              )}
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-white/5 p-3">
        <div className="glass rounded-xl p-3 text-xs">
          <div className="mb-2 flex items-center gap-2">
            <Sparkles className="h-3.5 w-3.5 text-autumn-amber" />
            <span className="font-display font-semibold">Autumn ‘26 release</span>
          </div>
          <p className="text-muted-foreground leading-snug">
            New: Solana smart-money cohorts, multi-sig revoke batching, and improved
            whale flow charts.
          </p>
        </div>
      </div>
    </aside>
  );
}
