"use client";

import { useEffect, useState, useCallback } from "react";
import { Plus, Trash2, Heart, Edit3, Star } from "lucide-react";
import { Card, CardHeader, CardTitle } from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import Modal from "@/components/ui/Modal";
import Input from "@/components/ui/Input";
import SelectionToolbar, { SelectCheckbox } from "@/components/ui/SelectionToolbar";
import { useSelection } from "@/lib/useSelection";
import { format, parseISO } from "date-fns";
import { fr } from "date-fns/locale";
import { formatMoney } from "@/lib/utils";

const CURRENCIES = ["EUR", "USD", "GBP", "CHF", "MUR", "AED"] as const;

interface Props { currency: string }

export default function WishlistTab({ currency }: Props) {
  const [items, setItems] = useState<any[]>([]);
  const [summary, setSummary] = useState<any>(null);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const sel = useSelection<number>();

  const bulkDelete = async () => {
    if (sel.ids.length === 0) return;
    if (!confirm(`Supprimer ${sel.ids.length} souhait(s) ?`)) return;
    await fetch("/api/finances/wishlist", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ids: sel.ids }) });
    sel.exitMode();
    load();
  };

  const load = useCallback(async () => {
    const [w, s] = await Promise.all([
      fetch("/api/finances/wishlist").then(r => r.json()),
      fetch(`/api/finances/summary?currency=${currency}`).then(r => r.json()),
    ]);
    setItems(w);
    setSummary(s);
  }, [currency]);

  useEffect(() => { load(); }, [load]);

  const deleteItem = async (id: number) => {
    if (!confirm("Supprimer cet item de la wishlist ?")) return;
    await fetch(`/api/finances/wishlist/${id}`, { method: "DELETE" });
    load();
  };

  return (
    <div className="space-y-4 animate-fade-in">

      {/* Total wishlist */}
      <Card gradient glow="purple">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-accent-purple/20 flex items-center justify-center">
            <Heart size={28} className="text-accent-purple" />
          </div>
          <div className="flex-1">
            <p className="text-foreground-muted text-xs uppercase tracking-wider">Total wishlist</p>
            <h2 className="font-heading text-2xl font-bold text-accent-purple">
              {summary ? formatMoney(summary.wishlistTotal, currency) : "..."}
            </h2>
            {summary && (
              <p className="text-xs text-foreground-muted mt-1">
                {summary.wishlistPct.toFixed(1)}% de mon patrimoine
              </p>
            )}
          </div>
        </div>
        {summary && summary.total > 0 && (
          <div className="mt-3">
            <div className="h-2 bg-surface-2 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-accent rounded-full transition-all duration-700"
                style={{ width: `${Math.min(summary.wishlistPct, 100)}%` }}
              />
            </div>
          </div>
        )}
      </Card>

      {/* Bouton ajouter */}
      <Button onClick={() => { setEditing(null); setShowModal(true); }} className="w-full">
        <Plus size={16} /> Ajouter à la wishlist
      </Button>

      {/* Souhaits */}
      <h2 className="font-heading text-base font-semibold text-foreground-muted uppercase tracking-wider mt-2">
        Souhaits
      </h2>

      <SelectionToolbar
        selectionMode={sel.mode}
        selectedCount={sel.size}
        totalCount={items.length}
        onToggleMode={sel.toggleMode}
        onSelectAll={() => sel.selectAll(items.map(i => i.id))}
        onClear={sel.clear}
        onDelete={bulkDelete}
        label="souhait(s)"
      />

      {items.length === 0 ? (
        <Card><p className="text-center text-foreground-muted text-sm py-4">Aucun souhait pour le moment</p></Card>
      ) : (
        <div className="space-y-2">
          {items.map(item => {
            const pctOfPatrimoine = summary?.total > 0 ? (item.amount / summary.total) * 100 : 0;
            return (
              <Card key={item.id}>
                <div className="flex items-start gap-3">
                  {sel.mode && <div className="pt-2"><SelectCheckbox checked={sel.isSelected(item.id)} onChange={() => sel.toggle(item.id)} /></div>}
                  <div className="w-10 h-10 rounded-xl bg-accent-purple/10 flex items-center justify-center flex-shrink-0">
                    <Star size={18} className="text-accent-purple" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm">{item.name}</p>
                    <p className="font-heading text-lg font-bold text-foreground mt-0.5">
                      {formatMoney(item.amount, item.currency)}
                    </p>
                    <p className="text-[10px] text-foreground-muted mt-0.5">
                      Ajouté le {format(parseISO(item.created_at.replace(" ", "T") + "Z"), "dd MMM yyyy", { locale: fr })}
                    </p>
                    <div className="flex items-center gap-1.5 mt-1.5">
                      <div className="flex-1 h-1 bg-surface-2 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-accent-purple rounded-full"
                          style={{ width: `${Math.min(pctOfPatrimoine * 5, 100)}%` }}
                        />
                      </div>
                      <span className="text-[10px] text-accent-purple font-semibold whitespace-nowrap">
                        {pctOfPatrimoine.toFixed(2)}% patrimoine
                      </span>
                    </div>
                  </div>
                  <div className="flex flex-col gap-1 items-end">
                    <button
                      onClick={() => { setEditing(item); setShowModal(true); }}
                      className="p-1.5 text-muted hover:text-accent-blue cursor-pointer transition-colors"
                    >
                      <Edit3 size={13} />
                    </button>
                    <button
                      onClick={() => deleteItem(item.id)}
                      className="p-1.5 text-muted hover:text-accent-red cursor-pointer transition-colors"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {showModal && (
        <WishModal
          editing={editing}
          onClose={() => { setShowModal(false); setEditing(null); }}
          onSaved={() => { load(); setShowModal(false); setEditing(null); }}
        />
      )}
    </div>
  );
}

function WishModal({ editing, onClose, onSaved }: any) {
  const [form, setForm] = useState({
    name: editing?.name || "",
    amount: editing?.amount?.toString() || "",
    currency: editing?.currency || "EUR",
    notes: editing?.notes || "",
  });
  const [saving, setSaving] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault(); setSaving(true);
    const body = { ...form, amount: parseFloat(form.amount) };
    if (editing) {
      await fetch(`/api/finances/wishlist/${editing.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    } else {
      await fetch("/api/finances/wishlist", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    }
    setSaving(false); onSaved();
  };

  return (
    <Modal open onClose={onClose} title={editing ? "Modifier" : "Ajouter à la wishlist"}>
      <form onSubmit={submit} className="space-y-4">
        <Input label="Nom" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} required placeholder="iPhone 17 Pro" />
        <div className="grid grid-cols-2 gap-3">
          <Input label="Montant" type="number" step="0.01" value={form.amount} onChange={e => setForm(f => ({ ...f, amount: e.target.value }))} required placeholder="1299" />
          <div>
            <label className="text-sm font-medium text-foreground-muted block mb-1">Devise</label>
            <select value={form.currency} onChange={e => setForm(f => ({ ...f, currency: e.target.value }))} className="w-full bg-surface border border-border rounded-xl px-3 py-2.5 text-foreground text-sm min-h-[44px] focus:outline-none focus:border-accent-blue">
              {CURRENCIES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
        </div>
        <Input label="Notes (optionnel)" value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} />
        <Button type="submit" loading={saving} className="w-full">Enregistrer</Button>
      </form>
    </Modal>
  );
}
