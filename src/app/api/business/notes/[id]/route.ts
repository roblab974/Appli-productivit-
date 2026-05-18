import { NextRequest, NextResponse } from "next/server";
import getDb, { ensureSchema } from "@/lib/db";

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  await ensureSchema();
  const db = getDb();
  const { content, tags } = await req.json();
  await db.prepare("UPDATE business_notes SET content=?, tags=?, updated_at=datetime('now') WHERE id=?").run(content, tags || null, params.id);
  return NextResponse.json(await db.prepare("SELECT * FROM business_notes WHERE id = ?").get(params.id));
}

export async function DELETE(_: NextRequest, { params }: { params: { id: string } }) {
  await ensureSchema();
  const db = getDb();
  await db.prepare("DELETE FROM business_notes WHERE id = ?").run(params.id);
  return NextResponse.json({ success: true });
}
