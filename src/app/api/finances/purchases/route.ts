import { NextRequest, NextResponse } from "next/server";
import getDb, { ensureSchema } from "@/lib/db";
import { todayStr } from "@/lib/utils";
import { bulkDelete } from "@/lib/bulk";
import { requireUserId, withAuth } from "@/lib/auth";

export const DELETE = bulkDelete("purchases");

export const GET = withAuth(async () => {
  await ensureSchema();
  const userId = await requireUserId();
  const db = getDb();
  return NextResponse.json(await db.prepare("SELECT * FROM purchases WHERE user_id = ? ORDER BY purchase_date DESC, id DESC").all(userId));
});

export const POST = withAuth(async (req: NextRequest) => {
  await ensureSchema();
  const userId = await requireUserId();
  const db = getDb();
  const { name, amount, currency = "EUR", account_id, purchase_date, notes } = await req.json();
  const r = await db.prepare(
    "INSERT INTO purchases (user_id, name, amount, currency, account_id, purchase_date, notes) VALUES (?, ?, ?, ?, ?, ?, ?)"
  ).run(userId, name, amount, currency, account_id || null, purchase_date || todayStr(), notes || null);
  return NextResponse.json(await db.prepare("SELECT * FROM purchases WHERE id = ?").get(r.lastInsertRowid), { status: 201 });
});
