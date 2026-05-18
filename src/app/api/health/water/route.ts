import { NextRequest, NextResponse } from "next/server";
import getDb, { ensureSchema } from "@/lib/db";
import { todayStr } from "@/lib/utils";

export async function GET(req: NextRequest) {
  await ensureSchema();
  const db = getDb();
  const { searchParams } = new URL(req.url);
  const date = searchParams.get("date") || todayStr();
  const row = await db.prepare("SELECT * FROM water_logs WHERE date = ?").get(date);
  return NextResponse.json(row || { date, glasses: 0, goal: 8 });
}

export async function POST(req: NextRequest) {
  await ensureSchema();
  const db = getDb();
  const { date, glasses, goal = 8 } = await req.json();
  const d = date || todayStr();
  const existing = await db.prepare("SELECT id FROM water_logs WHERE date = ?").get(d);
  if (existing) {
    await db.prepare("UPDATE water_logs SET glasses=?, goal=? WHERE date=?").run(glasses, goal, d);
    return NextResponse.json(await db.prepare("SELECT * FROM water_logs WHERE date = ?").get(d));
  }
  const result = await db.prepare("INSERT INTO water_logs (date, glasses, goal) VALUES (?, ?, ?)").run(d, glasses, goal);
  return NextResponse.json(await db.prepare("SELECT * FROM water_logs WHERE id = ?").get(result.lastInsertRowid), { status: 201 });
}
