import { PrismaClient, Chain, WalletLabel, TxType, RiskLevel, AuditSeverity } from "@prisma/client";

const prisma = new PrismaClient();

// --- Deterministic PRNG so seeding is repeatable -----------------------------
function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const rand = mulberry32(0xC0FFEE);
const pick = <T,>(arr: T[]) => arr[Math.floor(rand() * arr.length)];
const randInt = (min: number, max: number) => Math.floor(rand() * (max - min + 1)) + min;
const randFloat = (min: number, max: number) => rand() * (max - min) + min;

function evmAddress(seed: string) {
  const hex = "0123456789abcdef";
  let out = "0x";
  let s = 0;
  for (let i = 0; i < seed.length; i++) s = (s * 31 + seed.charCodeAt(i)) >>> 0;
  const r = mulberry32(s);
  for (let i = 0; i < 40; i++) out += hex[Math.floor(r() * 16)];
  return out;
}

function txHash(seed: string) {
  const hex = "0123456789abcdef";
  let out = "0x";
  let s = 0;
  for (let i = 0; i < seed.length; i++) s = (s * 131 + seed.charCodeAt(i)) >>> 0;
  const r = mulberry32(s);
  for (let i = 0; i < 64; i++) out += hex[Math.floor(r() * 16)];
  return out;
}

// --- Master data -------------------------------------------------------------
const TOKENS: Array<{
  symbol: string; name: string; chain: Chain; contract: string;
  decimals: number; price: number; change: number; mcap: number; vol: number; cat: string;
}> = [
  { symbol: "ETH", name: "Ethereum", chain: "ETHEREUM", contract: "0x0000000000000000000000000000000000000000", decimals: 18, price: 3420.55, change: 2.41, mcap: 411_000_000_000, vol: 18_400_000_000, cat: "L1" },
  { symbol: "WBTC", name: "Wrapped Bitcoin", chain: "ETHEREUM", contract: "0x2260fac5e5542a773aa44fbcfedf7c193bc2c599", decimals: 8, price: 67_812.4, change: 1.12, mcap: 12_400_000_000, vol: 1_400_000_000, cat: "L1" },
  { symbol: "USDC", name: "USD Coin", chain: "ETHEREUM", contract: "0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48", decimals: 6, price: 1.0, change: 0.01, mcap: 33_000_000_000, vol: 8_000_000_000, cat: "Stable" },
  { symbol: "USDT", name: "Tether", chain: "ETHEREUM", contract: "0xdac17f958d2ee523a2206206994597c13d831ec7", decimals: 6, price: 1.0, change: -0.02, mcap: 96_000_000_000, vol: 42_000_000_000, cat: "Stable" },
  { symbol: "ARB", name: "Arbitrum", chain: "ARBITRUM", contract: "0x912ce59144191c1204e64559fe8253a0e49e6548", decimals: 18, price: 0.91, change: -3.4, mcap: 3_700_000_000, vol: 240_000_000, cat: "L2" },
  { symbol: "OP", name: "Optimism", chain: "OPTIMISM", contract: "0x4200000000000000000000000000000000000042", decimals: 18, price: 1.84, change: 4.21, mcap: 2_100_000_000, vol: 180_000_000, cat: "L2" },
  { symbol: "MATIC", name: "Polygon", chain: "POLYGON", contract: "0x0000000000000000000000000000000000001010", decimals: 18, price: 0.52, change: -1.92, mcap: 5_100_000_000, vol: 290_000_000, cat: "L2" },
  { symbol: "SOL", name: "Solana", chain: "SOLANA", contract: "So11111111111111111111111111111111111111112", decimals: 9, price: 168.92, change: 6.74, mcap: 78_000_000_000, vol: 4_200_000_000, cat: "L1" },
  { symbol: "PEPE", name: "Pepe", chain: "ETHEREUM", contract: "0x6982508145454ce325ddbe47a25d4ec3d2311933", decimals: 18, price: 0.0000128, change: 12.3, mcap: 5_300_000_000, vol: 880_000_000, cat: "Memecoin" },
  { symbol: "WIF", name: "dogwifhat", chain: "SOLANA", contract: "EKpQGSJtjMFqKZ9KQanSqYXRcF8fBopzLHYxdM65zcjm", decimals: 6, price: 2.18, change: -8.9, mcap: 2_100_000_000, vol: 410_000_000, cat: "Memecoin" },
  { symbol: "LINK", name: "Chainlink", chain: "ETHEREUM", contract: "0x514910771af9ca656af840dff83e8264ecf986ca", decimals: 18, price: 14.21, change: 3.05, mcap: 8_900_000_000, vol: 320_000_000, cat: "Oracle" },
  { symbol: "UNI", name: "Uniswap", chain: "ETHEREUM", contract: "0x1f9840a85d5af5bf1d1762f925bdaddc4201f984", decimals: 18, price: 8.42, change: 1.84, mcap: 5_000_000_000, vol: 140_000_000, cat: "DEX" },
  { symbol: "AAVE", name: "Aave", chain: "ETHEREUM", contract: "0x7fc66500c84a76ad7e9c93437bfc5ac33e2ddae9", decimals: 18, price: 134.18, change: 2.12, mcap: 2_000_000_000, vol: 90_000_000, cat: "Lending" },
  { symbol: "ENA", name: "Ethena", chain: "ETHEREUM", contract: "0x57e114b691db790c35207b2e685d4a43181e6061", decimals: 18, price: 0.78, change: 9.41, mcap: 2_400_000_000, vol: 260_000_000, cat: "Stable Yield" },
  { symbol: "JUP", name: "Jupiter", chain: "SOLANA", contract: "JUPyiwrYJFskUPiHa7hkeR8VUtAeFoSYbKedZNsDvCN", decimals: 6, price: 1.04, change: 5.2, mcap: 1_400_000_000, vol: 95_000_000, cat: "DEX" },
  { symbol: "BONK", name: "Bonk", chain: "SOLANA", contract: "DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263", decimals: 5, price: 0.0000241, change: 14.8, mcap: 1_700_000_000, vol: 220_000_000, cat: "Memecoin" },
  { symbol: "AVAX", name: "Avalanche", chain: "AVALANCHE", contract: "0x0000000000000000000000000000000000000000", decimals: 18, price: 32.4, change: -2.1, mcap: 12_400_000_000, vol: 410_000_000, cat: "L1" },
];

