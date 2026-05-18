import { NextRequest, NextResponse } from "next/server";
import getDb, { ensureSchema } from "@/lib/db";

export async function GET() {
  await ensureSchema();
  const db = getDb();
  return NextResponse.json(await db.prepare("SELECT * FROM business_notes ORDER BY updated_at DESC LIMIT 50").all());
}

export async function POST(req: NextRequest) {
  await ensureSchema();
  const db = getDb();
  const { content, tags } = await req.json();
  const result = await db.prepare("INSERT INTO business_notes (content, tags) VALUES (?, ?)").run(content, tags || null);
  return NextResponse.json(await db.prepare("SELECT * FROM business_notes WHERE id = ?").get(result.lastInsertRowid), { status: 201 });
}
