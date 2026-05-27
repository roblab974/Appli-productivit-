import { NextRequest, NextResponse } from "next/server";
import getDb, { ensureSchema } from "@/lib/db";
import { bulkDelete } from "@/lib/bulk";
import { requireUserId, withAuth } from "@/lib/auth";

export const DELETE = bulkDelete("business_notes");

export const GET = withAuth(async () => {
  await ensureSchema();
  const userId = await requireUserId();
  const db = getDb();
  return NextResponse.json(await db.prepare("SELECT * FROM business_notes WHERE user_id = ? ORDER BY updated_at DESC LIMIT 50").all(userId));
});

export const POST = withAuth(async (req: NextRequest) => {
  await ensureSchema();
  const userId = await requireUserId();
  const db = getDb();
  const { content, tags } = await req.json();
  const result = await db.prepare("INSERT INTO business_notes (user_id, content, tags) VALUES (?, ?, ?)").run(userId, content, tags || null);
  return NextResponse.json(await db.prepare("SELECT * FROM business_notes WHERE id = ?").get(result.lastInsertRowid), { status: 201 });
});
