import { NextRequest, NextResponse } from "next/server";
import getDb, { ensureSchema } from "@/lib/db";
import { todayStr } from "@/lib/utils";
import { bulkDelete } from "@/lib/bulk";
import { requireUserId, withAuth } from "@/lib/auth";

export const DELETE = bulkDelete("workouts", {
  cascade: async (db, _userId, ids) => {
    const ph = ids.map(() => "?").join(",");
    await db.prepare(`DELETE FROM workout_exercises WHERE workout_id IN (${ph})`).run(...ids);
  },
});

export const GET = withAuth(async (req: NextRequest) => {
  await ensureSchema();
  const userId = await requireUserId();
  const db = getDb();
  const { searchParams } = new URL(req.url);
  const from = searchParams.get("from");
  const to = searchParams.get("to") || todayStr();
  const limit = parseInt(searchParams.get("limit") || "50");

  let rows: any[];
  if (from) {
    rows = await db.prepare("SELECT * FROM workouts WHERE user_id = ? AND date BETWEEN ? AND ? ORDER BY date DESC LIMIT ?").all(userId, from, to, limit);
  } else {
    rows = await db.prepare("SELECT * FROM workouts WHERE user_id = ? ORDER BY date DESC LIMIT ?").all(userId, limit);
  }

  const workouts = await Promise.all(rows.map(async (w: any) => ({
    ...w,
    exercises: await db.prepare("SELECT * FROM workout_exercises WHERE workout_id = ?").all(w.id),
  })));

  return NextResponse.json(workouts);
});

export const POST = withAuth(async (req: NextRequest) => {
  await ensureSchema();
  const userId = await requireUserId();
  const db = getDb();
  const body = await req.json();
  const { date, type, duration_min, notes, exercises = [] } = body;

  const result = await db.prepare(
    "INSERT INTO workouts (user_id, date, type, duration_min, notes) VALUES (?, ?, ?, ?, ?)"
  ).run(userId, date || todayStr(), type, duration_min, notes || null);

  const workoutId = result.lastInsertRowid;

  for (const ex of exercises) {
    await db.prepare(
      "INSERT INTO workout_exercises (workout_id, name, sets, reps, weight_kg) VALUES (?, ?, ?, ?, ?)"
    ).run(workoutId, ex.name, ex.sets || null, ex.reps || null, ex.weight_kg || null);
  }

  const workout = await db.prepare("SELECT * FROM workouts WHERE id = ?").get(workoutId);
  return NextResponse.json({ ...workout, exercises }, { status: 201 });
});
