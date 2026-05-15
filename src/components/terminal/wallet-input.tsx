"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { Search, Wallet } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

export function WalletInput({
  basePath,
  placeholder = "0x… or .eth",
  defaultValue,
  paramName = "address",
}: {
  basePath: string;
  placeholder?: string;
  defaultValue?: string;
  paramName?: string;
}) {
  const router = useRouter();
  const sp = useSearchParams();
  const [value, setValue] = useState(defaultValue ?? sp.get(paramName) ?? "");

  function submit(e?: React.FormEvent) {
    e?.preventDefault();
    const v = value.trim();
    if (!v) {
      toast.error("Enter a wallet address or ENS name");
      return;
    }
    router.push(`${basePath}?${paramName}=${encodeURIComponent(v)}`);
  }

  return (
    <form onSubmit={submit} className="flex w-full max-w-md gap-2">
      <div className="relative flex-1">
        <Wallet className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
        <Input
          className="h-9 pl-9 font-mono text-sm"
          placeholder={placeholder}
          value={value}
          onChange={(e) => setValue(e.target.value)}
        />
      </div>
      <Button type="submit" size="sm" className="gap-1.5">
        <Search className="h-3.5 w-3.5" />
        Track
      </Button>
    </form>
  );
}
