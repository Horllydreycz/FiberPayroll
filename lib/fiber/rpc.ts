// Real Fiber node adapter — talks to a live Fiber node's JSON-RPC endpoint.
//
// Verified against fnn v0.9.0-rc5 on CKB testnet. Implements the Payment module
// (send_payment / get_payment) and node_info. Amounts on the CKB RPC are u128
// hex strings ("0x..").
//
// CKB-NATIVE (keysend): the payroll app holds a funded channel from the
// employer node to a payout node. Each payroll item triggers a REAL keysend
// payment of the item's actual CKB amount to FIBER_PAYOUT_PUBKEY over that
// channel — what the business sees is what settles. FIBER_PAYMENT_SHANNONS is
// only a fallback when an item has no amount. Set FIBER_RUSD_UDT_SCRIPT + an
// invoice flow for stablecoin (UDT) payments.

import { ckbEquivalent } from "@/lib/constants";
import { getCkbPerUsd } from "@/lib/price";
import type {
  CreateInvoiceParams,
  FiberAdapter,
  FiberInvoice,
  FiberPayment,
  FiberPaymentStatus,
  SendPaymentParams,
} from "./types";

const CKB_DECIMALS = 8;

function toHex(n: bigint | number): string {
  return "0x" + BigInt(n).toString(16);
}
function ckbFromShannons(units: string | number): number {
  return Number(BigInt(units ?? 0)) / 10 ** CKB_DECIMALS;
}

function mapStatus(s: string): FiberPaymentStatus {
  switch ((s || "").toLowerCase()) {
    case "success":
      return "SUCCESS";
    case "failed":
      return "FAILED";
    case "inflight":
      return "INFLIGHT";
    default:
      return "CREATED";
  }
}

export class RpcFiberAdapter implements FiberAdapter {
  readonly mode = "rpc" as const;
  private url: string;
  private payoutPubkey: string;
  private payoutAddr: string;
  private paymentShannons: bigint;

  constructor(url = process.env.FIBER_RPC_URL ?? "http://127.0.0.1:8227") {
    this.url = url;
    this.payoutPubkey = process.env.FIBER_PAYOUT_PUBKEY ?? "";
    this.payoutAddr = process.env.FIBER_PAYOUT_ADDR ?? "";
    this.paymentShannons = BigInt(process.env.FIBER_PAYMENT_SHANNONS ?? "100000000"); // 1 CKB
  }

  // Ensure the payout peer is connected so the channel has usable liquidity.
  // Idempotent and best-effort — the node ignores an already-connected peer.
  private async ensurePeer() {
    if (!this.payoutAddr) return;
    try {
      await this.call("connect_peer", [{ address: this.payoutAddr, save: true }]);
    } catch {
      /* already connected / transient — ignore */
    }
  }

  private async isPayoutPeerConnected(): Promise<boolean> {
    try {
      const res = await this.call<{ peers: { pubkey?: string }[] }>("list_peers", [{}]);
      return !!res.peers?.some((p) => p.pubkey === this.payoutPubkey);
    } catch {
      return false;
    }
  }

  // Pre-flight health check run before a payroll batch: connect the payout peer
  // and wait until the link is up, so the first payment never hits "liquidity 0".
  async ensureReady() {
    if (!this.payoutPubkey || !this.payoutAddr) {
      return { ready: true, detail: "no payout peer configured" };
    }
    if (await this.isPayoutPeerConnected()) {
      return { ready: true, detail: "payout peer already connected" };
    }
    await this.ensurePeer();
    for (let i = 0; i < 8; i++) {
      await new Promise((r) => setTimeout(r, 1000));
      if (await this.isPayoutPeerConnected()) {
        return { ready: true, detail: "payout peer reconnected" };
      }
    }
    return { ready: false, detail: "payout peer did not reconnect in time" };
  }

