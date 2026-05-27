import { NextRequest, NextResponse } from "next/server";
import getDb, { ensureSchema } from "@/lib/db";
import { requireUserId, withAuth } from "@/lib/auth";

export const GET = withAuth(async () => {
  await ensureSchema();
  const userId = await requireUserId();
  const db = getDb();
  return NextResponse.json(await db.prepare("SELECT * FROM other_assets WHERE user_id = ? ORDER BY created_at ASC").all(userId));
});

export const POST = withAuth(async (req: NextRequest) => {
  await ensureSchema();
  const userId = await requireUserId();
  const db = getDb();
  const { name, value, currency = "EUR", category, notes } = await req.json();
  const r = await db.prepare(
    "INSERT INTO other_assets (user_id, name, value, currency, category, notes) VALUES (?, ?, ?, ?, ?, ?)"
  ).run(userId, name, value, currency, category || null, notes || null);
  return NextResponse.json(await db.prepare("SELECT * FROM other_assets WHERE id = ?").get(r.lastInsertRowid), { status: 201 });
});
