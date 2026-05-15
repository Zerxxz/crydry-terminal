import { Sidebar } from "@/components/terminal/sidebar";
import { Topbar } from "@/components/terminal/topbar";
import { Aurora } from "@/components/aurora";
import { AestheticBarWrapper } from "@/components/terminal/aesthetic-bar-wrapper";

export default function TerminalLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative flex min-h-screen">
      <Aurora />
      <Sidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar />
        <main className="relative flex-1 overflow-x-hidden p-4 lg:p-6">
          {children}
        </main>
        <AestheticBarWrapper />
      </div>
    </div>
  );
}
