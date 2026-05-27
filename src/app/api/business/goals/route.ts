import { NextRequest, NextResponse } from "next/server";
import getDb, { ensureSchema } from "@/lib/db";
import { bulkDelete } from "@/lib/bulk";
import { requireUserId, withAuth } from "@/lib/auth";

export const DELETE = bulkDelete("business_goals", {
  cascade: async (db, userId, ids) => {
    const ph = ids.map(() => "?").join(",");
    await db.prepare(`UPDATE kpis SET goal_id = NULL WHERE user_id = ? AND goal_id IN (${ph})`).run(userId, ...ids);
  },
});

export const GET = withAuth(async () => {
  await ensureSchema();
  const userId = await requireUserId();
  const db = getDb();
  return NextResponse.json(await db.prepare("SELECT * FROM business_goals WHERE user_id = ? ORDER BY created_at DESC").all(userId));
});

export const POST = withAuth(async (req: NextRequest) => {
  await ensureSchema();
  const userId = await requireUserId();
  const db = getDb();
  const { title, description, target_date, progress = 0 } = await req.json();
  const result = await db.prepare(
    "INSERT INTO business_goals (user_id, title, description, target_date, progress) VALUES (?, ?, ?, ?, ?)"
  ).run(userId, title, description || null, target_date || null, progress);
  return NextResponse.json(await db.prepare("SELECT * FROM business_goals WHERE id = ?").get(result.lastInsertRowid), { status: 201 });
});
