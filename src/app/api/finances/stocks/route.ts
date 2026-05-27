import { NextRequest, NextResponse } from "next/server";
import getDb, { ensureSchema } from "@/lib/db";
import { refreshStockPrices } from "@/lib/finances";
import { requireUserId, withAuth } from "@/lib/auth";

export const GET = withAuth(async () => {
  await ensureSchema();
  const userId = await requireUserId();
  const db = getDb();
  const oldest = (await db.prepare("SELECT MIN(last_updated) as t FROM stocks WHERE user_id = ?").get(userId)) as any;
  if (!oldest?.t || Date.now() - new Date(oldest.t + "Z").getTime() > 60 * 60 * 1000) {
    await refreshStockPrices(userId);
  }
  return NextResponse.json(await db.prepare("SELECT * FROM stocks WHERE user_id = ? ORDER BY created_at ASC").all(userId));
});

export const POST = withAuth(async (req: NextRequest) => {
  await ensureSchema();
  const userId = await requireUserId();
  const db = getDb();
  const { ticker, name, quantity, avg_price, currency = "USD" } = await req.json();
  const r = await db.prepare(
    "INSERT INTO stocks (user_id, ticker, name, quantity, avg_price, currency) VALUES (?, ?, ?, ?, ?, ?)"
  ).run(userId, ticker.toUpperCase(), name || ticker, quantity, avg_price || null, currency);
  try { await refreshStockPrices(userId); } catch {}
  return NextResponse.json(await db.prepare("SELECT * FROM stocks WHERE id = ?").get(r.lastInsertRowid), { status: 201 });
});
