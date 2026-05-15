import { cn } from "@/lib/utils";

export function Logo({ className }: { className?: string }) {
  return (
    <div className={cn("flex items-center gap-2", className)}>
      <div className="relative h-7 w-7">
        <div className="absolute inset-0 rounded-[8px] bg-gradient-to-br from-magenta-400 via-magenta-600 to-autumn-amber shadow-[0_0_24px_-4px_rgba(255,61,160,0.7)]" />
        <div className="absolute inset-[3px] rounded-[5px] bg-background/80 backdrop-blur" />
        <div className="absolute inset-0 grid place-items-center font-display text-[12px] font-bold text-foreground">
          C
        </div>
      </div>
      <div className="flex flex-col leading-none">
        <span className="font-display text-[15px] font-semibold tracking-tight">
          crydry<span className="text-magenta-400">.</span>
        </span>
        <span className="text-[9px] uppercase tracking-[0.2em] text-muted-foreground">
          terminal
        </span>
      </div>
    </div>
  );
}
