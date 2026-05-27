"use client";

import { useEffect, useState, useCallback } from "react";
import { Moon, Droplets, Scale, Zap, Plus, Star, TrendingDown, Edit3, Trash2, Settings as SettingsIcon } from "lucide-react";
import PageHeader from "@/components/ui/PageHeader";
import { Card, CardHeader, CardTitle } from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import Modal from "@/components/ui/Modal";
import Input from "@/components/ui/Input";
import StarRating from "@/components/ui/StarRating";
import ProgressRing from "@/components/ui/ProgressRing";
import SelectionToolbar, { SelectCheckbox } from "@/components/ui/SelectionToolbar";
import { useSelection } from "@/lib/useSelection";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, ReferenceLine } from "recharts";
import { format, parseISO } from "date-fns";
import { fr } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { todayStr } from "@/lib/utils";

type Tab = "sleep" | "weight" | "water";

export default function HealthClient() {
  const [tab, setTab] = useState<Tab>("sleep");
  const [sleepLogs, setSleepLogs] = useState<any[]>([]);
  const [weightLogs, setWeightLogs] = useState<any[]>([]);
  const [waterToday, setWaterToday] = useState<any>({ volume_ml: 0, goal_ml: 2500, unit_size_ml: 250, unit_name: "verre" });
  const [waterSettings, setWaterSettings] = useState<any>({ goal_ml: 2500, unit_size_ml: 250, unit_name: "verre" });
  const [showWaterSettings, setShowWaterSettings] = useState(false);
  const [showWaterAdd, setShowWaterAdd] = useState(false);
  const [weightGoal, setWeightGoal] = useState(80);
  const [showWeightGoalModal, setShowWeightGoalModal] = useState(false);
  const sleepSel = useSelection<number>();
  const weightSel = useSelection<number>();
  const [showSleepModal, setShowSleepModal] = useState(false);
  const [showWeightModal, setShowWeightModal] = useState(false);
  const [saving, setSaving] = useState(false);

  const [sleepForm, setSleepForm] = useState({ bedtime: "23:00", wake_time: "07:00", duration_h: "8", quality: 3, energy_score: 7 });
  const [weightForm, setWeightForm] = useState({ weight_kg: "", waist_cm: "" });
  const [editingSleepId, setEditingSleepId] = useState<number | null>(null);
  const [editingWeightId, setEditingWeightId] = useState<number | null>(null);

  const load = useCallback(async () => {
    const [sl, wl, wa, ws, wgs] = await Promise.all([
      fetch("/api/sleep?limit=30").then(r => r.json()),
      fetch("/api/health/weight?limit=90").then(r => r.json()),
      fetch(`/api/health/water?date=${todayStr()}`).then(r => r.json()),
      fetch("/api/health/water/settings").then(r => r.json()),
      fetch("/api/health/weight/settings").then(r => r.json()),
    ]);
    setSleepLogs(sl);
    setWeightLogs(wl.reverse());
    setWaterToday(wa);
    setWaterSettings(ws);
    setWeightGoal(wgs?.goal_kg || 80);
  }, []);

  const bulkDeleteSleep = async () => {
    if (sleepSel.ids.length === 0) return;
    if (!confirm(`Supprimer ${sleepSel.ids.length} nuit(s) ?`)) return;
    await fetch("/api/sleep", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ids: sleepSel.ids }) });
    sleepSel.exitMode();
    load();
  };

  const bulkDeleteWeight = async () => {
    if (weightSel.ids.length === 0) return;
    if (!confirm(`Supprimer ${weightSel.ids.length} entrée(s) de poids ?`)) return;
    await fetch("/api/health/weight", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ids: weightSel.ids }) });
    weightSel.exitMode();
    load();
  };

  useEffect(() => { load(); }, [load]);

  const saveSleep = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    const body = { ...sleepForm, duration_h: parseFloat(sleepForm.duration_h) };
    if (editingSleepId) {
      await fetch(`/api/sleep/${editingSleepId}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    } else {
      await fetch("/api/sleep", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    }
    setSaving(false);
    setShowSleepModal(false);
    setEditingSleepId(null);
    load();
  };

  const deleteSleep = async (id: number) => {
    if (!confirm("Supprimer cette nuit ?")) return;
    await fetch(`/api/sleep/${id}`, { method: "DELETE" });
    load();
  };

  const saveWeight = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    const body = { weight_kg: parseFloat(weightForm.weight_kg), waist_cm: weightForm.waist_cm ? parseFloat(weightForm.waist_cm) : undefined };
    if (editingWeightId) {
      await fetch(`/api/health/weight/${editingWeightId}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    } else {
      await fetch("/api/health/weight", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    }
    setSaving(false);
    setShowWeightModal(false);
    setEditingWeightId(null);
    load();
  };

  const deleteWeight = async (id: number) => {
    if (!confirm("Supprimer ce log de poids ?")) return;
    await fetch(`/api/health/weight/${id}`, { method: "DELETE" });
    load();
  };

  const addWater = async (delta: number) => {
    const unitSize = waterToday.unit_size_ml || waterSettings.unit_size_ml || 250;
    const newVolume = Math.max(0, (waterToday.volume_ml || 0) + delta * unitSize);
    const resp = await fetch("/api/health/water", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        volume_ml: newVolume,
        goal_ml: waterToday.goal_ml || waterSettings.goal_ml,
        unit_size_ml: unitSize,
      }),
    });
    const data = await resp.json();
    setWaterToday(data);
  };

  const setWaterToVolume = async (volume_ml: number) => {
    const resp = await fetch("/api/health/water", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        volume_ml,
        goal_ml: waterToday.goal_ml || waterSettings.goal_ml,
        unit_size_ml: waterToday.unit_size_ml || waterSettings.unit_size_ml,
      }),
    });
    const data = await resp.json();
    setWaterToday(data);
  };

  const addWaterMl = async (ml: number) => {
    const newVolume = Math.max(0, (waterToday.volume_ml || 0) + ml);
    await setWaterToVolume(newVolume);
    setShowWaterAdd(false);
  };

  const avgSleep = sleepLogs.length > 0 ? (sleepLogs.reduce((s, l) => s + l.duration_h, 0) / sleepLogs.length).toFixed(1) : "—";
  const avgQuality = sleepLogs.length > 0 ? (sleepLogs.reduce((s, l) => s + l.quality, 0) / sleepLogs.length).toFixed(1) : "—";
  const latestWeight = weightLogs.length > 0 ? weightLogs[weightLogs.length - 1] : null;
  const weightDiff = weightLogs.length > 1
    ? (weightLogs[weightLogs.length - 1].weight_kg - weightLogs[0].weight_kg).toFixed(1)
    : null;

  const TABS = [
    { key: "sleep" as Tab, label: "Sommeil", icon: Moon },
    { key: "weight" as Tab, label: "Poids", icon: Scale },
    { key: "water" as Tab, label: "Eau", icon: Droplets },
  ];

  return (
    <div className="px-4 pb-4 max-w-lg mx-auto">
      <PageHeader
        title="Santé"
        action={
          <div className="flex gap-2">
            {tab === "sleep" && <Button size="sm" onClick={() => { setEditingSleepId(null); setSleepForm({ bedtime: "23:00", wake_time: "07:00", duration_h: "8", quality: 3, energy_score: 7 }); setShowSleepModal(true); }}><Plus size={14} /> Log</Button>}
            {tab === "weight" && <Button size="sm" onClick={() => { setEditingWeightId(null); setWeightForm({ weight_kg: "", waist_cm: "" }); setShowWeightModal(true); }}><Plus size={14} /> Log</Button>}
          </div>
        }
      />

      {/* Tabs */}
      <div className="flex gap-2 mb-4 bg-surface rounded-2xl p-1">
        {TABS.map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={cn(
              "flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-sm font-medium transition-all cursor-pointer",
              tab === t.key ? "bg-gradient-accent text-white" : "text-foreground-muted hover:text-foreground"
            )}
          >
            <t.icon size={14} />
            {t.label}
          </button>
        ))}
      </div>

      {/* SLEEP */}
      {tab === "sleep" && (
        <div className="space-y-4 animate-fade-in">
          <div className="grid grid-cols-2 gap-3">
            <Card className="text-center py-3">
              <Moon size={20} className="text-accent-purple mx-auto mb-1" />
              <span className="font-heading text-2xl font-bold text-accent-purple">{avgSleep}h</span>
              <p className="text-[10px] text-foreground-muted mt-0.5">Moyenne</p>
            </Card>
            <Card className="text-center py-3">
              <Star size={20} className="text-accent-amber fill-accent-amber mx-auto mb-1" />
              <span className="font-heading text-2xl font-bold text-accent-amber">{avgQuality}</span>
              <p className="text-[10px] text-foreground-muted mt-0.5">Qualité moy.</p>
            </Card>
          </div>

          {sleepLogs.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Durée du sommeil</CardTitle>
              </CardHeader>
              <ResponsiveContainer width="100%" height={150}>
                <LineChart data={[...sleepLogs].reverse().slice(-14)} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(51,65,85,0.3)" />
                  <XAxis dataKey="date" tickFormatter={d => format(parseISO(d), "dd/MM")} tick={{ fill: "#64748B", fontSize: 10 }} axisLine={false} tickLine={false} />
                  <YAxis domain={[4, 10]} tick={{ fill: "#64748B", fontSize: 10 }} axisLine={false} tickLine={false} />
                  <Tooltip contentStyle={{ background: "#0F172A", border: "1px solid #334155", borderRadius: 12, fontSize: 12 }}
                    formatter={(v: any) => [`${v}h`, "Sommeil"]}
                    labelFormatter={l => format(parseISO(l), "dd MMM", { locale: fr })} />
                  <ReferenceLine y={7} stroke="#22C55E" strokeDasharray="4 2" strokeOpacity={0.5} />
                  <Line type="monotone" dataKey="duration_h" stroke="#8B5CF6" strokeWidth={2} dot={false} activeDot={{ r: 4, fill: "#8B5CF6" }} />
                </LineChart>
              </ResponsiveContainer>
              <p className="text-[10px] text-accent-green text-right mt-1">— objectif 7h</p>
            </Card>
          )}

          <SelectionToolbar
            selectionMode={sleepSel.mode}
            selectedCount={sleepSel.size}
            totalCount={sleepLogs.length}
            onToggleMode={sleepSel.toggleMode}
            onSelectAll={() => sleepSel.selectAll(sleepLogs.map(l => l.id))}
            onClear={sleepSel.clear}
            onDelete={bulkDeleteSleep}
            label="nuit(s)"
          />

          <div className="space-y-2">
            {sleepLogs.slice(0, 14).map(log => (
              <Card key={log.id}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    {sleepSel.mode && <SelectCheckbox checked={sleepSel.isSelected(log.id)} onChange={() => sleepSel.toggle(log.id)} />}
                    <div>
                      <p className="text-sm font-medium">{format(parseISO(log.date), "EEE dd MMM", { locale: fr })}</p>
                      <div className="flex items-center gap-3 mt-1">
                        <span className="text-xs text-foreground-muted">{log.bedtime} → {log.wake_time}</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-start gap-2">
                    <div className="text-right">
                      <span className={cn("font-heading text-xl font-bold", log.duration_h >= 7 ? "text-accent-green" : "text-accent-amber")}>
                        {log.duration_h}h
                      </span>
                      <div className="flex justify-end mt-0.5">
                        <StarRating value={log.quality} size={12} />
                      </div>
                    </div>
                    <div className="flex flex-col">
                      <button
                        onClick={() => {
                          setEditingSleepId(log.id);
                          setSleepForm({ bedtime: log.bedtime || "23:00", wake_time: log.wake_time || "07:00", duration_h: log.duration_h.toString(), quality: log.quality, energy_score: log.energy_score || 7 });
                          setShowSleepModal(true);
                        }}
                        className="p-1 text-muted hover:text-accent-blue cursor-pointer transition-colors"
                      >
                        <Edit3 size={12} />
                      </button>
                      <button onClick={() => deleteSleep(log.id)} className="p-1 text-muted hover:text-accent-red cursor-pointer transition-colors">
                        <Trash2 size={12} />
                      </button>
                    </div>
                  </div>
                </div>
                {log.energy_score && (
                  <div className="flex items-center gap-2 mt-2 pt-2 border-t border-border/50">
                    <Zap size={12} className="text-accent-amber" />
                    <div className="flex-1 h-1.5 bg-surface-2 rounded-full overflow-hidden">
                      <div className="h-full bg-accent-amber rounded-full" style={{ width: `${log.energy_score * 10}%` }} />
                    </div>
                    <span className="text-xs text-foreground-muted">{log.energy_score}/10</span>
                  </div>
                )}
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* WEIGHT */}
      {tab === "weight" && (
        <div className="space-y-4 animate-fade-in">
          <div className="grid grid-cols-2 gap-3">
            <Card className="text-center py-3">
              <Scale size={20} className="text-accent-purple mx-auto mb-1" />
              <span className="font-heading text-2xl font-bold text-accent-purple">
                {latestWeight?.weight_kg ?? "—"}
              </span>
              <p className="text-[10px] text-foreground-muted mt-0.5">Actuel (kg)</p>
            </Card>
            <Card className="text-center py-3">
              <TrendingDown size={20} className="text-accent-green mx-auto mb-1" />
              <span className={cn("font-heading text-2xl font-bold", weightDiff && parseFloat(weightDiff) < 0 ? "text-accent-green" : "text-accent-amber")}>
                {weightDiff ? (parseFloat(weightDiff) > 0 ? `+${weightDiff}` : weightDiff) : "—"}
              </span>
              <p className="text-[10px] text-foreground-muted mt-0.5">Évolution (kg)</p>
            </Card>
          </div>

          {latestWeight && (
            <Card>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <CardTitle>Objectif</CardTitle>
                  <button
                    onClick={() => setShowWeightGoalModal(true)}
                    className="text-muted hover:text-accent-blue cursor-pointer transition-colors"
                    aria-label="Modifier l'objectif de poids"
                    title="Modifier l'objectif"
                  >
                    <SettingsIcon size={12} />
                  </button>
                </div>
                <span className="text-xs text-foreground-muted">{weightGoal} kg cible</span>
              </CardHeader>
              {(() => {
                const diff = latestWeight.weight_kg - weightGoal;
                const reached = diff <= 0;
                // Calcul de progression :
                // - Si starting_kg défini : (start - current) / (start - goal)
                // - Sinon : on suppose qu'il reste max 20 kg à perdre/gagner
                const range = 20; // amplitude de référence
                const pctVal = reached ? 100 : Math.max(0, Math.min(100, ((range - Math.abs(diff)) / range) * 100));
                return (
                  <div className="flex items-center gap-4">
                    <ProgressRing
                      value={pctVal}
                      max={100}
                      size={72}
                      color="#22C55E"
                    >
                      <span className="text-xs font-bold text-accent-green">{Math.round(pctVal)}%</span>
                    </ProgressRing>
                    <div>
                      <p className="text-sm text-foreground">
                        {reached
                          ? "Objectif atteint !"
                          : diff > 0
                            ? `${diff.toFixed(1)} kg à perdre`
                            : `${Math.abs(diff).toFixed(1)} kg à prendre`}
                      </p>
                      <p className="text-xs text-foreground-muted mt-0.5">Actuel : {latestWeight.weight_kg} kg → Cible : {weightGoal} kg</p>
                    </div>
                  </div>
                );
              })()}
            </Card>
          )}

          {weightLogs.length > 1 && (
            <Card>
              <CardHeader><CardTitle>Évolution du poids</CardTitle></CardHeader>
              <ResponsiveContainer width="100%" height={160}>
                <LineChart data={weightLogs.slice(-30)} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(51,65,85,0.3)" />
                  <XAxis dataKey="date" tickFormatter={d => format(parseISO(d), "dd/MM")} tick={{ fill: "#64748B", fontSize: 10 }} axisLine={false} tickLine={false} interval="preserveStartEnd" />
                  <YAxis domain={["auto", "auto"]} tick={{ fill: "#64748B", fontSize: 10 }} axisLine={false} tickLine={false} />
                  <Tooltip contentStyle={{ background: "#0F172A", border: "1px solid #334155", borderRadius: 12, fontSize: 12 }}
                    formatter={(v: any) => [`${v} kg`, "Poids"]} />
                  <ReferenceLine y={weightGoal} stroke="#22C55E" strokeDasharray="4 2" strokeOpacity={0.6} label={{ value: `${weightGoal} kg`, position: "right", fill: "#22C55E", fontSize: 10 }} />
                  <Line type="monotone" dataKey="weight_kg" stroke="#8B5CF6" strokeWidth={2.5} dot={false} activeDot={{ r: 4 }} />
                </LineChart>
              </ResponsiveContainer>
            </Card>
          )}

          {weightLogs.length > 0 && latestWeight?.waist_cm && (
            <Card>
              <CardHeader><CardTitle>Tour de taille</CardTitle></CardHeader>
              <ResponsiveContainer width="100%" height={130}>
                <LineChart data={weightLogs.filter(w => w.waist_cm).slice(-20)} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(51,65,85,0.3)" />
                  <XAxis dataKey="date" tickFormatter={d => format(parseISO(d), "dd/MM")} tick={{ fill: "#64748B", fontSize: 10 }} axisLine={false} tickLine={false} />
                  <YAxis domain={["auto", "auto"]} tick={{ fill: "#64748B", fontSize: 10 }} axisLine={false} tickLine={false} />
                  <Tooltip contentStyle={{ background: "#0F172A", border: "1px solid #334155", borderRadius: 12, fontSize: 12 }}
                    formatter={(v: any) => [`${v} cm`, "Tour de taille"]} />
                  <Line type="monotone" dataKey="waist_cm" stroke="#06B6D4" strokeWidth={2} dot={false} activeDot={{ r: 4 }} />
                </LineChart>
              </ResponsiveContainer>
            </Card>
          )}

          {/* Liste des dernières entrées poids */}
          {weightLogs.length > 0 && (
            <Card>
              <CardHeader><CardTitle>Historique récent</CardTitle></CardHeader>
              <SelectionToolbar
                selectionMode={weightSel.mode}
                selectedCount={weightSel.size}
                totalCount={weightLogs.length}
                onToggleMode={weightSel.toggleMode}
                onSelectAll={() => weightSel.selectAll(weightLogs.map(l => l.id))}
                onClear={weightSel.clear}
                onDelete={bulkDeleteWeight}
                label="entrée(s)"
              />
              <div className="space-y-1">
                {[...weightLogs].reverse().slice(0, 20).map(log => (
                  <div key={log.id} className="flex items-center justify-between py-1.5 border-b border-border/30 last:border-0">
                    <div className="flex items-center gap-3">
                      {weightSel.mode && <SelectCheckbox checked={weightSel.isSelected(log.id)} onChange={() => weightSel.toggle(log.id)} />}
                      <div>
                        <p className="text-sm font-medium">{format(parseISO(log.date), "EEE dd MMM yyyy", { locale: fr })}</p>
                        {log.waist_cm && <p className="text-[10px] text-foreground-muted">Taille : {log.waist_cm} cm</p>}
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      <span className="font-heading text-base font-bold text-accent-purple mr-1">{log.weight_kg} kg</span>
                      <button
                        onClick={() => {
                          setEditingWeightId(log.id);
                          setWeightForm({ weight_kg: log.weight_kg.toString(), waist_cm: log.waist_cm?.toString() || "" });
                          setShowWeightModal(true);
                        }}
                        className="p-1 text-muted hover:text-accent-blue cursor-pointer transition-colors"
                      >
                        <Edit3 size={12} />
                      </button>
                      <button onClick={() => deleteWeight(log.id)} className="p-1 text-muted hover:text-accent-red cursor-pointer transition-colors">
                        <Trash2 size={12} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          )}
        </div>
      )}

      {/* WATER */}
      {tab === "water" && (
        <div className="space-y-4 animate-fade-in">
          {(() => {
            const volume = waterToday.volume_ml || 0;
            const goal = waterToday.goal_ml || waterSettings.goal_ml || 2500;
            const unitSize = waterToday.unit_size_ml || waterSettings.unit_size_ml || 250;
            const unitName = waterToday.unit_name || waterSettings.unit_name || "verre";
            const units = Math.round(volume / unitSize);
            const goalUnits = Math.round(goal / unitSize);
            const pct = goal > 0 ? Math.min((volume / goal) * 100, 100) : 0;
            const liters = (volume / 1000).toFixed(2);
            const goalLiters = (goal / 1000).toFixed(1);
            return (
              <>
                <Card>
                  <div className="flex flex-col items-center py-4">
                    <ProgressRing
                      value={pct}
                      size={140}
                      strokeWidth={11}
                      color="#06B6D4"
                    >
                      <div className="text-center">
                        <Droplets size={20} className="text-accent-cyan mx-auto" />
                        <span className="font-heading text-2xl font-bold text-accent-cyan">{liters}</span>
                        <span className="text-foreground-muted text-xs block">/ {goalLiters} L</span>
                      </div>
                    </ProgressRing>
                    <p className="text-sm text-foreground-muted mt-3">
                      {units} {unitName}{units > 1 ? "s" : ""} aujourd'hui
                      <span className="text-foreground-muted/60"> · {unitSize >= 1000 ? `${unitSize/1000}L` : `${unitSize}ml`}/unité</span>
                    </p>
                    <div className="flex gap-3 mt-4">
                      <Button
                        variant="secondary"
                        size="md"
                        onClick={() => addWaterMl(-(waterToday.unit_size_ml || waterSettings.unit_size_ml || 250))}
                        disabled={volume === 0}
                        className="w-12 h-12 text-xl font-bold rounded-2xl"
                        aria-label="Retirer"
                      >
                        −
                      </Button>
                      <Button
                        size="md"
                        onClick={() => setShowWaterAdd(true)}
                        className="px-6 h-12 rounded-2xl"
                      >
                        <Plus size={18} /> Ajouter
                      </Button>
                    </div>
                    <button
                      onClick={() => setShowWaterSettings(true)}
                      className="mt-4 flex items-center gap-1.5 text-xs text-foreground-muted hover:text-accent-blue cursor-pointer transition-colors"
                    >
                      <SettingsIcon size={12} /> Modifier objectif & unité
                    </button>
                  </div>
                </Card>

                {/* Grille des unités (jusqu'à 16 max pour rester lisible) */}
                {goalUnits > 0 && goalUnits <= 24 && (
                  <div className={cn(
                    "grid gap-1.5",
                    goalUnits <= 8 ? "grid-cols-8" : goalUnits <= 12 ? "grid-cols-6" : "grid-cols-8"
                  )}>
                    {Array.from({ length: goalUnits }, (_, i) => (
                      <button
                        key={i}
                        onClick={() => {
                          const newVol = i < units ? i * unitSize : (i + 1) * unitSize;
                          setWaterToVolume(newVol);
                        }}
                        className={cn(
                          "aspect-square rounded-xl transition-all cursor-pointer active:scale-90",
                          i < units ? "bg-accent-cyan" : "bg-surface-2 border border-border"
                        )}
                        aria-label={`${unitName} ${i + 1}`}
                      >
                        <Droplets size={14} className={cn("mx-auto", i < units ? "text-white" : "text-muted")} />
                      </button>
                    ))}
                  </div>
                )}

                {volume >= goal && (
                  <Card glow="green" className="text-center py-3">
                    <p className="text-accent-green font-semibold">Objectif eau atteint !</p>
                    <p className="text-xs text-foreground-muted mt-1">{liters}L bus aujourd'hui</p>
                  </Card>
                )}
              </>
            );
          })()}
        </div>
      )}

      {/* Water settings modal */}
      <WaterSettingsModal
        open={showWaterSettings}
        settings={waterSettings}
        onClose={() => setShowWaterSettings(false)}
        onSaved={() => { setShowWaterSettings(false); load(); }}
      />

      {/* Water add modal */}
      <WaterAddModal
        open={showWaterAdd}
        onClose={() => setShowWaterAdd(false)}
        onAdd={addWaterMl}
      />

      {/* Weight goal modal */}
      <WeightGoalModal
        open={showWeightGoalModal}
        currentGoal={weightGoal}
        onClose={() => setShowWeightGoalModal(false)}
        onSaved={() => { setShowWeightGoalModal(false); load(); }}
      />

      {/* Sleep Modal */}
      <Modal open={showSleepModal} onClose={() => { setShowSleepModal(false); setEditingSleepId(null); }} title={editingSleepId ? "Modifier le sommeil" : "Log Sommeil"}>
        <form onSubmit={saveSleep} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <Input label="Coucher" type="time" value={sleepForm.bedtime} onChange={e => setSleepForm(f => ({ ...f, bedtime: e.target.value }))} />
            <Input label="Lever" type="time" value={sleepForm.wake_time} onChange={e => setSleepForm(f => ({ ...f, wake_time: e.target.value }))} />
          </div>
          <Input label="Durée (heures)" type="number" step="0.5" min="1" max="14" value={sleepForm.duration_h} onChange={e => setSleepForm(f => ({ ...f, duration_h: e.target.value }))} required />
          <div>
            <label className="text-sm font-medium text-foreground-muted block mb-2">Qualité</label>
            <StarRating value={sleepForm.quality} onChange={q => setSleepForm(f => ({ ...f, quality: q }))} size={28} />
          </div>
          <div>
            <label className="text-sm font-medium text-foreground-muted block mb-2">Énergie ({sleepForm.energy_score}/10)</label>
            <input type="range" min="1" max="10" value={sleepForm.energy_score} onChange={e => setSleepForm(f => ({ ...f, energy_score: parseInt(e.target.value) }))} className="w-full" />
          </div>
          <Button type="submit" loading={saving} className="w-full">Enregistrer</Button>
        </form>
      </Modal>

      {/* Weight Modal */}
      <Modal open={showWeightModal} onClose={() => { setShowWeightModal(false); setEditingWeightId(null); }} title={editingWeightId ? "Modifier le poids" : "Log Poids"}>
        <form onSubmit={saveWeight} className="space-y-4">
          <Input label="Poids (kg)" type="number" step="0.1" min="30" max="250" value={weightForm.weight_kg} onChange={e => setWeightForm(f => ({ ...f, weight_kg: e.target.value }))} required placeholder="95.5" />
          <Input label="Tour de taille (cm, optionnel)" type="number" step="0.5" value={weightForm.waist_cm} onChange={e => setWeightForm(f => ({ ...f, waist_cm: e.target.value }))} placeholder="90" />
          <Button type="submit" loading={saving} className="w-full">Enregistrer</Button>
        </form>
      </Modal>
    </div>
  );
}

// ───── Weight Goal Modal ──────────────────────────────────────────────────────

function WeightGoalModal({ open, currentGoal, onClose, onSaved }: { open: boolean; currentGoal: number; onClose: () => void; onSaved: () => void }) {
  const [goal, setGoal] = useState(currentGoal.toString());
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) setGoal(currentGoal.toString());
  }, [open, currentGoal]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const v = parseFloat(goal);
    if (isNaN(v) || v <= 20 || v >= 300) return;
    setSaving(true);
    await fetch("/api/health/weight/settings", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ goal_kg: v }),
    });
    setSaving(false);
    onSaved();
  };

  return (
    <Modal open={open} onClose={onClose} title="Objectif de poids">
      <form onSubmit={submit} className="space-y-4">
        <p className="text-sm text-foreground-muted">
          Définis ton poids cible. Tu pourras le modifier à tout moment.
        </p>
        <Input
          label="Poids cible (kg)"
          type="number"
          step="0.1"
          min="20"
          max="300"
          value={goal}
          onChange={e => setGoal(e.target.value)}
          required
        />
        <Button type="submit" loading={saving} className="w-full">Enregistrer</Button>
      </form>
    </Modal>
  );
}

