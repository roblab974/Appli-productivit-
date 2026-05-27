import { NextRequest, NextResponse } from "next/server";
import getDb, { ensureSchema } from "@/lib/db";
import { recomputeGoalProgress } from "@/lib/kpi-goal";
import { requireUserId, withAuth } from "@/lib/auth";

export const PATCH = withAuth(async (req: NextRequest, { params }: { params: { id: string } }) => {
  await ensureSchema();
  const userId = await requireUserId();
  const db = getDb();
  const body = await req.json();
  const before = (await db.prepare("SELECT goal_id FROM kpis WHERE id = ? AND user_id = ?").get(params.id, userId)) as any;
  if (!before) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const fields = Object.keys(body).map(k => `${k}=?`).join(", ");
  await db.prepare(`UPDATE kpis SET ${fields} WHERE id=? AND user_id=?`).run(...(Object.values(body) as any[]), params.id, userId);
  const after = (await db.prepare("SELECT goal_id FROM kpis WHERE id = ?").get(params.id)) as any;
  if (before?.goal_id) await recomputeGoalProgress(userId, before.goal_id);
  if (after?.goal_id && after.goal_id !== before?.goal_id) await recomputeGoalProgress(userId, after.goal_id);
  return NextResponse.json(await db.prepare("SELECT * FROM kpis WHERE id = ?").get(params.id));
});

export const DELETE = withAuth(async (_: NextRequest, { params }: { params: { id: string } }) => {
  await ensureSchema();
  const userId = await requireUserId();
  const db = getDb();
  const row = (await db.prepare("SELECT goal_id FROM kpis WHERE id = ? AND user_id = ?").get(params.id, userId)) as any;
  await db.prepare("DELETE FROM kpis WHERE id = ? AND user_id = ?").run(params.id, userId);
  if (row?.goal_id) await recomputeGoalProgress(userId, row.goal_id);
  return NextResponse.json({ success: true });
});
