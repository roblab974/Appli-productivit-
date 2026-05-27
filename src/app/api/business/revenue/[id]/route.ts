import { NextRequest, NextResponse } from "next/server";
import getDb, { ensureSchema } from "@/lib/db";
import { postTransaction } from "@/lib/finances";
import { requireUserId, withAuth } from "@/lib/auth";

export const PATCH = withAuth(async (req: NextRequest, { params }: { params: { id: string } }) => {
  await ensureSchema();
  const userId = await requireUserId();
  const db = getDb();
  const body = await req.json();
  const fields = Object.keys(body).map(k => `${k}=?`).join(", ");
  await db.prepare(`UPDATE revenue_logs SET ${fields} WHERE id=? AND user_id=?`).run(...(Object.values(body) as any[]), params.id, userId);
  return NextResponse.json(await db.prepare("SELECT * FROM revenue_logs WHERE id = ? AND user_id = ?").get(params.id, userId));
});

export const DELETE = withAuth(async (_: NextRequest, { params }: { params: { id: string } }) => {
  await ensureSchema();
  const userId = await requireUserId();
  const db = getDb();
  const rev = (await db.prepare("SELECT * FROM revenue_logs WHERE id = ? AND user_id = ?").get(params.id, userId)) as any;
  if (rev?.account_id) {
    await postTransaction(userId, {
      accountId: rev.account_id,
      amount: -rev.amount,
      type: "income",
      description: `Suppression revenu ${rev.month}/${rev.year}`,
      sourceId: rev.id,
      sourceType: "revenue",
    });
  }
  await db.prepare("DELETE FROM revenue_logs WHERE id = ? AND user_id = ?").run(params.id, userId);
  return NextResponse.json({ success: true });
});
