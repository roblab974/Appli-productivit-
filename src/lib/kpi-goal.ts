/**
 * Liaison KPI ↔ Objectif (scoped par user).
 */
import getDb from "./db";

export async function recomputeGoalProgress(userId: string, goalId: number) {
  if (!goalId) return;
  const db = getDb();
  const kpis = (await db.prepare("SELECT value, target FROM kpis WHERE user_id = ? AND goal_id = ?").all(userId, goalId)) as any[];
  const eligible = kpis.filter(k => typeof k.target === "number" && k.target > 0);
  if (eligible.length === 0) return;

  const total = eligible.reduce((acc, k) => acc + Math.min((k.value / k.target) * 100, 100), 0);
  const progress = Math.round(total / eligible.length);
  await db.prepare("UPDATE business_goals SET progress = ? WHERE id = ? AND user_id = ?").run(progress, goalId, userId);
}
