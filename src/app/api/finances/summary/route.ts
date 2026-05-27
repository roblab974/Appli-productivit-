import { NextRequest, NextResponse } from "next/server";
import getDb, { ensureSchema } from "@/lib/db";
import { computePatrimoine, getDisplayCurrency, recordPatrimoineSnapshot, refreshCryptoPrices, refreshStockPrices } from "@/lib/finances";
import { requireUserId, withAuth } from "@/lib/auth";

export const dynamic = "force-dynamic";

export const GET = withAuth(async (req: NextRequest) => {
  await ensureSchema();
  const userId = await requireUserId();
  const db = getDb();

  const { searchParams } = new URL(req.url);
  const requested = searchParams.get("currency");
  const displayCurrency = requested || (await getDisplayCurrency(userId));

  const oldestCrypto = (await db.prepare("SELECT MIN(last_updated) as t FROM cryptos WHERE user_id = ?").get(userId)) as any;
  const oldestStock = (await db.prepare("SELECT MIN(last_updated) as t FROM stocks WHERE user_id = ?").get(userId)) as any;
  const HOUR = 60 * 60 * 1000;
  if (oldestCrypto?.t && Date.now() - new Date(oldestCrypto.t + "Z").getTime() > HOUR) {
    try { await refreshCryptoPrices(userId); } catch {}
  }
  if (oldestStock?.t && Date.now() - new Date(oldestStock.t + "Z").getTime() > HOUR) {
    try { await refreshStockPrices(userId); } catch {}
  }

  const p = await computePatrimoine(userId, displayCurrency);
  try { await recordPatrimoineSnapshot(userId); } catch {}

  const history = await db.prepare(
    "SELECT date, total_eur FROM patrimoine_history WHERE user_id = ? AND date >= date('now','-90 day') ORDER BY date ASC"
  ).all(userId);

  const wishlistRows = (await db.prepare("SELECT amount, currency FROM wishlist WHERE user_id = ?").all(userId)) as any[];
  let wishlistTotalEur = 0;
  const { convert } = await import("@/lib/prices");
  for (const w of wishlistRows) {
    wishlistTotalEur += await convert(w.amount, w.currency, "EUR");
  }
  const wishlistTotal = await convert(wishlistTotalEur, "EUR", displayCurrency);

  return NextResponse.json({
    ...p,
    history,
    wishlistTotal,
    wishlistPct: p.total > 0 ? (wishlistTotal / p.total) * 100 : 0,
  });
});
