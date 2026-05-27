"use client";

import { useEffect, useState, useCallback } from "react";
import { Briefcase, Plus, Target, TrendingUp, BarChart2, FileText, Trash2, Edit3, Check, Link2 } from "lucide-react";
import PageHeader from "@/components/ui/PageHeader";
import { Card, CardHeader, CardTitle } from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import Modal from "@/components/ui/Modal";
import Input from "@/components/ui/Input";
import Badge from "@/components/ui/Badge";
import ProgressRing from "@/components/ui/ProgressRing";
import SelectionToolbar, { SelectCheckbox } from "@/components/ui/SelectionToolbar";
import { useSelection } from "@/lib/useSelection";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Line, LineChart } from "recharts";
import { format, parseISO } from "date-fns";
import { fr } from "date-fns/locale";
import { cn } from "@/lib/utils";

type Tab = "goals" | "revenue" | "kpis" | "notes";

const MONTHS = ["Jan", "Fév", "Mar", "Avr", "Mai", "Jun", "Jul", "Aoû", "Sep", "Oct", "Nov", "Déc"];

export default function BusinessClient() {
  const [tab, setTab] = useState<Tab>("goals");
  const [goals, setGoals] = useState<any[]>([]);
  const [revenue, setRevenue] = useState<any[]>([]);
  const [kpis, setKpis] = useState<any[]>([]);
  const [notes, setNotes] = useState<any[]>([]);
  const [saving, setSaving] = useState(false);

  const [showGoalModal, setShowGoalModal] = useState(false);
  const [showRevenueModal, setShowRevenueModal] = useState(false);
  const [showKpiModal, setShowKpiModal] = useState(false);
  const [showNoteModal, setShowNoteModal] = useState(false);
  const [editingNote, setEditingNote] = useState<any | null>(null);

  const [goalForm, setGoalForm] = useState({ title: "", description: "", target_date: "", progress: "0" });
  const [editingGoal, setEditingGoal] = useState<any>(null);
  const [revenueForm, setRevenueForm] = useState({ year: new Date().getFullYear().toString(), month: (new Date().getMonth() + 1).toString(), date: new Date().toISOString().slice(0, 10), amount: "", notes: "", account_id: "" });
  const [editingRevenue, setEditingRevenue] = useState<any>(null);
  const [kpiForm, setKpiForm] = useState({ name: "", value: "", unit: "", target: "", goal_id: "" });
  const [editingKpi, setEditingKpi] = useState<any>(null);
  const [noteForm, setNoteForm] = useState({ content: "", tags: "" });
  const [accounts, setAccounts] = useState<any[]>([]);
  const goalsSel = useSelection<number>();
  const revenueSel = useSelection<number>();
  const kpisSel = useSelection<number>();
  const notesSel = useSelection<number>();

  const bulkDel = async (path: string, ids: number[], label: string, onDone: () => void) => {
    if (ids.length === 0) return;
    if (!confirm(`Supprimer ${ids.length} ${label} ?`)) return;
    await fetch(path, { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ids }) });
    onDone();
    load();
  };

  const load = useCallback(async () => {
    const [g, r, k, n, acc] = await Promise.all([
      fetch("/api/business/goals").then(r => r.json()),
      fetch("/api/business/revenue").then(r => r.json()),
      fetch("/api/business/kpis").then(r => r.json()),
      fetch("/api/business/notes").then(r => r.json()),
      fetch("/api/finances/accounts").then(r => r.json()).catch(() => []),
    ]);
    setGoals(g);
    setRevenue(r.reverse());
    setKpis(k);
    setNotes(n);
    setAccounts(acc);
  }, []);

  useEffect(() => { load(); }, [load]);

  const saveGoal = async (e: React.FormEvent) => {
    e.preventDefault(); setSaving(true);
    const body = { ...goalForm, progress: parseInt(goalForm.progress) };
    if (editingGoal) {
      await fetch(`/api/business/goals/${editingGoal.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    } else {
      await fetch("/api/business/goals", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    }
    setSaving(false); setShowGoalModal(false); setEditingGoal(null); setGoalForm({ title: "", description: "", target_date: "", progress: "0" }); load();
  };

  const updateGoalProgress = async (id: number, progress: number) => {
    await fetch(`/api/business/goals/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ progress }) });
    setGoals(g => g.map(x => x.id === id ? { ...x, progress } : x));
  };

  const toggleGoalStatus = async (id: number, status: string) => {
    const newStatus = status === "completed" ? "active" : "completed";
    await fetch(`/api/business/goals/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status: newStatus }) });
    load();
  };

  const deleteGoal = async (id: number) => { await fetch(`/api/business/goals/${id}`, { method: "DELETE" }); load(); };

  const saveRevenue = async (e: React.FormEvent) => {
    e.preventDefault(); setSaving(true);
    // La date est la source de vérité, year/month dérivent de la date
    const parts = revenueForm.date.split("-");
    const body = {
      date: revenueForm.date,
      year: parseInt(parts[0]),
      month: parseInt(parts[1]),
      amount: parseFloat(revenueForm.amount),
      notes: revenueForm.notes,
      account_id: revenueForm.account_id ? parseInt(revenueForm.account_id) : null,
    };
    await fetch("/api/business/revenue", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    setSaving(false); setShowRevenueModal(false); setEditingRevenue(null);
    setRevenueForm({ year: new Date().getFullYear().toString(), month: (new Date().getMonth() + 1).toString(), date: new Date().toISOString().slice(0, 10), amount: "", notes: "", account_id: "" });
    load();
  };

  const deleteRevenue = async (id: number) => {
    if (!confirm("Supprimer ce revenu ? Le compte bancaire sera ajusté.")) return;
    await fetch(`/api/business/revenue/${id}`, { method: "DELETE" });
    load();
  };

  const saveKpi = async (e: React.FormEvent) => {
    e.preventDefault(); setSaving(true);
    const body: any = {
      name: kpiForm.name,
      value: parseFloat(kpiForm.value),
      unit: kpiForm.unit || null,
      target: kpiForm.target ? parseFloat(kpiForm.target) : null,
      goal_id: kpiForm.goal_id ? parseInt(kpiForm.goal_id) : null,
    };
    if (editingKpi) {
      await fetch(`/api/business/kpis/${editingKpi.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    } else {
      await fetch("/api/business/kpis", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    }
    setSaving(false); setShowKpiModal(false); setEditingKpi(null); setKpiForm({ name: "", value: "", unit: "", target: "", goal_id: "" }); load();
  };

  const deleteKpi = async (id: number) => {
    if (!confirm("Supprimer ce KPI ?")) return;
    await fetch(`/api/business/kpis/${id}`, { method: "DELETE" });
    load();
  };

  const saveNote = async (e: React.FormEvent) => {
    e.preventDefault(); setSaving(true);
    if (editingNote) {
      await fetch(`/api/business/notes/${editingNote.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(noteForm) });
    } else {
      await fetch("/api/business/notes", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(noteForm) });
    }
    setSaving(false); setShowNoteModal(false); setEditingNote(null); setNoteForm({ content: "", tags: "" }); load();
  };

  const deleteNote = async (id: number) => { await fetch(`/api/business/notes/${id}`, { method: "DELETE" }); load(); };

  const totalRevenue = revenue.reduce((s, r) => s + r.amount, 0);
  const revenueData = revenue.slice(-12).map(r => ({ name: MONTHS[r.month - 1], amount: r.amount }));
  const mainGoal = goals.find(g => g.status === "active");

  const TABS = [
    { key: "goals" as Tab, label: "Objectifs", icon: Target },
    { key: "revenue" as Tab, label: "Revenus", icon: TrendingUp },
    { key: "kpis" as Tab, label: "KPIs", icon: BarChart2 },
    { key: "notes" as Tab, label: "Notes", icon: FileText },
  ];

  return (
    <div className="px-4 pb-4 max-w-lg mx-auto">
      <PageHeader
        title="Business"
        action={
          <Button size="sm" onClick={() => {
            if (tab === "goals") setShowGoalModal(true);
            else if (tab === "revenue") setShowRevenueModal(true);
            else if (tab === "kpis") setShowKpiModal(true);
            else setShowNoteModal(true);
          }}>
            <Plus size={14} /> Ajouter
          </Button>
        }
      />

      {/* Tabs */}
      <div className="flex gap-1.5 mb-4 overflow-x-auto pb-1 scrollbar-none">
        {TABS.map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={cn(
              "flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium whitespace-nowrap transition-all cursor-pointer flex-shrink-0",
              tab === t.key ? "bg-gradient-accent text-white" : "bg-surface text-foreground-muted hover:text-foreground"
            )}
          >
            <t.icon size={14} /> {t.label}
          </button>
        ))}
      </div>

      {/* GOALS */}
      {tab === "goals" && (
        <div className="space-y-4 animate-fade-in">
          {mainGoal && (
            <Card gradient glow="blue">
              <div className="flex items-center gap-4">
                <ProgressRing value={mainGoal.progress} size={80} strokeWidth={7} color="#3B82F6">
                  <span className="font-heading text-lg font-bold text-accent-blue">{mainGoal.progress}%</span>
                </ProgressRing>
                <div className="flex-1">
                  <Badge variant="blue" className="mb-1">Objectif principal</Badge>
                  <p className="font-semibold text-foreground">{mainGoal.title}</p>
                  {mainGoal.description && <p className="text-xs text-foreground-muted mt-0.5">{mainGoal.description}</p>}
                  {mainGoal.target_date && <p className="text-xs text-foreground-muted mt-1">Deadline: {format(parseISO(mainGoal.target_date), "dd MMM yyyy", { locale: fr })}</p>}
                </div>
              </div>
              <div className="mt-3">
                <input
                  type="range" min="0" max="100" value={mainGoal.progress}
                  onChange={e => updateGoalProgress(mainGoal.id, parseInt(e.target.value))}
                  className="w-full"
                  aria-label="Progression"
                />
              </div>
            </Card>
          )}

          <SelectionToolbar
            selectionMode={goalsSel.mode}
            selectedCount={goalsSel.size}
            totalCount={goals.length}
            onToggleMode={goalsSel.toggleMode}
            onSelectAll={() => goalsSel.selectAll(goals.map(g => g.id))}
            onClear={goalsSel.clear}
            onDelete={() => bulkDel("/api/business/goals", goalsSel.ids, "objectif(s)", goalsSel.exitMode)}
            label="objectif(s)"
          />
          {goals.map(g => {
            const linkedKpisCount = kpis.filter(k => k.goal_id === g.id).length;
            return (
            <Card key={g.id}>
              <div className="flex items-start gap-3">
                {goalsSel.mode && <SelectCheckbox checked={goalsSel.isSelected(g.id)} onChange={() => goalsSel.toggle(g.id)} />}
                <button
                  onClick={() => toggleGoalStatus(g.id, g.status)}
                  className={cn("w-6 h-6 rounded-full border-2 flex items-center justify-center flex-shrink-0 mt-0.5 cursor-pointer transition-all",
                    g.status === "completed" ? "bg-accent-green border-accent-green" : "border-border hover:border-accent-green")}
                >
                  {g.status === "completed" && <Check size={12} className="text-white" />}
                </button>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className={cn("font-medium text-sm", g.status === "completed" && "line-through text-foreground-muted")}>{g.title}</p>
                    <Badge variant={g.status === "completed" ? "green" : g.status === "paused" ? "muted" : "blue"}>
                      {g.status === "completed" ? "Terminé" : g.status === "paused" ? "Pausé" : "Actif"}
                    </Badge>
                    {linkedKpisCount > 0 && (
                      <Badge variant="purple" className="flex items-center gap-1">
                        <Link2 size={10} /> {linkedKpisCount} KPI{linkedKpisCount > 1 ? "s" : ""}
                      </Badge>
                    )}
                  </div>
                  {g.description && <p className="text-xs text-foreground-muted mt-0.5">{g.description}</p>}
                  <div className="flex items-center gap-2 mt-2">
                    <div className="flex-1 h-1.5 bg-surface-2 rounded-full overflow-hidden">
                      <div className="h-full bg-gradient-accent rounded-full transition-all" style={{ width: `${g.progress}%` }} />
                    </div>
                    <span className="text-xs font-semibold text-accent-blue">{g.progress}%</span>
                  </div>
                  <input type="range" min="0" max="100" value={g.progress} onChange={e => updateGoalProgress(g.id, parseInt(e.target.value))} className="w-full mt-1" aria-label="Progression" />
                </div>
                <div className="flex flex-col gap-1">
                  <button
                    onClick={() => {
                      setEditingGoal(g);
                      setGoalForm({ title: g.title, description: g.description || "", target_date: g.target_date || "", progress: g.progress.toString() });
                      setShowGoalModal(true);
                    }}
                    className="p-1.5 text-muted hover:text-accent-blue cursor-pointer transition-colors"
                  >
                    <Edit3 size={14} />
                  </button>
                  <button onClick={() => deleteGoal(g.id)} className="p-1.5 text-muted hover:text-accent-red cursor-pointer transition-colors"><Trash2 size={14} /></button>
                </div>
              </div>
            </Card>
            );
          })}

          {goals.length === 0 && (
            <Card><p className="text-center text-foreground-muted text-sm py-4">Aucun objectif défini</p></Card>
          )}
        </div>
      )}

      {/* REVENUE */}
      {tab === "revenue" && (
        <div className="space-y-4 animate-fade-in">
          <div className="grid grid-cols-2 gap-3">
            <Card className="text-center py-3">
              <TrendingUp size={20} className="text-accent-green mx-auto mb-1" />
              <span className="font-heading text-xl font-bold text-accent-green">
                {totalRevenue.toLocaleString("fr-FR")} €
              </span>
              <p className="text-[10px] text-foreground-muted mt-0.5">Total</p>
            </Card>
            <Card className="text-center py-3">
              <BarChart2 size={20} className="text-accent-blue mx-auto mb-1" />
              <span className="font-heading text-xl font-bold text-accent-blue">
                {revenue.length > 0 ? Math.round(totalRevenue / revenue.length).toLocaleString("fr-FR") : 0} €
              </span>
              <p className="text-[10px] text-foreground-muted mt-0.5">Moy/mois</p>
            </Card>
          </div>

          {revenueData.length > 0 && (
            <Card>
              <CardHeader><CardTitle>Revenus mensuels</CardTitle></CardHeader>
              <ResponsiveContainer width="100%" height={160}>
                <BarChart data={revenueData} margin={{ top: 4, right: 4, left: -10, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(51,65,85,0.3)" />
                  <XAxis dataKey="name" tick={{ fill: "#64748B", fontSize: 11 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill: "#64748B", fontSize: 11 }} axisLine={false} tickLine={false} />
                  <Tooltip contentStyle={{ background: "#0F172A", border: "1px solid #334155", borderRadius: 12, fontSize: 12 }}
                    formatter={(v: any) => [`${v.toLocaleString("fr-FR")} €`, "Revenus"]} cursor={{ fill: "rgba(34,197,94,0.1)" }} />
                  <Bar dataKey="amount" fill="url(#greenGrad)" radius={[4, 4, 0, 0]} />
                  <defs>
                    <linearGradient id="greenGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#22C55E" />
                      <stop offset="100%" stopColor="#06B6D4" />
                    </linearGradient>
                  </defs>
                </BarChart>
              </ResponsiveContainer>
            </Card>
          )}

          <SelectionToolbar
            selectionMode={revenueSel.mode}
            selectedCount={revenueSel.size}
            totalCount={revenue.length}
            onToggleMode={revenueSel.toggleMode}
            onSelectAll={() => revenueSel.selectAll(revenue.map(r => r.id))}
            onClear={revenueSel.clear}
            onDelete={() => bulkDel("/api/business/revenue", revenueSel.ids, "revenu(s)", revenueSel.exitMode)}
            label="revenu(s)"
          />
          <div className="space-y-2">
            {revenue.slice().reverse().slice(0, 12).map(r => {
              const acc = accounts.find(a => a.id === r.account_id);
              return (
                <Card key={r.id}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      {revenueSel.mode && <SelectCheckbox checked={revenueSel.isSelected(r.id)} onChange={() => revenueSel.toggle(r.id)} />}
                      <div>
                        <span className="text-sm font-medium">
                          {r.date ? format(parseISO(r.date), "dd MMM yyyy", { locale: fr }) : `${MONTHS[r.month - 1]} ${r.year}`}
                        </span>
                        {acc && <span className="text-[10px] text-foreground-muted block">→ {acc.name}</span>}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="font-heading text-lg font-bold text-accent-green">{r.amount.toLocaleString("fr-FR")} €</span>
                      <button
                        onClick={() => {
                          setEditingRevenue(r);
                          setRevenueForm({
                            year: r.year.toString(),
                            month: r.month.toString(),
                            date: r.date || `${r.year}-${String(r.month).padStart(2, "0")}-01`,
                            amount: r.amount.toString(),
                            notes: r.notes || "",
                            account_id: r.account_id?.toString() || "",
                          });
                          setShowRevenueModal(true);
                        }}
                        className="p-1.5 text-muted hover:text-accent-blue cursor-pointer transition-colors"
                      >
                        <Edit3 size={13} />
                      </button>
                      <button onClick={() => deleteRevenue(r.id)} className="p-1.5 text-muted hover:text-accent-red cursor-pointer transition-colors">
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>
                  {r.notes && <p className="text-xs text-foreground-muted mt-1">{r.notes}</p>}
                </Card>
              );
            })}
          </div>
        </div>
      )}

      {/* KPIs */}
      {tab === "kpis" && (
        <div className="space-y-3 animate-fade-in">
          <SelectionToolbar
            selectionMode={kpisSel.mode}
            selectedCount={kpisSel.size}
            totalCount={kpis.length}
            onToggleMode={kpisSel.toggleMode}
            onSelectAll={() => kpisSel.selectAll(kpis.map(k => k.id))}
            onClear={kpisSel.clear}
            onDelete={() => bulkDel("/api/business/kpis", kpisSel.ids, "KPI(s)", kpisSel.exitMode)}
            label="KPI(s)"
          />
          {kpis.length === 0 && <Card><p className="text-center text-foreground-muted text-sm py-4">Aucun KPI défini</p></Card>}
          {kpis.map(kpi => {
            const pct = kpi.target ? Math.round((kpi.value / kpi.target) * 100) : null;
            const linkedGoal = goals.find(g => g.id === kpi.goal_id);
            return (
              <Card key={kpi.id}>
                <div className="flex items-center gap-3">
                  {kpisSel.mode && <SelectCheckbox checked={kpisSel.isSelected(kpi.id)} onChange={() => kpisSel.toggle(kpi.id)} />}
                  {pct !== null ? (
                    <ProgressRing value={kpi.value} max={kpi.target} size={56} strokeWidth={5} color="#3B82F6">
                      <span className="text-[10px] font-bold text-accent-blue">{pct}%</span>
                    </ProgressRing>
                  ) : (
                    <div className="w-14 h-14 rounded-xl bg-accent-blue/10 flex items-center justify-center">
                      <BarChart2 size={20} className="text-accent-blue" />
                    </div>
                  )}
                  <div className="flex-1">
                    <p className="text-sm font-medium text-foreground">{kpi.name}</p>
                    <div className="flex items-baseline gap-1 mt-0.5">
                      <span className="font-heading text-2xl font-bold text-accent-blue">{kpi.value.toLocaleString("fr-FR")}</span>
                      {kpi.unit && <span className="text-foreground-muted text-sm">{kpi.unit}</span>}
                      {kpi.target && <span className="text-foreground-muted text-xs">/ {kpi.target.toLocaleString("fr-FR")}</span>}
                    </div>
                    {linkedGoal && (
                      <div className="flex items-center gap-1 mt-1">
                        <Link2 size={10} className="text-accent-purple" />
                        <span className="text-[10px] text-accent-purple truncate">→ {linkedGoal.title}</span>
                      </div>
                    )}
                  </div>
                  <div className="flex flex-col gap-1">
                    <button
                      onClick={() => {
                        setEditingKpi(kpi);
                        setKpiForm({ name: kpi.name, value: kpi.value.toString(), unit: kpi.unit || "", target: kpi.target?.toString() || "", goal_id: kpi.goal_id?.toString() || "" });
                        setShowKpiModal(true);
                      }}
                      className="p-1.5 text-muted hover:text-accent-blue cursor-pointer transition-colors"
                    >
                      <Edit3 size={13} />
                    </button>
                    <button onClick={() => deleteKpi(kpi.id)} className="p-1.5 text-muted hover:text-accent-red cursor-pointer transition-colors">
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* NOTES */}
      {tab === "notes" && (
        <div className="space-y-3 animate-fade-in">
          <SelectionToolbar
            selectionMode={notesSel.mode}
            selectedCount={notesSel.size}
            totalCount={notes.length}
            onToggleMode={notesSel.toggleMode}
            onSelectAll={() => notesSel.selectAll(notes.map(n => n.id))}
            onClear={notesSel.clear}
            onDelete={() => bulkDel("/api/business/notes", notesSel.ids, "note(s)", notesSel.exitMode)}
            label="note(s)"
          />
          {notes.length === 0 && <Card><p className="text-center text-foreground-muted text-sm py-4">Aucune note</p></Card>}
          {notes.map(note => (
            <Card key={note.id}>
              {notesSel.mode && (
                <div className="mb-2"><SelectCheckbox checked={notesSel.isSelected(note.id)} onChange={() => notesSel.toggle(note.id)} /></div>
              )}
              <p className="text-sm text-foreground leading-relaxed whitespace-pre-wrap">{note.content}</p>
              <div className="flex items-center justify-between mt-3">
                <div className="flex gap-1 flex-wrap">
                  {note.tags && note.tags.split(",").map((tag: string) => (
                    <Badge key={tag} variant="purple" className="text-[10px]">{tag.trim()}</Badge>
                  ))}
                </div>
                <div className="flex gap-1">
                  <button
                    onClick={() => { setEditingNote(note); setNoteForm({ content: note.content, tags: note.tags || "" }); setShowNoteModal(true); }}
                    className="p-1.5 text-muted hover:text-accent-blue cursor-pointer transition-colors"
                  >
                    <Edit3 size={14} />
                  </button>
                  <button onClick={() => deleteNote(note.id)} className="p-1.5 text-muted hover:text-accent-red cursor-pointer transition-colors">
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
              <p className="text-[10px] text-muted mt-1">{format(parseISO(note.updated_at), "dd MMM HH:mm", { locale: fr })}</p>
            </Card>
          ))}
        </div>
      )}

      {/* MODALS */}
      <Modal open={showGoalModal} onClose={() => { setShowGoalModal(false); setEditingGoal(null); }} title={editingGoal ? "Modifier l'objectif" : "Nouvel objectif"}>
        <form onSubmit={saveGoal} className="space-y-4">
          <Input label="Titre" value={goalForm.title} onChange={e => setGoalForm(f => ({ ...f, title: e.target.value }))} required placeholder="Ex: Atteindre 10k€/mois" />
          <Input label="Description" value={goalForm.description} onChange={e => setGoalForm(f => ({ ...f, description: e.target.value }))} placeholder="Détails..." />
          <Input label="Deadline" type="date" value={goalForm.target_date} onChange={e => setGoalForm(f => ({ ...f, target_date: e.target.value }))} />
          <div>
            <label className="text-sm font-medium text-foreground-muted block mb-1">Progression ({goalForm.progress}%)</label>
            <input type="range" min="0" max="100" value={goalForm.progress} onChange={e => setGoalForm(f => ({ ...f, progress: e.target.value }))} className="w-full" />
          </div>
          <Button type="submit" loading={saving} className="w-full">Enregistrer</Button>
        </form>
      </Modal>

      <Modal open={showRevenueModal} onClose={() => { setShowRevenueModal(false); setEditingRevenue(null); }} title={editingRevenue ? "Modifier le revenu" : "Log Revenus"}>
        <form onSubmit={saveRevenue} className="space-y-4">
          <Input
            label="Date du revenu"
            type="date"
            value={revenueForm.date}
            onChange={e => setRevenueForm(f => ({ ...f, date: e.target.value }))}
            required
          />
          <p className="text-[11px] text-foreground-muted -mt-3">
            Un seul revenu par mois est conservé (la nouvelle entrée remplace celle du même mois).
          </p>
          <Input label="Montant (€)" type="number" step="0.01" value={revenueForm.amount} onChange={e => setRevenueForm(f => ({ ...f, amount: e.target.value }))} required placeholder="1500.00" />
          <div>
            <label className="text-sm font-medium text-foreground-muted block mb-1">Compte bancaire crédité</label>
            <select value={revenueForm.account_id} onChange={e => setRevenueForm(f => ({ ...f, account_id: e.target.value }))} className="w-full bg-surface border border-border rounded-xl px-3 py-2.5 text-foreground text-sm min-h-[44px] focus:outline-none focus:border-accent-blue">
              <option value="">— Aucun (n'affecte pas le patrimoine) —</option>
              {accounts.map(a => <option key={a.id} value={a.id}>{a.name} ({a.balance.toLocaleString("fr-FR")} {a.currency})</option>)}
            </select>
            {accounts.length === 0 && <p className="text-xs text-accent-amber mt-1">Ajoute un compte dans Finances → Patrimoine pour lier ce revenu.</p>}
          </div>
          <Input label="Notes" value={revenueForm.notes} onChange={e => setRevenueForm(f => ({ ...f, notes: e.target.value }))} placeholder="Source des revenus..." />
          <Button type="submit" loading={saving} className="w-full">Enregistrer</Button>
        </form>
      </Modal>

      <Modal open={showKpiModal} onClose={() => { setShowKpiModal(false); setEditingKpi(null); }} title={editingKpi ? "Modifier le KPI" : "Nouveau KPI"}>
        <form onSubmit={saveKpi} className="space-y-4">
          <Input label="Nom" value={kpiForm.name} onChange={e => setKpiForm(f => ({ ...f, name: e.target.value }))} required placeholder="Ex: Clients actifs" />
          <div className="grid grid-cols-2 gap-3">
            <Input label="Valeur" type="number" value={kpiForm.value} onChange={e => setKpiForm(f => ({ ...f, value: e.target.value }))} required />
            <Input label="Unité" value={kpiForm.unit} onChange={e => setKpiForm(f => ({ ...f, unit: e.target.value }))} placeholder="€, clients, %" />
          </div>
          <Input label="Cible (target)" type="number" value={kpiForm.target} onChange={e => setKpiForm(f => ({ ...f, target: e.target.value }))} placeholder="Optionnel" />
          <div>
            <label className="text-sm font-medium text-foreground-muted block mb-1">Lié à un objectif (optionnel)</label>
            <select
              value={kpiForm.goal_id}
              onChange={e => setKpiForm(f => ({ ...f, goal_id: e.target.value }))}
              className="w-full bg-surface border border-border rounded-xl px-3 py-2.5 text-foreground text-sm min-h-[44px] focus:outline-none focus:border-accent-blue"
            >
              <option value="">— Aucun —</option>
              {goals.filter(g => g.status !== "completed").map(g => (
                <option key={g.id} value={g.id}>{g.title}</option>
              ))}
            </select>
            {kpiForm.goal_id && (
              <p className="text-[11px] text-accent-purple mt-1.5 flex items-center gap-1">
                <Link2 size={10} /> La progression de cet objectif sera mise à jour automatiquement en fonction de la valeur du KPI.
              </p>
            )}
          </div>
          <Button type="submit" loading={saving} className="w-full">Enregistrer</Button>
        </form>
      </Modal>

      <Modal open={showNoteModal} onClose={() => { setShowNoteModal(false); setEditingNote(null); setNoteForm({ content: "", tags: "" }); }} title={editingNote ? "Modifier la note" : "Nouvelle note"}>
        <form onSubmit={saveNote} className="space-y-4">
          <div>
            <label className="text-sm font-medium text-foreground-muted block mb-1">Contenu</label>
            <textarea
              value={noteForm.content}
              onChange={e => setNoteForm(f => ({ ...f, content: e.target.value }))}
              rows={5}
              required
              placeholder="Idée, observation, plan d'action..."
              className="w-full bg-surface border border-border rounded-xl px-3 py-2.5 text-foreground text-sm placeholder:text-muted focus:outline-none focus:border-accent-blue resize-none"
            />
          </div>
          <Input label="Tags (séparés par virgule)" value={noteForm.tags} onChange={e => setNoteForm(f => ({ ...f, tags: e.target.value }))} placeholder="idée, produit, marketing" />
          <Button type="submit" loading={saving} className="w-full">Enregistrer</Button>
        </form>
      </Modal>
    </div>
  );
}
