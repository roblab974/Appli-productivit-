import { NextRequest, NextResponse } from "next/server";
import getDb, { ensureSchema } from "@/lib/db";
import { requireUserId, withAuth } from "@/lib/auth";

export const GET = withAuth(async (req: NextRequest) => {
  await ensureSchema();
  const userId = await requireUserId();
  const db = getDb();
  const { searchParams } = new URL(req.url);
  const limit = parseInt(searchParams.get("limit") || "50");
  const rows = await db.prepare(`
    SELECT t.*, a.name as account_name, a.currency as account_currency
    FROM transactions t
    LEFT JOIN bank_accounts a ON a.id = t.account_id
    WHERE t.user_id = ?
    ORDER BY t.date DESC, t.id DESC
    LIMIT ?
  `).all(userId, limit);
  return NextResponse.json(rows);
});
