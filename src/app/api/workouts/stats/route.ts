import { NextResponse } from "next/server";
import getDb, { ensureSchema } from "@/lib/db";
import { format, subWeeks, startOfWeek, endOfWeek, subDays } from "date-fns";

export async function GET() {
  await ensureSchema();
  const db = getDb();

  // Weekly volume (last 8 weeks)
  const weeklyVolume = [];
  for (let i = 7; i >= 0; i--) {
    const weekStart = format(startOfWeek(subWeeks(new Date(), i), { weekStartsOn: 1 }), "yyyy-MM-dd");
    const weekEnd = format(endOfWeek(subWeeks(new Date(), i), { weekStartsOn: 1 }), "yyyy-MM-dd");
    const [ex, cnt] = await Promise.all([
      db.prepare(`SELECT COALESCE(SUM(we.sets * we.reps * we.weight_kg), 0) as volume FROM workout_exercises we JOIN workouts w ON w.id = we.workout_id WHERE w.date BETWEEN ? AND ?`).get(weekStart, weekEnd),
      db.prepare("SELECT COUNT(*) as count FROM workouts WHERE date BETWEEN ? AND ?").get(weekStart, weekEnd),
    ]);
    weeklyVolume.push({ week: `S${8 - i}`, volume: Math.round((ex as any)?.volume || 0), sessions: (cnt as any)?.count || 0, weekStart });
  }

  // Workout dates for streak
  const workoutDates = (await db.prepare("SELECT DISTINCT date FROM workouts ORDER BY date DESC").all()).map((r: any) => r.date);
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
    db.prepare("SELECT COUNT(*) as count FROM workouts WHERE date >= ?").get(thirtyAgo),
    db.prepare("SELECT COUNT(*) as count FROM workouts WHERE date BETWEEN ? AND ?").get(weekStart, weekEnd),
  ]);

  return NextResponse.json({
    weeklyVolume,
    streak,
    sessionsLast30: (s30 as any)?.count || 0,
    thisWeekSessions: (thisWeek as any)?.count || 0,
  });
}
