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

// Stablecoins supported by Fiber (UDTs whitelisted on CKB).
export const STABLECOINS = ["RUSD", "USDI", "USDC"] as const;
export type Stablecoin = (typeof STABLECOINS)[number];

export const FIAT_CURRENCIES = ["USD", "EUR", "GBP", "NGN", "INR", "BRL"] as const;
export type FiatCurrency = (typeof FIAT_CURRENCIES)[number];

// Static demo FX rates: 1 unit fiat -> stablecoin (USD-pegged). For the
// hackathon we treat all stablecoins as USD-pegged 1:1.
export const FX_TO_USD: Record<string, number> = {
  USD: 1,
  EUR: 1.08,
  GBP: 1.27,
  NGN: 0.00066,
  INR: 0.012,
  BRL: 0.18,
};

export function toStablecoin(amount: number, currency: string): number {
  const rate = FX_TO_USD[currency] ?? 1;
  return Math.round(amount * rate * 100) / 100;
}

// Simple flat tax estimate for payslip breakdown (demo only).
export const DEFAULT_TAX_RATE = 0.1;

export const ROLE_LABELS: Record<UserRole, string> = {
  ADMIN: "Admin",
  FINANCE_MANAGER: "Finance Manager",
  VIEWER: "Viewer",
};