  private async call<T>(method: string, params: unknown): Promise<T> {
    const res = await fetch(this.url, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ id: 1, jsonrpc: "2.0", method, params }),
      signal: AbortSignal.timeout(20_000),
    });
    if (!res.ok) throw new Error(`Fiber RPC ${method}: HTTP ${res.status}`);
    const json = await res.json();
    if (json.error) {
      throw new Error(`Fiber RPC ${method}: ${json.error.message ?? "error"}`);
    }
    return json.result as T;
  }

  // The on-chain funding tx hash of the channel to the payout node. This is the
  // verifiable on-chain anchor shared by all payments routed through the channel.
  private async channelFundingTx(): Promise<string | undefined> {
    try {
      const res = await this.call<{ channels: { channel_outpoint: string; peer_id?: string; remote_pubkey?: string }[] }>(
        "list_channels",
        [{}],
      );
      const chan = res.channels?.[0];
      if (!chan?.channel_outpoint) return undefined;
      // outpoint = 0x <32-byte tx hash> <4-byte index>; strip the index suffix.
      return chan.channel_outpoint.slice(0, 66);
    } catch {
      return undefined;
    }
  }

  // Real employer-node balance: on-chain wallet (un-channeled CKB) + channel
  // outbound liquidity. Reads the live node + public CKB RPC.
  async getBalance() {
    let channelShannons = BigInt(0);
    let onchainShannons = BigInt(0);
    let nodeOk = true;

    try {
      const res = await this.call<{ channels: { local_balance: string }[] }>("list_channels", [{}]);
      for (const c of res.channels ?? []) channelShannons += BigInt(c.local_balance ?? 0);
    } catch {
      nodeOk = false; // node unreachable — channel liquidity unknown
    }

    const ckbRpc = process.env.FIBER_CKB_RPC_URL;
    const lockArg = process.env.FIBER_PAYER_LOCK_ARG;
    const codeHash =
      process.env.FIBER_PAYER_LOCK_CODE_HASH ??
      "0x9bd7e06f3ecf4be0f2fcd2188b23f1b9fcc88e5d4b65a8637b17723bbda3cce8";
    if (ckbRpc && lockArg) {
      try {
        const r = await fetch(ckbRpc, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            id: 1,
            jsonrpc: "2.0",
            method: "get_cells_capacity",
            params: [{ script: { code_hash: codeHash, hash_type: "type", args: lockArg }, script_type: "lock" }],
          }),
          signal: AbortSignal.timeout(5_000),
        });
        const j = await r.json();
        if (j.result?.capacity) onchainShannons = BigInt(j.result.capacity);
      } catch {
        /* ignore */
      }
    }

    const channelCkb = Number(channelShannons) / 1e8;
    const onchainCkb = Number(onchainShannons) / 1e8;
    return { onchainCkb, channelCkb, totalCkb: onchainCkb + channelCkb, nodeOk };
  }

  async ping() {
    try {
      const info = await this.call<{ pubkey: string; version: string }>("node_info", {});
      return { ok: true, mode: "rpc", detail: `fnn ${info.version} · ${info.pubkey.slice(0, 12)}…` };
    } catch (e) {
      return { ok: false, mode: "rpc", detail: (e as Error).message };
    }
  }

  // No invoice needed for the keysend demo flow; return a descriptive stub so
  // the orchestration layer keeps working unchanged.
  async createInvoice(params: CreateInvoiceParams): Promise<FiberInvoice> {
    return {
      invoiceAddress: `keysend:${this.payoutPubkey}`,
      paymentHash: "",
      amount: params.amount,
      stablecoin: params.stablecoin,
      payee: params.payee,
      expiresAt: Date.now() + (params.expirySeconds ?? 3600) * 1000,
    };
  }

  async sendPayment(params: SendPaymentParams): Promise<FiberPayment> {
    if (!this.payoutPubkey) {
      throw new Error("FIBER_PAYOUT_PUBKEY is not set for live (rpc) payments.");
    }
    // Send the item's real value. CKB amounts settle as-is; USD-pegged assets
    // (USDC/USDT) settle as their CKB equivalent at the live CoinGecko rate.
    // FIBER_PAYMENT_SHANNONS is only a fallback if an amount is missing.
    const ckbAmount = ckbEquivalent(params.amount, params.stablecoin, await getCkbPerUsd());
    const shannons =
      ckbAmount > 0
        ? BigInt(Math.round(ckbAmount * 10 ** CKB_DECIMALS))
        : this.paymentShannons;
    const body = {
      target_pubkey: this.payoutPubkey,
      amount: toHex(shannons),
      keysend: true,
    };
    type SendResult = {
      payment_hash: string;
      status: string;
      fee: string;
      created_at?: string | number;
      last_updated_at?: string | number;
    };
    let result: SendResult;
    try {
      result = await this.call<SendResult>("send_payment", [body]);
    } catch (e) {
      // The peer may have dropped (no liquidity / no route). Reconnect and retry once.
      const msg = (e as Error).message.toLowerCase();
      if (msg.includes("liquidity") || msg.includes("route") || msg.includes("peer") || msg.includes("connect")) {
        await this.ensurePeer();
        await new Promise((r) => setTimeout(r, 3000));
        result = await this.call<SendResult>("send_payment", [body]);
      } else {
        throw e;
      }
    }
    return {
      paymentHash: result.payment_hash,
      status: mapStatus(result.status),
      amount: params.amount, // business-facing figure (DB record)
      stablecoin: params.stablecoin,
      fee: ckbFromShannons(result.fee),
      routeHops: 1,
      onchainTxHash: await this.channelFundingTx(),
      createdAt: Date.now(),
      lastUpdatedAt: Date.now(),
    };
  }

  async getPayment(paymentHash: string): Promise<FiberPayment> {
    const result = await this.call<{
      payment_hash: string;
      status: string;
      fee: string;
      failed_error?: string;
    }>("get_payment", [{ payment_hash: paymentHash }]);
    return {
      paymentHash: result.payment_hash,
      status: mapStatus(result.status),
      amount: 0,
      stablecoin: "CKB",
      fee: ckbFromShannons(result.fee),
      failedReason: result.failed_error ?? undefined,
      routeHops: 1,
      createdAt: Date.now(),
      lastUpdatedAt: Date.now(),
    };
  }
}