const PROTOCOLS = ["Uniswap V3", "Aerodrome", "Curve", "GMX", "Aave V3", "Lido", "EigenLayer", "Jupiter", "Raydium", "PancakeSwap"];

const WHALES: Array<{
  ens: string; name: string; chain: Chain; labels: WalletLabel[]; net: number;
  pnlUsd: number; pnlPct: number; win: number; bio: string;
}> = [
  { ens: "vitalik.eth",   name: "Vitalik Buterin",   chain: "ETHEREUM", labels: ["WHALE", "FOUNDATION"], net: 962_400_000, pnlUsd: 24_100_000, pnlPct: 12.3, win: 0.71, bio: "Co-founder, Ethereum Foundation." },
  { ens: "punk6529.eth",  name: "6529",              chain: "ETHEREUM", labels: ["WHALE", "SMART_MONEY"], net: 41_280_000, pnlUsd: 3_120_000, pnlPct: 8.4, win: 0.62, bio: "OM. Open metaverse advocate." },
  { ens: "cobie.eth",     name: "Cobie",             chain: "ETHEREUM", labels: ["WHALE", "SMART_MONEY"], net: 78_900_000, pnlUsd: 5_400_000, pnlPct: 14.1, win: 0.58, bio: "Co-host UpOnly. Macro contrarian." },
  { ens: "hsaka.eth",     name: "Hsaka",             chain: "ETHEREUM", labels: ["SMART_MONEY"], net: 11_400_000, pnlUsd: 1_840_000, pnlPct: 22.8, win: 0.74, bio: "Perp leverage trader." },
  { ens: "tetranode.eth", name: "Tetranode",         chain: "ETHEREUM", labels: ["WHALE", "MARKET_MAKER"], net: 218_500_000, pnlUsd: 4_400_000, pnlPct: 4.1, win: 0.55, bio: "Yield farmer & DAO operator." },
  { ens: "ansem.sol",     name: "Ansem",             chain: "SOLANA",   labels: ["SMART_MONEY"], net: 23_700_000, pnlUsd: 6_900_000, pnlPct: 41.2, win: 0.69, bio: "Solana memecoin sniper." },
  { ens: "gcr.eth",       name: "GCR",               chain: "ETHEREUM", labels: ["WHALE", "SMART_MONEY"], net: 184_300_000, pnlUsd: -2_100_000, pnlPct: -1.2, win: 0.59, bio: "Macro derivatives trader." },
  { ens: "machibigbrother.eth", name: "Machi",       chain: "ETHEREUM", labels: ["WHALE"], net: 42_700_000, pnlUsd: 980_000, pnlPct: 2.4, win: 0.51, bio: "NFT degen / IRL conman energy." },
  { ens: "lookonchain.eth", name: "Lookonchain Watch", chain: "ETHEREUM", labels: ["WHALE"], net: 19_400_000, pnlUsd: 412_000, pnlPct: 2.2, win: 0.50, bio: "Tracked aggregate cluster wallet." },
  { ens: "binance14.eth", name: "Binance 14",        chain: "ETHEREUM", labels: ["EXCHANGE"], net: 4_120_000_000, pnlUsd: 0, pnlPct: 0, win: 0, bio: "Hot wallet — Binance." },
  { ens: "wintermute.eth",name: "Wintermute",        chain: "ETHEREUM", labels: ["MARKET_MAKER"], net: 612_400_000, pnlUsd: 14_200_000, pnlPct: 2.4, win: 0.61, bio: "Crypto market maker." },
  { ens: "jumptrading.eth", name: "Jump Trading",    chain: "ETHEREUM", labels: ["MARKET_MAKER"], net: 740_800_000, pnlUsd: 6_300_000, pnlPct: 0.9, win: 0.58, bio: "TradFi crossover MM." },
  { ens: "nakamoto.sol",  name: "SOL OG",            chain: "SOLANA",   labels: ["SMART_MONEY", "WHALE"], net: 14_200_000, pnlUsd: 4_900_000, pnlPct: 52.4, win: 0.67, bio: "Holds since 2020. Memecoin maxi." },
  { ens: "blocktower.eth",name: "BlockTower",        chain: "ETHEREUM", labels: ["WHALE"], net: 295_600_000, pnlUsd: 4_100_000, pnlPct: 1.4, win: 0.62, bio: "Hedge fund." },
  { ens: "0xsifu.eth",    name: "Sifu",              chain: "ETHEREUM", labels: ["WHALE"], net: 38_700_000, pnlUsd: -1_200_000, pnlPct: -3.0, win: 0.48, bio: "DeFi vet, ex-Wonderland." },
  { ens: "icebergy.eth",  name: "Icebergy",          chain: "ETHEREUM", labels: ["SMART_MONEY"], net: 8_900_000, pnlUsd: 2_400_000, pnlPct: 36.4, win: 0.71, bio: "On-chain analyst." },
  { ens: "loomdart.eth",  name: "Loomdart",          chain: "ETHEREUM", labels: ["SMART_MONEY"], net: 6_700_000, pnlUsd: 1_180_000, pnlPct: 21.7, win: 0.66, bio: "Arthur's smaller brother." },
  { ens: "alameda.eth",   name: "Alameda Estate",    chain: "ETHEREUM", labels: ["EXCHANGE"], net: 92_400_000, pnlUsd: 0, pnlPct: 0, win: 0, bio: "Bankruptcy estate wallet." },
  { ens: "f2pool.eth",    name: "F2Pool",            chain: "ETHEREUM", labels: ["EXCHANGE"], net: 184_900_000, pnlUsd: 0, pnlPct: 0, win: 0, bio: "Mining pool payout wallet." },
  { ens: "seedphrase.eth",name: "SeedPhrase",        chain: "ETHEREUM", labels: ["SMART_MONEY"], net: 4_300_000, pnlUsd: 1_900_000, pnlPct: 78.9, win: 0.79, bio: "Pre-launch memecoin specialist." },
];

