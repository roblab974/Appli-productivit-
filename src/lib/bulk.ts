/**
 * Helper pour les suppressions en lot, scoped par user.
 */
import { NextRequest, NextResponse } from "next/server";
import getDb, { ensureSchema } from "@/lib/db";
import { requireUserId, withAuth } from "@/lib/auth";

const ALLOWED_TABLES = new Set([
  "workouts", "workout_exercises", "sleep_logs", "weight_logs", "water_logs",
  "business_goals", "revenue_logs", "kpis", "business_notes", "todos",
  "bank_accounts", "stocks", "cryptos", "other_assets", "subscriptions",
  "purchases", "wishlist", "transactions",
]);

export function bulkDelete(table: string, opts?: { cascade?: (db: any, userId: string, ids: number[]) => Promise<void> }) {
  if (!ALLOWED_TABLES.has(table)) throw new Error(`Table not allowed: ${table}`);
  return withAuth(async function DELETE(req: NextRequest) {
    await ensureSchema();
    const userId = await requireUserId();
    const db = getDb();
    const body = await req.json();
    const ids: number[] = Array.isArray(body?.ids) ? body.ids.filter((x: any) => typeof x === "number") : [];
    if (ids.length === 0) return NextResponse.json({ error: "No ids provided" }, { status: 400 });

    if (opts?.cascade) await opts.cascade(db, userId, ids);

    const placeholders = ids.map(() => "?").join(",");
    // Filtre par user_id pour empêcher de supprimer les rangs d'un autre utilisateur
    await db.prepare(`DELETE FROM ${table} WHERE user_id = ? AND id IN (${placeholders})`).run(userId, ...ids);
    return NextResponse.json({ success: true, deleted: ids.length });
  });
}
