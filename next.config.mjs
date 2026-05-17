/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Required for wagmi v2 + RainbowKit + viem to work in Next.js App Router
  transpilePackages: [
    "@rainbow-me/rainbowkit",
    "wagmi",
    "viem",
    "@tanstack/react-query",
  ],
  webpack: (config) => {
    // Polyfill node-only modules used by some wagmi connectors
    config.resolve.fallback = {
      ...config.resolve.fallback,
      fs: false,
      net: false,
      tls: false,
    };
    config.externals.push("pino-pretty", "lokijs", "encoding");
    return config;
  },
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "assets.coingecko.com" },
      { protocol: "https", hostname: "coin-images.coingecko.com" },
      { protocol: "https", hostname: "raw.githubusercontent.com" },
      { protocol: "https", hostname: "cryptologos.cc" },
      { protocol: "https", hostname: "**.walletconnect.com" },
      { protocol: "https", hostname: "**.walletconnect.org" },
    ],
  },
  eslint: {
    // Don't fail build on ESLint warnings — keep build resilient
    ignoreDuringBuilds: true,
  },
  typescript: {
    // Don't fail build on type errors in production deploys; we typecheck in CI separately
    ignoreBuildErrors: false,
  },
};

export default nextConfig;
