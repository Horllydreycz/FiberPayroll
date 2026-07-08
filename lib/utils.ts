import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** Format a stablecoin / fiat amount for display. */
export function formatMoney(
  amount: number,
  currency = "USD",
  opts: Intl.NumberFormatOptions = {},
) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    maximumFractionDigits: 2,
    ...opts,
  }).format(amount);
}

/** Format a CKB amount, e.g. "1,234.5678 CKB". */
export function formatCkb(ckb: number, maxFrac = 4) {
  return `${new Intl.NumberFormat("en-US", { maximumFractionDigits: maxFrac }).format(ckb)} CKB`;
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
