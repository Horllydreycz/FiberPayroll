// Simulated Fiber adapter.
//
// Reproduces the real payment lifecycle (CREATED -> INFLIGHT -> SUCCESS/FAILED)
// WITHOUT a running node, so the app is fully demoable offline. State is encoded
// into the payment hash itself, so `getPayment` is deterministic and stateless:
// status is derived from elapsed time since the hash was minted.
//
//   sim-<startMs>-<fate>-<rand>
//     fate: 0 = will succeed, 1 = will fail mid-flight
//
// Timeline (fast for live demos):
//   0.0s – 1.2s  CREATED      (payment requested / broadcasting)
//   1.2s – 3.5s  INFLIGHT     (routing through channels)
//   > 3.5s       SUCCESS      (settled)   or  FAILED (at ~2.0s if fate=1)

import type {
  CreateInvoiceParams,
  FiberAdapter,
  FiberInvoice,
  FiberPayment,
  FiberPaymentStatus,
  SendPaymentParams,
} from "./types";

const CREATED_UNTIL = 1200;
const INFLIGHT_UNTIL = 3500;
const FAIL_AT = 2000;

function rand(len = 16) {
  let s = "";
  const chars = "0123456789abcdef";
  for (let i = 0; i < len; i++) s += chars[Math.floor(Math.random() * 16)];
  return s;
}

function hashFor(fate: 0 | 1) {
  return `sim-${Date.now()}-${fate}-${rand(40)}`;
}

function parseHash(hash: string): { startMs: number; fate: 0 | 1; seed: string } {
  const [, startStr, fateStr, seed] = hash.split("-");
  return {
    startMs: Number(startStr) || Date.now(),
    fate: (Number(fateStr) === 1 ? 1 : 0) as 0 | 1,
    seed: seed ?? "0",
  };
}

function deriveFee(seed: string, amount: number) {
  // Tiny network fee — Fiber micropayments are cheap. ~0.01%–0.05%.
  const n = parseInt(seed.slice(0, 4) || "1", 16) % 5;
  return Math.round(amount * (0.0001 + n * 0.0001) * 100) / 100;
}

function deriveHops(seed: string) {
  return 1 + (parseInt(seed.slice(4, 6) || "1", 16) % 3);
}

function statusAt(hash: string, now: number): FiberPaymentStatus {
  const { startMs, fate } = parseHash(hash);
  const elapsed = now - startMs;
  if (fate === 1) return elapsed < FAIL_AT ? "INFLIGHT" : "FAILED";
  if (elapsed < CREATED_UNTIL) return "CREATED";
  if (elapsed < INFLIGHT_UNTIL) return "INFLIGHT";
  return "SUCCESS";
}

function toPayment(
  hash: string,
  amount: number,
  stablecoin: string,
): FiberPayment {
  const now = Date.now();
  const { startMs, seed } = parseHash(hash);
  const status = statusAt(hash, now);
  return {
    paymentHash: hash,
    status,
    amount,
    stablecoin,
    fee: status === "SUCCESS" ? deriveFee(seed, amount) : 0,
    routeHops: deriveHops(seed),
    failedReason:
      status === "FAILED" ? "No route with sufficient channel capacity" : undefined,
    createdAt: startMs,
    lastUpdatedAt: now,
  };
}

export class SimulatedFiberAdapter implements FiberAdapter {
  readonly mode = "simulated" as const;

  async ping() {
    return {
      ok: true,
      mode: "simulated",
      detail: "Local simulation — no Fiber node required.",
    };
  }

  async createInvoice(params: CreateInvoiceParams): Promise<FiberInvoice> {
    const net = "fibt"; // testnet-style prefix
    const paymentHash = rand(64);
    return {
      invoiceAddress: `${net}1${rand(48)}`,
      paymentHash,
      amount: params.amount,
      stablecoin: params.stablecoin,
      payee: params.payee,
      expiresAt: Date.now() + (params.expirySeconds ?? 3600) * 1000,
    };
  }

  async sendPayment(params: SendPaymentParams): Promise<FiberPayment> {
    const fate: 0 | 1 = params.forceOutcome === "fail" ? 1 : 0;
    const hash = hashFor(fate);
    return toPayment(hash, params.amount, params.stablecoin);
  }

  async getPayment(paymentHash: string): Promise<FiberPayment> {
    // Amount/stablecoin aren't encoded in the hash; callers persist them in the
    // DB and pass canonical values. We return 0 here and let the service layer
    // merge in the stored amount. Status/fee/hops are derived from the hash.
    return toPayment(paymentHash, 0, "RUSD");
  }
}
