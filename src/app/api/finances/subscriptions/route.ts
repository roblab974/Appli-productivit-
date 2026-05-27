import { NextRequest, NextResponse } from "next/server";
import getDb, { ensureSchema } from "@/lib/db";
import { bulkDelete } from "@/lib/bulk";
import { requireUserId, withAuth } from "@/lib/auth";

export const DELETE = bulkDelete("subscriptions");

export const GET = withAuth(async () => {
  await ensureSchema();
  const userId = await requireUserId();
  const db = getDb();
  return NextResponse.json(await db.prepare("SELECT * FROM subscriptions WHERE user_id = ? ORDER BY due_date ASC").all(userId));
});

export const POST = withAuth(async (req: NextRequest) => {
  await ensureSchema();
  const userId = await requireUserId();
  const db = getDb();
  const {
    name, amount, currency = "EUR", frequency = "monthly",
    account_id, due_date, auto_deduct = 0, active = 1,
  } = await req.json();
  const r = await db.prepare(
    "INSERT INTO subscriptions (user_id, name, amount, currency, frequency, account_id, due_date, auto_deduct, active) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)"
  ).run(userId, name, amount, currency, frequency, account_id || null, due_date, auto_deduct ? 1 : 0, active ? 1 : 0);
  return NextResponse.json(await db.prepare("SELECT * FROM subscriptions WHERE id = ?").get(r.lastInsertRowid), { status: 201 });
});