// ───── Water Add Modal ────────────────────────────────────────────────────────

function WaterAddModal({ open, onClose, onAdd }: { open: boolean; onClose: () => void; onAdd: (ml: number) => void }) {
  const [customMl, setCustomMl] = useState("");
  const [showCustom, setShowCustom] = useState(false);

  useEffect(() => {
    if (!open) {
      setCustomMl("");
      setShowCustom(false);
    }
  }, [open]);

  const QUICK = [
    { label: "Verre", ml: 250, desc: "25 cl" },
    { label: "Gourde", ml: 500, desc: "50 cl" },
    { label: "Bouteille", ml: 1250, desc: "1,25 L" },
  ];

  const submitCustom = (e: React.FormEvent) => {
    e.preventDefault();
    const ml = parseInt(customMl);
    if (!ml || ml <= 0) return;
    onAdd(ml);
  };

  return (
    <Modal open={open} onClose={onClose} title="Ajouter de l'eau">
      {!showCustom ? (
        <div className="space-y-3">
          {QUICK.map(q => (
            <button
              key={q.label}
              onClick={() => onAdd(q.ml)}
              className="w-full flex items-center justify-between px-4 py-4 rounded-2xl bg-surface border border-border hover:border-accent-cyan/50 hover:bg-accent-cyan/5 cursor-pointer transition-all active:scale-[0.98]"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-accent-cyan/15 flex items-center justify-center">
                  <Droplets size={20} className="text-accent-cyan" />
                </div>
                <div className="text-left">
                  <p className="text-sm font-semibold text-foreground">{q.label}</p>
                  <p className="text-xs text-foreground-muted">{q.desc}</p>
                </div>
              </div>
              <span className="text-sm font-bold text-accent-cyan">+{q.ml} ml</span>
            </button>
          ))}

          <button
            onClick={() => setShowCustom(true)}
            className="w-full flex items-center justify-between px-4 py-4 rounded-2xl bg-surface border border-dashed border-border hover:border-accent-blue/50 cursor-pointer transition-all active:scale-[0.98]"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-accent-blue/15 flex items-center justify-center">
                <Plus size={20} className="text-accent-blue" />
              </div>
              <div className="text-left">
                <p className="text-sm font-semibold text-foreground">Custom</p>
                <p className="text-xs text-foreground-muted">Entrer une quantité en ml</p>
              </div>
            </div>
            <span className="text-sm font-bold text-accent-blue">→</span>
          </button>
        </div>
      ) : (
        <form onSubmit={submitCustom} className="space-y-4">
          <Input
            label="Quantité (ml)"
            type="number"
            min="1"
            step="1"
            autoFocus
            value={customMl}
            onChange={e => setCustomMl(e.target.value)}
            placeholder="Ex: 400"
            required
          />
          <div className="flex gap-2">
            <Button type="button" variant="secondary" onClick={() => setShowCustom(false)} className="flex-1">
              Retour
            </Button>
            <Button type="submit" className="flex-1" disabled={!customMl || parseInt(customMl) <= 0}>
              Ajouter
            </Button>
          </div>
        </form>
      )}
    </Modal>
  );
}

