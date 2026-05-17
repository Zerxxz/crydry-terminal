import { PageHeader } from "@/components/terminal/page-header";
import { WalletInput } from "@/components/terminal/wallet-input";
import { LivePortfolio } from "@/components/terminal/live-portfolio";

export const dynamic = "force-dynamic";

/**
 * Portfolio is fully client-side & real-time:
 * - If the user connects a wallet (RainbowKit), we use that.
 * - If they paste an address, we use that override.
 * - Either way, LivePortfolio reads on-chain via viem and prices via
 *   CoinGecko, refreshing every 30s.
 */
export default function PortfolioPage({
  searchParams,
}: {
  searchParams: { address?: string };
}) {
  return (
    <div className="space-y-6 pb-4">
      <PageHeader
        eyebrow="Portfolio"
        title="Wallet Portfolio"
        description="Connect your wallet or paste any EVM address to see real-time, multi-chain holdings."
      >
        <WalletInput basePath="/terminal/portfolio" defaultValue={searchParams.address} />
      </PageHeader>

      <LivePortfolio addressOverride={searchParams.address} />
    </div>
  );
}
