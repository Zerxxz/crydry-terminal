import type { Metadata } from "next";
import { Inter, JetBrains_Mono, Space_Grotesk } from "next/font/google";
import { headers } from "next/headers";
import "./globals.css";
import { Providers } from "@/components/providers";
import { Toaster } from "sonner";

const sans = Inter({ subsets: ["latin"], variable: "--font-sans", display: "swap" });
const display = Space_Grotesk({ subsets: ["latin"], variable: "--font-display", display: "swap" });
const mono = JetBrains_Mono({ subsets: ["latin"], variable: "--font-mono", display: "swap" });

export const metadata: Metadata = {
  title: "Crydry Terminal — Web3 Operations OS",
  description:
    "Track whales, decode smart money, audit contracts and revoke wallet approvals from a single, beautifully fast Web3 terminal.",
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"),
  openGraph: {
    title: "Crydry Terminal",
    description: "The Web3 operations terminal — built for whales, by whales.",
    type: "website",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  // Pass cookie header to wagmi for SSR hydration of wallet state
  const cookie = headers().get("cookie") ?? "";

  return (
    <html lang="en" suppressHydrationWarning className={`${sans.variable} ${display.variable} ${mono.variable}`}>
      <body className="antialiased">
        <Providers cookie={cookie}>{children}</Providers>
        <Toaster
          position="bottom-right"
          theme="dark"
          toastOptions={{
            style: {
              background: "rgba(20, 8, 16, 0.85)",
              border: "1px solid rgba(255, 61, 160, 0.3)",
              color: "rgb(245, 230, 240)",
              backdropFilter: "blur(12px)",
            },
          }}
        />
      </body>
    </html>
  );
}
