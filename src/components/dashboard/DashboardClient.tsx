"use client";

import { useEffect, useState } from "react";
import { Flame, Droplets, Dumbbell, Moon, CheckSquare, Briefcase, TrendingUp, Quote, Zap, AlertTriangle, Calendar as CalendarIcon } from "lucide-react";
import { Card, CardHeader, CardTitle } from "@/components/ui/Card";
import ProgressRing from "@/components/ui/ProgressRing";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { deadlineColor } from "@/components/todos/TodosClient";

interface DashboardData {
  today: string;
  score: number;
  globalStreak: number;
  quote: { text: string; author: string };
  workout: { done: boolean; streak: number; weekSessions: number; weeklyGoal?: number };
  sleep: { ok: boolean; data: { duration_h: number; quality: number } | null };
  water: { ok: boolean; glasses: number; goal: number; volume_ml?: number; goal_ml?: number };
  tasks: { pct: number; total: number; completed: number };
  weight: number | null;
  weightGoal?: number;
  mainGoal: { title: string; progress: number } | null;
  urgentTasks?: Array<{ id: number; title: string; priority: string; deadline: string; daysLeft: number }>;
}

function ScoreColor(score: number) {
  if (score >= 75) return "#22C55E";
  if (score >= 50) return "#F59E0B";
  return "#EF4444";
}

