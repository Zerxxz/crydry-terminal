"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/logo";
import { cn } from "@/lib/utils";

const LINKS = [
  { href: "/#features",    label: "Features" },
  { href: "/terminal",     label: "Terminal" },
  { href: "/terminal/whales", label: "Whales" },
  { href: "/terminal/audit",  label: "Audit" },
];

export function MarketingNav() {
  const pathname = usePathname();
  return (
    <header className="sticky top-0 z-40 border-b border-white/5 bg-background/60 backdrop-blur-xl">
      <div className="container flex h-16 items-center">
        <Link href="/" className="transition hover:opacity-80">
          <Logo />
        </Link>
        <nav className="ml-10 hidden items-center gap-1 md:flex">
          {LINKS.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className={cn(
                "rounded-md px-3 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground",
                pathname === l.href && "text-foreground"
              )}
            >
              {l.label}
            </Link>
          ))}
        </nav>
        <div className="ml-auto flex items-center gap-2">
          <Button asChild variant="ghost" size="sm" className="hidden sm:inline-flex">
            <Link href="/terminal">Sign in</Link>
          </Button>
          <Button asChild size="sm" className="gap-1.5">
            <Link href="/terminal">Launch app</Link>
          </Button>
        </div>
      </div>
    </header>
  );
}
