import { NextRequest, NextResponse } from "next/server";
import getDb, { ensureSchema } from "@/lib/db";

export async function GET(_: NextRequest, { params }: { params: { id: string } }) {
  await ensureSchema();
  const db = getDb();
  const workout = await db.prepare("SELECT * FROM workouts WHERE id = ?").get(params.id);
  if (!workout) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const exercises = await db.prepare("SELECT * FROM workout_exercises WHERE workout_id = ?").all(params.id);
  return NextResponse.json({ ...workout, exercises });
}

export async function DELETE(_: NextRequest, { params }: { params: { id: string } }) {
  await ensureSchema();
  const db = getDb();
  await db.prepare("DELETE FROM workouts WHERE id = ?").run(params.id);
  return NextResponse.json({ success: true });
}
