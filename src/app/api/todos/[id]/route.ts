import { NextRequest, NextResponse } from "next/server";
import getDb, { ensureSchema } from "@/lib/db";

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  await ensureSchema();
  const db = getDb();
  const body = await req.json();

  if ("completed" in body) {
    await db.prepare(
      `UPDATE todos SET completed=?, completed_at=${body.completed ? "datetime('now')" : "NULL"} WHERE id=?`
    ).run(body.completed ? 1 : 0, params.id);
  } else {
    const fields = Object.keys(body).map(k => `${k}=?`).join(", ");
    await db.prepare(`UPDATE todos SET ${fields} WHERE id=?`).run(...(Object.values(body) as any[]), params.id);
  }

  const todo = await db.prepare("SELECT * FROM todos WHERE id = ?").get(params.id) as any;
  return NextResponse.json({ ...todo, completed: Boolean(todo.completed) });
}

export async function DELETE(_: NextRequest, { params }: { params: { id: string } }) {
  await ensureSchema();
  const db = getDb();
  await db.prepare("DELETE FROM todos WHERE id = ?").run(params.id);
  return NextResponse.json({ success: true });
}
