// Live CKB/USD spot price.
// Source: CoinGecko — https://www.coingecko.com/en/coins/nervos-network
// (public API endpoint for the same data; cached to stay within rate limits)

const COINGECKO_URL =
  "https://api.coingecko.com/api/v3/simple/price?ids=nervos-network&vs_currencies=usd";

const TTL_MS = 60_000;
let cache: { price: number; at: number } | null = null;

/**
 * Current CKB price in USD. Cached for 60s; returns the last known price if
 * CoinGecko is unreachable, or null if no price has ever been fetched.
 */
export async function getCkbUsdPrice(): Promise<number | null> {
  if (cache && Date.now() - cache.at < TTL_MS) return cache.price;
  try {
    const res = await fetch(COINGECKO_URL, {
      signal: AbortSignal.timeout(8_000),
      headers: { accept: "application/json" },
    });
    if (!res.ok) return cache?.price ?? null;
    const json = (await res.json()) as { "nervos-network"?: { usd?: number } };
    const price = json["nervos-network"]?.usd;
    if (typeof price !== "number" || !(price > 0)) return cache?.price ?? null;
    cache = { price, at: Date.now() };
    return price;
  } catch {
    return cache?.price ?? null;
  }
}

/** "≈ $1,234.56" helper for CKB amounts; null-safe when no price is known. */
export function approxUsd(ckbAmount: number, price: number | null): string | null {
  if (price == null) return null;
  const usd = ckbAmount * price;
  const formatted = new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: usd < 1 ? 4 : 2,
  }).format(usd);
  return `≈ ${formatted}`;
}
