"use client";

import { getDefaultConfig } from "@rainbow-me/rainbowkit";
import {
  mainnet,
  arbitrum,
  optimism,
  base,
  polygon,
  bsc,
} from "wagmi/chains";

export const wagmiConfig = getDefaultConfig({
  appName: "Crydry Terminal",
  projectId: process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID || "demo-project-id",
  chains: [mainnet, arbitrum, optimism, base, polygon, bsc],
  ssr: true,
});
