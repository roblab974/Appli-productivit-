"use client";

import { useEffect, useState, useCallback } from "react";
import { Briefcase, Plus, Target, TrendingUp, BarChart2, FileText, Trash2, Edit3, Check } from "lucide-react";
import PageHeader from "@/components/ui/PageHeader";
import { Card, CardHeader, CardTitle } from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import Modal from "@/components/ui/Modal";
import Input from "@/components/ui/Input";
import Badge from "@/components/ui/Badge";
import ProgressRing from "@/components/ui/ProgressRing";
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
  const [revenueForm, setRevenueForm] = useState({ year: new Date().getFullYear().toString(), month: (new Date().getMonth() + 1).toString(), amount: "", notes: "" });
  const [kpiForm, setKpiForm] = useState({ name: "", value: "", unit: "", target: "" });
  const [noteForm, setNoteForm] = useState({ content: "", tags: "" });

  const load = useCallback(async () => {
    const [g, r, k, n] = await Promise.all([
      fetch("/api/business/goals").then(r => r.json()),
      fetch("/api/business/revenue").then(r => r.json()),
      fetch("/api/business/kpis").then(r => r.json()),
      fetch("/api/business/notes").then(r => r.json()),
    ]);
    setGoals(g);
    setRevenue(r.reverse());
    setKpis(k);
    setNotes(n);
  }, []);

  useEffect(() => { load(); }, [load]);

  const saveGoal = async (e: React.FormEvent) => {
    e.preventDefault(); setSaving(true);
    await fetch("/api/business/goals", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...goalForm, progress: parseInt(goalForm.progress) }) });
    setSaving(false); setShowGoalModal(false); setGoalForm({ title: "", description: "", target_date: "", progress: "0" }); load();
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
    await fetch("/api/business/revenue", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...revenueForm, year: parseInt(revenueForm.year), month: parseInt(revenueForm.month), amount: parseFloat(revenueForm.amount) }) });
    setSaving(false); setShowRevenueModal(false); load();
  };

  const saveKpi = async (e: React.FormEvent) => {
    e.preventDefault(); setSaving(true);
    await fetch("/api/business/kpis", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...kpiForm, value: parseFloat(kpiForm.value), target: kpiForm.target ? parseFloat(kpiForm.target) : undefined }) });
    setSaving(false); setShowKpiModal(false); setKpiForm({ name: "", value: "", unit: "", target: "" }); load();
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

          {goals.map(g => (
            <Card key={g.id}>
              <div className="flex items-start gap-3">
                <button
                  onClick={() => toggleGoalStatus(g.id, g.status)}
                  className={cn("w-6 h-6 rounded-full border-2 flex items-center justify-center flex-shrink-0 mt-0.5 cursor-pointer transition-all",
                    g.status === "completed" ? "bg-accent-green border-accent-green" : "border-border hover:border-accent-green")}
                >
                  {g.status === "completed" && <Check size={12} className="text-white" />}
                </button>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className={cn("font-medium text-sm", g.status === "completed" && "line-through text-foreground-muted")}>{g.title}</p>
                    <Badge variant={g.status === "completed" ? "green" : g.status === "paused" ? "muted" : "blue"}>
                      {g.status === "completed" ? "Terminé" : g.status === "paused" ? "Pausé" : "Actif"}
                    </Badge>
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
                <button onClick={() => deleteGoal(g.id)} className="p-1.5 text-muted hover:text-accent-red cursor-pointer transition-colors"><Trash2 size={14} /></button>
              </div>
            </Card>
          ))}

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

          <div className="space-y-2">
            {revenue.slice().reverse().slice(0, 12).map(r => (
              <Card key={r.id}>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">{MONTHS[r.month - 1]} {r.year}</span>
                  <span className="font-heading text-lg font-bold text-accent-green">{r.amount.toLocaleString("fr-FR")} €</span>
                </div>
                {r.notes && <p className="text-xs text-foreground-muted mt-1">{r.notes}</p>}
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* KPIs */}
      {tab === "kpis" && (
        <div className="space-y-3 animate-fade-in">
          {kpis.length === 0 && <Card><p className="text-center text-foreground-muted text-sm py-4">Aucun KPI défini</p></Card>}
          {kpis.map(kpi => {
            const pct = kpi.target ? Math.round((kpi.value / kpi.target) * 100) : null;
            return (
              <Card key={kpi.id}>
                <div className="flex items-center gap-3">
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
          {notes.length === 0 && <Card><p className="text-center text-foreground-muted text-sm py-4">Aucune note</p></Card>}
          {notes.map(note => (
            <Card key={note.id}>
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
      <Modal open={showGoalModal} onClose={() => setShowGoalModal(false)} title="Nouvel objectif">
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

      <Modal open={showRevenueModal} onClose={() => setShowRevenueModal(false)} title="Log Revenus">
        <form onSubmit={saveRevenue} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-sm font-medium text-foreground-muted block mb-1">Mois</label>
              <select value={revenueForm.month} onChange={e => setRevenueForm(f => ({ ...f, month: e.target.value }))} className="w-full bg-surface border border-border rounded-xl px-3 py-2.5 text-foreground text-sm focus:outline-none focus:border-accent-blue min-h-[44px]">
                {MONTHS.map((m, i) => <option key={i} value={i + 1}>{m}</option>)}
              </select>
            </div>
            <Input label="Année" type="number" value={revenueForm.year} onChange={e => setRevenueForm(f => ({ ...f, year: e.target.value }))} />
          </div>
          <Input label="Montant (€)" type="number" step="0.01" value={revenueForm.amount} onChange={e => setRevenueForm(f => ({ ...f, amount: e.target.value }))} required placeholder="1500.00" />
          <Input label="Notes" value={revenueForm.notes} onChange={e => setRevenueForm(f => ({ ...f, notes: e.target.value }))} placeholder="Source des revenus..." />
          <Button type="submit" loading={saving} className="w-full">Enregistrer</Button>
        </form>
      </Modal>

      <Modal open={showKpiModal} onClose={() => setShowKpiModal(false)} title="Nouveau KPI">
        <form onSubmit={saveKpi} className="space-y-4">
          <Input label="Nom" value={kpiForm.name} onChange={e => setKpiForm(f => ({ ...f, name: e.target.value }))} required placeholder="Ex: Clients actifs" />
          <div className="grid grid-cols-2 gap-3">
            <Input label="Valeur" type="number" value={kpiForm.value} onChange={e => setKpiForm(f => ({ ...f, value: e.target.value }))} required />
            <Input label="Unité" value={kpiForm.unit} onChange={e => setKpiForm(f => ({ ...f, unit: e.target.value }))} placeholder="€, clients, %" />
          </div>
          <Input label="Objectif (optionnel)" type="number" value={kpiForm.target} onChange={e => setKpiForm(f => ({ ...f, target: e.target.value }))} />
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
