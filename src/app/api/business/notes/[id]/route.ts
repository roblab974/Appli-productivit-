import { NextRequest, NextResponse } from "next/server";
import getDb, { ensureSchema } from "@/lib/db";
import { requireUserId, withAuth } from "@/lib/auth";

export const PATCH = withAuth(async (req: NextRequest, { params }: { params: { id: string } }) => {
  await ensureSchema();
  const userId = await requireUserId();
  const db = getDb();
  const { content, tags } = await req.json();
  await db.prepare("UPDATE business_notes SET content=?, tags=?, updated_at=datetime('now') WHERE id=? AND user_id=?").run(content, tags || null, params.id, userId);
  return NextResponse.json(await db.prepare("SELECT * FROM business_notes WHERE id = ? AND user_id = ?").get(params.id, userId));
});

export const DELETE = withAuth(async (_: NextRequest, { params }: { params: { id: string } }) => {
  await ensureSchema();
  const userId = await requireUserId();
  const db = getDb();
  await db.prepare("DELETE FROM business_notes WHERE id = ? AND user_id = ?").run(params.id, userId);
  return NextResponse.json({ success: true });
});
