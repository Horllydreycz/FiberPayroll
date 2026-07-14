// Fiber Network payment-channel integration types.
// Modeled on the Fiber node JSON-RPC (Invoice + Payment modules).
// Ref: https://github.com/nervosnetwork/fiber crates/fiber-lib/src/rpc

export type FiberPaymentStatus = "CREATED" | "INFLIGHT" | "SUCCESS" | "FAILED";

export interface CreateInvoiceParams {
  /** Amount in stablecoin units (e.g. RUSD). */
  amount: number;
  stablecoin: string;
  description?: string;
  /** Recipient's Fiber node pubkey / wallet address. */
  payee: string;
  expirySeconds?: number;
}

export interface FiberInvoice {
  /** Encoded invoice string ("fibt..." / "fibb..."). */
  invoiceAddress: string;
  paymentHash: string;
  amount: number;
  stablecoin: string;
  payee: string;
  expiresAt: number; // epoch ms
}

export interface SendPaymentParams {
  /** Encoded invoice to pay (preferred). */
  invoice?: string;
  /** Or pay directly to a node pubkey. */
  targetPubkey?: string;
  amount: number;
  stablecoin: string;
  maxFee?: number;
  /** Force a particular outcome — used for demo seeding. */
  forceOutcome?: "success" | "fail";
}

export interface FiberPayment {
  paymentHash: string;
  status: FiberPaymentStatus;
  amount: number;
  stablecoin: string;
  fee: number;
  /** Number of routing hops the payment traversed. */
  routeHops: number;
  /** On-chain funding tx hash of the channel used (verifiable anchor). */
  onchainTxHash?: string;
  failedReason?: string;
  createdAt: number; // epoch ms
  lastUpdatedAt: number; // epoch ms
}

export interface FiberAdapter {
  readonly mode: "simulated" | "rpc";
  /** Liveness / node info check for the settings page. */
  ping(): Promise<{ ok: boolean; mode: string; detail?: string }>;
  /**
   * Pre-flight: ensure the node is ready to pay (e.g. payout peer connected so
   * the channel has usable outbound liquidity). Called before a payroll run.
   * Best-effort and idempotent. No-op for the simulated adapter.
   */
  ensureReady?(): Promise<{ ready: boolean; detail?: string }>;
  /** Real balance of the employer node (on-chain wallet + channel liquidity). */
  getBalance?(): Promise<{
    onchainCkb: number;
    channelCkb: number;
    totalCkb: number;
    /** False when the Fiber node itself was unreachable. */
    nodeOk: boolean;
  } | null>;
  createInvoice(params: CreateInvoiceParams): Promise<FiberInvoice>;
  sendPayment(params: SendPaymentParams): Promise<FiberPayment>;
  getPayment(paymentHash: string): Promise<FiberPayment>;
}
