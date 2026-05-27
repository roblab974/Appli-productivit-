"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { Plus, CheckCircle2, Circle, Trash2, Timer, Play, Pause, RotateCcw, AlertTriangle, Minus, ChevronDown, Calendar as CalendarIcon, Edit3 } from "lucide-react";
import PageHeader from "@/components/ui/PageHeader";
import { Card, CardHeader, CardTitle } from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import Modal from "@/components/ui/Modal";
import Input from "@/components/ui/Input";
import Badge from "@/components/ui/Badge";
import ProgressRing from "@/components/ui/ProgressRing";
import SelectionToolbar, { SelectCheckbox } from "@/components/ui/SelectionToolbar";
import { useSelection } from "@/lib/useSelection";
import { cn, todayStr, pct } from "@/lib/utils";
import { differenceInDays, parseISO, format } from "date-fns";
import { fr } from "date-fns/locale";

/** Couleur du contour selon le nombre de jours restants jusqu'à la deadline */
export function deadlineColor(deadline?: string | null): { border: string; text: string; bg: string; label: string } | null {
  if (!deadline) return null;
  try {
    const days = differenceInDays(parseISO(deadline), new Date());
    if (days < 3) return { border: "border-accent-red", text: "text-accent-red", bg: "bg-accent-red/10", label: days < 0 ? `En retard ${Math.abs(days)}j` : days === 0 ? "Aujourd'hui" : `Dans ${days}j` };
    if (days < 5) return { border: "border-accent-orange", text: "text-accent-orange", bg: "bg-accent-orange/10", label: `Dans ${days}j` };
    if (days < 7) return { border: "border-accent-yellow", text: "text-accent-yellow", bg: "bg-accent-yellow/10", label: `Dans ${days}j` };
    return { border: "border-accent-green", text: "text-accent-green", bg: "bg-accent-green/10", label: `Dans ${days}j` };
  } catch { return null; }
}

type Tab = "tasks" | "pomodoro";
type Priority = "high" | "medium" | "low";

const PRIORITY_CONFIG = {
  high: { label: "Haute", color: "red" as const, order: 0 },
  medium: { label: "Moyenne", color: "amber" as const, order: 1 },
  low: { label: "Basse", color: "muted" as const, order: 2 },
};

const POMODORO_PRESETS = [
  { label: "25 / 5", work: 25, break: 5 },
  { label: "50 / 10", work: 50, break: 10 },
  { label: "90 / 20", work: 90, break: 20 },
];

