import { NextRequest, NextResponse } from "next/server";
import getDb, { ensureSchema } from "@/lib/db";
import { requireUserId, withAuth } from "@/lib/auth";

export const PATCH = withAuth(async (req: NextRequest, { params }: { params: { id: string } }) => {
  await ensureSchema();
  const userId = await requireUserId();
  const db = getDb();
  const body = await req.json();
  const fields = Object.keys(body).map(k => `${k}=?`).join(", ");
  await db.prepare(`UPDATE bank_accounts SET ${fields} WHERE id=? AND user_id=?`).run(...(Object.values(body) as any[]), params.id, userId);
  return NextResponse.json(await db.prepare("SELECT * FROM bank_accounts WHERE id = ? AND user_id = ?").get(params.id, userId));
});

export const DELETE = withAuth(async (_: NextRequest, { params }: { params: { id: string } }) => {
  await ensureSchema();
  const userId = await requireUserId();
  const db = getDb();
  await db.prepare("DELETE FROM bank_accounts WHERE id = ? AND user_id = ?").run(params.id, userId);
  return NextResponse.json({ success: true });
});
