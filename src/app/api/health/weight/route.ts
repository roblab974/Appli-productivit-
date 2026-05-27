import { NextRequest, NextResponse } from "next/server";
import getDb, { ensureSchema } from "@/lib/db";
import { todayStr } from "@/lib/utils";
import { bulkDelete } from "@/lib/bulk";
import { requireUserId, withAuth } from "@/lib/auth";

export const DELETE = bulkDelete("weight_logs");

export const GET = withAuth(async (req: NextRequest) => {
  await ensureSchema();
  const userId = await requireUserId();
  const db = getDb();
  const { searchParams } = new URL(req.url);
  const limit = parseInt(searchParams.get("limit") || "90");
  const rows = await db.prepare("SELECT * FROM weight_logs WHERE user_id = ? ORDER BY date DESC LIMIT ?").all(userId, limit);
  return NextResponse.json(rows);
});

export const POST = withAuth(async (req: NextRequest) => {
  await ensureSchema();
  const userId = await requireUserId();
  const db = getDb();
  const { date, weight_kg, waist_cm } = await req.json();
  const d = date || todayStr();
  const existing = await db.prepare("SELECT id FROM weight_logs WHERE user_id = ? AND date = ?").get(userId, d);
  if (existing) {
    await db.prepare("UPDATE weight_logs SET weight_kg=?, waist_cm=? WHERE user_id = ? AND date=?").run(weight_kg, waist_cm || null, userId, d);
    return NextResponse.json(await db.prepare("SELECT * FROM weight_logs WHERE user_id = ? AND date = ?").get(userId, d));
  }
  const result = await db.prepare("INSERT INTO weight_logs (user_id, date, weight_kg, waist_cm) VALUES (?, ?, ?, ?)").run(userId, d, weight_kg, waist_cm || null);
  return NextResponse.json(await db.prepare("SELECT * FROM weight_logs WHERE id = ?").get(result.lastInsertRowid), { status: 201 });
});
