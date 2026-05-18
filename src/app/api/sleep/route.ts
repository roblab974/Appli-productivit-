import { NextRequest, NextResponse } from "next/server";
import getDb, { ensureSchema } from "@/lib/db";
import { todayStr } from "@/lib/utils";

export async function GET(req: NextRequest) {
  await ensureSchema();
  const db = getDb();
  const { searchParams } = new URL(req.url);
  const limit = parseInt(searchParams.get("limit") || "30");
  const rows = await db.prepare("SELECT * FROM sleep_logs ORDER BY date DESC LIMIT ?").all(limit);
  return NextResponse.json(rows);
}

export async function POST(req: NextRequest) {
  await ensureSchema();
  const db = getDb();
  const body = await req.json();
  const { date, bedtime, wake_time, duration_h, quality, energy_score } = body;
  const d = date || todayStr();

  const existing = await db.prepare("SELECT id FROM sleep_logs WHERE date = ?").get(d);
  if (existing) {
    await db.prepare("UPDATE sleep_logs SET bedtime=?, wake_time=?, duration_h=?, quality=?, energy_score=? WHERE date=?")
      .run(bedtime || null, wake_time || null, duration_h, quality, energy_score || null, d);
    return NextResponse.json(await db.prepare("SELECT * FROM sleep_logs WHERE date = ?").get(d));
  }

  const result = await db.prepare(
    "INSERT INTO sleep_logs (date, bedtime, wake_time, duration_h, quality, energy_score) VALUES (?, ?, ?, ?, ?, ?)"
  ).run(d, bedtime || null, wake_time || null, duration_h, quality, energy_score || null);

  return NextResponse.json(await db.prepare("SELECT * FROM sleep_logs WHERE id = ?").get(result.lastInsertRowid), { status: 201 });
}
