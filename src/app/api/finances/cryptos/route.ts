import { NextRequest, NextResponse } from "next/server";
import getDb, { ensureSchema } from "@/lib/db";
import { refreshCryptoPrices } from "@/lib/finances";
import { resolveCryptoSymbol } from "@/lib/prices";
import { requireUserId, withAuth } from "@/lib/auth";

export const GET = withAuth(async () => {
  await ensureSchema();
  const userId = await requireUserId();
  const db = getDb();
  const oldest = (await db.prepare("SELECT MIN(last_updated) as t FROM cryptos WHERE user_id = ?").get(userId)) as any;
  if (!oldest?.t || Date.now() - new Date(oldest.t + "Z").getTime() > 60 * 60 * 1000) {
    await refreshCryptoPrices(userId);
  }
  return NextResponse.json(await db.prepare("SELECT * FROM cryptos WHERE user_id = ? ORDER BY created_at ASC").all(userId));
});

export const POST = withAuth(async (req: NextRequest) => {
  await ensureSchema();
  const userId = await requireUserId();
  const db = getDb();
  const { symbol, name, quantity, avg_price } = await req.json();
  const resolved = resolveCryptoSymbol(symbol);
  const coin_id = resolved?.id || symbol.toLowerCase();
  const finalName = name || resolved?.name || symbol.toUpperCase();
  const r = await db.prepare(
    "INSERT INTO cryptos (user_id, symbol, coin_id, name, quantity, avg_price, currency) VALUES (?, ?, ?, ?, ?, ?, 'USD')"
  ).run(userId, symbol.toUpperCase(), coin_id, finalName, quantity, avg_price || null);
  try { await refreshCryptoPrices(userId); } catch {}
  return NextResponse.json(await db.prepare("SELECT * FROM cryptos WHERE id = ?").get(r.lastInsertRowid), { status: 201 });
});
