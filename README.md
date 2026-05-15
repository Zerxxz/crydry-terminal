# Crydry Terminal

A production-grade crypto operating terminal — wallet portfolios, whale tracking, smart-money flow, token-approval revoke, and a smart-contract audit tool — wrapped in a Nansen-grade interface with magenta & autumn aesthetics.

## Stack

- **Next.js 14** (App Router) + **TypeScript**
- **PostgreSQL** via **Prisma**
- **Tailwind** + **shadcn/ui** primitives
- **Framer Motion** for motion design
- **Recharts** for time-series & flow charts
- **TanStack Query** for client cache
- **Zod** for runtime validation

## Features

| Module | Route | Description |
| --- | --- | --- |
| Dashboard | `/terminal` | KPIs, market ticker, network activity |
| Portfolio | `/terminal/portfolio` | Multi-chain holdings & PnL |
| Whale Tracker | `/terminal/whales` | Top 100 whales, flow charts, profiles |
| Smart Money | `/terminal/smart-money` | Cohort leaderboard & rotating capital |
| Revoke | `/terminal/revoke` | Token-approval auditor + revoke action |
| Audit | `/terminal/audit` | Static-analysis smart-contract auditor |

## Getting started

```bash
# 1. Install
npm install

# 2. Environment
cp .env.example .env
# edit DATABASE_URL

# 3. Database
npx prisma migrate dev --name init
npm run db:seed

# 4. Dev server
npm run dev
```

The app runs at <http://localhost:3000>.

## Architecture

```
src/
  app/                # routes (App Router)
    api/              # JSON endpoints
    terminal/         # authenticated terminal shell
  components/
    ui/               # shadcn primitives
    chart/            # recharts wrappers
    terminal/         # feature-specific composites
  lib/
    db.ts             # Prisma singleton
    chains.ts         # chain registry
    audit/            # static analysis rules engine
    format.ts         # currency/number/address formatters
    types.ts          # shared zod schemas
prisma/
  schema.prisma       # data model
  seed.ts             # realistic seed data
```

## Production notes

- All routes return real loading / empty / error states. No placeholders.
- Wallet auth surface is provider-agnostic; swap the stub in `lib/wallet.ts` for `wagmi` + `viem` when wiring real chains.
- Chain provider adapters in `lib/chains.ts` look for `ALCHEMY_API_KEY` / `ETHERSCAN_API_KEY` / `HELIUS_API_KEY`. When absent, the API serves seeded DB data so the UI is never broken.
