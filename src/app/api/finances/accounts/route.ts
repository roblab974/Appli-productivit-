import { NextRequest, NextResponse } from "next/server";
import getDb, { ensureSchema } from "@/lib/db";
import { requireUserId, withAuth } from "@/lib/auth";

export const GET = withAuth(async () => {
  await ensureSchema();
  const userId = await requireUserId();
  const db = getDb();
  return NextResponse.json(await db.prepare("SELECT * FROM bank_accounts WHERE user_id = ? ORDER BY created_at ASC").all(userId));
});

export const POST = withAuth(async (req: NextRequest) => {
  await ensureSchema();
  const userId = await requireUserId();
  const db = getDb();
  const { name, balance = 0, currency = "EUR", type = "checking" } = await req.json();
  const r = await db.prepare(
    "INSERT INTO bank_accounts (user_id, name, balance, currency, type) VALUES (?, ?, ?, ?, ?)"
  ).run(userId, name, balance, currency, type);
  return NextResponse.json(await db.prepare("SELECT * FROM bank_accounts WHERE id = ?").get(r.lastInsertRowid), { status: 201 });
});
