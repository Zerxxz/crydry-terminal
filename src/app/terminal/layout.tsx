import { Sidebar } from "@/components/terminal/sidebar";
import { Topbar } from "@/components/terminal/topbar";
import { Aurora } from "@/components/aurora";
import { AestheticBar } from "@/components/terminal/aesthetic-bar";
import { db } from "@/lib/db";

async function fetchTicks() {
  try {
    const tokens = await db.token.findMany({
      orderBy: { marketCap: "desc" },
      take: 16,
    });
    return tokens.map((t) => ({
      symbol: t.symbol,
      price: Number(t.priceUsd),
      change: t.change24h,
    }));
  } catch {
    return [];
  }
}

export default async function TerminalLayout({ children }: { children: React.ReactNode }) {
  const ticks = await fetchTicks();
  return (
    <div className="relative flex min-h-screen">
      <Aurora />
      <Sidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar />
        <main className="relative flex-1 overflow-x-hidden p-4 lg:p-6">
          {children}
        </main>
        <AestheticBar ticks={ticks} />
      </div>
    </div>
  );
}
