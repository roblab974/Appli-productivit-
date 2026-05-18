import { NextRequest, NextResponse } from "next/server";
import getDb, { ensureSchema } from "@/lib/db";
import { todayStr } from "@/lib/utils";

export async function GET() {
  await ensureSchema();
  const db = getDb();
  const rows = await db.prepare(`
    SELECT k1.* FROM kpis k1
    INNER JOIN (SELECT name, MAX(date) as maxdate FROM kpis GROUP BY name) k2
    ON k1.name = k2.name AND k1.date = k2.maxdate
    ORDER BY k1.name
  `).all();
  return NextResponse.json(rows);
}

export async function POST(req: NextRequest) {
  await ensureSchema();
  const db = getDb();
  const { name, value, unit, target, date } = await req.json();
  const result = await db.prepare(
    "INSERT INTO kpis (name, value, unit, target, date) VALUES (?, ?, ?, ?, ?)"
  ).run(name, value, unit || null, target || null, date || todayStr());
  return NextResponse.json(await db.prepare("SELECT * FROM kpis WHERE id = ?").get(result.lastInsertRowid), { status: 201 });
}
