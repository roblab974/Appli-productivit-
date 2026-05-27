"use client";

import { useEffect, useState, useCallback } from "react";
import { Plus, Trash2, Edit3, Repeat, AlertCircle, Zap, Power } from "lucide-react";
import { Card, CardHeader, CardTitle } from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import Modal from "@/components/ui/Modal";
import Input from "@/components/ui/Input";
import Badge from "@/components/ui/Badge";
import SelectionToolbar, { SelectCheckbox } from "@/components/ui/SelectionToolbar";
import { useSelection } from "@/lib/useSelection";
import { format, parseISO, differenceInDays, addDays, addWeeks, addMonths, addYears } from "date-fns";
import { fr } from "date-fns/locale";
import { cn, formatMoney, todayStr } from "@/lib/utils";

const CURRENCIES = ["EUR", "USD", "GBP", "CHF", "MUR", "AED"] as const;
const FREQUENCIES = [
  { value: "weekly", label: "Hebdomadaire" },
  { value: "monthly", label: "Mensuel" },
  { value: "annual", label: "Annuel" },
];

interface Props { currency: string }

export default function SubscriptionsTab({ currency }: Props) {
  const [subscriptions, setSubscriptions] = useState<any[]>([]);
  const [accounts, setAccounts] = useState<any[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const sel = useSelection<number>();

  const bulkDelete = async () => {
    if (sel.ids.length === 0) return;
    if (!confirm(`Supprimer ${sel.ids.length} abonnement(s) ?`)) return;
    await fetch("/api/finances/subscriptions", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ids: sel.ids }) });
    sel.exitMode();
    load();
  };

  const load = useCallback(async () => {
    const [s, a] = await Promise.all([
      fetch("/api/finances/subscriptions").then(r => r.json()),
      fetch("/api/finances/accounts").then(r => r.json()),
    ]);
    setSubscriptions(s);
    setAccounts(a);
  }, []);

  useEffect(() => { load(); }, [load]);

  // Auto-deduction des abonnements échus (côté client = quand on charge la page)
  useEffect(() => {
    if (subscriptions.length === 0 || accounts.length === 0) return;
    const today = todayStr();
    const toDeduct = subscriptions.filter(s =>
      s.active && s.auto_deduct && s.account_id && s.due_date <= today
    );
    if (toDeduct.length > 0) {
      Promise.all(toDeduct.map(s => deductNow(s, false))).then(() => load());
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [subscriptions.length, accounts.length]);

  const nextDueDate = (current: string, frequency: string): string => {
    const d = parseISO(current);
    if (frequency === "weekly") return format(addWeeks(d, 1), "yyyy-MM-dd");
    if (frequency === "annual") return format(addYears(d, 1), "yyyy-MM-dd");
    return format(addMonths(d, 1), "yyyy-MM-dd");
  };

  const deductNow = async (s: any, reload = true) => {
    if (!s.account_id) {
      alert("Aucun compte lié");
      return;
    }
    // Crée une transaction sortante
    await fetch(`/api/finances/purchases`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: `[Abonnement] ${s.name}`,
        amount: s.amount,
        currency: s.currency,
        account_id: s.account_id,
        purchase_date: todayStr(),
      }),
    }).then(r => r.json()).then(async (purchase) => {
      if (purchase?.id) {
        await fetch(`/api/finances/purchases/${purchase.id}`, { method: "POST" });
      }
    });
    // Update subscription : next due date + last_deducted_at
    await fetch(`/api/finances/subscriptions/${s.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        due_date: nextDueDate(s.due_date, s.frequency),
        last_deducted_at: new Date().toISOString(),
      }),
    });
    if (reload) load();
  };

  const toggleAutoDeduct = async (s: any) => {
    await fetch(`/api/finances/subscriptions/${s.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ auto_deduct: !s.auto_deduct }),
    });
    load();
  };

  const deleteSub = async (id: number) => {
    if (!confirm("Supprimer cet abonnement ?")) return;
    await fetch(`/api/finances/subscriptions/${id}`, { method: "DELETE" });
    load();
  };

  const monthlyTotal = subscriptions.reduce((sum, s) => {
    if (!s.active) return sum;
    if (s.frequency === "monthly") return sum + s.amount;
    if (s.frequency === "weekly") return sum + s.amount * 4.33;
    if (s.frequency === "annual") return sum + s.amount / 12;
    return sum;
  }, 0);

  return (
    <div className="space-y-4 animate-fade-in">
      {/* Résumé */}
      <div className="grid grid-cols-2 gap-3">
        <Card className="text-center py-3">
          <Repeat size={20} className="text-accent-purple mx-auto mb-1" />
          <span className="font-heading text-xl font-bold text-accent-purple">{subscriptions.filter(s => s.active).length}</span>
          <p className="text-[10px] text-foreground-muted mt-0.5">Actifs</p>
        </Card>
        <Card className="text-center py-3">
          <Zap size={20} className="text-accent-amber mx-auto mb-1" />
          <span className="font-heading text-xl font-bold text-accent-amber">{formatMoney(monthlyTotal, "EUR", true)}</span>
          <p className="text-[10px] text-foreground-muted mt-0.5">/ mois</p>
        </Card>
      </div>

      {/* Bouton ajouter */}
      <Button onClick={() => { setEditing(null); setShowModal(true); }} className="w-full">
        <Plus size={16} /> Nouvel abonnement
      </Button>

      <SelectionToolbar
        selectionMode={sel.mode}
        selectedCount={sel.size}
        totalCount={subscriptions.length}
        onToggleMode={sel.toggleMode}
        onSelectAll={() => sel.selectAll(subscriptions.map(s => s.id))}
        onClear={sel.clear}
        onDelete={bulkDelete}
        label="abonnement(s)"
      />

      {/* Liste */}
      {subscriptions.length === 0 && (
        <Card><p className="text-center text-foreground-muted text-sm py-4">Aucun abonnement</p></Card>
      )}

      <div className="space-y-2">
        {subscriptions.map(s => {
          const account = accounts.find(a => a.id === s.account_id);
          const daysLeft = differenceInDays(parseISO(s.due_date), new Date());
          const urgent = daysLeft <= 5 && daysLeft >= 0 && s.active;
          const overdue = daysLeft < 0 && s.active;
          return (
            <Card key={s.id} className={cn(!s.active && "opacity-50")}>
              <div className="flex items-start gap-3">
                {sel.mode && <div className="pt-2"><SelectCheckbox checked={sel.isSelected(s.id)} onChange={() => sel.toggle(s.id)} /></div>}
                <div className={cn(
                  "w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0",
                  overdue ? "bg-accent-red/20" : urgent ? "bg-accent-amber/20" : "bg-accent-purple/10"
                )}>
                  <Repeat size={18} className={cn(
                    overdue ? "text-accent-red" : urgent ? "text-accent-amber" : "text-accent-purple"
                  )} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-medium text-sm">{s.name}</p>
                    <Badge variant={s.frequency === "annual" ? "blue" : s.frequency === "weekly" ? "amber" : "purple"}>
                      {FREQUENCIES.find(f => f.value === s.frequency)?.label}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="font-heading text-base font-bold text-foreground">
                      {formatMoney(s.amount, s.currency)}
                    </span>
                    {account && (
                      <span className="text-xs text-foreground-muted">
                        · {account.name}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-1.5 mt-1.5">
                    <AlertCircle size={11} className={cn(
                      overdue ? "text-accent-red animate-pulse-red" : urgent ? "text-accent-amber animate-pulse-amber" : "text-foreground-muted"
                    )} />
                    <span className={cn(
                      "text-xs",
                      overdue ? "text-accent-red font-semibold animate-pulse-red" : urgent ? "text-accent-amber font-semibold animate-pulse-amber" : "text-foreground-muted"
                    )}>
                      {overdue
                        ? `En retard de ${Math.abs(daysLeft)}j`
                        : daysLeft === 0
                          ? "Aujourd'hui"
                          : `Dans ${daysLeft}j — ${format(parseISO(s.due_date), "dd MMM", { locale: fr })}`
                      }
                    </span>
                  </div>
                </div>
                <div className="flex flex-col gap-1 items-end">
                  <button
                    onClick={() => { setEditing(s); setShowModal(true); }}
                    className="p-1.5 text-muted hover:text-accent-blue cursor-pointer transition-colors"
                  >
                    <Edit3 size={13} />
                  </button>
                  <button
                    onClick={() => deleteSub(s.id)}
                    className="p-1.5 text-muted hover:text-accent-red cursor-pointer transition-colors"
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-between mt-3 pt-3 border-t border-border/30">
                <button
                  onClick={() => toggleAutoDeduct(s)}
                  className={cn(
                    "flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer",
                    s.auto_deduct
                      ? "bg-accent-green/15 text-accent-green border border-accent-green/30"
                      : "bg-surface-2 text-foreground-muted border border-border"
                  )}
                >
                  <Power size={11} />
                  Déduire auto {s.auto_deduct ? "ON" : "OFF"}
                </button>
                {s.account_id && (
                  <button
                    onClick={() => deductNow(s)}
                    className="text-xs text-accent-blue hover:underline cursor-pointer"
                  >
                    Payer maintenant
                  </button>
                )}
              </div>
            </Card>
          );
        })}
      </div>

      {showModal && (
        <SubscriptionModal
          editing={editing}
          accounts={accounts}
          onClose={() => { setShowModal(false); setEditing(null); }}
          onSaved={() => { load(); setShowModal(false); setEditing(null); }}
        />
      )}

      {/* Animation pour le clignotement */}
      <style jsx global>{`
        @keyframes pulse-red {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.4; }
        }
        @keyframes pulse-amber {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
        .animate-pulse-red { animation: pulse-red 1s ease-in-out infinite; }
        .animate-pulse-amber { animation: pulse-amber 1.5s ease-in-out infinite; }
      `}</style>
    </div>
  );
}

function SubscriptionModal({ editing, accounts, onClose, onSaved }: any) {
  const [form, setForm] = useState({
    name: editing?.name || "",
    amount: editing?.amount?.toString() || "",
    currency: editing?.currency || "EUR",
    frequency: editing?.frequency || "monthly",
    account_id: editing?.account_id?.toString() || "",
    due_date: editing?.due_date || todayStr(),
    auto_deduct: editing?.auto_deduct ? true : false,
    active: editing?.active !== undefined ? !!editing.active : true,
  });
  const [saving, setSaving] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault(); setSaving(true);
    const body = {
      ...form,
      amount: parseFloat(form.amount),
      account_id: form.account_id ? parseInt(form.account_id) : null,
      auto_deduct: form.auto_deduct ? 1 : 0,
      active: form.active ? 1 : 0,
    };
    if (editing) {
      await fetch(`/api/finances/subscriptions/${editing.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    } else {
      await fetch("/api/finances/subscriptions", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    }
    setSaving(false); onSaved();
  };

  return (
    <Modal open onClose={onClose} title={editing ? "Modifier l'abonnement" : "Nouvel abonnement"}>
      <form onSubmit={submit} className="space-y-4">
        <Input label="Nom" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} required placeholder="Netflix, Spotify..." />
        <div className="grid grid-cols-2 gap-3">
          <Input label="Montant" type="number" step="0.01" value={form.amount} onChange={e => setForm(f => ({ ...f, amount: e.target.value }))} required placeholder="9.99" />
          <div>
            <label className="text-sm font-medium text-foreground-muted block mb-1">Devise</label>
            <select value={form.currency} onChange={e => setForm(f => ({ ...f, currency: e.target.value }))} className="w-full bg-surface border border-border rounded-xl px-3 py-2.5 text-foreground text-sm min-h-[44px] focus:outline-none focus:border-accent-blue">
              {CURRENCIES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
        </div>
        <div>
          <label className="text-sm font-medium text-foreground-muted block mb-1">Fréquence</label>
          <select value={form.frequency} onChange={e => setForm(f => ({ ...f, frequency: e.target.value }))} className="w-full bg-surface border border-border rounded-xl px-3 py-2.5 text-foreground text-sm min-h-[44px] focus:outline-none focus:border-accent-blue">
            {FREQUENCIES.map(f => <option key={f.value} value={f.value}>{f.label}</option>)}
          </select>
        </div>
        <div>
          <label className="text-sm font-medium text-foreground-muted block mb-1">Compte bancaire lié</label>
          <select value={form.account_id} onChange={e => setForm(f => ({ ...f, account_id: e.target.value }))} className="w-full bg-surface border border-border rounded-xl px-3 py-2.5 text-foreground text-sm min-h-[44px] focus:outline-none focus:border-accent-blue">
            <option value="">— Aucun —</option>
            {accounts.map((a: any) => <option key={a.id} value={a.id}>{a.name} ({formatMoney(a.balance, a.currency)})</option>)}
          </select>
          {accounts.length === 0 && <p className="text-xs text-accent-amber mt-1">Ajoute d'abord un compte dans l'onglet Patrimoine.</p>}
        </div>
        <Input label="Prochaine échéance" type="date" value={form.due_date} onChange={e => setForm(f => ({ ...f, due_date: e.target.value }))} required />
        <label className="flex items-center gap-2 cursor-pointer">
          <input type="checkbox" checked={form.auto_deduct} onChange={e => setForm(f => ({ ...f, auto_deduct: e.target.checked }))} className="w-4 h-4 accent-accent-blue" />
          <span className="text-sm">Déduire automatiquement à l'échéance</span>
        </label>
        <label className="flex items-center gap-2 cursor-pointer">
          <input type="checkbox" checked={form.active} onChange={e => setForm(f => ({ ...f, active: e.target.checked }))} className="w-4 h-4 accent-accent-blue" />
          <span className="text-sm">Actif</span>
        </label>
        <Button type="submit" loading={saving} className="w-full">Enregistrer</Button>
      </form>
    </Modal>
  );
}
