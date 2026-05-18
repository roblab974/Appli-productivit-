"use client";

import { useEffect, useState, useCallback } from "react";
import { Moon, Droplets, Scale, Zap, Plus, Star, TrendingDown } from "lucide-react";
import PageHeader from "@/components/ui/PageHeader";
import { Card, CardHeader, CardTitle } from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import Modal from "@/components/ui/Modal";
import Input from "@/components/ui/Input";
import StarRating from "@/components/ui/StarRating";
import ProgressRing from "@/components/ui/ProgressRing";
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
  const [waterToday, setWaterToday] = useState({ glasses: 0, goal: 8 });
  const [showSleepModal, setShowSleepModal] = useState(false);
  const [showWeightModal, setShowWeightModal] = useState(false);
  const [saving, setSaving] = useState(false);

  const [sleepForm, setSleepForm] = useState({ bedtime: "23:00", wake_time: "07:00", duration_h: "8", quality: 3, energy_score: 7 });
  const [weightForm, setWeightForm] = useState({ weight_kg: "", waist_cm: "" });

  const load = useCallback(async () => {
    const [sl, wl, wa] = await Promise.all([
      fetch("/api/sleep?limit=30").then(r => r.json()),
      fetch("/api/health/weight?limit=90").then(r => r.json()),
      fetch(`/api/health/water?date=${todayStr()}`).then(r => r.json()),
    ]);
    setSleepLogs(sl);
    setWeightLogs(wl.reverse());
    setWaterToday(wa);
  }, []);

  useEffect(() => { load(); }, [load]);

  const saveSleep = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    await fetch("/api/sleep", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...sleepForm, duration_h: parseFloat(sleepForm.duration_h) }),
    });
    setSaving(false);
    setShowSleepModal(false);
    load();
  };

  const saveWeight = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    await fetch("/api/health/weight", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ weight_kg: parseFloat(weightForm.weight_kg), waist_cm: weightForm.waist_cm ? parseFloat(weightForm.waist_cm) : undefined }),
    });
    setSaving(false);
    setShowWeightModal(false);
    load();
  };

  const addWater = async (delta: number) => {
    const newGlasses = Math.max(0, waterToday.glasses + delta);
    const resp = await fetch("/api/health/water", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ glasses: newGlasses, goal: waterToday.goal }),
    });
    const data = await resp.json();
    setWaterToday(data);
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
            {tab === "sleep" && <Button size="sm" onClick={() => setShowSleepModal(true)}><Plus size={14} /> Log</Button>}
            {tab === "weight" && <Button size="sm" onClick={() => setShowWeightModal(true)}><Plus size={14} /> Log</Button>}
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

          <div className="space-y-2">
            {sleepLogs.slice(0, 7).map(log => (
              <Card key={log.id}>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium">{format(parseISO(log.date), "EEE dd MMM", { locale: fr })}</p>
                    <div className="flex items-center gap-3 mt-1">
                      <span className="text-xs text-foreground-muted">{log.bedtime} → {log.wake_time}</span>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className={cn("font-heading text-xl font-bold", log.duration_h >= 7 ? "text-accent-green" : "text-accent-amber")}>
                      {log.duration_h}h
                    </span>
                    <div className="flex justify-end mt-0.5">
                      <StarRating value={log.quality} size={12} />
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
                <CardTitle>Objectif</CardTitle>
                <span className="text-xs text-foreground-muted">92 kg cible</span>
              </CardHeader>
              <div className="flex items-center gap-4">
                <ProgressRing
                  value={Math.max(0, 120 - (latestWeight.weight_kg - 92))}
                  max={120}
                  size={72}
                  color="#22C55E"
                >
                  <span className="text-xs font-bold text-accent-green">
                    {Math.round(Math.max(0, ((120 - (latestWeight.weight_kg - 92)) / 120) * 100))}%
                  </span>
                </ProgressRing>
                <div>
                  <p className="text-sm text-foreground">
                    {latestWeight.weight_kg > 92
                      ? `${(latestWeight.weight_kg - 92).toFixed(1)} kg à perdre`
                      : "Objectif atteint !"}
                  </p>
                  <p className="text-xs text-foreground-muted mt-0.5">Actuel : {latestWeight.weight_kg} kg → Cible : 92 kg</p>
                </div>
              </div>
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
                  <ReferenceLine y={92} stroke="#22C55E" strokeDasharray="4 2" strokeOpacity={0.6} />
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
        </div>
      )}

      {/* WATER */}
      {tab === "water" && (
        <div className="space-y-4 animate-fade-in">
          <Card>
            <div className="flex flex-col items-center py-4">
              <ProgressRing
                value={waterToday.glasses}
                max={waterToday.goal}
                size={120}
                strokeWidth={10}
                color="#06B6D4"
              >
                <div className="text-center">
                  <Droplets size={20} className="text-accent-cyan mx-auto" />
                  <span className="font-heading text-2xl font-bold text-accent-cyan">{waterToday.glasses}</span>
                  <span className="text-foreground-muted text-xs block">/{waterToday.goal}</span>
                </div>
              </ProgressRing>
              <p className="text-sm text-foreground-muted mt-3">verres aujourd'hui</p>
              <div className="flex gap-4 mt-4">
                <Button
                  variant="secondary"
                  size="lg"
                  onClick={() => addWater(-1)}
                  disabled={waterToday.glasses === 0}
                  className="w-14 h-14 text-xl font-bold rounded-2xl"
                >
                  −
                </Button>
                <Button
                  size="lg"
                  onClick={() => addWater(1)}
                  disabled={waterToday.glasses >= 20}
                  className="w-14 h-14 text-xl font-bold rounded-2xl"
                >
                  +
                </Button>
              </div>
            </div>
          </Card>

          <div className="grid grid-cols-8 gap-1.5">
            {Array.from({ length: waterToday.goal }, (_, i) => (
              <button
                key={i}
                onClick={() => {
                  const newVal = i < waterToday.glasses ? i : i + 1;
                  fetch("/api/health/water", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ glasses: newVal, goal: waterToday.goal }) }).then(r => r.json()).then(d => setWaterToday(d));
                }}
                className={cn(
                  "aspect-square rounded-xl transition-all cursor-pointer active:scale-90",
                  i < waterToday.glasses ? "bg-accent-cyan" : "bg-surface-2 border border-border"
                )}
                aria-label={`Verre ${i + 1}`}
              >
                <Droplets size={14} className={cn("mx-auto", i < waterToday.glasses ? "text-white" : "text-muted")} />
              </button>
            ))}
          </div>

          {waterToday.glasses >= waterToday.goal && (
            <Card glow="green" className="text-center py-3">
              <p className="text-accent-green font-semibold">Objectif eau atteint !</p>
              <p className="text-xs text-foreground-muted mt-1">{waterToday.glasses} verres bus aujourd'hui</p>
            </Card>
          )}
        </div>
      )}

      {/* Sleep Modal */}
      <Modal open={showSleepModal} onClose={() => setShowSleepModal(false)} title="Log Sommeil">
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
      <Modal open={showWeightModal} onClose={() => setShowWeightModal(false)} title="Log Poids">
        <form onSubmit={saveWeight} className="space-y-4">
          <Input label="Poids (kg)" type="number" step="0.1" min="30" max="250" value={weightForm.weight_kg} onChange={e => setWeightForm(f => ({ ...f, weight_kg: e.target.value }))} required placeholder="95.5" />
          <Input label="Tour de taille (cm, optionnel)" type="number" step="0.5" value={weightForm.waist_cm} onChange={e => setWeightForm(f => ({ ...f, waist_cm: e.target.value }))} placeholder="90" />
          <Button type="submit" loading={saving} className="w-full">Enregistrer</Button>
        </form>
      </Modal>
    </div>
  );
}
