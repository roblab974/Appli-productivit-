import { NextRequest, NextResponse } from "next/server";
import getDb, { ensureSchema } from "@/lib/db";

export async function GET() {
  await ensureSchema();
  const db = getDb();
  return NextResponse.json(await db.prepare("SELECT * FROM business_goals ORDER BY created_at DESC").all());
}

export async function POST(req: NextRequest) {
  await ensureSchema();
  const db = getDb();
  const { title, description, target_date, progress = 0 } = await req.json();
  const result = await db.prepare(
    "INSERT INTO business_goals (title, description, target_date, progress) VALUES (?, ?, ?, ?)"
  ).run(title, description || null, target_date || null, progress);
  return NextResponse.json(await db.prepare("SELECT * FROM business_goals WHERE id = ?").get(result.lastInsertRowid), { status: 201 });
}
