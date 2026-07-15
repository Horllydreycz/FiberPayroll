# Fiber Payroll

> A reusable payment-UX layer over the Nervos CKB Fiber Network, shown as global payroll. Each payment lands in about a second and costs a fraction of a cent.

Live demo: **https://216-250-118-10.sslip.io**

The core of this project is a small payment layer that sits over a Fiber node and handles
the things every payment app needs: reading real spendable balance, refusing a spend the
channel can't cover, tracking settlement, retrying failures, and producing a receipt
anyone can verify. It lives in [`lib/fiber/`](lib/fiber) behind one interface, so you can
build on it instead of talking to raw JSON-RPC.

Payroll is how the layer is put to work. Add your team, build a run, approve it, and pay
everyone — each person's pay moves over a Fiber channel and settles in roughly a second.
The balance you see is the node's actual balance, not a number in a database. Every
payment records what it was worth in USD the moment it settled, and every payslip carries
a QR code anyone can scan to check the payment really happened.

## Quick start (no Fiber node needed)

```bash
npm install
npm run db:push      # create the SQLite schema
npm run db:seed      # seed demo company + employees + a completed payroll
npm run dev          # http://localhost:3000
```

Demo login: `admin@fiberpayroll.dev` / `password123`

Out of the box it runs in simulated mode, which walks a payment through its whole
lifecycle (`Created → Inflight → Success/Failed`) locally, so you can demo the entire
thing offline. To switch to real payments against a node, see "Going live" below.

### Docker

```bash
docker compose up --build          # dev/demo container on :3000
```

For production (a VPS running both Fiber nodes with HTTPS), see
[`deploy/README.md`](deploy/README.md) and `docker-compose.prod.yml`.

## The 5-minute demo

1. **Log in.** The dashboard shows the live treasury (channel plus on-chain CKB, with a
   USD estimate) and a plain-language summary of what happened today and what needs you.
2. **Employees.** Add one by hand, or hit `Import` and drop in
   `public/sample-employees.csv`. It validates the rows, catches duplicates, and previews
   before saving.
3. **New payroll.** Pick who to pay, choose the month, generate the run.
4. **Review, approve, execute.** If the run costs more than the channel can spend, the app
   won't let you run it.
5. **Watch it settle.** Each payment moves `Broadcasting → Processing → Settled` live.
   Anything that fails, or doesn't settle within 60 seconds, can be retried on its own.
6. **Payslip.** Download the PDF: amount in CKB, its USD value at settlement, the rate
   used, and a QR code linking to a public `/verify` page with the payment hash and the
   on-chain channel it settled through.
7. **Reports.** Charts by month, country, and department, plus a CSV export.

## How the Fiber part works

The bridge between payroll and Fiber lives in [`lib/fiber/`](lib/fiber), behind one
`FiberAdapter` interface with two implementations:

- **`rpc.ts`** is the real one. It talks to a Fiber node over JSON-RPC: `send_payment`
  (a keysend for the item's exact CKB amount), `get_payment` to poll settlement,
  `list_channels` for spendable liquidity and the on-chain anchor, `connect_peer` and
  `list_peers` to keep the payout link healthy, and `node_info`. The treasury figure adds
  the channel's `local_balance` to the wallet's on-chain CKB, read from a CKB indexer RPC.
- **`simulated.ts`** runs the same lifecycle with no node behind it.
- **`service.ts`** ties it together: the funds check before a run, executing the batch,
  syncing settlement with the 60-second timeout, the retry flow, the settlement timeline,
  stamping the CoinGecko USD rate at settlement, generating payslips, notifications, and
  the audit log.

Payroll settles in CKB, so the amount you see is the amount that moves on-chain. Salaries
can be entered in CKB, or in fiat and converted at a demo rate.

### Going live

Run two fnn nodes with a funded channel between them (employer paying out to the payout
node), then set:

```bash
FIBER_MODE=rpc
FIBER_RPC_URL=http://127.0.0.1:8227      # employer node RPC
FIBER_PAYOUT_PUBKEY=03...                # payout node pubkey
FIBER_PAYOUT_ADDR=/ip4/.../p2p/Qm...     # payout node multiaddr (auto-reconnect)
FIBER_CKB_RPC_URL=https://testnet.ckbapp.dev/
FIBER_PAYER_LOCK_ARG=0x...               # employer wallet lock args (on-chain balance)
```

The [Fiber docs](https://www.fiber.world/docs) and the
[run-a-node guide](https://www.fiber.world/docs/quick-start/run-a-node) cover the node
setup.

## Built with

- Next.js 16 (App Router, standalone output), React 19, TypeScript, Tailwind v4, shadcn-style UI
- Auth.js v5 (credentials), Prisma 6 with SQLite (swap `DATABASE_URL` for Postgres)
- `@react-pdf/renderer` and `qrcode` for payslips, PapaParse for CSV, Recharts for charts
- CoinGecko for the live CKB/USD rate, Docker (multi-stage) with Caddy for HTTPS in production

## Scripts

| Script | What it does |
| --- | --- |
| `npm run dev` | Start the dev server |
| `npm run db:push` | Apply the Prisma schema to SQLite |
| `npm run db:seed` | Reset and reseed the demo data |
| `npm run db:studio` | Open Prisma Studio |
| `npm run build` | Production build |
