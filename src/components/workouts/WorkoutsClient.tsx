"use client";

import { useEffect, useState } from "react";
import { Plus, Flame, Calendar, TrendingUp, Dumbbell, Timer, ChevronDown, ChevronUp, Trash2 } from "lucide-react";
import PageHeader from "@/components/ui/PageHeader";
import { Card, CardHeader, CardTitle } from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import Modal from "@/components/ui/Modal";
import Input from "@/components/ui/Input";
import Badge from "@/components/ui/Badge";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, parseISO } from "date-fns";
import { fr } from "date-fns/locale";
import { cn } from "@/lib/utils";

interface Workout {
  id: number; date: string; type: string; duration_min: number; notes?: string;
  exercises?: { id: number; name: string; sets?: number; reps?: number; weight_kg?: number }[];
}
interface Stats { weeklyVolume: { week: string; volume: number; sessions: number }[]; streak: number; sessionsLast30: number; thisWeekSessions: number }

const WORKOUT_TYPES = [
  { value: "musculation", label: "Musculation", color: "blue" as const },
  { value: "cardio", label: "Cardio", color: "green" as const },
  { value: "autre", label: "Autre", color: "muted" as const },
];

export default function WorkoutsClient() {
  const [workouts, setWorkouts] = useState<Workout[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [currentMonth] = useState(new Date());

  const [form, setForm] = useState({ type: "musculation", duration_min: "45", notes: "" });
  const [exercises, setExercises] = useState([{ name: "", sets: "", reps: "", weight_kg: "" }]);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    const [wRes, sRes] = await Promise.all([fetch("/api/workouts"), fetch("/api/workouts/stats")]);
    setWorkouts(await wRes.json());
    setStats(await sRes.json());
  };
  useEffect(() => { load(); }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    await fetch("/api/workouts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...form,
        duration_min: parseInt(form.duration_min),
        exercises: exercises.filter(ex => ex.name).map(ex => ({
          name: ex.name,
          sets: ex.sets ? parseInt(ex.sets) : undefined,
          reps: ex.reps ? parseInt(ex.reps) : undefined,
          weight_kg: ex.weight_kg ? parseFloat(ex.weight_kg) : undefined,
        })),
      }),
    });
    setSaving(false);
    setShowForm(false);
    setForm({ type: "musculation", duration_min: "45", notes: "" });
    setExercises([{ name: "", sets: "", reps: "", weight_kg: "" }]);
    load();
  };

  const deleteWorkout = async (id: number) => {
    await fetch(`/api/workouts/${id}`, { method: "DELETE" });
    load();
  };

  // Calendar
  const monthDays = eachDayOfInterval({ start: startOfMonth(currentMonth), end: endOfMonth(currentMonth) });
  const workoutDates = new Set(workouts.map(w => w.date));

  return (
    <div className="px-4 pb-4 max-w-lg mx-auto">
      <PageHeader
        title="Workouts"
        subtitle={stats ? `${stats.thisWeekSessions}/3 cette semaine` : ""}
        action={
          <Button size="sm" onClick={() => setShowForm(true)}>
            <Plus size={16} /> Log
          </Button>
        }
      />

      {/* Stats row */}
      {stats && (
        <div className="grid grid-cols-3 gap-3 mb-4">
          <Card className="text-center py-3">
            <Flame size={18} className="text-accent-amber mx-auto mb-1" />
            <span className="font-heading text-2xl font-bold text-accent-amber">{stats.streak}</span>
            <p className="text-[10px] text-foreground-muted mt-0.5">Streak</p>
          </Card>
          <Card className="text-center py-3">
            <Dumbbell size={18} className="text-accent-blue mx-auto mb-1" />
            <span className="font-heading text-2xl font-bold text-accent-blue">{stats.thisWeekSessions}</span>
            <p className="text-[10px] text-foreground-muted mt-0.5">Cette sem.</p>
          </Card>
          <Card className="text-center py-3">
            <Calendar size={18} className="text-accent-purple mx-auto mb-1" />
            <span className="font-heading text-2xl font-bold text-accent-purple">{stats.sessionsLast30}</span>
            <p className="text-[10px] text-foreground-muted mt-0.5">30 jours</p>
          </Card>
        </div>
      )}

      {/* Weekly goal bar */}
      {stats && (
        <Card className="mb-4">
          <CardHeader>
            <CardTitle>Objectif hebdo</CardTitle>
            <span className="text-xs text-foreground-muted">{stats.thisWeekSessions}/3 séances</span>
          </CardHeader>
          <div className="flex gap-2">
            {[1, 2, 3].map(i => (
              <div key={i} className={cn(
                "h-2 flex-1 rounded-full transition-all duration-500",
                i <= stats.thisWeekSessions ? "bg-gradient-accent" : "bg-surface-2"
              )} />
            ))}
          </div>
        </Card>
      )}

      {/* Volume chart */}
      {stats && stats.weeklyVolume.some(w => w.volume > 0) && (
        <Card className="mb-4">
          <CardHeader>
            <CardTitle>Volume (kg)</CardTitle>
            <TrendingUp size={16} className="text-accent-blue" />
          </CardHeader>
          <ResponsiveContainer width="100%" height={140}>
            <BarChart data={stats.weeklyVolume} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(51,65,85,0.3)" />
              <XAxis dataKey="week" tick={{ fill: "#64748B", fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: "#64748B", fontSize: 11 }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={{ background: "#0F172A", border: "1px solid #334155", borderRadius: 12, fontSize: 12 }} cursor={{ fill: "rgba(59,130,246,0.1)" }} />
              <Bar dataKey="volume" fill="url(#blueGrad)" radius={[4, 4, 0, 0]} />
              <defs>
                <linearGradient id="blueGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#3B82F6" />
                  <stop offset="100%" stopColor="#8B5CF6" />
                </linearGradient>
              </defs>
            </BarChart>
          </ResponsiveContainer>
        </Card>
      )}

      {/* Calendar */}
      <Card className="mb-4">
        <CardHeader>
          <CardTitle>Calendrier</CardTitle>
          <span className="text-xs text-foreground-muted capitalize">{format(currentMonth, "MMMM yyyy", { locale: fr })}</span>
        </CardHeader>
        <div className="grid grid-cols-7 gap-1 text-center">
          {["L", "M", "M", "J", "V", "S", "D"].map((d, i) => (
            <span key={i} className="text-[10px] text-foreground-muted pb-1">{d}</span>
          ))}
          {/* Offset for first day */}
          {Array.from({ length: (monthDays[0].getDay() || 7) - 1 }).map((_, i) => <div key={`e${i}`} />)}
          {monthDays.map(day => {
            const dateStr = format(day, "yyyy-MM-dd");
            const hasWorkout = workoutDates.has(dateStr);
            const isToday = isSameDay(day, new Date());
            return (
              <div key={dateStr} className={cn(
                "aspect-square flex items-center justify-center rounded-lg text-xs font-medium transition-all",
                hasWorkout && "bg-gradient-accent text-white",
                isToday && !hasWorkout && "ring-1 ring-accent-blue/50 text-accent-blue",
                !hasWorkout && !isToday && "text-foreground-muted"
              )}>
                {day.getDate()}
              </div>
            );
          })}
        </div>
      </Card>

      {/* Recent workouts */}
      <div className="space-y-3">
        <h2 className="font-heading text-base font-semibold text-foreground-muted uppercase tracking-wider">Historique</h2>
        {workouts.length === 0 && (
          <Card><p className="text-center text-foreground-muted text-sm py-4">Aucune séance loggée</p></Card>
        )}
        {workouts.slice(0, 10).map(w => {
          const typeInfo = WORKOUT_TYPES.find(t => t.value === w.type) || WORKOUT_TYPES[2];
          const expanded = expandedId === w.id;
          return (
            <Card key={w.id} className="cursor-pointer" onClick={() => setExpandedId(expanded ? null : w.id)}>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-accent-blue/10 flex items-center justify-center flex-shrink-0">
                  <Dumbbell size={18} className="text-accent-blue" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <Badge variant={typeInfo.color}>{typeInfo.label}</Badge>
                    <span className="text-xs text-foreground-muted">
                      {format(parseISO(w.date), "dd/MM", { locale: fr })}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 mt-1">
                    <span className="text-xs text-foreground-muted flex items-center gap-1">
                      <Timer size={11} /> {w.duration_min} min
                    </span>
                    {w.exercises && w.exercises.length > 0 && (
                      <span className="text-xs text-foreground-muted">{w.exercises.length} exercices</span>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {expanded ? <ChevronUp size={16} className="text-foreground-muted" /> : <ChevronDown size={16} className="text-foreground-muted" />}
                  <button
                    className="p-1.5 rounded-lg hover:bg-accent-red/10 text-muted hover:text-accent-red transition-colors cursor-pointer"
                    onClick={e => { e.stopPropagation(); deleteWorkout(w.id); }}
                    aria-label="Supprimer"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
              {expanded && w.exercises && w.exercises.length > 0 && (
                <div className="mt-3 pt-3 border-t border-border/50 space-y-1">
                  {w.exercises.map(ex => (
                    <div key={ex.id} className="flex items-center justify-between text-sm">
                      <span className="text-foreground">{ex.name}</span>
                      <span className="text-foreground-muted text-xs">
                        {[ex.sets && `${ex.sets}x`, ex.reps && `${ex.reps}`, ex.weight_kg && `${ex.weight_kg}kg`].filter(Boolean).join(" ")}
                      </span>
                    </div>
                  ))}
                  {w.notes && <p className="text-xs text-foreground-muted mt-2 italic">{w.notes}</p>}
                </div>
              )}
            </Card>
          );
        })}
      </div>

      {/* Log modal */}
      <Modal open={showForm} onClose={() => setShowForm(false)} title="Nouvelle séance">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-sm font-medium text-foreground-muted block mb-2">Type</label>
            <div className="flex gap-2">
              {WORKOUT_TYPES.map(t => (
                <button
                  key={t.value}
                  type="button"
                  onClick={() => setForm(f => ({ ...f, type: t.value }))}
                  className={cn(
                    "flex-1 py-2 px-3 rounded-xl text-sm font-medium transition-all cursor-pointer",
                    form.type === t.value ? "bg-gradient-accent text-white" : "bg-surface-2 text-foreground-muted hover:text-foreground"
                  )}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          <Input
            label="Durée (minutes)"
            type="number"
            min="1"
            value={form.duration_min}
            onChange={e => setForm(f => ({ ...f, duration_min: e.target.value }))}
            required
          />

          <div>
            <label className="text-sm font-medium text-foreground-muted block mb-2">Exercices</label>
            <div className="space-y-2">
              {exercises.map((ex, i) => (
                <div key={i} className="grid grid-cols-4 gap-1.5">
                  <input
                    placeholder="Exercice"
                    value={ex.name}
                    onChange={e => { const n = [...exercises]; n[i].name = e.target.value; setExercises(n); }}
                    className="col-span-4 bg-surface border border-border rounded-xl px-3 py-2 text-sm text-foreground placeholder:text-muted focus:outline-none focus:border-accent-blue min-h-[40px]"
                  />
                  <input placeholder="Séries" value={ex.sets} onChange={e => { const n = [...exercises]; n[i].sets = e.target.value; setExercises(n); }} type="number" className="bg-surface border border-border rounded-xl px-2 py-2 text-sm text-foreground placeholder:text-muted focus:outline-none focus:border-accent-blue text-center min-h-[40px]" />
                  <input placeholder="Reps" value={ex.reps} onChange={e => { const n = [...exercises]; n[i].reps = e.target.value; setExercises(n); }} type="number" className="bg-surface border border-border rounded-xl px-2 py-2 text-sm text-foreground placeholder:text-muted focus:outline-none focus:border-accent-blue text-center min-h-[40px]" />
                  <input placeholder="Poids" value={ex.weight_kg} onChange={e => { const n = [...exercises]; n[i].weight_kg = e.target.value; setExercises(n); }} type="number" step="0.5" className="bg-surface border border-border rounded-xl px-2 py-2 text-sm text-foreground placeholder:text-muted focus:outline-none focus:border-accent-blue text-center min-h-[40px]" />
                  <span className="text-[10px] text-foreground-muted text-center col-start-2">séries</span>
                  <span className="text-[10px] text-foreground-muted text-center">reps</span>
                  <span className="text-[10px] text-foreground-muted text-center">kg</span>
                </div>
              ))}
              <button
                type="button"
                onClick={() => setExercises(e => [...e, { name: "", sets: "", reps: "", weight_kg: "" }])}
                className="text-xs text-accent-blue hover:underline cursor-pointer"
              >
                + Ajouter un exercice
              </button>
            </div>
          </div>

          <Input
            label="Notes (optionnel)"
            value={form.notes}
            onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
            placeholder="Comment tu t'es senti..."
          />

          <Button type="submit" loading={saving} className="w-full">
            Enregistrer la séance
          </Button>
        </form>
      </Modal>
    </div>
  );
}
