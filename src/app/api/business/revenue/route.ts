import { NextRequest, NextResponse } from "next/server";
import getDb, { ensureSchema } from "@/lib/db";

export async function GET() {
  await ensureSchema();
  const db = getDb();
  return NextResponse.json(await db.prepare("SELECT * FROM revenue_logs ORDER BY year DESC, month DESC LIMIT 24").all());
}

export async function POST(req: NextRequest) {
  await ensureSchema();
  const db = getDb();
  const { year, month, amount, notes } = await req.json();
  const existing = await db.prepare("SELECT id FROM revenue_logs WHERE year=? AND month=?").get(year, month);
  if (existing) {
    await db.prepare("UPDATE revenue_logs SET amount=?, notes=? WHERE year=? AND month=?").run(amount, notes || null, year, month);
    return NextResponse.json(await db.prepare("SELECT * FROM revenue_logs WHERE year=? AND month=?").get(year, month));
  }
  const result = await db.prepare("INSERT INTO revenue_logs (year, month, amount, notes) VALUES (?, ?, ?, ?)").run(year, month, amount, notes || null);
  return NextResponse.json(await db.prepare("SELECT * FROM revenue_logs WHERE id = ?").get(result.lastInsertRowid), { status: 201 });
}
