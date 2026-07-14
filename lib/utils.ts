import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Format a payroll amount. Payroll is CKB-native, so the default (and any
 * explicit "CKB") renders as CKB; fiat codes render as currency.
 */
export function formatMoney(
  amount: number,
  currency = "CKB",
  opts: Intl.NumberFormatOptions = {},
) {
  if (currency === "CKB") return formatCkb(amount);
  try {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency,
      maximumFractionDigits: 2,
      ...opts,
    }).format(amount);
  } catch {
    // Non-ISO codes (e.g. legacy "RUSD" records) — plain number + code.
    return `${new Intl.NumberFormat("en-US", { maximumFractionDigits: 2 }).format(amount)} ${currency}`;
  }
}

/**
 * Format a CKB amount, e.g. "1,234.56 CKB". Precision adapts to magnitude so
 * large balances don't truncate in cards: 4 decimals under 100, 2 up to 10k,
 * whole numbers above that.
 */
export function formatCkb(ckb: number, maxFrac?: number) {
  const frac = maxFrac ?? (Math.abs(ckb) >= 1_000 ? 0 : Math.abs(ckb) >= 100 ? 2 : 4);
  return `${new Intl.NumberFormat("en-US", { maximumFractionDigits: frac }).format(ckb)} CKB`;
}

/** Compact number, e.g. 12.5k */
export function formatCompact(n: number) {
  return new Intl.NumberFormat("en-US", { notation: "compact" }).format(n);
}

export function formatDate(date: Date | string, withTime = false) {
  const d = typeof date === "string" ? new Date(date) : date;
  return d.toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    ...(withTime ? { hour: "2-digit", minute: "2-digit" } : {}),
  });
}

/** Shorten a wallet / tx hash for display: 0x1234…abcd */
export function shortHash(hash: string, head = 6, tail = 4) {
  if (!hash) return "";
  if (hash.length <= head + tail) return hash;
  return `${hash.slice(0, head)}…${hash.slice(-tail)}`;
}

export function initials(name: string) {
  return name
    .split(" ")
    .map((p) => p[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

export function cuid() {
  return (
    Date.now().toString(36) + Math.random().toString(36).slice(2, 10)
  );
}

export function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

/** CKB explorer base for the active network (testnet/Pudge by default). */
export const CKB_EXPLORER =
  process.env.NEXT_PUBLIC_CKB_EXPLORER ?? "https://pudge.explorer.nervos.org";

export function explorerTxUrl(txHash: string) {
  return `${CKB_EXPLORER}/transaction/${txHash}`;
}
