import { NextRequest, NextResponse } from "next/server";
import getDb, { ensureSchema } from "@/lib/db";
import { todayStr } from "@/lib/utils";
import { requireUserId, withAuth } from "@/lib/auth";

async function getSettings(userId: string) {
  const db = getDb();
  const s = (await db.prepare("SELECT goal_ml, unit_size_ml, unit_name FROM water_settings WHERE user_id = ?").get(userId)) as any;
  return s || { goal_ml: 2500, unit_size_ml: 250, unit_name: "verre" };
}

export const GET = withAuth(async (req: NextRequest) => {
  await ensureSchema();
  const userId = await requireUserId();
  const db = getDb();
  const { searchParams } = new URL(req.url);
  const date = searchParams.get("date") || todayStr();
  const settings = await getSettings(userId);
  const row = (await db.prepare("SELECT * FROM water_logs WHERE user_id = ? AND date = ?").get(userId, date)) as any;
  if (!row) {
    return NextResponse.json({
      date, volume_ml: 0,
      goal_ml: settings.goal_ml,
      unit_size_ml: settings.unit_size_ml,
      unit_name: settings.unit_name,
      glasses: 0, goal: Math.round(settings.goal_ml / settings.unit_size_ml),
    });
  }
  return NextResponse.json({
    ...row,
    goal_ml: settings.goal_ml,
    unit_size_ml: settings.unit_size_ml,
    unit_name: settings.unit_name,
  });
});

export const POST = withAuth(async (req: NextRequest) => {
  await ensureSchema();
  const userId = await requireUserId();
  const db = getDb();
  const settings = await getSettings(userId);
  const body = await req.json();
  const date = body.date || todayStr();
  let volume_ml = typeof body.volume_ml === "number" ? body.volume_ml : null;
  if (volume_ml === null && typeof body.glasses === "number") {
    volume_ml = body.glasses * (body.unit_size_ml || settings.unit_size_ml);
  }
  volume_ml = Math.max(0, volume_ml || 0);
  const goal_ml = body.goal_ml || settings.goal_ml;
  const unit_size_ml = body.unit_size_ml || settings.unit_size_ml;
  const glasses = Math.round(volume_ml / unit_size_ml);
  const goal = Math.round(goal_ml / unit_size_ml);

  const existing = await db.prepare("SELECT id FROM water_logs WHERE user_id = ? AND date = ?").get(userId, date);
  if (existing) {
    await db.prepare(
      "UPDATE water_logs SET volume_ml=?, goal_ml=?, unit_size_ml=?, glasses=?, goal=? WHERE user_id = ? AND date=?"
    ).run(volume_ml, goal_ml, unit_size_ml, glasses, goal, userId, date);
  } else {
    await db.prepare(
      "INSERT INTO water_logs (user_id, date, volume_ml, goal_ml, unit_size_ml, glasses, goal) VALUES (?, ?, ?, ?, ?, ?, ?)"
    ).run(userId, date, volume_ml, goal_ml, unit_size_ml, glasses, goal);
  }

  const row = (await db.prepare("SELECT * FROM water_logs WHERE user_id = ? AND date = ?").get(userId, date)) as any;
  return NextResponse.json({ ...row, unit_name: settings.unit_name });
});
