"use client";

import { useEffect, useState, useCallback } from "react";
import { Plus, Trash2, ShoppingBag, Check, Minus, Edit3 } from "lucide-react";
import { Card, CardHeader, CardTitle } from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import Modal from "@/components/ui/Modal";
import Input from "@/components/ui/Input";
import Badge from "@/components/ui/Badge";
import SelectionToolbar, { SelectCheckbox } from "@/components/ui/SelectionToolbar";
import { useSelection } from "@/lib/useSelection";
import { format, parseISO } from "date-fns";
import { fr } from "date-fns/locale";
import { cn, formatMoney, todayStr } from "@/lib/utils";

const CURRENCIES = ["EUR", "USD", "GBP", "CHF", "MUR", "AED"] as const;

interface Props { currency: string }

export default function PurchasesTab({ currency }: Props) {
  const [purchases, setPurchases] = useState<any[]>([]);
  const [accounts, setAccounts] = useState<any[]>([]);
  const [summary, setSummary] = useState<any>(null);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const sel = useSelection<number>();

  const bulkDelete = async () => {
    if (sel.ids.length === 0) return;
    if (!confirm(`Supprimer ${sel.ids.length} achat(s) ?`)) return;
    await fetch("/api/finances/purchases", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ids: sel.ids }) });
    sel.exitMode();
    load();
  };

  const load = useCallback(async () => {
    const [p, a, s] = await Promise.all([
      fetch("/api/finances/purchases").then(r => r.json()),
      fetch("/api/finances/accounts").then(r => r.json()),
      fetch(`/api/finances/summary?currency=${currency}`).then(r => r.json()),
    ]);
    setPurchases(p);
    setAccounts(a);
    setSummary(s);
  }, [currency]);

  useEffect(() => { load(); }, [load]);

  const deductPurchase = async (id: number) => {
    await fetch(`/api/finances/purchases/${id}`, { method: "POST" });
    load();
  };

  const deletePurchase = async (id: number) => {
    if (!confirm("Supprimer cet achat ?")) return;
    await fetch(`/api/finances/purchases/${id}`, { method: "DELETE" });
    load();
  };

  return (
    <div className="space-y-4 animate-fade-in">

      {/* Nouvel achat */}
      <Button onClick={() => { setEditing(null); setShowModal(true); }} className="w-full">
        <Plus size={16} /> Nouvel achat
      </Button>

      <SelectionToolbar
        selectionMode={sel.mode}
        selectedCount={sel.size}
        totalCount={purchases.length}
        onToggleMode={sel.toggleMode}
        onSelectAll={() => sel.selectAll(purchases.map(p => p.id))}
        onClear={sel.clear}
        onDelete={bulkDelete}
        label="achat(s)"
      />

      {/* Liste des achats */}
      {purchases.length === 0 ? (
        <Card><p className="text-center text-foreground-muted text-sm py-4">Aucun achat enregistré</p></Card>
      ) : (
        <div className="space-y-2">
          {purchases.map(p => {
            const account = accounts.find(a => a.id === p.account_id);
            const pctOfPatrimoine = summary?.total > 0 ? (p.amount / summary.total) * 100 : 0;
            return (
              <Card key={p.id} className={cn(p.deducted && "opacity-60")}>
                <div className="flex items-start gap-3">
                  {sel.mode && <div className="pt-2"><SelectCheckbox checked={sel.isSelected(p.id)} onChange={() => sel.toggle(p.id)} /></div>}
                  <div className={cn(
                    "w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0",
                    p.deducted ? "bg-accent-green/10" : "bg-accent-amber/10"
                  )}>
                    <ShoppingBag size={18} className={p.deducted ? "text-accent-green" : "text-accent-amber"} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-medium text-sm">{p.name}</p>
                      {p.deducted && <Badge variant="green">Payé</Badge>}
                    </div>
                    <p className="font-heading text-lg font-bold text-foreground mt-0.5">
                      {formatMoney(p.amount, p.currency)}
                    </p>
                    <div className="flex items-center gap-2 mt-1 text-xs text-foreground-muted">
                      {account && <span>{account.name}</span>}
                      <span>·</span>
                      <span>{format(parseISO(p.purchase_date), "dd MMM yyyy", { locale: fr })}</span>
                    </div>
                    <div className="flex items-center gap-1.5 mt-1">
                      <div className="flex-1 h-1 bg-surface-2 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-accent-blue rounded-full"
                          style={{ width: `${Math.min(pctOfPatrimoine * 5, 100)}%` }}
                        />
                      </div>
                      <span className="text-[10px] text-accent-blue font-semibold whitespace-nowrap">
                        {pctOfPatrimoine.toFixed(2)}% patrimoine
                      </span>
                    </div>
                  </div>
                  <div className="flex flex-col gap-1 items-end">
                    <button
                      onClick={() => { setEditing(p); setShowModal(true); }}
                      className="p-1.5 text-muted hover:text-accent-blue cursor-pointer transition-colors"
                    >
                      <Edit3 size={13} />
                    </button>
                    <button
                      onClick={() => deletePurchase(p.id)}
                      className="p-1.5 text-muted hover:text-accent-red cursor-pointer transition-colors"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>

                {!p.deducted && p.account_id && (
                  <button
                    onClick={() => deductPurchase(p.id)}
                    className="w-full mt-3 py-2 rounded-xl bg-accent-red/10 text-accent-red text-sm font-medium hover:bg-accent-red/20 transition-colors cursor-pointer flex items-center justify-center gap-2"
                  >
                    <Minus size={14} /> Déduire de mon patrimoine
                  </button>
                )}
                {p.deducted && (
                  <div className="mt-3 pt-3 border-t border-border/30 flex items-center gap-2 text-xs text-accent-green">
                    <Check size={12} />
                    <span>Déduit le {p.deducted_at ? format(parseISO(p.deducted_at.replace(" ", "T") + "Z"), "dd MMM 'à' HH:mm", { locale: fr }) : "—"}</span>
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      )}

      {showModal && (
        <PurchaseModal
          editing={editing}
          accounts={accounts}
          onClose={() => { setShowModal(false); setEditing(null); }}
          onSaved={() => { load(); setShowModal(false); setEditing(null); }}
        />
      )}
    </div>
  );
}

function PurchaseModal({ editing, accounts, onClose, onSaved }: any) {
  const [form, setForm] = useState({
    name: editing?.name || "",
    amount: editing?.amount?.toString() || "",
    currency: editing?.currency || "EUR",
    account_id: editing?.account_id?.toString() || "",
    purchase_date: editing?.purchase_date || todayStr(),
    notes: editing?.notes || "",
  });
  const [saving, setSaving] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault(); setSaving(true);
    const body = {
      ...form,
      amount: parseFloat(form.amount),
      account_id: form.account_id ? parseInt(form.account_id) : null,
    };
    if (editing) {
      await fetch(`/api/finances/purchases/${editing.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    } else {
      await fetch("/api/finances/purchases", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    }
    setSaving(false); onSaved();
  };

  return (
    <Modal open onClose={onClose} title={editing ? "Modifier l'achat" : "Nouvel achat"}>
      <form onSubmit={submit} className="space-y-4">
        <Input label="Produit / Service" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} required placeholder="MacBook Pro M3" />
        <div className="grid grid-cols-2 gap-3">
          <Input label="Montant" type="number" step="0.01" value={form.amount} onChange={e => setForm(f => ({ ...f, amount: e.target.value }))} required placeholder="2499" />
          <div>
            <label className="text-sm font-medium text-foreground-muted block mb-1">Devise</label>
            <select value={form.currency} onChange={e => setForm(f => ({ ...f, currency: e.target.value }))} className="w-full bg-surface border border-border rounded-xl px-3 py-2.5 text-foreground text-sm min-h-[44px] focus:outline-none focus:border-accent-blue">
              {CURRENCIES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
        </div>
        <Input label="Date d'achat" type="date" value={form.purchase_date} onChange={e => setForm(f => ({ ...f, purchase_date: e.target.value }))} required />
        <div>
          <label className="text-sm font-medium text-foreground-muted block mb-1">Compte à débiter</label>
          <select value={form.account_id} onChange={e => setForm(f => ({ ...f, account_id: e.target.value }))} className="w-full bg-surface border border-border rounded-xl px-3 py-2.5 text-foreground text-sm min-h-[44px] focus:outline-none focus:border-accent-blue">
            <option value="">— Aucun —</option>
            {accounts.map((a: any) => <option key={a.id} value={a.id}>{a.name} ({formatMoney(a.balance, a.currency)})</option>)}
          </select>
        </div>
        <Input label="Notes (optionnel)" value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} />
        <Button type="submit" loading={saving} className="w-full">{editing ? "Modifier" : "Ajouter"}</Button>
      </form>
    </Modal>
  );
}
