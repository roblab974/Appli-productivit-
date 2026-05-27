import { NextResponse } from "next/server";
import getDb, { ensureSchema } from "@/lib/db";
import { format, subDays, startOfWeek, endOfWeek, differenceInDays, parseISO } from "date-fns";
import { getTodosForDate } from "@/lib/todos-helpers";
import { requireUserId, withAuth } from "@/lib/auth";

export const dynamic = "force-dynamic";

export const GET = withAuth(async () => {
  await ensureSchema();
  const userId = await requireUserId();
  const db = getDb();
  const today = format(new Date(), "yyyy-MM-dd");

  const [todayWorkout, todaySleep, todayWater] = await Promise.all([
    db.prepare("SELECT * FROM workouts WHERE user_id = ? AND date = ?").get(userId, today),
    db.prepare("SELECT * FROM sleep_logs WHERE user_id = ? AND date = ?").get(userId, today),
    db.prepare("SELECT * FROM water_logs WHERE user_id = ? AND date = ?").get(userId, today),
  ]);

  const todayTodos = await getTodosForDate(db, userId, today);
  const completedTodos = todayTodos.filter(t => t.completed).length;
  const taskPct = todayTodos.length > 0 ? Math.round((completedTodos / todayTodos.length) * 100) : 0;

  const waterSettings = (await db.prepare("SELECT goal_ml FROM water_settings WHERE user_id = ?").get(userId)) as any;
  const waterGoalMl = waterSettings?.goal_ml || 2500;
  const waterVolumeMl = (todayWater as any)?.volume_ml || 0;
  const waterOk = waterVolumeMl >= waterGoalMl;

  const workoutSettings = (await db.prepare("SELECT weekly_goal FROM workout_settings WHERE user_id = ?").get(userId)) as any;
  const weeklyWorkoutGoal = workoutSettings?.weekly_goal || 3;

  const weightSettings = (await db.prepare("SELECT goal_kg FROM weight_settings WHERE user_id = ?").get(userId)) as any;
  const weightGoal = weightSettings?.goal_kg || 80;

  const workoutDone = !!todayWorkout;
  const sleepOk = (todaySleep as any)?.duration_h >= 7;
  const score = Math.round((workoutDone ? 25 : 0) + (sleepOk ? 25 : 0) + (taskPct * 0.25) + (waterOk ? 25 : 0));

  let globalStreak = 0;
  for (let i = 0; i < 30; i++) {
    const d = format(subDays(new Date(), i), "yyyy-MM-dd");
    if (i === 0 && score < 75) break;
    const [w, s, wa] = await Promise.all([
      db.prepare("SELECT id FROM workouts WHERE user_id = ? AND date = ?").get(userId, d),
      db.prepare("SELECT duration_h FROM sleep_logs WHERE user_id = ? AND date = ?").get(userId, d),
      db.prepare("SELECT volume_ml FROM water_logs WHERE user_id = ? AND date = ?").get(userId, d),
    ]);
    const dayTodos = await getTodosForDate(db, userId, d);
    const dayDone = dayTodos.filter((t: any) => t.completed).length;
    const dayPct = dayTodos.length > 0 ? Math.round((dayDone / dayTodos.length) * 100) : 0;
    const dayScore = (w ? 25 : 0) + ((s as any)?.duration_h >= 7 ? 25 : 0) + (dayPct * 0.25) + (((wa as any)?.volume_ml || 0) >= waterGoalMl ? 25 : 0);
    if (dayScore >= 75) globalStreak++;
    else break;
  }

  const quotes = await db.prepare("SELECT * FROM quotes").all();
  const dayOfYear = Math.floor((Date.now() - new Date(new Date().getFullYear(), 0, 0).getTime()) / 86400000);
  const quote = quotes.length > 0 ? quotes[dayOfYear % quotes.length] : { text: "Chaque jour est une nouvelle opportunité.", author: "Anonyme" };

  const [latestWeight, weekData, mainGoal] = await Promise.all([
    db.prepare("SELECT weight_kg FROM weight_logs WHERE user_id = ? ORDER BY date DESC LIMIT 1").get(userId),
    (() => {
      const weekStart = format(startOfWeek(new Date(), { weekStartsOn: 1 }), "yyyy-MM-dd");
      const weekEnd = format(endOfWeek(new Date(), { weekStartsOn: 1 }), "yyyy-MM-dd");
      return db.prepare("SELECT COUNT(*) as count FROM workouts WHERE user_id = ? AND date BETWEEN ? AND ?").get(userId, weekStart, weekEnd);
    })(),
    db.prepare("SELECT * FROM business_goals WHERE user_id = ? AND status='active' ORDER BY created_at DESC LIMIT 1").get(userId),
  ]);

  const workoutDates = (await db.prepare("SELECT DISTINCT date FROM workouts WHERE user_id = ? ORDER BY date DESC").all(userId)).map((r: any) => r.date);
  let workoutStreak = 0;
  const yesterday = format(subDays(new Date(), 1), "yyyy-MM-dd");
  let checkDate: string | null = workoutDates.includes(today) ? today : workoutDates.includes(yesterday) ? yesterday : null;
  if (checkDate) {
    for (const d of workoutDates) {
      if (d === checkDate) { workoutStreak++; checkDate = format(subDays(new Date(checkDate), 1), "yyyy-MM-dd"); }
      else break;
    }
  }

  const urgentRaw = (await db.prepare(`
    SELECT * FROM todos
    WHERE user_id = ? AND deadline IS NOT NULL AND completed = 0
    ORDER BY deadline ASC LIMIT 50
  `).all(userId)) as any[];
  const urgentTasks = urgentRaw
    .map(t => {
      try {
        const days = differenceInDays(parseISO(t.deadline), new Date());
        return { ...t, completed: Boolean(t.completed), daysLeft: days };
      } catch { return null; }
    })
    .filter((t: any) => t && t.daysLeft <= 3)
    .slice(0, 5);

  return NextResponse.json({
    today, score, globalStreak, quote,
    workout: { done: workoutDone, streak: workoutStreak, weekSessions: (weekData as any)?.count || 0, weeklyGoal: weeklyWorkoutGoal, data: todayWorkout },
    sleep: { ok: sleepOk, data: todaySleep },
    water: {
      ok: waterOk,
      volume_ml: waterVolumeMl,
      goal_ml: waterGoalMl,
      glasses: (todayWater as any)?.glasses || 0,
      goal: (todayWater as any)?.goal || Math.round(waterGoalMl / 250),
    },
    tasks: { pct: taskPct, total: todayTodos.length, completed: completedTodos },
    weight: (latestWeight as any)?.weight_kg || null,
    weightGoal,
    mainGoal,
    urgentTasks,
  });
});
