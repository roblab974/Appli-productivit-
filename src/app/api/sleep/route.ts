import { NextRequest, NextResponse } from "next/server";
import getDb, { ensureSchema } from "@/lib/db";
import { todayStr } from "@/lib/utils";
import { bulkDelete } from "@/lib/bulk";
import { requireUserId, withAuth } from "@/lib/auth";

export const DELETE = bulkDelete("sleep_logs");

export const GET = withAuth(async (req: NextRequest) => {
  await ensureSchema();
  const userId = await requireUserId();
  const db = getDb();
  const { searchParams } = new URL(req.url);
  const limit = parseInt(searchParams.get("limit") || "30");
  const rows = await db.prepare("SELECT * FROM sleep_logs WHERE user_id = ? ORDER BY date DESC LIMIT ?").all(userId, limit);
  return NextResponse.json(rows);
});

export const POST = withAuth(async (req: NextRequest) => {
  await ensureSchema();
  const userId = await requireUserId();
  const db = getDb();
  const body = await req.json();
  const { date, bedtime, wake_time, duration_h, quality, energy_score } = body;
  const d = date || todayStr();

  const existing = await db.prepare("SELECT id FROM sleep_logs WHERE user_id = ? AND date = ?").get(userId, d);
  if (existing) {
    await db.prepare("UPDATE sleep_logs SET bedtime=?, wake_time=?, duration_h=?, quality=?, energy_score=? WHERE user_id = ? AND date=?")
      .run(bedtime || null, wake_time || null, duration_h, quality, energy_score || null, userId, d);
    return NextResponse.json(await db.prepare("SELECT * FROM sleep_logs WHERE user_id = ? AND date = ?").get(userId, d));
  }

  const result = await db.prepare(
    "INSERT INTO sleep_logs (user_id, date, bedtime, wake_time, duration_h, quality, energy_score) VALUES (?, ?, ?, ?, ?, ?, ?)"
  ).run(userId, d, bedtime || null, wake_time || null, duration_h, quality, energy_score || null);

  return NextResponse.json(await db.prepare("SELECT * FROM sleep_logs WHERE id = ?").get(result.lastInsertRowid), { status: 201 });
});
