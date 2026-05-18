import { NextRequest, NextResponse } from "next/server";
import getDb, { ensureSchema } from "@/lib/db";
import { todayStr } from "@/lib/utils";

export async function GET(req: NextRequest) {
  await ensureSchema();
  const db = getDb();
  const { searchParams } = new URL(req.url);
  const from = searchParams.get("from");
  const to = searchParams.get("to") || todayStr();
  const limit = parseInt(searchParams.get("limit") || "50");

  let rows: any[];
  if (from) {
    rows = await db.prepare("SELECT * FROM workouts WHERE date BETWEEN ? AND ? ORDER BY date DESC LIMIT ?").all(from, to, limit);
  } else {
    rows = await db.prepare("SELECT * FROM workouts ORDER BY date DESC LIMIT ?").all(limit);
  }

  const workouts = await Promise.all(rows.map(async (w: any) => ({
    ...w,
    exercises: await db.prepare("SELECT * FROM workout_exercises WHERE workout_id = ?").all(w.id),
  })));

  return NextResponse.json(workouts);
}

export async function POST(req: NextRequest) {
  await ensureSchema();
  const db = getDb();
  const body = await req.json();
  const { date, type, duration_min, notes, exercises = [] } = body;

  const result = await db.prepare(
    "INSERT INTO workouts (date, type, duration_min, notes) VALUES (?, ?, ?, ?)"
  ).run(date || todayStr(), type, duration_min, notes || null);

  const workoutId = result.lastInsertRowid;

  for (const ex of exercises) {
    await db.prepare(
      "INSERT INTO workout_exercises (workout_id, name, sets, reps, weight_kg) VALUES (?, ?, ?, ?, ?)"
    ).run(workoutId, ex.name, ex.sets || null, ex.reps || null, ex.weight_kg || null);
  }

  const workout = await db.prepare("SELECT * FROM workouts WHERE id = ?").get(workoutId);
  return NextResponse.json({ ...workout, exercises }, { status: 201 });
}
