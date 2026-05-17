import { PageHeader } from "@/components/terminal/page-header";
import { WalletInput } from "@/components/terminal/wallet-input";
import { LiveRevoke } from "@/components/terminal/live-revoke";

export const dynamic = "force-dynamic";

export default function RevokePage({
  searchParams,
}: {
  searchParams: { address?: string };
}) {
  return (
    <div className="space-y-6 pb-4">
      <PageHeader
        eyebrow="Wallet hygiene"
        title="Revoke Wallet Access"
        description="Audit every ERC-20 approval on the connected wallet. Risk-scored on-chain — revoke in a single signed transaction."
      >
        <WalletInput basePath="/terminal/revoke" defaultValue={searchParams.address} />
      </PageHeader>

      <LiveRevoke addressOverride={searchParams.address} />
    </div>
  );
}