// ───── Water Settings Modal ───────────────────────────────────────────────────

function WaterSettingsModal({ open, settings, onClose, onSaved }: any) {
  const PRESETS = [
    { name: "verre", label: "Verre", size: 250 },
    { name: "gobelet", label: "Gobelet", size: 330 },
    { name: "gourde", label: "Gourde", size: 500 },
    { name: "bouteille", label: "Bouteille", size: 1250 },
  ];

  const [form, setForm] = useState({
    goal_l: ((settings?.goal_ml || 2500) / 1000).toString(),
    unit_size_ml: (settings?.unit_size_ml || 250).toString(),
    unit_name: settings?.unit_name || "verre",
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open && settings) {
      setForm({
        goal_l: (settings.goal_ml / 1000).toString(),
        unit_size_ml: settings.unit_size_ml.toString(),
        unit_name: settings.unit_name,
      });
    }
  }, [open, settings]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault(); setSaving(true);
    await fetch("/api/health/water/settings", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        goal_ml: Math.round(parseFloat(form.goal_l) * 1000),
        unit_size_ml: parseInt(form.unit_size_ml),
        unit_name: form.unit_name,
      }),
    });
    setSaving(false); onSaved();
  };

  return (
    <Modal open={open} onClose={onClose} title="Objectif & unité d'hydratation">
      <form onSubmit={submit} className="space-y-4">
        <Input
          label="Objectif quotidien (litres)"
          type="number"
          step="0.1"
          min="0.5"
          max="10"
          value={form.goal_l}
          onChange={e => setForm(f => ({ ...f, goal_l: e.target.value }))}
          required
        />
        <div>
          <label className="text-sm font-medium text-foreground-muted block mb-2">Unité de référence</label>
          <div className="grid grid-cols-2 gap-2">
            {PRESETS.map(p => (
              <button
                key={p.name}
                type="button"
                onClick={() => setForm(f => ({ ...f, unit_name: p.name, unit_size_ml: p.size.toString() }))}
                className={cn(
                  "py-2.5 px-3 rounded-xl text-sm font-medium transition-all cursor-pointer text-left",
                  form.unit_name === p.name
                    ? "bg-gradient-accent text-white"
                    : "bg-surface-2 text-foreground-muted hover:text-foreground"
                )}
              >
                <span className="block">{p.label}</span>
                <span className="text-[10px] opacity-70">
                  {p.size >= 1000 ? `${p.size/1000}L` : `${p.size}ml`}
                </span>
              </button>
            ))}
          </div>
        </div>
        <Input
          label="Ou taille personnalisée (ml)"
          type="number"
          min="50"
          max="3000"
          value={form.unit_size_ml}
          onChange={e => setForm(f => ({ ...f, unit_size_ml: e.target.value, unit_name: "custom" }))}
        />
        <div className="bg-surface rounded-xl p-3">
          <p className="text-xs text-foreground-muted">
            Avec ces réglages : <span className="text-accent-blue font-semibold">{Math.round(parseFloat(form.goal_l || "0") * 1000 / parseInt(form.unit_size_ml || "1"))} unités</span> pour atteindre l'objectif de {form.goal_l}L.
          </p>
        </div>
        <Button type="submit" loading={saving} className="w-full">Enregistrer</Button>
      </form>
    </Modal>
  );
}
