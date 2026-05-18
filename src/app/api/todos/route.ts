import { NextRequest, NextResponse } from "next/server";
import getDb, { ensureSchema } from "@/lib/db";
import { todayStr } from "@/lib/utils";

export async function GET(req: NextRequest) {
  await ensureSchema();
  const db = getDb();
  const { searchParams } = new URL(req.url);
  const date = searchParams.get("date") || todayStr();

  const [explicit, daily, weekly] = await Promise.all([
    db.prepare("SELECT * FROM todos WHERE date = ? AND recurring IS NULL ORDER BY priority DESC, created_at ASC").all(date),
    db.prepare("SELECT * FROM todos WHERE recurring='daily'").all(),
    db.prepare("SELECT * FROM todos WHERE recurring='weekly' AND recurring_day=?").all(new Date(date).getDay()),
  ]);

  const allTodos = [
    ...explicit,
    ...[...daily, ...weekly].map((t: any) => ({ ...t, date })),
  ];

  return NextResponse.json(allTodos.map((t: any) => ({ ...t, completed: Boolean(t.completed) })));
}

export async function POST(req: NextRequest) {
  await ensureSchema();
  const db = getDb();
  const { title, priority = "medium", date, recurring, recurring_day } = await req.json();
  const result = await db.prepare(
    "INSERT INTO todos (title, priority, date, recurring, recurring_day) VALUES (?, ?, ?, ?, ?)"
  ).run(title, priority, date || todayStr(), recurring || null, recurring_day ?? null);
  const todo = await db.prepare("SELECT * FROM todos WHERE id = ?").get(result.lastInsertRowid) as any;
  return NextResponse.json({ ...todo, completed: Boolean(todo.completed) }, { status: 201 });
}
