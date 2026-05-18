import { NextRequest, NextResponse } from "next/server";
import getDb, { ensureSchema } from "@/lib/db";
import { todayStr } from "@/lib/utils";

export async function GET(req: NextRequest) {
  await ensureSchema();
  const db = getDb();
  const { searchParams } = new URL(req.url);
  const date = searchParams.get("date") || todayStr();
  const rows = await db.prepare("SELECT * FROM pomodoro_sessions WHERE date = ? ORDER BY created_at DESC").all(date);
  return NextResponse.json(rows);
}

export async function POST(req: NextRequest) {
  await ensureSchema();
  const db = getDb();
  const { date, duration_min = 25, completed = true } = await req.json();
  const result = await db.prepare("INSERT INTO pomodoro_sessions (date, duration_min, completed) VALUES (?, ?, ?)").run(date || todayStr(), duration_min, completed ? 1 : 0);
  return NextResponse.json(await db.prepare("SELECT * FROM pomodoro_sessions WHERE id = ?").get(result.lastInsertRowid), { status: 201 });
}
