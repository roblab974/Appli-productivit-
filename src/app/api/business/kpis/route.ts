import { NextRequest, NextResponse } from "next/server";
import getDb, { ensureSchema } from "@/lib/db";
import { todayStr } from "@/lib/utils";
import { recomputeGoalProgress } from "@/lib/kpi-goal";
import { requireUserId, withAuth } from "@/lib/auth";

export const GET = withAuth(async () => {
  await ensureSchema();
  const userId = await requireUserId();
  const db = getDb();
  const rows = await db.prepare(`
    SELECT k1.* FROM kpis k1
    INNER JOIN (SELECT name, MAX(date) as maxdate FROM kpis WHERE user_id = ? GROUP BY name) k2
    ON k1.name = k2.name AND k1.date = k2.maxdate
    WHERE k1.user_id = ?
    ORDER BY k1.name
  `).all(userId, userId);
  return NextResponse.json(rows);
});

export const POST = withAuth(async (req: NextRequest) => {
  await ensureSchema();
  const userId = await requireUserId();
  const db = getDb();
  const { name, value, unit, target, date, goal_id } = await req.json();
  const result = await db.prepare(
    "INSERT INTO kpis (user_id, name, value, unit, target, date, goal_id) VALUES (?, ?, ?, ?, ?, ?, ?)"
  ).run(userId, name, value, unit || null, target || null, date || todayStr(), goal_id || null);
  if (goal_id) await recomputeGoalProgress(userId, Number(goal_id));
  return NextResponse.json(await db.prepare("SELECT * FROM kpis WHERE id = ?").get(result.lastInsertRowid), { status: 201 });
});

export const DELETE = withAuth(async (req: NextRequest) => {
  await ensureSchema();
  const userId = await requireUserId();
  const db = getDb();
  const body = await req.json();
  const ids: number[] = Array.isArray(body?.ids) ? body.ids.filter((x: any) => typeof x === "number") : [];
  if (ids.length === 0) return NextResponse.json({ error: "No ids provided" }, { status: 400 });

  const ph = ids.map(() => "?").join(",");
  const goalRows = (await db.prepare(`SELECT DISTINCT goal_id FROM kpis WHERE user_id = ? AND id IN (${ph}) AND goal_id IS NOT NULL`).all(userId, ...ids)) as any[];
  const goalIds = goalRows.map(r => r.goal_id);

  await db.prepare(`DELETE FROM kpis WHERE user_id = ? AND id IN (${ph})`).run(userId, ...ids);
  for (const gid of goalIds) {
    await recomputeGoalProgress(userId, gid);
  }
  return NextResponse.json({ success: true, deleted: ids.length });
});
