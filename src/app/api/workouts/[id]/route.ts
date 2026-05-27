import { NextRequest, NextResponse } from "next/server";
import getDb, { ensureSchema } from "@/lib/db";
import { requireUserId, withAuth } from "@/lib/auth";

export const GET = withAuth(async (_: NextRequest, { params }: { params: { id: string } }) => {
  await ensureSchema();
  const userId = await requireUserId();
  const db = getDb();
  const workout = await db.prepare("SELECT * FROM workouts WHERE id = ? AND user_id = ?").get(params.id, userId);
  if (!workout) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const exercises = await db.prepare("SELECT * FROM workout_exercises WHERE workout_id = ?").all(params.id);
  return NextResponse.json({ ...workout, exercises });
});

export const PATCH = withAuth(async (req: NextRequest, { params }: { params: { id: string } }) => {
  await ensureSchema();
  const userId = await requireUserId();
  const db = getDb();
  const owner = await db.prepare("SELECT user_id FROM workouts WHERE id = ?").get(params.id) as any;
  if (!owner || owner.user_id !== userId) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const body = await req.json();
  const { exercises, ...workoutFields } = body;
  if (Object.keys(workoutFields).length > 0) {
    const fields = Object.keys(workoutFields).map(k => `${k}=?`).join(", ");
    await db.prepare(`UPDATE workouts SET ${fields} WHERE id=?`).run(...(Object.values(workoutFields) as any[]), params.id);
  }
  if (Array.isArray(exercises)) {
    await db.prepare("DELETE FROM workout_exercises WHERE workout_id = ?").run(params.id);
    for (const ex of exercises) {
      await db.prepare(
        "INSERT INTO workout_exercises (workout_id, name, sets, reps, weight_kg) VALUES (?, ?, ?, ?, ?)"
      ).run(params.id, ex.name, ex.sets || null, ex.reps || null, ex.weight_kg || null);
    }
  }
  const workout = await db.prepare("SELECT * FROM workouts WHERE id = ?").get(params.id);
  const exs = await db.prepare("SELECT * FROM workout_exercises WHERE workout_id = ?").all(params.id);
  return NextResponse.json({ ...workout, exercises: exs });
});

export const DELETE = withAuth(async (_: NextRequest, { params }: { params: { id: string } }) => {
  await ensureSchema();
  const userId = await requireUserId();
  const db = getDb();
  await db.prepare("DELETE FROM workout_exercises WHERE workout_id IN (SELECT id FROM workouts WHERE id = ? AND user_id = ?)").run(params.id, userId);
  await db.prepare("DELETE FROM workouts WHERE id = ? AND user_id = ?").run(params.id, userId);
  return NextResponse.json({ success: true });
});
