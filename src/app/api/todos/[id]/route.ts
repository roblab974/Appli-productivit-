import { NextRequest, NextResponse } from "next/server";
import getDb, { ensureSchema } from "@/lib/db";
import { todayStr } from "@/lib/utils";
import { requireUserId, withAuth } from "@/lib/auth";

export const PATCH = withAuth(async (req: NextRequest, { params }: { params: { id: string } }) => {
  await ensureSchema();
  const userId = await requireUserId();
  const db = getDb();
  const body = await req.json();
  const todo = (await db.prepare("SELECT * FROM todos WHERE id = ? AND user_id = ?").get(params.id, userId)) as any;
  if (!todo) return NextResponse.json({ error: "Not found" }, { status: 404 });

  if ("completed" in body && todo.recurring) {
    const date = body.date || todayStr();
    if (body.completed) {
      await db.prepare("INSERT OR IGNORE INTO task_completions (todo_id, date) VALUES (?, ?)").run(params.id, date);
    } else {
      await db.prepare("DELETE FROM task_completions WHERE todo_id = ? AND date = ?").run(params.id, date);
    }
    const otherKeys = Object.keys(body).filter(k => k !== "completed" && k !== "date");
    if (otherKeys.length === 0) {
      return NextResponse.json({ ...todo, completed: Boolean(body.completed) });
    }
    delete body.completed;
    delete body.date;
  }

  if (Object.keys(body).length > 0) {
    if ("completed" in body) {
      await db.prepare(
        `UPDATE todos SET completed=?, completed_at=${body.completed ? "datetime('now')" : "NULL"} WHERE id=? AND user_id=?`
      ).run(body.completed ? 1 : 0, params.id, userId);
      delete body.completed;
    }
    if (Object.keys(body).length > 0) {
      const fields = Object.keys(body).map(k => `${k}=?`).join(", ");
      await db.prepare(`UPDATE todos SET ${fields} WHERE id=? AND user_id=?`).run(...(Object.values(body) as any[]), params.id, userId);
    }
  }
  const updated = (await db.prepare("SELECT * FROM todos WHERE id = ? AND user_id = ?").get(params.id, userId)) as any;
  return NextResponse.json({ ...updated, completed: Boolean(updated.completed) });
});

export const DELETE = withAuth(async (_: NextRequest, { params }: { params: { id: string } }) => {
  await ensureSchema();
  const userId = await requireUserId();
  const db = getDb();
  await db.prepare("DELETE FROM task_completions WHERE todo_id IN (SELECT id FROM todos WHERE id = ? AND user_id = ?)").run(params.id, userId);
  await db.prepare("DELETE FROM todos WHERE id = ? AND user_id = ?").run(params.id, userId);
  return NextResponse.json({ success: true });
});
