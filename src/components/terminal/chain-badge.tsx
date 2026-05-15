import { Chain } from "@prisma/client";
import { CHAINS } from "@/lib/chains";
import { cn } from "@/lib/utils";

export function ChainBadge({ chain, className }: { chain: Chain; className?: string }) {
  const m = CHAINS[chain];
  return (
    <div
      className={cn(
        "inline-flex items-center gap-1.5 rounded-md border border-white/10 bg-white/[0.03] px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider",
        className
      )}
    >
      <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: m.color }} />
      {m.short}
    </div>
  );
}
