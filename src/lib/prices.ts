/**
 * Récupération des prix externes :
 * - Devises  : api.frankfurter.app (gratuit, basé sur la BCE, sans clé)
 * - Crypto   : api.coingecko.com (gratuit, sans clé)
 * - Actions  : query1.finance.yahoo.com (non officiel, sans clé)
 *
 * Toutes les fonctions sont défensives : en cas d'erreur réseau, on retourne
 * null et l'appelant utilise une valeur en cache ou la valeur précédente.
 */

import getDb from "./db";

export type Currency = "EUR" | "USD" | "GBP" | "CHF" | "MUR" | "AED";
export const SUPPORTED_CURRENCIES: Currency[] = ["EUR", "USD", "GBP", "CHF", "MUR", "AED"];

// ─── DEVISES ──────────────────────────────────────────────────────────────────

/**
 * Récupère les taux de change vers EUR pour toutes les devises supportées.
 * Cache : 1h en DB.
 * Retourne un objet { USD: 1.08, GBP: 0.86, ... } où la valeur = combien
 * d'unités de cette devise valent 1 EUR.
 */
export async function getRatesToEUR(): Promise<Record<string, number>> {
  const db = getDb();
  const now = Date.now();
  const ONE_HOUR = 60 * 60 * 1000;

  // 1. Check cache
  const cached = (await db.prepare("SELECT * FROM rates_cache").all()) as any[];
  if (cached.length > 0) {
    const oldest = Math.min(...cached.map(r => new Date(r.updated_at + "Z").getTime()));
    if (now - oldest < ONE_HOUR) {
      const out: Record<string, number> = { EUR: 1 };
      for (const r of cached) out[r.currency] = r.rate_to_eur;
      return out;
    }
  }

  // 2. Fetch fresh rates (1 EUR = X foreign)
  try {
    const url = "https://api.frankfurter.app/latest?from=EUR&to=USD,GBP,CHF,AED";
    const res = await fetch(url, { next: { revalidate: 3600 } } as any);
    if (!res.ok) throw new Error("Frankfurter " + res.status);
    const data = await res.json();
    const fxRates: Record<string, number> = { EUR: 1, ...data.rates };

    // MUR n'est pas couvert par Frankfurter — utiliser un fallback statique
    // ou un autre fournisseur. Pour l'instant on hardcode une approximation.
    if (!fxRates.MUR) fxRates.MUR = 49.5;

    // Save cache
    for (const [cur, rate] of Object.entries(fxRates)) {
      await db.prepare(
        "INSERT OR REPLACE INTO rates_cache (currency, rate_to_eur, updated_at) VALUES (?, ?, datetime('now'))"
      ).run(cur, rate);
    }
    return fxRates;
  } catch (err) {
    // Fallback : valeurs statiques raisonnables si l'API échoue
    console.warn("[prices] FX fetch failed, using fallback", err);
    return { EUR: 1, USD: 1.08, GBP: 0.86, CHF: 0.96, MUR: 49.5, AED: 3.97 };
  }
}

/**
 * Convertit un montant d'une devise à une autre.
 */
export async function convert(amount: number, from: string, to: string): Promise<number> {
  if (from === to) return amount;
  const rates = await getRatesToEUR();
  // amount * (1 EUR = X from) = montant en EUR  →  / rateFrom
  const inEur = amount / (rates[from] || 1);
  // EUR vers TO
  const inTo = inEur * (rates[to] || 1);
  return inTo;
}

// ─── CRYPTO (CoinGecko) ───────────────────────────────────────────────────────

/**
 * Récupère le prix actuel en USD d'une liste de coins par leur coin_id CoinGecko.
 * Ex: ["bitcoin", "ethereum"] → { bitcoin: 67200, ethereum: 3450 }
 */
export async function getCryptoPrices(coinIds: string[]): Promise<Record<string, number>> {
  if (coinIds.length === 0) return {};
  try {
    const ids = coinIds.map(encodeURIComponent).join(",");
    const url = `https://api.coingecko.com/api/v3/simple/price?ids=${ids}&vs_currencies=usd`;
    const res = await fetch(url, { next: { revalidate: 600 } } as any);
    if (!res.ok) throw new Error("CoinGecko " + res.status);
    const data = await res.json();
    const out: Record<string, number> = {};
    for (const id of coinIds) {
      out[id] = data[id]?.usd ?? 0;
    }
    return out;
  } catch (err) {
    console.warn("[prices] Crypto fetch failed", err);
    return {};
  }
}

/**
 * Recherche un coin par symbole (ex: "BTC") → retourne le coin_id CoinGecko.
 * Liste statique des plus populaires pour éviter un appel API supplémentaire.
 */
const COIN_MAP: Record<string, { id: string; name: string }> = {
  BTC: { id: "bitcoin", name: "Bitcoin" },
  ETH: { id: "ethereum", name: "Ethereum" },
  USDT: { id: "tether", name: "Tether" },
  USDC: { id: "usd-coin", name: "USD Coin" },
  BNB: { id: "binancecoin", name: "BNB" },
  SOL: { id: "solana", name: "Solana" },
  XRP: { id: "ripple", name: "XRP" },
  ADA: { id: "cardano", name: "Cardano" },
  DOGE: { id: "dogecoin", name: "Dogecoin" },
  AVAX: { id: "avalanche-2", name: "Avalanche" },
  DOT: { id: "polkadot", name: "Polkadot" },
  MATIC: { id: "matic-network", name: "Polygon" },
  LINK: { id: "chainlink", name: "Chainlink" },
  LTC: { id: "litecoin", name: "Litecoin" },
  ATOM: { id: "cosmos", name: "Cosmos" },
  UNI: { id: "uniswap", name: "Uniswap" },
  XLM: { id: "stellar", name: "Stellar" },
  ALGO: { id: "algorand", name: "Algorand" },
  NEAR: { id: "near", name: "NEAR" },
  ICP: { id: "internet-computer", name: "Internet Computer" },
};

export function resolveCryptoSymbol(symbol: string): { id: string; name: string } | null {
  return COIN_MAP[symbol.toUpperCase()] || null;
}

// ─── ACTIONS (Yahoo Finance non officiel) ─────────────────────────────────────

/**
 * Récupère les prix actuels d'une liste de tickers.
 * Ex: ["AAPL", "MSFT"] → { AAPL: { price: 178.5, currency: "USD" }, ... }
 */
export async function getStockPrices(tickers: string[]): Promise<Record<string, { price: number; currency: string }>> {
  if (tickers.length === 0) return {};
  try {
    const symbols = tickers.map(encodeURIComponent).join(",");
    const url = `https://query1.finance.yahoo.com/v7/finance/quote?symbols=${symbols}`;
    const res = await fetch(url, {
      headers: { "User-Agent": "Mozilla/5.0" },
      next: { revalidate: 600 },
    } as any);
    if (!res.ok) throw new Error("Yahoo " + res.status);
    const data = await res.json();
    const out: Record<string, { price: number; currency: string }> = {};
    for (const q of data.quoteResponse?.result || []) {
      out[q.symbol] = {
        price: q.regularMarketPrice ?? 0,
        currency: q.currency || "USD",
      };
    }
    return out;
  } catch (err) {
    console.warn("[prices] Stock fetch failed", err);
    return {};
  }
}