const SPENDERS: Array<{ name: string; risk: RiskLevel; reason: string }> = [
  { name: "Uniswap V3 Router", risk: "LOW", reason: "Audited, immutable router with $20B+ cumulative volume." },
  { name: "Aerodrome Router", risk: "LOW", reason: "Verified contract, multi-sig governance." },
  { name: "0x Exchange Proxy", risk: "LOW", reason: "Audited proxy with timelock upgrade." },
  { name: "Aave V3 Pool", risk: "LOW", reason: "Battle-tested, time-locked admin." },
  { name: "GMX Vault", risk: "MEDIUM", reason: "Vault upgradable; safeguard timelock 24h." },
  { name: "Mystery Spender", risk: "HIGH", reason: "Unverified contract with infinite allowance." },
  { name: "Drainer.exe", risk: "CRITICAL", reason: "Address linked to wallet-drainer cluster." },
  { name: "Phishing Mimic", risk: "CRITICAL", reason: "Spoofed Uniswap router; created < 14 days ago." },
];

// --- Audit corpus ------------------------------------------------------------
const AUDIT_CONTRACTS: Array<{
  name: string; address: string; chain: Chain; verified: boolean; bytecode: number;
  compiler: string; risk: RiskLevel; score: number; summary: string;
  findings: Array<{ rule: string; title: string; severity: AuditSeverity; description: string; recommendation: string; line?: number }>;
}> = [
  {
    name: "RugStaking",
    address: "0xa1c0000000000000000000000000000000000bad",
    chain: "ETHEREUM",
    verified: true,
    bytecode: 14820,
    compiler: "0.8.19+commit.7dd6d404",
    risk: "CRITICAL",
    score: 92,
    summary: "Owner-controlled withdrawal with no timelock, hidden mint function and unbounded fee parameter.",
    findings: [
      { rule: "OWNER_DRAIN", title: "Owner can drain pool", severity: "CRITICAL", description: "`emergencyWithdraw()` transfers full balance to owner without timelock or quorum.", recommendation: "Replace with multisig + 48h timelock; emit transparent events.", line: 142 },
      { rule: "HIDDEN_MINT", title: "Unrestricted mint()", severity: "CRITICAL", description: "`_mint(owner, amount)` callable by EOA owner. Token supply is not capped.", recommendation: "Cap supply or move minting under DAO governance.", line: 88 },
      { rule: "FEE_UNBOUNDED", title: "Fee parameter has no ceiling", severity: "HIGH", description: "`setFee(uint256)` accepts up to 100%, enabling honey-pot exit.", recommendation: "Bound fee at 5% with onlyTimelock modifier.", line: 211 },
      { rule: "REENTRANCY_GUARD_MISSING", title: "Missing nonReentrant on claim()", severity: "MEDIUM", description: "claim() makes external call before state update.", recommendation: "Apply OpenZeppelin nonReentrant + checks-effects-interactions.", line: 174 },
    ],
  },
  {
    name: "AeroVaultV2",
    address: "0xae20000000000000000000000000000000000a17",
    chain: "BASE",
    verified: true,
    bytecode: 22100,
    compiler: "0.8.23+commit.f704f362",
    risk: "LOW",
    score: 12,
    summary: "Open-source vault with timelocked admin and audited dependencies. Minor gas notes only.",
    findings: [
      { rule: "GAS_STORAGE_PACKING", title: "Suboptimal struct packing", severity: "INFO", description: "Position struct uses two uint256 where uint128 would suffice.", recommendation: "Pack to single slot to save ~5k gas / op.", line: 47 },
      { rule: "STYLE_NATSPEC", title: "Missing NatSpec on public functions", severity: "INFO", description: "Three public functions lack `@notice` / `@param` tags.", recommendation: "Add NatSpec for downstream tooling.", line: 12 },
    ],
  },
  {
    name: "BridgeLite",
    address: "0xB81d6E0000000000000000000000000000003432",
    chain: "ARBITRUM",
    verified: false,
    bytecode: 8420,
    compiler: "unknown",
    risk: "HIGH",
    score: 71,
    summary: "Unverified bytecode with selectors matching known proxy-drain patterns.",
    findings: [
      { rule: "UNVERIFIED_SOURCE", title: "Source code not verified", severity: "HIGH", description: "Etherscan source not published; behavior cannot be audited.", recommendation: "Avoid approving until source is published & matches deployed bytecode." },
      { rule: "PROXY_NO_TIMELOCK", title: "EIP-1967 proxy without timelock", severity: "HIGH", description: "Implementation slot writable by EOA admin.", recommendation: "Wrap admin in 24h timelock + multisig." },
      { rule: "SELECTOR_CLASH", title: "Selector clash with permit() observed", severity: "MEDIUM", description: "Function selector 0xd505accf collides with token permit pattern.", recommendation: "Rename function to avoid client-side phishing." },
    ],
  },
];

