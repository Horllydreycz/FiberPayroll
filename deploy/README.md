# Deploying FiberPayroll to a VPS

One Ubuntu VPS runs everything: both Fiber nodes, the app, and Caddy for HTTPS.
Only ports 80/443 are exposed — the node RPCs stay on the internal Docker
network (fnn's JSON-RPC has no authentication; never publish it).

## 0. Prerequisites

- A VPS (Ubuntu 22.04+, 2 GB RAM is plenty), with ports 80 and 443 open
- A domain (or subdomain) with an A record pointing at the VPS IP
- Docker + the compose plugin on the VPS:
  `curl -fsSL https://get.docker.com | sh`

## 1. Copy the project

```bash
scp -r FiberPayroll user@your-vps:~/
cd ~/FiberPayroll
```

## 2. Bring the Fiber nodes

Two options:

**A — Move your existing nodes (keeps your funds AND the funded channel).**
Stop the local fiber-a / fiber-b containers first, then copy each node's whole
data directory (config.yml, ckb/key, and the store the node created) into:

```
deploy/fiber/a/   ← everything from fiber-testnet/a + its container data dir
deploy/fiber/b/   ← everything from fiber-testnet/b + its container data dir
```

The channel state lives in those directories — since both sides move together,
the channel comes with them. Don't run the old and new copies at the same time
(a stale commitment broadcast can forfeit channel funds).

**B — Fresh nodes.** Create `deploy/fiber/a` and `deploy/fiber/b`, put a new
CKB private key at `ckb/key` in each (32-byte hex), and copy your existing
`config.yml` files as a starting point. You'll fund from the faucet and open a
channel in step 5.

Make sure each `config.yml` has `rpc.listening_addr: "0.0.0.0:8227"` (Docker
needs it reachable from the app container; the network is still private).

## 3. Configure

```bash
cp .env.production.example .env
nano .env
```

Fill in `DOMAIN`, a fresh `AUTH_SECRET` (`npx auth secret`), the node key
passwords, and — if you reused your existing nodes — the same
`FIBER_PAYOUT_PUBKEY` / `FIBER_PAYER_LOCK_ARG` values from your local `.env`.
`FIBER_PAYOUT_ADDR` changes to DNS form: `/dns4/fiber-b/tcp/8228/p2p/<PEER_ID>`
(same peer ID as before if the keys moved).

## 4. Start the nodes and collect identities

```bash
docker compose -f docker-compose.prod.yml up -d fiber-a fiber-b
docker compose -f docker-compose.prod.yml exec fiber-a fnn-cli info
docker compose -f docker-compose.prod.yml exec fiber-b fnn-cli info
```

From fiber-b's output take the `pubkey` (→ `FIBER_PAYOUT_PUBKEY`) and peer id
(→ `FIBER_PAYOUT_ADDR`). From fiber-a's output take its wallet address; its
lock args go in `FIBER_PAYER_LOCK_ARG` (drives the on-chain treasury reading).

## 5. Fund and open the channel (fresh nodes only)

Get testnet CKB from https://faucet.nervos.org to fiber-a's address, then:

```bash
docker compose -f docker-compose.prod.yml exec fiber-a fnn-cli peer connect "/dns4/fiber-b/tcp/8228/p2p/<FIBER_B_PEER_ID>"
docker compose -f docker-compose.prod.yml exec fiber-a fnn-cli channel open --peer <FIBER_B_PEER_ID> --funding-amount <shannons>
```

(e.g. 50000000000 shannons = 500 CKB; ~62 CKB stays locked as reserve.)
Wait for the funding tx to confirm; `fnn-cli channel list_channels` should
show `CHANNEL_READY`.

## 6. Launch everything

```bash
docker compose -f docker-compose.prod.yml up -d --build
```

Caddy fetches a Let's Encrypt certificate automatically. Open
`https://<your-domain>`, register, and check the Treasury card shows the
node's real balance.

## Operations

- Logs: `docker compose -f docker-compose.prod.yml logs -f app fiber-a`
- Update the app: `git pull && docker compose -f docker-compose.prod.yml up -d --build app`
- Back up: the `payroll-data` volume (SQLite DB) and `deploy/fiber/*`
  (node keys + channel state — this IS the wallet, guard it)
- The `deploy/fiber` directories are gitignored; never commit keys

## Known limitation

Every registered company shares the single fiber-a treasury. Fine for a
testnet demo (faucet money); a per-company node or sub-account model is needed
before anything real.
