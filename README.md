# Fiber Payroll

> Global payroll in stablecoins, completed in minutes — built on the Nervos CKB **Fiber Network**.

Upload your team, generate a payroll run, approve it, and pay everyone worldwide in stablecoins
(RUSD/USDI/USDC) over Fiber's payment channels — with **live settlement tracking**, PDF payslips
with QR verification, and audit-ready accounting exports.

## Quick start

```bash
npm install
npm run db:push      # create the SQLite schema
npm run db:seed      # seed demo company + employees + a completed payroll
npm run dev          # http://localhost:3000
```

**Demo login:** `admin@fiberpayroll.dev` · `password123`

## The 5-minute demo flow

1. **Log in** → land on the dashboard (treasury balance, settlement rate, recent runs).
2. **Employees** → `Import` and drop `public/sample-employees.csv` (validation + duplicate detection + preview).
3. **New payroll** → select employees, pick the month, **Generate payroll** (creates a draft).
4. **Review** the run → **Approve** → **Execute payments**.
5. **Watch live settlement** — payments move `Broadcasting → Processing → Settled` in real time.
   One payment fails on purpose → click **Retry** → it settles.
6. **Payslip** → open a settled payment's payslip → **Download PDF** (QR links to a public `/verify` page).
7. **Reports** → charts by month / country / stablecoin / department → **Export CSV**.

## Tech

- **Next.js 16** (App Router) · **React 19** · **TypeScript** · **Tailwind v4** · shadcn-style UI
- **Auth.js v5** (credentials) · **Prisma 6** + **SQLite** (swap `DATABASE_URL` for Postgres)
- **Recharts** · **@react-pdf/renderer** + **qrcode** · **PapaParse**

## Fiber Network integration

The payroll ↔ Fiber bridge lives in [`lib/fiber/`](lib/fiber):

- `simulated.ts` — default adapter. Reproduces the real `Created → Inflight → Success/Failed`
  payment lifecycle locally, so the whole app is demoable with **no node required**.
- `rpc.ts` — real adapter. Talks to a Fiber node's JSON-RPC (`new_invoice`, `send_payment`,
  `get_payment`) and denominates payments in a stablecoin UDT via `udt_type_script`.
- `service.ts` — orchestration: executes a batch, polls settlement, records the timeline,
  generates payslips, and reconciles the treasury balance.

To settle against a **live Fiber node**, set in `.env`:

```bash
FIBER_MODE=rpc
FIBER_RPC_URL=http://127.0.0.1:8227
FIBER_RUSD_UDT_SCRIPT='{"code_hash":"0x...","hash_type":"type","args":"0x..."}'
```

See the [Fiber docs](https://www.fiber.world/docs) and
[run-a-node guide](https://www.fiber.world/docs/quick-start/run-a-node).

## Scripts

| Script | Description |
| --- | --- |
| `npm run dev` | Start the dev server |
| `npm run db:push` | Apply the Prisma schema to SQLite |
| `npm run db:seed` | Reset + seed demo data |
| `npm run db:studio` | Open Prisma Studio |
| `npm run build` | Production build |