// --- Main --------------------------------------------------------------------
async function main() {
  console.log("→ Wiping existing data");
  await prisma.auditFinding.deleteMany();
  await prisma.auditReport.deleteMany();
  await prisma.smartMoneySignal.deleteMany();
  await prisma.tokenApproval.deleteMany();
  await prisma.transaction.deleteMany();
  await prisma.holding.deleteMany();
  await prisma.marketTick.deleteMany();
  await prisma.token.deleteMany();
  await prisma.wallet.deleteMany();

  console.log("→ Seeding tokens");
  const tokenRecords = await Promise.all(
    TOKENS.map((t) =>
      prisma.token.create({
        data: {
          symbol: t.symbol,
          name: t.name,
          chain: t.chain,
          contract: t.contract,
          decimals: t.decimals,
          priceUsd: t.price,
          change24h: t.change,
          volume24h: t.vol,
          marketCap: t.mcap,
          fdvUsd: t.mcap * 1.15,
          category: t.cat,
          logo: `https://cryptologos.cc/logos/${t.name.toLowerCase().replace(/\s+/g, "-")}-${t.symbol.toLowerCase()}-logo.png`,
        },
      })
    )
  );
  const tokenBySymbol = new Map(tokenRecords.map((t) => [t.symbol, t]));

  console.log("→ Seeding market ticks (history per symbol)");
  const now = Date.now();
  for (const t of tokenRecords) {
    for (let i = 47; i >= 0; i--) {
      const drift = Math.sin(i / 4) * Number(t.priceUsd) * 0.04 + (rand() - 0.5) * Number(t.priceUsd) * 0.03;
      const px = Math.max(0.0000001, Number(t.priceUsd) + drift);
      await prisma.marketTick.create({
        data: {
          symbol: t.symbol,
          priceUsd: px,
          change24h: ((px - Number(t.priceUsd)) / Number(t.priceUsd)) * 100,
          volume24h: Number(t.volume24h) * randFloat(0.6, 1.4),
          capturedAt: new Date(now - i * 30 * 60 * 1000),
        },
      });
    }
  }

  console.log("→ Seeding wallets");
  const walletRecords = await Promise.all(
    WHALES.map((w, idx) =>
      prisma.wallet.create({
        data: {
          address: evmAddress(w.ens + idx),
          chain: w.chain,
          ens: w.ens,
          displayName: w.name,
          labels: w.labels,
          netWorthUsd: w.net,
          pnl30dUsd: w.pnlUsd,
          pnl30dPct: w.pnlPct,
          winRate: w.win,
          realizedUsd: w.pnlUsd * 0.6,
          unrealizedUsd: w.pnlUsd * 0.4,
          followers: randInt(120, 84_000),
          bio: w.bio,
        },
      })
    )
  );

  console.log("→ Seeding holdings");
  for (const w of walletRecords) {
    const holdingsCount = randInt(6, 11);
    const chosen = [...tokenRecords].sort(() => rand() - 0.5).slice(0, holdingsCount);
    const weights = chosen.map(() => randFloat(0.05, 1));
    const total = weights.reduce((a, b) => a + b, 0);
    for (let i = 0; i < chosen.length; i++) {
      const tk = chosen[i];
      const allocation = weights[i] / total;
      const valueUsd = Number(w.netWorthUsd) * allocation;
      const amount = valueUsd / Math.max(0.0000001, Number(tk.priceUsd));
      const pnlPct = randFloat(-25, 80);
      const pnlUsd = valueUsd * (pnlPct / 100);
      const costBasis = valueUsd - pnlUsd;
      await prisma.holding.create({
        data: {
          walletId: w.id,
          tokenId: tk.id,
          amount,
          valueUsd,
          costBasis,
          pnlUsd,
          pnlPct,
          allocation: allocation * 100,
        },
      });
    }
  }

  console.log("→ Seeding transactions");
  const txTypes: TxType[] = ["SWAP", "TRANSFER_IN", "TRANSFER_OUT", "ADD_LIQUIDITY", "STAKE", "CLAIM"];
  for (const w of walletRecords) {
    const count = randInt(20, 38);
    for (let i = 0; i < count; i++) {
      const type = pick(txTypes);
      const tk = pick(tokenRecords);
      const amount = randFloat(1, 20_000);
      const valueUsd = amount * Number(tk.priceUsd);
      await prisma.transaction.create({
        data: {
          hash: txHash(w.address + i),
          walletId: w.id,
          chain: w.chain,
          type,
          blockNumber: BigInt(19_000_000 + randInt(0, 800_000)),
          timestamp: new Date(now - randInt(1, 60 * 24 * 30) * 60 * 1000),
          fromAddr: type === "TRANSFER_IN" ? evmAddress("from" + i + w.address) : w.address,
          toAddr: type === "TRANSFER_OUT" ? evmAddress("to" + i + w.address) : w.address,
          tokenSymbol: tk.symbol,
          tokenAmount: amount,
          valueUsd,
          gasUsd: randFloat(0.3, 24),
          protocol: pick(PROTOCOLS),
        },
      });
    }
  }

  console.log("→ Seeding token approvals");
  for (const w of walletRecords.slice(0, 8)) {
    const cnt = randInt(4, 9);
    const tokens = [...tokenRecords].sort(() => rand() - 0.5).slice(0, cnt);
    for (const tk of tokens) {
      const sp = pick(SPENDERS);
      const unlimited = rand() > 0.4;
      await prisma.tokenApproval.create({
        data: {
          walletId: w.id,
          tokenId: tk.id,
          spender: evmAddress(sp.name + tk.symbol),
          spenderName: sp.name,
          allowance: unlimited ? "115792089237316195423570985008687907853269984665640564039457584007913129639935" : String(randInt(1_000, 100_000_000)),
          isUnlimited: unlimited,
          riskLevel: sp.risk,
          riskReason: sp.reason,
          lastUsed: new Date(now - randInt(1, 200) * 24 * 60 * 60 * 1000),
        },
      });
    }
  }

  console.log("→ Seeding smart-money signals");
  const cohorts = ["Solana Memecoin Snipers", "ETH OG Whales", "Perp Maxis", "Stable Yield Farmers", "Pre-launch IDO Hunters"];
  const directions = ["LONG", "SHORT", "ACCUMULATE", "DISTRIBUTE"];
  const smWallets = walletRecords.filter((w) => w.labels.includes("SMART_MONEY"));
  for (const w of smWallets) {
    for (let i = 0; i < randInt(2, 5); i++) {
      const tk = pick(tokenRecords);
      await prisma.smartMoneySignal.create({
        data: {
          walletId: w.id,
          cohort: pick(cohorts),
          conviction: randFloat(0.5, 0.99),
          asset: tk.symbol,
          direction: pick(directions),
          sizeUsd: randFloat(50_000, 4_500_000),
          thesis: `${pick(["Cohort", "Cluster", "Group"])} rotating into ${tk.symbol} after ${randInt(2, 14)}d accumulation.`,
          detectedAt: new Date(now - randInt(0, 60 * 24 * 14) * 60 * 1000),
        },
      });
    }
  }

  console.log("→ Seeding audit reports");
  for (const c of AUDIT_CONTRACTS) {
    await prisma.auditReport.create({
      data: {
        contractName: c.name,
        chain: c.chain,
        address: c.address,
        bytecodeSize: c.bytecode,
        verified: c.verified,
        compiler: c.compiler,
        riskScore: c.score,
        overallRisk: c.risk,
        summary: c.summary,
        findings: {
          create: c.findings,
        },
      },
    });
  }

  console.log("✓ Seed complete");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
