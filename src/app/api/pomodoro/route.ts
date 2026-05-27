import { NextRequest, NextResponse } from "next/server";
import getDb, { ensureSchema } from "@/lib/db";
import { todayStr } from "@/lib/utils";
import { requireUserId, withAuth } from "@/lib/auth";

export const GET = withAuth(async (req: NextRequest) => {
  await ensureSchema();
  const userId = await requireUserId();
  const db = getDb();
  const { searchParams } = new URL(req.url);
  const date = searchParams.get("date") || todayStr();
  const rows = await db.prepare("SELECT * FROM pomodoro_sessions WHERE user_id = ? AND date = ? ORDER BY created_at DESC").all(userId, date);
  return NextResponse.json(rows);
});

export const POST = withAuth(async (req: NextRequest) => {
  await ensureSchema();
  const userId = await requireUserId();
  const db = getDb();
  const { date, duration_min = 25, completed = true } = await req.json();
  const result = await db.prepare("INSERT INTO pomodoro_sessions (user_id, date, duration_min, completed) VALUES (?, ?, ?, ?)").run(userId, date || todayStr(), duration_min, completed ? 1 : 0);
  return NextResponse.json(await db.prepare("SELECT * FROM pomodoro_sessions WHERE id = ?").get(result.lastInsertRowid), { status: 201 });
});
