import { NextRequest, NextResponse } from "next/server";
import getDb, { ensureSchema } from "@/lib/db";
import { todayStr } from "@/lib/utils";

export async function GET(req: NextRequest) {
  await ensureSchema();
  const db = getDb();
  const { searchParams } = new URL(req.url);
  const limit = parseInt(searchParams.get("limit") || "90");
  const rows = await db.prepare("SELECT * FROM weight_logs ORDER BY date DESC LIMIT ?").all(limit);
  return NextResponse.json(rows);
}

export async function POST(req: NextRequest) {
  await ensureSchema();
  const db = getDb();
  const { date, weight_kg, waist_cm } = await req.json();
  const d = date || todayStr();
  const existing = await db.prepare("SELECT id FROM weight_logs WHERE date = ?").get(d);
  if (existing) {
    await db.prepare("UPDATE weight_logs SET weight_kg=?, waist_cm=? WHERE date=?").run(weight_kg, waist_cm || null, d);
    return NextResponse.json(await db.prepare("SELECT * FROM weight_logs WHERE date = ?").get(d));
  }
  const result = await db.prepare("INSERT INTO weight_logs (date, weight_kg, waist_cm) VALUES (?, ?, ?)").run(d, weight_kg, waist_cm || null);
  return NextResponse.json(await db.prepare("SELECT * FROM weight_logs WHERE id = ?").get(result.lastInsertRowid), { status: 201 });
}
