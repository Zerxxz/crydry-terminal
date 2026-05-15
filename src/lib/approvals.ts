/**
 * On-chain token approval fetching using viem.
 * Reads Approval events from well-known ERC-20 tokens for a given owner address.
 */

import { createPublicClient, http, parseAbiItem, formatUnits, type Address } from "viem";
import { mainnet, arbitrum, optimism, base, polygon, bsc } from "viem/chains";

// Public RPC endpoints (rate-limited but free)
const CHAIN_RPCS: Record<string, { chain: typeof mainnet; rpc: string }> = {
  ETHEREUM: { chain: mainnet, rpc: "https://eth.llamarpc.com" },
  ARBITRUM: { chain: arbitrum, rpc: "https://arb1.arbitrum.io/rpc" },
  OPTIMISM: { chain: optimism, rpc: "https://mainnet.optimism.io" },
  BASE: { chain: base, rpc: "https://mainnet.base.org" },
  POLYGON: { chain: polygon, rpc: "https://polygon-rpc.com" },
  BSC: { chain: bsc, rpc: "https://bsc-dataseed1.binance.org" },
};

// Well-known tokens to check approvals for (Ethereum mainnet)
const POPULAR_TOKENS: Array<{ address: Address; symbol: string; name: string; decimals: number }> = [
  { address: "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48", symbol: "USDC", name: "USD Coin", decimals: 6 },
  { address: "0xdAC17F958D2ee523a2206206994597C13D831ec7", symbol: "USDT", name: "Tether", decimals: 6 },
  { address: "0x6B175474E89094C44Da98b954EedeAC495271d0F", symbol: "DAI", name: "Dai", decimals: 18 },
  { address: "0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599", symbol: "WBTC", name: "Wrapped Bitcoin", decimals: 8 },
  { address: "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2", symbol: "WETH", name: "Wrapped Ether", decimals: 18 },
  { address: "0x514910771AF9Ca656af840dff83E8264EcF986CA", symbol: "LINK", name: "Chainlink", decimals: 18 },
  { address: "0x1f9840a85d5aF5bf1D1762F925BDADdC4201F984", symbol: "UNI", name: "Uniswap", decimals: 18 },
  { address: "0x7Fc66500c84A76Ad7e9c93437bFc5Ac33E2DDaE9", symbol: "AAVE", name: "Aave", decimals: 18 },
  { address: "0x6982508145454Ce325dDbE47a25d4ec3d2311933", symbol: "PEPE", name: "Pepe", decimals: 18 },
  { address: "0x95aD61b0a150d79219dCF64E1E6Cc01f0B64C4cE", symbol: "SHIB", name: "Shiba Inu", decimals: 18 },
];

// Known spender labels
const SPENDER_LABELS: Record<string, { name: string; risk: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL" }> = {
  "0x68b3465833fb72a70ecdf485e0e4c7bd8665fc45": { name: "Uniswap V3 Router 2", risk: "LOW" },
  "0x7a250d5630b4cf539739df2c5dacb4c659f2488d": { name: "Uniswap V2 Router", risk: "LOW" },
  "0xe592427a0aece92de3edee1f18e0157c05861564": { name: "Uniswap V3 Router", risk: "LOW" },
  "0xdef1c0ded9bec7f1a1670819833240f027b25eff": { name: "0x Exchange Proxy", risk: "LOW" },
  "0x1111111254eeb25477b68fb85ed929f73a960582": { name: "1inch V5 Router", risk: "LOW" },
  "0x881d40237659c251811cec9c364ef91dc08d300c": { name: "MetaMask Swap Router", risk: "LOW" },
  "0x3fc91a3afd70395cd496c647d5a6cc9d4b2b7fad": { name: "Uniswap Universal Router", risk: "LOW" },
  "0x87870bca3f3fd6335c3f4ce8392d69350b4fa4e2": { name: "Aave V3 Pool", risk: "LOW" },
  "0x7d2768de32b0b80b7a3454c06bdac94a69ddc7a9": { name: "Aave V2 Pool", risk: "LOW" },
};

export interface OnChainApproval {
  tokenAddress: string;
  tokenSymbol: string;
  tokenName: string;
  tokenDecimals: number;
  spender: string;
  spenderName: string;
  allowance: string;
  allowanceFormatted: string;
  isUnlimited: boolean;
  riskLevel: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  riskReason: string;
  chain: string;
}

const MAX_UINT256 = BigInt("0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff");
const UNLIMITED_THRESHOLD = MAX_UINT256 / 2n;

/**
 * Fetch real on-chain token approvals for a wallet address.
 * Reads allowance() for each popular token × known routers.
 */
export async function fetchOnChainApprovals(
  ownerAddress: string,
  chainId: string = "ETHEREUM"
): Promise<OnChainApproval[]> {
  const chainConfig = CHAIN_RPCS[chainId];
  if (!chainConfig) return [];

  const client = createPublicClient({
    chain: chainConfig.chain,
    transport: http(chainConfig.rpc),
  });

  const approvals: OnChainApproval[] = [];
  const spenderAddresses = Object.keys(SPENDER_LABELS);

  // For each popular token, check allowance against known spenders
  for (const token of POPULAR_TOKENS) {
    for (const spender of spenderAddresses) {
      try {
        const allowance = await client.readContract({
          address: token.address,
          abi: [parseAbiItem("function allowance(address owner, address spender) view returns (uint256)")],
          functionName: "allowance",
          args: [ownerAddress as Address, spender as Address],
        });

        if (allowance > 0n) {
          const isUnlimited = allowance >= UNLIMITED_THRESHOLD;
          const spenderMeta = SPENDER_LABELS[spender.toLowerCase()];
          const allowanceFormatted = isUnlimited
            ? "Unlimited"
            : formatUnits(allowance, token.decimals);

          let riskLevel = spenderMeta?.risk ?? "HIGH";
          let riskReason = "";

          if (isUnlimited && riskLevel === "LOW") {
            riskLevel = "MEDIUM";
            riskReason = "Unlimited allowance on verified router. Consider reducing to exact needed amount.";
          } else if (isUnlimited && riskLevel !== "LOW") {
            riskLevel = "HIGH";
            riskReason = "Unlimited allowance on unverified or higher-risk spender.";
          } else if (riskLevel === "LOW") {
            riskReason = "Verified, audited protocol with bounded allowance.";
          } else {
            riskReason = "Unknown spender — review before keeping active.";
          }

          approvals.push({
            tokenAddress: token.address,
            tokenSymbol: token.symbol,
            tokenName: token.name,
            tokenDecimals: token.decimals,
            spender,
            spenderName: spenderMeta?.name ?? `Unknown (${spender.slice(0, 8)}…)`,
            allowance: allowance.toString(),
            allowanceFormatted,
            isUnlimited,
            riskLevel,
            riskReason,
            chain: chainId,
          });
        }
      } catch {
        // Skip on RPC errors (rate limiting, etc.)
        continue;
      }
    }
  }

  return approvals;
}
