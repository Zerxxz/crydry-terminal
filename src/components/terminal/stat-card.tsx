import { ArrowDownRight, ArrowUpRight } from "lucide-react";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { formatPct } from "@/lib/format";

export function StatCard({
  label,
  value,
  delta,
  icon: Icon,
  hint,
  className,
}: {
  label: string;
  value: string;
  delta?: number;
  icon: React.ComponentType<{ className?: string }>;
  hint?: string;
  className?: string;
}) {
  const positive = (delta ?? 0) >= 0;
  return (
    <Card className={cn("p-5 transition hover:-translate-y-0.5", className)}>
      <div className="flex items-center justify-between">
        <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
          {label}
        </span>
        <span className="grid h-7 w-7 place-items-center rounded-md bg-magenta-500/10 ring-1 ring-magenta-500/20">
          <Icon className="h-3.5 w-3.5 text-magenta-300" />
        </span>
      </div>
      <div className="mt-3 flex items-baseline gap-2">
        <div className="num font-display text-2xl font-semibold">{value}</div>
        {typeof delta === "number" && (
          <div
            className={cn(
              "flex items-center gap-0.5 rounded-md px-1.5 py-0.5 text-[10px] font-semibold",
              positive
                ? "bg-emerald-500/10 text-emerald-300"
                : "bg-rose-500/10 text-rose-300"
            )}
          >
            {positive ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
            {formatPct(delta)}
          </div>
        )}
      </div>
      {hint && <div className="mt-1 text-[11px] text-muted-foreground">{hint}</div>}
    </Card>
  );
}