export default function TodosClient() {
  const [tab, setTab] = useState<Tab>("tasks");
  const [todos, setTodos] = useState<any[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ title: "", priority: "medium" as Priority, recurring: "" as "" | "daily" | "weekly", recurring_day: "1", deadline: "" });
  const [editingId, setEditingId] = useState<number | null>(null);
  const sel = useSelection<number>();

  const bulkDelete = async () => {
    if (sel.ids.length === 0) return;
    if (!confirm(`Supprimer ${sel.ids.length} tâche(s) ?`)) return;
    await fetch("/api/todos", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ids: sel.ids }) });
    sel.exitMode();
    loadTodos();
  };

  // Pomodoro
  const [pomoDuration, setPomoDuration] = useState(25);
  const [pomoBreak, setPomoBreak] = useState(5);
  const [pomoPhase, setPomoPhase] = useState<"work" | "break">("work");
  const [timeLeft, setTimeLeft] = useState(25 * 60);
  const [running, setRunning] = useState(false);
  const [sessionsToday, setSessionsToday] = useState(0);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const loadTodos = useCallback(async () => {
    const data = await fetch(`/api/todos?date=${todayStr()}`).then(r => r.json());
    setTodos(data);
  }, []);

  const loadPomodoro = useCallback(async () => {
    const data = await fetch(`/api/pomodoro?date=${todayStr()}`).then(r => r.json());
    setSessionsToday(data.filter((s: any) => s.completed).length);
  }, []);

  useEffect(() => { loadTodos(); loadPomodoro(); }, [loadTodos, loadPomodoro]);

  // Pomodoro timer
  useEffect(() => {
    if (running) {
      intervalRef.current = setInterval(() => {
        setTimeLeft(t => {
          if (t <= 1) {
            setRunning(false);
            if (pomoPhase === "work") {
              fetch("/api/pomodoro", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ duration_min: pomoDuration, completed: true }) }).then(() => loadPomodoro());
              setPomoPhase("break");
              return pomoBreak * 60;
            } else {
              setPomoPhase("work");
              return pomoDuration * 60;
            }
          }
          return t - 1;
        });
      }, 1000);
    }
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [running, pomoPhase, pomoDuration, pomoBreak, loadPomodoro]);

  const resetTimer = () => { setRunning(false); setPomoPhase("work"); setTimeLeft(pomoDuration * 60); };
  const applyPreset = (preset: typeof POMODORO_PRESETS[0]) => { setPomoDuration(preset.work); setPomoBreak(preset.break); setRunning(false); setPomoPhase("work"); setTimeLeft(preset.work * 60); };

  const minutes = Math.floor(timeLeft / 60);
  const seconds = timeLeft % 60;
  const totalSeconds = (pomoPhase === "work" ? pomoDuration : pomoBreak) * 60;
  const pomoPct = ((totalSeconds - timeLeft) / totalSeconds) * 100;

  const toggleTodo = async (id: number, completed: boolean) => {
    await fetch(`/api/todos/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ completed: !completed }) });
    setTodos(ts => ts.map(t => t.id === id ? { ...t, completed: !t.completed } : t));
  };

  const deleteTodo = async (id: number) => {
    await fetch(`/api/todos/${id}`, { method: "DELETE" });
    setTodos(ts => ts.filter(t => t.id !== id));
  };

  const saveTodo = async (e: React.FormEvent) => {
    e.preventDefault(); setSaving(true);
    const body = {
      title: form.title,
      priority: form.priority,
      recurring: form.recurring || null,
      recurring_day: form.recurring === "weekly" ? parseInt(form.recurring_day) : null,
      deadline: form.deadline || null,
    };
    if (editingId) {
      await fetch(`/api/todos/${editingId}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    } else {
      await fetch("/api/todos", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    }
    setSaving(false);
    setShowModal(false);
    setEditingId(null);
    setForm({ title: "", priority: "medium", recurring: "", recurring_day: "1", deadline: "" });
    loadTodos();
  };

  const startEditTodo = (t: any) => {
    setEditingId(t.id);
    setForm({
      title: t.title,
      priority: t.priority as Priority,
      recurring: (t.recurring || "") as "" | "daily" | "weekly",
      recurring_day: t.recurring_day?.toString() || "1",
      deadline: t.deadline || "",
    });
    setShowModal(true);
  };

  const sortedTodos = [...todos].sort((a, b) => {
    if (a.completed !== b.completed) return a.completed ? 1 : -1;
    return PRIORITY_CONFIG[a.priority as Priority].order - PRIORITY_CONFIG[b.priority as Priority].order;
  });
  const completedCount = todos.filter(t => t.completed).length;
  const completionPct = pct(completedCount, todos.length);

  return (
    <div className="px-4 pb-4 max-w-lg mx-auto">
      <PageHeader
        title="Productivité"
        action={tab === "tasks" ? (
          <Button size="sm" onClick={() => { setEditingId(null); setForm({ title: "", priority: "medium", recurring: "", recurring_day: "1", deadline: "" }); setShowModal(true); }}><Plus size={14} /> Tâche</Button>
        ) : undefined}
      />

      {/* Tabs */}
      <div className="flex gap-2 mb-4 bg-surface rounded-2xl p-1">
        <button onClick={() => setTab("tasks")} className={cn("flex-1 py-2 rounded-xl text-sm font-medium transition-all cursor-pointer", tab === "tasks" ? "bg-gradient-accent text-white" : "text-foreground-muted")}>
          Tâches
        </button>
        <button onClick={() => setTab("pomodoro")} className={cn("flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-sm font-medium transition-all cursor-pointer", tab === "pomodoro" ? "bg-gradient-accent text-white" : "text-foreground-muted")}>
          <Timer size={14} /> Pomodoro
        </button>
      </div>

      {/* TASKS */}
      {tab === "tasks" && (
        <div className="space-y-4 animate-fade-in">
          {/* Progress */}
          {todos.length > 0 && (
            <Card>
              <div className="flex items-center gap-4">
                <ProgressRing value={completionPct} size={72} strokeWidth={6} color="#22C55E">
                  <span className="font-heading text-lg font-bold text-accent-green">{completionPct}%</span>
                </ProgressRing>
                <div>
                  <p className="font-semibold text-foreground">Score du jour</p>
                  <p className="text-sm text-foreground-muted">{completedCount} / {todos.length} tâches</p>
                  <div className="flex gap-2 mt-2">
                    {Object.entries(PRIORITY_CONFIG).map(([key, cfg]) => {
                      const count = todos.filter(t => t.priority === key && !t.completed).length;
                      if (count === 0) return null;
                      return <Badge key={key} variant={cfg.color}>{count} {cfg.label.toLowerCase()}</Badge>;
                    })}
                  </div>
                </div>
              </div>
            </Card>
          )}

          {/* Task list */}
          <SelectionToolbar
            selectionMode={sel.mode}
            selectedCount={sel.size}
            totalCount={todos.length}
            onToggleMode={sel.toggleMode}
            onSelectAll={() => sel.selectAll(todos.map(t => t.id))}
            onClear={sel.clear}
            onDelete={bulkDelete}
            label="tâche(s)"
          />

          {sortedTodos.length === 0 && (
            <Card><p className="text-center text-foreground-muted text-sm py-6">Aucune tâche pour aujourd'hui</p></Card>
          )}

          {sortedTodos.map(todo => {
            const cfg = PRIORITY_CONFIG[todo.priority as Priority];
            const dl = deadlineColor(todo.deadline);
            return (
              <div
                key={todo.id}
                className={cn(
                  "flex items-center gap-3 p-3 rounded-2xl border-2 transition-all",
                  todo.completed
                    ? "bg-surface/50 border-border/30 opacity-60"
                    : "glass",
                  // Contour deadline (prioritaire sur le contour standard)
                  !todo.completed && dl ? dl.border : !todo.completed && "border-border/60",
                  // Indicateur priorité haute (barre gauche) si pas de deadline
                  !todo.completed && !dl && todo.priority === "high" && "border-l-accent-red/60"
                )}
              >
                {sel.mode && <SelectCheckbox checked={sel.isSelected(todo.id)} onChange={() => sel.toggle(todo.id)} />}
                <button
                  onClick={() => toggleTodo(todo.id, todo.completed)}
                  className="flex-shrink-0 cursor-pointer active:scale-90 transition-transform"
                  aria-label={todo.completed ? "Marquer non complété" : "Marquer complété"}
                >
                  {todo.completed
                    ? <CheckCircle2 size={22} className="text-accent-green" />
                    : <Circle size={22} className="text-muted hover:text-foreground transition-colors" />
                  }
                </button>
                <div className="flex-1 min-w-0">
                  <p className={cn("text-sm font-medium", todo.completed && "line-through text-foreground-muted")}>{todo.title}</p>
                  <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                    <Badge variant={cfg.color} className="text-[10px] px-1.5 py-0">{cfg.label}</Badge>
                    {todo.recurring && <Badge variant="muted" className="text-[10px] px-1.5 py-0">{todo.recurring === "daily" ? "Quotidien" : "Hebdo"}</Badge>}
                    {dl && (
                      <span className={cn("text-[10px] font-semibold flex items-center gap-1", dl.text)}>
                        <CalendarIcon size={10} /> {dl.label}
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-0.5 flex-shrink-0">
                  <button
                    onClick={() => startEditTodo(todo)}
                    className="p-1.5 text-muted hover:text-accent-blue cursor-pointer transition-colors"
                    aria-label="Modifier"
                  >
                    <Edit3 size={14} />
                  </button>
                  <button onClick={() => deleteTodo(todo.id)} className="p-1.5 text-muted hover:text-accent-red cursor-pointer transition-colors">
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* POMODORO */}
      {tab === "pomodoro" && (
        <div className="space-y-4 animate-fade-in">
          {/* Presets */}
          <div className="flex gap-2">
            {POMODORO_PRESETS.map(p => (
              <button
                key={p.label}
                onClick={() => applyPreset(p)}
                className={cn(
                  "flex-1 py-2 rounded-xl text-sm font-medium transition-all cursor-pointer",
                  pomoDuration === p.work && pomoBreak === p.break ? "bg-gradient-accent text-white" : "bg-surface text-foreground-muted hover:text-foreground"
                )}
              >
                {p.label}
              </button>
            ))}
          </div>

          {/* Timer */}
          <Card gradient>
            <div className="flex flex-col items-center py-6">
              <Badge variant={pomoPhase === "work" ? "blue" : "green"} className="mb-6 text-sm px-3 py-1">
                {pomoPhase === "work" ? "Travail" : "Pause"}
              </Badge>

              <ProgressRing
                value={pomoPct}
                size={200}
                strokeWidth={10}
                color={pomoPhase === "work" ? "#3B82F6" : "#22C55E"}
              >
                <div className="text-center">
                  <span className="font-heading text-5xl font-bold text-foreground">
                    {String(minutes).padStart(2, "0")}:{String(seconds).padStart(2, "0")}
                  </span>
                  <p className="text-foreground-muted text-sm mt-1">
                    {pomoPhase === "work" ? `${pomoDuration} min de focus` : `${pomoBreak} min de pause`}
                  </p>
                </div>
              </ProgressRing>

              <div className="flex gap-4 mt-8">
                <button
                  onClick={resetTimer}
                  className="w-14 h-14 rounded-2xl bg-surface-2 flex items-center justify-center text-foreground-muted hover:text-foreground transition-colors cursor-pointer active:scale-95"
                  aria-label="Réinitialiser"
                >
                  <RotateCcw size={20} />
                </button>
                <button
                  onClick={() => setRunning(r => !r)}
                  className="w-20 h-14 rounded-2xl bg-gradient-accent flex items-center justify-center text-white transition-all cursor-pointer active:scale-95 shadow-glow-blue"
                  aria-label={running ? "Pause" : "Démarrer"}
                >
                  {running ? <Pause size={24} /> : <Play size={24} fill="white" />}
                </button>
              </div>
            </div>
          </Card>

          {/* Sessions today */}
          <Card>
            <CardHeader>
              <CardTitle>Aujourd'hui</CardTitle>
              <span className="text-xs text-foreground-muted">{sessionsToday} sessions</span>
            </CardHeader>
            <div className="flex gap-2 flex-wrap">
              {Array.from({ length: Math.max(sessionsToday, 4) }, (_, i) => (
                <div
                  key={i}
                  className={cn(
                    "w-8 h-8 rounded-lg flex items-center justify-center",
                    i < sessionsToday ? "bg-gradient-accent" : "bg-surface-2"
                  )}
                >
                  <Timer size={14} className={i < sessionsToday ? "text-white" : "text-muted"} />
                </div>
              ))}
            </div>
            <p className="text-xs text-foreground-muted mt-3">
              ≈ {Math.round(sessionsToday * pomoDuration)} min de focus total
            </p>
          </Card>

          {/* Custom duration */}
          <Card>
            <CardHeader><CardTitle>Durée personnalisée</CardTitle></CardHeader>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-foreground-muted block mb-1">Travail (min)</label>
                <div className="flex items-center gap-2">
                  <button onClick={() => { setPomoDuration(d => Math.max(1, d - 5)); resetTimer(); }} className="w-8 h-8 rounded-lg bg-surface-2 flex items-center justify-center cursor-pointer hover:bg-surface text-foreground-muted">
                    <Minus size={14} />
                  </button>
                  <span className="font-heading text-xl font-bold text-accent-blue w-8 text-center">{pomoDuration}</span>
                  <button onClick={() => { setPomoDuration(d => Math.min(120, d + 5)); resetTimer(); }} className="w-8 h-8 rounded-lg bg-surface-2 flex items-center justify-center cursor-pointer hover:bg-surface text-foreground-muted">
                    <Plus size={14} />
                  </button>
                </div>
              </div>
              <div>
                <label className="text-xs text-foreground-muted block mb-1">Pause (min)</label>
                <div className="flex items-center gap-2">
                  <button onClick={() => { setPomoBreak(d => Math.max(1, d - 1)); resetTimer(); }} className="w-8 h-8 rounded-lg bg-surface-2 flex items-center justify-center cursor-pointer hover:bg-surface text-foreground-muted">
                    <Minus size={14} />
                  </button>
                  <span className="font-heading text-xl font-bold text-accent-green w-8 text-center">{pomoBreak}</span>
                  <button onClick={() => { setPomoBreak(d => Math.min(60, d + 1)); resetTimer(); }} className="w-8 h-8 rounded-lg bg-surface-2 flex items-center justify-center cursor-pointer hover:bg-surface text-foreground-muted">
                    <Plus size={14} />
                  </button>
                </div>
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* Modal */}
      <Modal open={showModal} onClose={() => { setShowModal(false); setEditingId(null); }} title={editingId ? "Modifier la tâche" : "Nouvelle tâche"}>
        <form onSubmit={saveTodo} className="space-y-4">
          <Input label="Tâche" value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} required placeholder="Que dois-tu faire ?" />
          <div>
            <label className="text-sm font-medium text-foreground-muted block mb-2">Priorité</label>
            <div className="flex gap-2">
              {(["high", "medium", "low"] as Priority[]).map(p => (
                <button key={p} type="button" onClick={() => setForm(f => ({ ...f, priority: p }))}
                  className={cn("flex-1 py-2 rounded-xl text-sm font-medium transition-all cursor-pointer",
                    form.priority === p ? "bg-gradient-accent text-white" : "bg-surface-2 text-foreground-muted hover:text-foreground")}>
                  {PRIORITY_CONFIG[p].label}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="text-sm font-medium text-foreground-muted block mb-2">Récurrence</label>
            <select
              value={form.recurring}
              onChange={e => setForm(f => ({ ...f, recurring: e.target.value as any }))}
              className="w-full bg-surface border border-border rounded-xl px-3 py-2.5 text-foreground text-sm focus:outline-none focus:border-accent-blue min-h-[44px]"
            >
              <option value="">Aucune (une seule fois)</option>
              <option value="daily">Quotidienne</option>
              <option value="weekly">Hebdomadaire</option>
            </select>
          </div>
          {form.recurring === "weekly" && (
            <div>
              <label className="text-sm font-medium text-foreground-muted block mb-2">Jour de la semaine</label>
              <select value={form.recurring_day} onChange={e => setForm(f => ({ ...f, recurring_day: e.target.value }))} className="w-full bg-surface border border-border rounded-xl px-3 py-2.5 text-foreground text-sm focus:outline-none focus:border-accent-blue min-h-[44px]">
                {["Dimanche", "Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi"].map((d, i) => <option key={i} value={i}>{d}</option>)}
              </select>
            </div>
          )}
          <div>
            <label className="text-sm font-medium text-foreground-muted block mb-2">
              Deadline (optionnel)
            </label>
            <input
              type="date"
              value={form.deadline}
              onChange={e => setForm(f => ({ ...f, deadline: e.target.value }))}
              className="w-full bg-surface border border-border rounded-xl px-3 py-2.5 text-foreground text-sm focus:outline-none focus:border-accent-blue min-h-[44px]"
            />
            <p className="text-[10px] text-foreground-muted mt-1">
              Contour vert &gt; 7j · jaune 5-7j · orange 3-5j · rouge &lt; 3j
            </p>
          </div>
          <Button type="submit" loading={saving} className="w-full">{editingId ? "Enregistrer" : "Ajouter"}</Button>
        </form>
      </Modal>
    </div>
  );
}
