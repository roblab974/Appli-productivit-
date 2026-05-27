/**
 * Récupère toutes les tâches "actives" pour une date donnée, scoped par user.
 */
import type { DB } from "./db";

export async function getTodosForDate(db: DB, userId: string, dateStr: string) {
  const dow = new Date(dateStr + "T00:00:00").getDay();
  const [explicit, daily, weekly, completions] = await Promise.all([
    db.prepare("SELECT * FROM todos WHERE user_id = ? AND date = ? AND recurring IS NULL").all(userId, dateStr),
    db.prepare("SELECT * FROM todos WHERE user_id = ? AND recurring='daily'").all(userId),
    db.prepare("SELECT * FROM todos WHERE user_id = ? AND recurring='weekly' AND recurring_day=?").all(userId, dow),
    db.prepare(`
      SELECT tc.todo_id FROM task_completions tc
      INNER JOIN todos t ON t.id = tc.todo_id
      WHERE t.user_id = ? AND tc.date = ?
    `).all(userId, dateStr),
  ]);
  const completedIds = new Set((completions as any[]).map(c => c.todo_id));

  return [
    ...(explicit as any[]).map(t => ({ ...t, completed: Boolean(t.completed) })),
    ...(daily as any[]).map(t => ({ ...t, date: dateStr, completed: completedIds.has(t.id) })),
    ...(weekly as any[]).map(t => ({ ...t, date: dateStr, completed: completedIds.has(t.id) })),
  ];
}
