import { NextResponse } from "next/server";
import getDb, { ensureSchema } from "@/lib/db";
import { format, subWeeks, startOfWeek, endOfWeek, subDays } from "date-fns";
import { requireUserId, withAuth } from "@/lib/auth";

export const GET = withAuth(async () => {
  await ensureSchema();
  const userId = await requireUserId();
  const db = getDb();

  const weeklyVolume = [];
  for (let i = 7; i >= 0; i--) {
    const weekStart = format(startOfWeek(subWeeks(new Date(), i), { weekStartsOn: 1 }), "yyyy-MM-dd");
    const weekEnd = format(endOfWeek(subWeeks(new Date(), i), { weekStartsOn: 1 }), "yyyy-MM-dd");
    const [ex, cnt] = await Promise.all([
      db.prepare(`SELECT COALESCE(SUM(we.sets * we.reps * we.weight_kg), 0) as volume FROM workout_exercises we JOIN workouts w ON w.id = we.workout_id WHERE w.user_id = ? AND w.date BETWEEN ? AND ?`).get(userId, weekStart, weekEnd),
      db.prepare("SELECT COUNT(*) as count FROM workouts WHERE user_id = ? AND date BETWEEN ? AND ?").get(userId, weekStart, weekEnd),
    ]);
    weeklyVolume.push({ week: `S${8 - i}`, volume: Math.round((ex as any)?.volume || 0), sessions: (cnt as any)?.count || 0, weekStart });
  }

  const workoutDates = (await db.prepare("SELECT DISTINCT date FROM workouts WHERE user_id = ? ORDER BY date DESC").all(userId)).map((r: any) => r.date);
  let streak = 0;
  const today = format(new Date(), "yyyy-MM-dd");
  const yesterday = format(subDays(new Date(), 1), "yyyy-MM-dd");
  let checkDate: string | null = workoutDates.includes(today) ? today : workoutDates.includes(yesterday) ? yesterday : null;
  if (checkDate) {
    for (const d of workoutDates) {
      if (d === checkDate) { streak++; checkDate = format(subDays(new Date(checkDate), 1), "yyyy-MM-dd"); }
      else break;
    }
  }

  const thirtyAgo = format(subDays(new Date(), 30), "yyyy-MM-dd");
  const weekStart = format(startOfWeek(new Date(), { weekStartsOn: 1 }), "yyyy-MM-dd");
  const weekEnd = format(endOfWeek(new Date(), { weekStartsOn: 1 }), "yyyy-MM-dd");

  const [s30, thisWeek] = await Promise.all([
    db.prepare("SELECT COUNT(*) as count FROM workouts WHERE user_id = ? AND date >= ?").get(userId, thirtyAgo),
    db.prepare("SELECT COUNT(*) as count FROM workouts WHERE user_id = ? AND date BETWEEN ? AND ?").get(userId, weekStart, weekEnd),
  ]);

  return NextResponse.json({
    weeklyVolume,
    streak,
    sessionsLast30: (s30 as any)?.count || 0,
    thisWeekSessions: (thisWeek as any)?.count || 0,
  });
});
