"use client";

import { getDefaultConfig } from "@rainbow-me/rainbowkit";
import { cookieStorage, createStorage } from "wagmi";
import {
  mainnet,
  arbitrum,
  optimism,
  base,
  polygon,
  bsc,
} from "wagmi/chains";

// WalletConnect requires a valid 32-character project ID. Use env var or
// a stable placeholder so RainbowKit can still bootstrap the injected
// (MetaMask, Coinbase) connectors without crashing.
const PROJECT_ID =
  process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID ||
  "00000000000000000000000000000000";

export const wagmiConfig = getDefaultConfig({
  appName: "Crydry Terminal",
  projectId: PROJECT_ID,
  chains: [mainnet, arbitrum, optimism, base, polygon, bsc],
  ssr: true,
  storage: createStorage({
    storage: cookieStorage,
  }),
});
