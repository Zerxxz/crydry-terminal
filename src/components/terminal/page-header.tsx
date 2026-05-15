import { cn } from "@/lib/utils";

export function PageHeader({
  eyebrow,
  title,
  description,
  children,
  className,
}: {
  eyebrow?: string;
  title: string;
  description?: React.ReactNode;
  children?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-col gap-3 border-b border-white/5 pb-6 lg:flex-row lg:items-end lg:justify-between", className)}>
      <div className="space-y-1.5">
        {eyebrow && (
          <div className="text-[11px] font-semibold uppercase tracking-[0.2em] text-magenta-400/80">
            {eyebrow}
          </div>
        )}
        <h1 className="font-display text-2xl font-semibold tracking-tight md:text-3xl">{title}</h1>
        {description && <p className="max-w-2xl text-sm text-muted-foreground">{description}</p>}
      </div>
      {children && <div className="flex flex-wrap items-center gap-2">{children}</div>}
    </div>
  );
}
