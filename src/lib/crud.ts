/**
 * Helpers PATCH / DELETE génériques pour les routes [id] simples,
 * scoped par user_id. Évite la duplication massive.
 */
import { NextRequest, NextResponse } from "next/server";
import getDb, { ensureSchema } from "@/lib/db";
import { requireUserId, withAuth } from "@/lib/auth";

const ALLOWED = new Set([
  "bank_accounts", "stocks", "cryptos", "other_assets",
  "subscriptions", "wishlist",
]);

export function simplePatch(table: string) {
  if (!ALLOWED.has(table)) throw new Error(`Table not allowed: ${table}`);
  return withAuth(async (req: NextRequest, { params }: { params: { id: string } }) => {
    await ensureSchema();
    const userId = await requireUserId();
    const db = getDb();
    const body = await req.json();
    if (table === "subscriptions") {
      if ("auto_deduct" in body) body.auto_deduct = body.auto_deduct ? 1 : 0;
      if ("active" in body) body.active = body.active ? 1 : 0;
    }
    const fields = Object.keys(body).map(k => `${k}=?`).join(", ");
    await db.prepare(`UPDATE ${table} SET ${fields} WHERE id=? AND user_id=?`).run(...(Object.values(body) as any[]), params.id, userId);
    return NextResponse.json(await db.prepare(`SELECT * FROM ${table} WHERE id = ? AND user_id = ?`).get(params.id, userId));
  });
}

export function simpleDelete(table: string) {
  if (!ALLOWED.has(table)) throw new Error(`Table not allowed: ${table}`);
  return withAuth(async (_: NextRequest, { params }: { params: { id: string } }) => {
    await ensureSchema();
    const userId = await requireUserId();
    const db = getDb();
    await db.prepare(`DELETE FROM ${table} WHERE id = ? AND user_id = ?`).run(params.id, userId);
    return NextResponse.json({ success: true });
  });
}