export default function DashboardClient() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/dashboard")
      .then(r => r.json())
      .then(d => { setData(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  if (loading) return <DashboardSkeleton />;
  if (!data) return <div className="p-4 text-foreground-muted">Erreur de chargement</div>;

  const scoreColor = ScoreColor(data.score);
  const dateLabel = new Date(data.today).toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" });

  return (
    <div className="px-4 pt-10 pb-4 space-y-4 animate-fade-in max-w-lg mx-auto">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-foreground-muted text-sm capitalize">{dateLabel}</p>
          <h1 className="font-heading text-2xl font-bold">Bonjour 👋</h1>
        </div>
        {data.globalStreak > 0 && (
          <div className="flex items-center gap-1.5 bg-accent-amber/10 border border-accent-amber/20 px-3 py-1.5 rounded-xl">
            <Flame size={16} className="text-accent-amber" />
            <span className="text-accent-amber font-bold text-sm">{data.globalStreak}j</span>
          </div>
        )}
      </div>

      {/* Score du jour */}
      <Card gradient glow={data.score >= 75 ? "green" : undefined}>
        <div className="flex items-center gap-4">
          <ProgressRing value={data.score} size={88} strokeWidth={7} color={scoreColor}>
            <div className="text-center">
              <span className="font-heading text-2xl font-bold" style={{ color: scoreColor }}>{data.score}</span>
              <span className="text-foreground-muted text-[10px] block">/100</span>
            </div>
          </ProgressRing>
          <div className="flex-1">
            <h2 className="font-heading text-lg font-bold mb-2">Score du jour</h2>
            <div className="space-y-1.5">
              <ScoreItem icon={Dumbbell} label="Workout" done={data.workout.done} value={data.workout.done ? "✓" : "—"} />
              <ScoreItem icon={Moon} label="Sommeil" done={data.sleep.ok} value={data.sleep.data ? `${data.sleep.data.duration_h}h` : "—"} />
              <ScoreItem icon={CheckSquare} label="Tâches" done={data.tasks.pct >= 75} value={`${data.tasks.pct}%`} />
              <ScoreItem icon={Droplets} label="Eau" done={data.water.ok} value={`${data.water.glasses}/${data.water.goal}`} />
            </div>
          </div>
        </div>
      </Card>

      {/* Quote */}
      <Card className="border-l-2 border-l-accent-purple/50">
        <div className="flex gap-3">
          <Quote size={18} className="text-accent-purple flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm text-foreground leading-relaxed italic">"{data.quote.text}"</p>
            <p className="text-xs text-foreground-muted mt-1">— {data.quote.author}</p>
          </div>
        </div>
      </Card>

      {/* Tâches urgentes (deadline ≤ 3 jours) */}
      {data.urgentTasks && data.urgentTasks.length > 0 && (
        <Card glow="green" className="border border-accent-red/30">
          <CardHeader>
            <div className="flex items-center gap-2">
              <AlertTriangle size={16} className="text-accent-red animate-pulse" />
              <CardTitle className="text-accent-red">Urgent</CardTitle>
            </div>
            <Link href="/todos" className="text-[10px] text-foreground-muted hover:text-foreground transition-colors">
              Voir tout →
            </Link>
          </CardHeader>
          <div className="space-y-2">
            {data.urgentTasks.map(t => {
              const dl = deadlineColor(t.deadline);
              return (
                <Link key={t.id} href="/todos" className={cn(
                  "flex items-center gap-3 p-2.5 rounded-xl border-2 transition-all cursor-pointer hover:scale-[1.01] active:scale-100",
                  dl?.border,
                  dl?.bg
                )}>
                  <CalendarIcon size={14} className={dl?.text} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">{t.title}</p>
                  </div>
                  <span className={cn("text-xs font-bold", dl?.text)}>{dl?.label}</span>
                </Link>
              );
            })}
          </div>
        </Card>
      )}

      {/* Quick stats grid */}
      <div className="grid grid-cols-2 gap-3">

        {/* Workout */}
        <Link href="/workouts">
          <Card className="h-full hover:border-accent-blue/40 transition-colors active:scale-95">
            <CardHeader>
              <CardTitle>Workouts</CardTitle>
              <Dumbbell size={16} className="text-accent-blue" />
            </CardHeader>
            <div className="mt-1">
              <div className="flex items-baseline gap-1">
                <span className="font-heading text-3xl font-bold text-accent-blue">{data.workout.weekSessions}</span>
                <span className="text-foreground-muted text-sm">/{data.workout.weeklyGoal || 3} sem.</span>
              </div>
              {data.workout.streak > 0 && (
                <div className="flex items-center gap-1 mt-1">
                  <Flame size={12} className="text-accent-amber" />
                  <span className="text-xs text-accent-amber">{data.workout.streak} jours</span>
                </div>
              )}
            </div>
          </Card>
        </Link>

        {/* Eau */}
        <Link href="/health">
          <Card className="h-full hover:border-accent-cyan/40 transition-colors active:scale-95">
            <CardHeader>
              <CardTitle>Eau</CardTitle>
              <Droplets size={16} className="text-accent-cyan" />
            </CardHeader>
            <div className="mt-1">
              <div className="flex items-baseline gap-1">
                <span className="font-heading text-3xl font-bold text-accent-cyan">{data.water.glasses}</span>
                <span className="text-foreground-muted text-sm">/{data.water.goal}</span>
              </div>
              <div className="mt-2 h-1.5 bg-surface-2 rounded-full overflow-hidden">
                <div
                  className="h-full bg-accent-cyan rounded-full transition-all duration-500"
                  style={{ width: `${Math.min((data.water.glasses / data.water.goal) * 100, 100)}%` }}
                />
              </div>
            </div>
          </Card>
        </Link>

        {/* Tâches */}
        <Link href="/todos">
          <Card className="h-full hover:border-accent-green/40 transition-colors active:scale-95">
            <CardHeader>
              <CardTitle>Tâches</CardTitle>
              <CheckSquare size={16} className="text-accent-green" />
            </CardHeader>
            <div className="mt-1">
              <div className="flex items-baseline gap-1">
                <span className="font-heading text-3xl font-bold text-accent-green">{data.tasks.completed}</span>
                <span className="text-foreground-muted text-sm">/{data.tasks.total}</span>
              </div>
              <span className="text-xs text-foreground-muted">{data.tasks.pct}% complétées</span>
            </div>
          </Card>
        </Link>

        {/* Poids */}
        <Link href="/health">
          <Card className="h-full hover:border-accent-purple/40 transition-colors active:scale-95">
            <CardHeader>
              <CardTitle>Poids</CardTitle>
              <TrendingUp size={16} className="text-accent-purple" />
            </CardHeader>
            <div className="mt-1">
              {data.weight ? (
                <>
                  <div className="flex items-baseline gap-1">
                    <span className="font-heading text-3xl font-bold text-accent-purple">{data.weight}</span>
                    <span className="text-foreground-muted text-sm">kg</span>
                  </div>
                  <span className="text-xs text-foreground-muted">Objectif: {data.weightGoal || 80} kg</span>
                </>
              ) : (
                <span className="text-sm text-foreground-muted">Pas de données</span>
              )}
            </div>
          </Card>
        </Link>
      </div>

      {/* Business goal */}
      {data.mainGoal && (
        <Link href="/business">
          <Card className="hover:border-accent-amber/40 transition-colors active:scale-95">
            <CardHeader>
              <CardTitle>Business</CardTitle>
              <Briefcase size={16} className="text-accent-amber" />
            </CardHeader>
            <p className="text-sm font-medium text-foreground mb-2 truncate">{data.mainGoal.title}</p>
            <div className="flex items-center gap-3">
              <div className="flex-1 h-2 bg-surface-2 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-accent rounded-full transition-all duration-500"
                  style={{ width: `${data.mainGoal.progress}%` }}
                />
              </div>
              <span className="text-sm font-bold text-accent-blue">{data.mainGoal.progress}%</span>
            </div>
          </Card>
        </Link>
      )}

    </div>
  );
}

function ScoreItem({ icon: Icon, label, done, value }: { icon: any; label: string; done: boolean; value: string }) {
  return (
    <div className="flex items-center gap-2">
      <div className={cn("w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0",
        done ? "bg-accent-green/20" : "bg-surface-2")}>
        <Icon size={11} className={done ? "text-accent-green" : "text-muted"} />
      </div>
      <span className="text-xs text-foreground-muted flex-1">{label}</span>
      <span className={cn("text-xs font-semibold", done ? "text-accent-green" : "text-foreground-muted")}>{value}</span>
    </div>
  );
}

function DashboardSkeleton() {
  return (
    <div className="px-4 pt-10 pb-4 space-y-4 max-w-lg mx-auto">
      <div className="h-8 w-40 bg-surface rounded-xl animate-pulse" />
      <div className="h-32 bg-surface rounded-2xl animate-pulse" />
      <div className="h-20 bg-surface rounded-2xl animate-pulse" />
      <div className="grid grid-cols-2 gap-3">
        {[...Array(4)].map((_, i) => <div key={i} className="h-24 bg-surface rounded-2xl animate-pulse" />)}
      </div>
    </div>
  );
}
