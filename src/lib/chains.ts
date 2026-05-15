import type { Chain } from "@prisma/client";

export interface ChainMeta {
  id: Chain;
  name: string;
  short: string;
  color: string;
  explorer: (addr: string) => string;
  txExplorer: (hash: string) => string;
  nativeSymbol: string;
}

export const CHAINS: Record<Chain, ChainMeta> = {
  ETHEREUM:  { id: "ETHEREUM",  name: "Ethereum",  short: "ETH",  color: "#627EEA", nativeSymbol: "ETH",   explorer: (a) => `https://etherscan.io/address/${a}`,  txExplorer: (h) => `https://etherscan.io/tx/${h}` },
  ARBITRUM:  { id: "ARBITRUM",  name: "Arbitrum",  short: "ARB",  color: "#28A0F0", nativeSymbol: "ETH",   explorer: (a) => `https://arbiscan.io/address/${a}`,   txExplorer: (h) => `https://arbiscan.io/tx/${h}` },
  OPTIMISM:  { id: "OPTIMISM",  name: "Optimism",  short: "OP",   color: "#FF0420", nativeSymbol: "ETH",   explorer: (a) => `https://optimistic.etherscan.io/address/${a}`, txExplorer: (h) => `https://optimistic.etherscan.io/tx/${h}` },
  BASE:      { id: "BASE",      name: "Base",      short: "BASE", color: "#0052FF", nativeSymbol: "ETH",   explorer: (a) => `https://basescan.org/address/${a}`,  txExplorer: (h) => `https://basescan.org/tx/${h}` },
  POLYGON:   { id: "POLYGON",   name: "Polygon",   short: "POL",  color: "#8247E5", nativeSymbol: "MATIC", explorer: (a) => `https://polygonscan.com/address/${a}`, txExplorer: (h) => `https://polygonscan.com/tx/${h}` },
  BSC:       { id: "BSC",       name: "BSC",       short: "BNB",  color: "#F3BA2F", nativeSymbol: "BNB",   explorer: (a) => `https://bscscan.com/address/${a}`,    txExplorer: (h) => `https://bscscan.com/tx/${h}` },
  SOLANA:    { id: "SOLANA",    name: "Solana",    short: "SOL",  color: "#14F195", nativeSymbol: "SOL",   explorer: (a) => `https://solscan.io/account/${a}`,    txExplorer: (h) => `https://solscan.io/tx/${h}` },
  AVALANCHE: { id: "AVALANCHE", name: "Avalanche", short: "AVAX", color: "#E84142", nativeSymbol: "AVAX",  explorer: (a) => `https://snowtrace.io/address/${a}`,  txExplorer: (h) => `https://snowtrace.io/tx/${h}` },
};

export function chainMeta(chain: Chain): ChainMeta {
  return CHAINS[chain];
}

export const CHAIN_LIST = Object.values(CHAINS);
