import Link from "next/link";
import { Logo } from "@/components/logo";

const LINKS: Record<string, Array<{ label: string; href: string }>> = {
  Product: [
    { label: "Terminal", href: "/terminal" },
    { label: "Whale Tracker", href: "/terminal/whales" },
    { label: "Smart Money", href: "/terminal/smart-money" },
    { label: "Revoke", href: "/terminal/revoke" },
    { label: "Audit", href: "/terminal/audit" },
  ],
  Resources: [
    { label: "Docs", href: "/docs" },
    { label: "API", href: "/api" },
    { label: "Changelog", href: "/changelog" },
    { label: "Status", href: "/status" },
  ],
  Company: [
    { label: "About", href: "/about" },
    { label: "Careers", href: "/careers" },
    { label: "Privacy", href: "/privacy" },
    { label: "Security", href: "/security" },
  ],
};

export function Footer() {
  return (
    <footer className="border-t border-white/5 bg-background/60">
      <div className="container py-14">
        <div className="grid gap-10 lg:grid-cols-[1.4fr_repeat(3,1fr)]">
          <div>
            <Logo />
            <p className="mt-4 max-w-xs text-sm text-muted-foreground">
              The Web3 operations terminal. Built for whales, by whales — wrapped in autumn glass.
            </p>
            <div className="mt-5 flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-md border border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-emerald-300">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                Operational
              </span>
              <span className="text-[11px] text-muted-foreground">All systems normal</span>
            </div>
          </div>
          {Object.entries(LINKS).map(([heading, items]) => (
            <div key={heading}>
              <div className="text-[10px] font-semibold uppercase tracking-[0.25em] text-muted-foreground">
                {heading}
              </div>
              <ul className="mt-4 space-y-2">
                {items.map((it) => (
                  <li key={it.label}>
                    <Link
                      href={it.href}
                      className="text-sm text-muted-foreground transition-colors hover:text-foreground"
                    >
                      {it.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <div className="mt-12 flex flex-col items-start justify-between gap-3 border-t border-white/5 pt-6 text-[11px] text-muted-foreground sm:flex-row sm:items-center">
          <span>© {new Date().getFullYear()} Crydry Labs Inc.</span>
          <span className="font-mono">build · 2026.05.0 — autumn</span>
        </div>
      </div>
    </footer>
  );
}
