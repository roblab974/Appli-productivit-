/**
 * Calculs et opérations transverses sur les finances (scoped par user).
 */
import getDb from "./db";
import { convert, getRatesToEUR, getCryptoPrices, getStockPrices } from "./prices";
import { format } from "date-fns";

export async function getDisplayCurrency(userId: string): Promise<string> {
  const db = getDb();
  const row = (await db.prepare("SELECT display_currency FROM finance_settings WHERE user_id = ?").get(userId)) as any;
  return row?.display_currency || "EUR";
}

export async function setDisplayCurrency(userId: string, currency: string): Promise<void> {
  const db = getDb();
  await db.prepare(
    "UPDATE finance_settings SET display_currency = ?, updated_at = datetime('now') WHERE user_id = ?"
  ).run(currency, userId);
}

export async function refreshCryptoPrices(userId: string): Promise<void> {
  const db = getDb();
  const cryptos = (await db.prepare("SELECT * FROM cryptos WHERE user_id = ?").all(userId)) as any[];
  if (cryptos.length === 0) return;
  const coinIds = cryptos.map(c => c.coin_id).filter(Boolean);
  if (coinIds.length === 0) return;
  const prices = await getCryptoPrices(coinIds);
  for (const c of cryptos) {
    const price = prices[c.coin_id];
    if (price && price > 0) {
      await db.prepare(
        "UPDATE cryptos SET current_price = ?, last_updated = datetime('now') WHERE id = ? AND user_id = ?"
      ).run(price, c.id, userId);
    }
  }
}

export async function refreshStockPrices(userId: string): Promise<void> {
  const db = getDb();
  const stocks = (await db.prepare("SELECT * FROM stocks WHERE user_id = ?").all(userId)) as any[];
  if (stocks.length === 0) return;
  const tickers = stocks.map(s => s.ticker);
  const prices = await getStockPrices(tickers);
  for (const s of stocks) {
    const p = prices[s.ticker];
    if (p && p.price > 0) {
      await db.prepare(
        "UPDATE stocks SET current_price = ?, currency = ?, last_updated = datetime('now') WHERE id = ? AND user_id = ?"
      ).run(p.price, p.currency || s.currency, s.id, userId);
    }
  }
}

export async function computePatrimoine(userId: string, displayCurrency: string = "EUR") {
  const db = getDb();
  await getRatesToEUR();

  const [accounts, stocks, cryptos, assets] = await Promise.all([
    db.prepare("SELECT * FROM bank_accounts WHERE user_id = ?").all(userId),
    db.prepare("SELECT * FROM stocks WHERE user_id = ?").all(userId),
    db.prepare("SELECT * FROM cryptos WHERE user_id = ?").all(userId),
    db.prepare("SELECT * FROM other_assets WHERE user_id = ?").all(userId),
  ]) as any[][];

  let accountsTotal = 0;
  for (const a of accounts) {
    accountsTotal += await convert(a.balance, a.currency, displayCurrency);
  }
  let stocksTotal = 0;
  for (const s of stocks) {
    const v = (s.current_price ?? s.avg_price ?? 0) * s.quantity;
    stocksTotal += await convert(v, s.currency, displayCurrency);
  }
  let cryptosTotal = 0;
  for (const c of cryptos) {
    const v = (c.current_price ?? c.avg_price ?? 0) * c.quantity;
    cryptosTotal += await convert(v, "USD", displayCurrency);
  }
  let assetsTotal = 0;
  for (const a of assets) {
    assetsTotal += await convert(a.value, a.currency, displayCurrency);
  }
  const total = accountsTotal + stocksTotal + cryptosTotal + assetsTotal;
  return { total, accountsTotal, stocksTotal, cryptosTotal, assetsTotal, currency: displayCurrency };
}

export async function recordPatrimoineSnapshot(userId: string) {
  const db = getDb();
  const today = format(new Date(), "yyyy-MM-dd");
  const p = await computePatrimoine(userId, "EUR");
  await db.prepare(`
    INSERT INTO patrimoine_history (user_id, date, total_eur, accounts_total, stocks_total, cryptos_total, assets_total)
    VALUES (?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(user_id, date) DO UPDATE SET
      total_eur = excluded.total_eur,
      accounts_total = excluded.accounts_total,
      stocks_total = excluded.stocks_total,
      cryptos_total = excluded.cryptos_total,
      assets_total = excluded.assets_total
  `).run(userId, today, p.total, p.accountsTotal, p.stocksTotal, p.cryptosTotal, p.assetsTotal);
}

export async function postTransaction(userId: string, opts: {
  accountId: number | null;
  amount: number;
  type: string;
  description?: string;
  sourceId?: number;
  sourceType?: string;
  date?: string;
}) {
  const db = getDb();
  const date = opts.date || format(new Date(), "yyyy-MM-dd");
  await db.prepare(
    "INSERT INTO transactions (user_id, account_id, amount, type, description, source_id, source_type, date) VALUES (?, ?, ?, ?, ?, ?, ?, ?)"
  ).run(userId, opts.accountId, opts.amount, opts.type, opts.description || null, opts.sourceId || null, opts.sourceType || null, date);
  if (opts.accountId) {
    await db.prepare("UPDATE bank_accounts SET balance = balance + ? WHERE id = ? AND user_id = ?").run(opts.amount, opts.accountId, userId);
  }
}
