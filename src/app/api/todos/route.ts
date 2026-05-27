import { NextRequest, NextResponse } from "next/server";
import getDb, { ensureSchema } from "@/lib/db";
import { todayStr } from "@/lib/utils";
import { bulkDelete } from "@/lib/bulk";
import { getTodosForDate } from "@/lib/todos-helpers";
import { requireUserId, withAuth } from "@/lib/auth";

export const DELETE = bulkDelete("todos");

export const GET = withAuth(async (req: NextRequest) => {
  await ensureSchema();
  const userId = await requireUserId();
  const db = getDb();
  const { searchParams } = new URL(req.url);
  const date = searchParams.get("date") || todayStr();
  const todos = await getTodosForDate(db, userId, date);
  return NextResponse.json(todos);
});

export const POST = withAuth(async (req: NextRequest) => {
  await ensureSchema();
  const userId = await requireUserId();
  const db = getDb();
  const { title, priority = "medium", date, recurring, recurring_day, deadline } = await req.json();
  const result = await db.prepare(
    "INSERT INTO todos (user_id, title, priority, date, recurring, recurring_day, deadline) VALUES (?, ?, ?, ?, ?, ?, ?)"
  ).run(userId, title, priority, date || todayStr(), recurring || null, recurring_day ?? null, deadline || null);
  const todo = await db.prepare("SELECT * FROM todos WHERE id = ?").get(result.lastInsertRowid) as any;
  return NextResponse.json({ ...todo, completed: Boolean(todo.completed) }, { status: 201 });
});
