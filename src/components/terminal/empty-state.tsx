import { cn } from "@/lib/utils";

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  className,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-white/10 bg-white/[0.02] py-14 text-center",
        className
      )}
    >
      <div className="grid h-10 w-10 place-items-center rounded-xl bg-magenta-500/10 ring-1 ring-magenta-500/30">
        <Icon className="h-4 w-4 text-magenta-300" />
      </div>
      <div className="space-y-1">
        <div className="font-display text-base font-semibold">{title}</div>
        {description && <p className="max-w-sm text-xs text-muted-foreground">{description}</p>}
      </div>
      {action}
    </div>
  );
}
