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
  await db.prepare(`UPDATE purchases SET ${fields} WHERE id=? AND user_id=?`).run(...(Object.values(body) as any[]), params.id, userId);
  return NextResponse.json(await db.prepare("SELECT * FROM purchases WHERE id = ? AND user_id = ?").get(params.id, userId));
});

export const DELETE = withAuth(async (_: NextRequest, { params }: { params: { id: string } }) => {
  await ensureSchema();
  const userId = await requireUserId();
  const db = getDb();
  await db.prepare("DELETE FROM purchases WHERE id = ? AND user_id = ?").run(params.id, userId);
  return NextResponse.json({ success: true });
});

// Action : déduit l'achat du compte
export const POST = withAuth(async (req: NextRequest, { params }: { params: { id: string } }) => {
  await ensureSchema();
  const userId = await requireUserId();
  const db = getDb();
  const purchase = (await db.prepare("SELECT * FROM purchases WHERE id = ? AND user_id = ?").get(params.id, userId)) as any;
  if (!purchase) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (purchase.deducted) return NextResponse.json({ error: "Already deducted" }, { status: 400 });
  if (!purchase.account_id) return NextResponse.json({ error: "No account linked" }, { status: 400 });

  await postTransaction(userId, {
    accountId: purchase.account_id,
    amount: -Math.abs(purchase.amount),
    type: "purchase",
    description: purchase.name,
    sourceId: purchase.id,
    sourceType: "purchase",
    date: purchase.purchase_date,
  });
  await db.prepare("UPDATE purchases SET deducted = 1, deducted_at = datetime('now') WHERE id = ? AND user_id = ?").run(params.id, userId);
  return NextResponse.json(await db.prepare("SELECT * FROM purchases WHERE id = ?").get(params.id));
});
