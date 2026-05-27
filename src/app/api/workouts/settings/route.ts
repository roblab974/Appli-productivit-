import { NextRequest, NextResponse } from "next/server";
import getDb, { ensureSchema } from "@/lib/db";
import { requireUserId, withAuth } from "@/lib/auth";

export const GET = withAuth(async () => {
  await ensureSchema();
  const userId = await requireUserId();
  const db = getDb();
  const s = (await db.prepare("SELECT weekly_goal FROM workout_settings WHERE user_id = ?").get(userId)) as any;
  return NextResponse.json(s || { weekly_goal: 3 });
});

export const PATCH = withAuth(async (req: NextRequest) => {
  await ensureSchema();
  const userId = await requireUserId();
  const db = getDb();
  const { weekly_goal } = await req.json();
  const value = parseInt(weekly_goal);
  if (!value || value < 1 || value > 14) {
    return NextResponse.json({ error: "weekly_goal doit être entre 1 et 14" }, { status: 400 });
  }
  await db.prepare("UPDATE workout_settings SET weekly_goal = ?, updated_at = datetime('now') WHERE user_id = ?").run(value, userId);
  return NextResponse.json({ weekly_goal: value });
});
