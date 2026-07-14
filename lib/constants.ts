// Shared enums (as const unions since SQLite has no native enums) and
// reference data for the payroll + Fiber domain.

export const USER_ROLES = ["ADMIN", "FINANCE_MANAGER", "VIEWER"] as const;
export type UserRole = (typeof USER_ROLES)[number];

export const EMPLOYEE_STATUSES = ["ACTIVE", "INACTIVE"] as const;
export type EmployeeStatus = (typeof EMPLOYEE_STATUSES)[number];

export const EMPLOYMENT_TYPES = ["FULL_TIME", "CONTRACTOR", "PART_TIME"] as const;
export type EmploymentType = (typeof EMPLOYMENT_TYPES)[number];

export const PAYMENT_FREQUENCIES = ["MONTHLY", "BIWEEKLY", "WEEKLY"] as const;
export type PaymentFrequency = (typeof PAYMENT_FREQUENCIES)[number];

export const BATCH_STATUSES = [
  "DRAFT",
  "APPROVED",
  "PROCESSING",
  "COMPLETED",
  "FAILED",
  "CANCELLED",
] as const;
export type BatchStatus = (typeof BATCH_STATUSES)[number];

export const ITEM_STATUSES = [
  "PENDING",
  "BROADCASTING",
  "PROCESSING",
  "SETTLED",
  "FAILED",
  "EXPIRED",
  "REFUNDED",
] as const;
export type ItemStatus = (typeof ITEM_STATUSES)[number];

export const PAYMENT_STATUSES = [
  "CREATED",
  "INFLIGHT",
  "SUCCESS",
  "FAILED",
] as const;
export type PaymentStatus = (typeof PAYMENT_STATUSES)[number];

export const SETTLEMENT_STAGES = [
  "PAYMENT_REQUESTED",
  "BROADCAST",
  "CONFIRMED",
  "SETTLED",
  "FAILED",
] as const;
export type SettlementStage = (typeof SETTLEMENT_STAGES)[number];

// Payout assets an employee can choose. CKB settles natively over the Fiber
// channel; USDC/USDT are denominated in the asset and settled as their CKB
// equivalent at the demo FX rate (native UDT channels are future work).
export const STABLECOINS = ["CKB", "USDC", "USDT"] as const;
export type Stablecoin = (typeof STABLECOINS)[number];

/** The asset actually sent over the Fiber channel. */
export const PAYOUT_ASSET = "CKB";

export const FIAT_CURRENCIES = ["USD", "EUR", "GBP", "NGN", "INR", "BRL"] as const;
export type FiatCurrency = (typeof FIAT_CURRENCIES)[number];

/** Salary currency choices — CKB (native, recommended) plus demo fiat. */
export const CURRENCY_OPTIONS = ["CKB", ...FIAT_CURRENCIES];

// Static demo FX rates: 1 unit fiat -> USD.
export const FX_TO_USD: Record<string, number> = {
  USD: 1,
  EUR: 1.08,
  GBP: 1.27,
  NGN: 0.00066,
  INR: 0.012,
  BRL: 0.18,
};

// Fallback CKB/USD rate, used ONLY when the live CoinGecko price is
// unavailable. Live rate comes from lib/price.ts (getCkbPerUsd).
export const CKB_PER_USD = 250;

/**
 * Convert a salary into the CKB amount that is actually paid over Fiber.
 * CKB salaries pass through unchanged; fiat converts via USD at `ckbPerUsd`
 * (live CoinGecko rate, falling back to CKB_PER_USD).
 */
export function toPayoutCkb(amount: number, currency: string, ckbPerUsd: number): number {
  if (currency === "CKB" || !currency) return Math.round(amount * 1e4) / 1e4;
  const usd = amount * (FX_TO_USD[currency] ?? 1);
  return Math.round(usd * ckbPerUsd * 1e4) / 1e4;
}

/**
 * Convert a net salary (in `currency`) into the employee's chosen payout
 * asset. USDC/USDT are treated as USD-pegged 1:1.
 */
export function toPayoutAsset(
  amount: number,
  currency: string,
  asset: string,
  ckbPerUsd: number,
): number {
  if (asset === "CKB") return toPayoutCkb(amount, currency, ckbPerUsd);
  const usd = currency === "CKB" ? amount / ckbPerUsd : amount * (FX_TO_USD[currency] ?? 1);
  return Math.round(usd * 100) / 100;
}

/**
 * CKB actually settled over the channel for an amount in a payout asset.
 * Identity for CKB; USD-pegged assets convert at `ckbPerUsd`.
 */
export function ckbEquivalent(amount: number, asset: string, ckbPerUsd: number): number {
  if (asset === "CKB" || !asset) return amount;
  return Math.round(amount * ckbPerUsd * 1e4) / 1e4;
}

// Simple flat tax estimate for payslip breakdown (demo only).
export const DEFAULT_TAX_RATE = 0.1;

export const ROLE_LABELS: Record<UserRole, string> = {
  ADMIN: "Admin",
  FINANCE_MANAGER: "Finance Manager",
  VIEWER: "Viewer",
};
