"use client";

import { useState } from "react";
import { Search, Bell, Wallet, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { motion } from "framer-motion";
import { shortAddress } from "@/lib/format";
import { toast } from "sonner";

const DEMO_ADDR = "0xD1d9c1B0c3a1e7d6aF02fe3C0bD2dE4aB1bC04e5";

export function Topbar() {
  const [connected, setConnected] = useState(false);
  return (
    <header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b border-white/5 bg-background/70 px-4 backdrop-blur-xl lg:px-6">
      <div className="relative w-full max-w-md">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
        <Input
          className="h-9 pl-9 pr-20"
          placeholder="Search wallets, tokens, contracts…"
        />
        <kbd className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded border border-white/10 bg-white/[0.03] px-1.5 py-0.5 text-[10px] text-muted-foreground">
          ⌘K
        </kbd>
      </div>

      <div className="ml-auto flex items-center gap-2">
        <Badge variant="success" className="hidden gap-1.5 md:flex">
          <span className="relative flex h-1.5 w-1.5">
            <span className="absolute inset-0 animate-ping rounded-full bg-emerald-400/60" />
            <span className="relative inline-block h-1.5 w-1.5 rounded-full bg-emerald-400" />
          </span>
          Live · Mainnet
        </Badge>
        <Button variant="ghost" size="icon" aria-label="Notifications">
          <Bell className="h-4 w-4" />
        </Button>

        {connected ? (
          <motion.button
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            className="glass flex items-center gap-2 rounded-lg px-3 py-1.5 text-xs"
            onClick={() => {
              setConnected(false);
              toast("Disconnected");
            }}
          >
            <span className="relative flex h-1.5 w-1.5">
              <span className="absolute inset-0 animate-ping rounded-full bg-magenta-400/70" />
              <span className="relative inline-block h-1.5 w-1.5 rounded-full bg-magenta-400" />
            </span>
            <span className="num">{shortAddress(DEMO_ADDR)}</span>
            <ChevronDown className="h-3.5 w-3.5 opacity-60" />
          </motion.button>
        ) : (
          <Button
            onClick={() => {
              setConnected(true);
              toast.success("Wallet connected", {
                description: shortAddress(DEMO_ADDR),
              });
            }}
            size="sm"
            className="gap-2"
          >
            <Wallet className="h-3.5 w-3.5" />
            Connect Wallet
          </Button>
        )}
      </div>
    </header>
  );
}
