"use client";

import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";

export function ErrorState({
  message,
  onRetry,
}: {
  message: string;
  onRetry?: () => void;
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-rose-500/20 bg-rose-500/[0.04] py-12 text-center">
      <div className="grid h-10 w-10 place-items-center rounded-xl bg-rose-500/10 ring-1 ring-rose-500/30">
        <AlertTriangle className="h-4 w-4 text-rose-300" />
      </div>
      <div className="space-y-1">
        <div className="font-display text-sm font-semibold">Something went wrong</div>
        <p className="max-w-sm text-xs text-muted-foreground">{message}</p>
      </div>
      {onRetry && (
        <Button size="sm" variant="outline" onClick={onRetry}>
          Retry
        </Button>
      )}
    </div>
  );
}
