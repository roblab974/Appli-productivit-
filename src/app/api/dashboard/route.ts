import { NextResponse } from "next/server";
import getDb, { ensureSchema } from "@/lib/db";
import { format, subDays, startOfWeek, endOfWeek } from "date-fns";

export async function GET() {
  await ensureSchema();
  const db = getDb();
  const today = format(new Date(), "yyyy-MM-dd");

  const [todayWorkout, todaySleep, todayWater, todayTodos] = await Promise.all([
    db.prepare("SELECT * FROM workouts WHERE date = ?").get(today),
    db.prepare("SELECT * FROM sleep_logs WHERE date = ?").get(today),
    db.prepare("SELECT * FROM water_logs WHERE date = ?").get(today),
    db.prepare("SELECT * FROM todos WHERE date = ? AND recurring IS NULL").all(today),
  ]);

  const completedTodos = (todayTodos as any[]).filter(t => t.completed).length;
  const taskPct = (todayTodos as any[]).length > 0 ? Math.round((completedTodos / (todayTodos as any[]).length) * 100) : 0;

  const workoutDone = !!todayWorkout;
  const sleepOk = (todaySleep as any)?.duration_h >= 7;
  const waterOk = (todayWater as any)?.glasses >= (todayWater as any)?.goal;
  const score = Math.round((workoutDone ? 25 : 0) + (sleepOk ? 25 : 0) + (taskPct * 0.25) + (waterOk ? 25 : 0));

  // Global streak
  let globalStreak = 0;
  for (let i = 0; i < 30; i++) {
    const d = format(subDays(new Date(), i), "yyyy-MM-dd");
    if (i === 0 && score < 75) break;
    const [w, s, wa, tt] = await Promise.all([
      db.prepare("SELECT id FROM workouts WHERE date = ?").get(d),
      db.prepare("SELECT duration_h FROM sleep_logs WHERE date = ?").get(d),
      db.prepare("SELECT glasses, goal FROM water_logs WHERE date = ?").get(d),
      db.prepare("SELECT COUNT(*) as total, SUM(completed) as done FROM todos WHERE date = ? AND recurring IS NULL").get(d),
    ]);
    const dayPct = (tt as any)?.total > 0 ? Math.round(((tt as any).done / (tt as any).total) * 100) : 0;
    const dayScore = (w ? 25 : 0) + ((s as any)?.duration_h >= 7 ? 25 : 0) + (dayPct * 0.25) + ((wa as any)?.glasses >= (wa as any)?.goal ? 25 : 0);
    if (dayScore >= 75) globalStreak++;
    else break;
  }

  // Quote of the day
  const quotes = await db.prepare("SELECT * FROM quotes").all();
  const dayOfYear = Math.floor((Date.now() - new Date(new Date().getFullYear(), 0, 0).getTime()) / 86400000);
  const quote = quotes.length > 0 ? quotes[dayOfYear % quotes.length] : { text: "Chaque jour est une nouvelle opportunité.", author: "Anonyme" };

  const [latestWeight, weekData, mainGoal] = await Promise.all([
    db.prepare("SELECT weight_kg FROM weight_logs ORDER BY date DESC LIMIT 1").get(),
    (() => {
      const weekStart = format(startOfWeek(new Date(), { weekStartsOn: 1 }), "yyyy-MM-dd");
      const weekEnd = format(endOfWeek(new Date(), { weekStartsOn: 1 }), "yyyy-MM-dd");
      return db.prepare("SELECT COUNT(*) as count FROM workouts WHERE date BETWEEN ? AND ?").get(weekStart, weekEnd);
    })(),
    db.prepare("SELECT * FROM business_goals WHERE status='active' ORDER BY created_at DESC LIMIT 1").get(),
  ]);

  // Workout streak
  const workoutDates = (await db.prepare("SELECT DISTINCT date FROM workouts ORDER BY date DESC").all()).map((r: any) => r.date);
  let workoutStreak = 0;
  const yesterday = format(subDays(new Date(), 1), "yyyy-MM-dd");
  let checkDate: string | null = workoutDates.includes(today) ? today : workoutDates.includes(yesterday) ? yesterday : null;
  if (checkDate) {
    for (const d of workoutDates) {
      if (d === checkDate) { workoutStreak++; checkDate = format(subDays(new Date(checkDate), 1), "yyyy-MM-dd"); }
      else break;
    }
  }

  return NextResponse.json({
    today, score, globalStreak, quote,
    workout: { done: workoutDone, streak: workoutStreak, weekSessions: (weekData as any)?.count || 0, data: todayWorkout },
    sleep: { ok: sleepOk, data: todaySleep },
    water: { ok: waterOk, glasses: (todayWater as any)?.glasses || 0, goal: (todayWater as any)?.goal || 8 },
    tasks: { pct: taskPct, total: (todayTodos as any[]).length, completed: completedTodos },
    weight: (latestWeight as any)?.weight_kg || null,
    mainGoal,
  });
}
