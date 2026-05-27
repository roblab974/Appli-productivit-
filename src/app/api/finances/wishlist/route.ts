import { NextRequest, NextResponse } from "next/server";
import getDb, { ensureSchema } from "@/lib/db";
import { bulkDelete } from "@/lib/bulk";
import { requireUserId, withAuth } from "@/lib/auth";

export const DELETE = bulkDelete("wishlist");

export const GET = withAuth(async () => {
  await ensureSchema();
  const userId = await requireUserId();
  const db = getDb();
  return NextResponse.json(await db.prepare("SELECT * FROM wishlist WHERE user_id = ? ORDER BY created_at DESC").all(userId));
});

export const POST = withAuth(async (req: NextRequest) => {
  await ensureSchema();
  const userId = await requireUserId();
  const db = getDb();
  const { name, amount, currency = "EUR", notes, priority = 0 } = await req.json();
  const r = await db.prepare(
    "INSERT INTO wishlist (user_id, name, amount, currency, notes, priority) VALUES (?, ?, ?, ?, ?, ?)"
  ).run(userId, name, amount, currency, notes || null, priority);
  return NextResponse.json(await db.prepare("SELECT * FROM wishlist WHERE id = ?").get(r.lastInsertRowid), { status: 201 });
});
