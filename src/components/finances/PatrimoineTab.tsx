"use client";

import { useEffect, useState, useCallback } from "react";
import { Plus, Trash2, Edit3, Building2, LineChart as LineIcon, Coins, Home, TrendingUp, ArrowUpRight, ArrowDownRight } from "lucide-react";
import { Card, CardHeader, CardTitle } from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import Modal from "@/components/ui/Modal";
import Input from "@/components/ui/Input";
import Badge from "@/components/ui/Badge";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Area, AreaChart, PieChart, Pie, Cell, Legend } from "recharts";
import { format, parseISO } from "date-fns";
import { fr } from "date-fns/locale";
import { cn, formatMoney } from "@/lib/utils";

const CURRENCIES = ["EUR", "USD", "GBP", "CHF", "MUR", "AED"] as const;

interface Props {
  currency: string;
  onCurrencyChange: (c: string) => void;
}

export default function PatrimoineTab({ currency, onCurrencyChange }: Props) {
  const [summary, setSummary] = useState<any>(null);
  const [accounts, setAccounts] = useState<any[]>([]);
  const [stocks, setStocks] = useState<any[]>([]);
  const [cryptos, setCryptos] = useState<any[]>([]);
  const [assets, setAssets] = useState<any[]>([]);
  const [transactions, setTransactions] = useState<any[]>([]);

  const [modal, setModal] = useState<null | "account" | "stock" | "crypto" | "asset">(null);
  const [editing, setEditing] = useState<any>(null);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    const [s, a, st, c, o, t] = await Promise.all([
      fetch(`/api/finances/summary?currency=${currency}`).then(r => r.json()),
      fetch("/api/finances/accounts").then(r => r.json()),
      fetch("/api/finances/stocks").then(r => r.json()),
      fetch("/api/finances/cryptos").then(r => r.json()),
      fetch("/api/finances/assets").then(r => r.json()),
      fetch("/api/finances/transactions?limit=10").then(r => r.json()),
    ]);
    setSummary(s);
    setAccounts(a);
    setStocks(st);
    setCryptos(c);
    setAssets(o);
    setTransactions(t);
  }, [currency]);

  useEffect(() => { load(); }, [load]);

  return (
    <div className="space-y-4 animate-fade-in">

      {/* Hero patrimoine */}
      <Card gradient glow="blue">
        <div className="flex items-start justify-between mb-2">
          <div>
            <p className="text-foreground-muted text-xs uppercase tracking-wider">Patrimoine total</p>
            <h2 className="font-heading text-4xl font-bold text-foreground mt-1">
              {summary ? formatMoney(summary.total, currency) : "..."}
            </h2>
          </div>
          <select
            value={currency}
            onChange={e => onCurrencyChange(e.target.value)}
            className="bg-surface border border-border rounded-xl px-3 py-2 text-foreground text-sm focus:outline-none focus:border-accent-blue cursor-pointer"
          >
            {CURRENCIES.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>

        {/* Breakdown */}
        {summary && (
          <div className="grid grid-cols-4 gap-2 mt-3">
            <BreakdownItem label="Comptes" value={summary.accountsTotal} total={summary.total} currency={currency} />
            <BreakdownItem label="Actions" value={summary.stocksTotal} total={summary.total} currency={currency} />
            <BreakdownItem label="Crypto" value={summary.cryptosTotal} total={summary.total} currency={currency} />
            <BreakdownItem label="Assets" value={summary.assetsTotal} total={summary.total} currency={currency} />
          </div>
        )}

        {/* Graphique évolution */}
        {summary?.history && summary.history.length > 1 && (
          <div className="mt-4 -mx-1">
            <ResponsiveContainer width="100%" height={120}>
              <AreaChart data={summary.history} margin={{ top: 4, right: 4, left: 4, bottom: 0 }}>
                <defs>
                  <linearGradient id="patGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#3B82F6" stopOpacity={0.4} />
                    <stop offset="100%" stopColor="#3B82F6" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="date" hide />
                <YAxis hide domain={["auto", "auto"]} />
                <Tooltip
                  contentStyle={{ background: "#0F172A", border: "1px solid #334155", borderRadius: 12, fontSize: 12 }}
                  formatter={(v: any) => [formatMoney(v, "EUR"), "Patrimoine"]}
                  labelFormatter={l => format(parseISO(l), "dd MMM yyyy", { locale: fr })}
                />
                <Area type="monotone" dataKey="total_eur" stroke="#3B82F6" strokeWidth={2} fill="url(#patGrad)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        )}
      </Card>

      {/* Donut chart de répartition */}
      {summary && summary.total > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Répartition du patrimoine</CardTitle>
            <span className="text-xs text-foreground-muted">{currency}</span>
          </CardHeader>
          {(() => {
            const data = [
              { name: "Comptes", value: summary.accountsTotal, color: "#3B82F6" },
              { name: "Actions", value: summary.stocksTotal, color: "#22C55E" },
              { name: "Cryptos", value: summary.cryptosTotal, color: "#F59E0B" },
              { name: "Assets", value: summary.assetsTotal, color: "#8B5CF6" },
            ].filter(d => d.value > 0);
            return (
              <div className="flex items-center gap-3">
                <ResponsiveContainer width="55%" height={180}>
                  <PieChart>
                    <Pie
                      data={data}
                      cx="50%"
                      cy="50%"
                      innerRadius={48}
                      outerRadius={75}
                      paddingAngle={2}
                      dataKey="value"
                      stroke="none"
                    >
                      {data.map((entry, i) => (
                        <Cell key={i} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{ background: "#0F172A", border: "1px solid #334155", borderRadius: 12, fontSize: 12 }}
                      formatter={(v: any, _name: any, props: any) => [
                        `${formatMoney(v, currency)} (${((v / summary.total) * 100).toFixed(1)}%)`,
                        props.payload.name
                      ]}
                    />
                  </PieChart>
                </ResponsiveContainer>
                <div className="flex-1 space-y-2">
                  {data.map(d => {
                    const pct = (d.value / summary.total) * 100;
                    return (
                      <div key={d.name} className="flex items-center gap-2">
                        <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: d.color }} />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-baseline justify-between">
                            <span className="text-xs text-foreground-muted">{d.name}</span>
                            <span className="text-xs font-bold" style={{ color: d.color }}>{pct.toFixed(1)}%</span>
                          </div>
                          <p className="text-xs font-semibold text-foreground">{formatMoney(d.value, currency, true)}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })()}
        </Card>
      )}

      {/* 4 sections en grille 2x2 */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">

        {/* Mes comptes */}
        <Section
          title="Mes Comptes"
          icon={Building2}
          color="blue"
          onAdd={() => { setEditing(null); setModal("account"); }}
        >
          {accounts.length === 0 && <Empty text="Aucun compte" />}
          {accounts.map(a => (
            <Row key={a.id}
              title={a.name}
              subtitle={a.type}
              value={formatMoney(a.balance, a.currency)}
              onEdit={() => { setEditing(a); setModal("account"); }}
              onDelete={async () => {
                if (!confirm(`Supprimer ${a.name} ?`)) return;
                await fetch(`/api/finances/accounts/${a.id}`, { method: "DELETE" });
                load();
              }}
            />
          ))}
        </Section>

        {/* Mes actions */}
        <Section
          title="Mes Actions"
          icon={LineIcon}
          color="green"
          onAdd={() => { setEditing(null); setModal("stock"); }}
        >
          {stocks.length === 0 && <Empty text="Aucune action" />}
          {stocks.map(s => {
            const value = (s.current_price ?? s.avg_price ?? 0) * s.quantity;
            return (
              <Row key={s.id}
                title={s.ticker}
                subtitle={`${s.quantity} × ${formatMoney(s.current_price ?? s.avg_price ?? 0, s.currency)}`}
                value={formatMoney(value, s.currency)}
                onEdit={() => { setEditing(s); setModal("stock"); }}
                onDelete={async () => {
                  if (!confirm(`Supprimer ${s.ticker} ?`)) return;
                  await fetch(`/api/finances/stocks/${s.id}`, { method: "DELETE" });
                  load();
                }}
              />
            );
          })}
        </Section>

        {/* Mes cryptos */}
        <Section
          title="Mes Cryptos"
          icon={Coins}
          color="amber"
          onAdd={() => { setEditing(null); setModal("crypto"); }}
        >
          {cryptos.length === 0 && <Empty text="Aucune crypto" />}
          {cryptos.map(c => {
            const value = (c.current_price ?? c.avg_price ?? 0) * c.quantity;
            return (
              <Row key={c.id}
                title={c.symbol}
                subtitle={`${c.quantity} × $${(c.current_price ?? c.avg_price ?? 0).toLocaleString("fr-FR")}`}
                value={`$${value.toLocaleString("fr-FR", { maximumFractionDigits: 2 })}`}
                onEdit={() => { setEditing(c); setModal("crypto"); }}
                onDelete={async () => {
                  if (!confirm(`Supprimer ${c.symbol} ?`)) return;
                  await fetch(`/api/finances/cryptos/${c.id}`, { method: "DELETE" });
                  load();
                }}
              />
            );
          })}
        </Section>

        {/* Autres assets */}
        <Section
          title="Autres Assets"
          icon={Home}
          color="purple"
          onAdd={() => { setEditing(null); setModal("asset"); }}
        >
          {assets.length === 0 && <Empty text="Aucun asset" />}
          {assets.map(a => (
            <Row key={a.id}
              title={a.name}
              subtitle={a.category || "Asset"}
              value={formatMoney(a.value, a.currency)}
              onEdit={() => { setEditing(a); setModal("asset"); }}
              onDelete={async () => {
                if (!confirm(`Supprimer ${a.name} ?`)) return;
                await fetch(`/api/finances/assets/${a.id}`, { method: "DELETE" });
                load();
              }}
            />
          ))}
        </Section>

      </div>

      {/* Historique des transactions */}
      <Card>
        <CardHeader>
          <CardTitle>Historique entrées / sorties</CardTitle>
          <TrendingUp size={16} className="text-accent-blue" />
        </CardHeader>
        {transactions.length === 0 && <Empty text="Aucune transaction" />}
        <div className="space-y-2">
          {transactions.map(t => (
            <div key={t.id} className="flex items-center gap-3 py-1.5 border-b border-border/30 last:border-0">
              <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0",
                t.amount >= 0 ? "bg-accent-green/15" : "bg-accent-red/15"
              )}>
                {t.amount >= 0
                  ? <ArrowUpRight size={14} className="text-accent-green" />
                  : <ArrowDownRight size={14} className="text-accent-red" />
                }
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{t.description || t.type}</p>
                <p className="text-[10px] text-foreground-muted">
                  {t.account_name || "—"} · {format(parseISO(t.date), "dd MMM yyyy", { locale: fr })}
                </p>
              </div>
              <span className={cn("font-semibold text-sm",
                t.amount >= 0 ? "text-accent-green" : "text-accent-red"
              )}>
                {t.amount >= 0 ? "+" : ""}{formatMoney(t.amount, t.account_currency || currency)}
              </span>
            </div>
          ))}
        </div>
      </Card>

      {/* Modals */}
      {modal === "account" && (
        <AccountModal
          editing={editing}
          onClose={() => { setModal(null); setEditing(null); }}
          onSaved={() => { load(); setModal(null); setEditing(null); }}
        />
      )}
      {modal === "stock" && (
        <StockModal
          editing={editing}
          onClose={() => { setModal(null); setEditing(null); }}
          onSaved={() => { load(); setModal(null); setEditing(null); }}
        />
      )}
      {modal === "crypto" && (
        <CryptoModal
          editing={editing}
          onClose={() => { setModal(null); setEditing(null); }}
          onSaved={() => { load(); setModal(null); setEditing(null); }}
        />
      )}
      {modal === "asset" && (
        <AssetModal
          editing={editing}
          onClose={() => { setModal(null); setEditing(null); }}
          onSaved={() => { load(); setModal(null); setEditing(null); }}
        />
      )}
    </div>
  );
}

// ───── Sub-components ─────────────────────────────────────────────────────────

function BreakdownItem({ label, value, total, currency }: { label: string; value: number; total: number; currency: string }) {
  const pct = total > 0 ? Math.round((value / total) * 100) : 0;
  return (
    <div className="text-center bg-surface/60 rounded-xl py-2 px-1">
      <p className="text-[9px] text-foreground-muted uppercase">{label}</p>
      <p className="font-heading text-sm font-bold text-foreground mt-0.5">{formatMoney(value, currency, true)}</p>
      <p className="text-[10px] text-accent-blue">{pct}%</p>
    </div>
  );
}

function Section({ title, icon: Icon, color, children, onAdd }: any) {
  const colorMap: any = {
    blue: "text-accent-blue", green: "text-accent-green", amber: "text-accent-amber", purple: "text-accent-purple"
  };
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Icon size={16} className={colorMap[color]} />
          <CardTitle>{title}</CardTitle>
        </div>
        <button
          onClick={onAdd}
          className="w-7 h-7 rounded-lg bg-surface-2 hover:bg-surface flex items-center justify-center cursor-pointer text-foreground-muted hover:text-accent-blue transition-colors"
          aria-label="Ajouter"
        >
          <Plus size={14} />
        </button>
      </CardHeader>
      <div className="space-y-1.5">{children}</div>
    </Card>
  );
}

function Row({ title, subtitle, value, onEdit, onDelete }: any) {
  return (
    <div className="flex items-center gap-2 py-1.5 border-b border-border/30 last:border-0">
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-foreground truncate">{title}</p>
        {subtitle && <p className="text-[10px] text-foreground-muted truncate">{subtitle}</p>}
      </div>
      <span className="text-sm font-semibold text-foreground whitespace-nowrap">{value}</span>
      <div className="flex gap-0.5">
        <button onClick={onEdit} className="p-1 text-muted hover:text-accent-blue cursor-pointer transition-colors">
          <Edit3 size={12} />
        </button>
        <button onClick={onDelete} className="p-1 text-muted hover:text-accent-red cursor-pointer transition-colors">
          <Trash2 size={12} />
        </button>
      </div>
    </div>
  );
}

function Empty({ text }: { text: string }) {
  return <p className="text-xs text-foreground-muted text-center py-3">{text}</p>;
}

// ───── Modals ─────────────────────────────────────────────────────────────────

function AccountModal({ editing, onClose, onSaved }: any) {
  const [form, setForm] = useState({
    name: editing?.name || "",
    balance: editing?.balance?.toString() || "0",
    currency: editing?.currency || "EUR",
    type: editing?.type || "checking",
  });
  const [saving, setSaving] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault(); setSaving(true);
    const body = { ...form, balance: parseFloat(form.balance) };
    if (editing) {
      await fetch(`/api/finances/accounts/${editing.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    } else {
      await fetch("/api/finances/accounts", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    }
    setSaving(false); onSaved();
  };

  return (
    <Modal open onClose={onClose} title={editing ? "Modifier le compte" : "Nouveau compte"}>
      <form onSubmit={submit} className="space-y-4">
        <Input label="Nom du compte" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} required placeholder="Compte courant BNP" />
        <div className="grid grid-cols-2 gap-3">
          <Input label="Solde" type="number" step="0.01" value={form.balance} onChange={e => setForm(f => ({ ...f, balance: e.target.value }))} required />
          <div>
            <label className="text-sm font-medium text-foreground-muted block mb-1">Devise</label>
            <select value={form.currency} onChange={e => setForm(f => ({ ...f, currency: e.target.value }))} className="w-full bg-surface border border-border rounded-xl px-3 py-2.5 text-foreground text-sm min-h-[44px] focus:outline-none focus:border-accent-blue">
              {CURRENCIES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
        </div>
        <div>
          <label className="text-sm font-medium text-foreground-muted block mb-1">Type</label>
          <select value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value }))} className="w-full bg-surface border border-border rounded-xl px-3 py-2.5 text-foreground text-sm min-h-[44px] focus:outline-none focus:border-accent-blue">
            <option value="checking">Courant</option>
            <option value="savings">Épargne</option>
            <option value="investment">Investissement</option>
            <option value="cash">Liquide</option>
          </select>
        </div>
        <Button type="submit" loading={saving} className="w-full">Enregistrer</Button>
      </form>
    </Modal>
  );
}

function StockModal({ editing, onClose, onSaved }: any) {
  const [form, setForm] = useState({
    ticker: editing?.ticker || "",
    name: editing?.name || "",
    quantity: editing?.quantity?.toString() || "",
    avg_price: editing?.avg_price?.toString() || "",
    currency: editing?.currency || "USD",
  });
  const [saving, setSaving] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault(); setSaving(true);
    const body = { ...form, quantity: parseFloat(form.quantity), avg_price: form.avg_price ? parseFloat(form.avg_price) : null };
    if (editing) {
      await fetch(`/api/finances/stocks/${editing.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    } else {
      await fetch("/api/finances/stocks", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    }
    setSaving(false); onSaved();
  };

  return (
    <Modal open onClose={onClose} title={editing ? "Modifier l'action" : "Nouvelle action"}>
      <form onSubmit={submit} className="space-y-4">
        <Input label="Ticker (ex: AAPL, MSFT, GOOGL)" value={form.ticker} onChange={e => setForm(f => ({ ...f, ticker: e.target.value.toUpperCase() }))} required placeholder="AAPL" />
        <Input label="Nom (optionnel)" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Apple Inc." />
        <div className="grid grid-cols-2 gap-3">
          <Input label="Quantité" type="number" step="0.0001" value={form.quantity} onChange={e => setForm(f => ({ ...f, quantity: e.target.value }))} required />
          <Input label="Prix moyen achat" type="number" step="0.01" value={form.avg_price} onChange={e => setForm(f => ({ ...f, avg_price: e.target.value }))} placeholder="Optionnel" />
        </div>
        <p className="text-xs text-foreground-muted">Le prix actuel sera récupéré automatiquement depuis Yahoo Finance.</p>
        <Button type="submit" loading={saving} className="w-full">Enregistrer</Button>
      </form>
    </Modal>
  );
}

function CryptoModal({ editing, onClose, onSaved }: any) {
  const [form, setForm] = useState({
    symbol: editing?.symbol || "",
    quantity: editing?.quantity?.toString() || "",
    avg_price: editing?.avg_price?.toString() || "",
  });
  const [saving, setSaving] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault(); setSaving(true);
    const body = { ...form, quantity: parseFloat(form.quantity), avg_price: form.avg_price ? parseFloat(form.avg_price) : null };
    if (editing) {
      await fetch(`/api/finances/cryptos/${editing.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    } else {
      await fetch("/api/finances/cryptos", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    }
    setSaving(false); onSaved();
  };

  return (
    <Modal open onClose={onClose} title={editing ? "Modifier la crypto" : "Nouvelle crypto"}>
      <form onSubmit={submit} className="space-y-4">
        <Input label="Symbole (BTC, ETH, SOL, ADA...)" value={form.symbol} onChange={e => setForm(f => ({ ...f, symbol: e.target.value.toUpperCase() }))} required placeholder="BTC" />
        <div className="grid grid-cols-2 gap-3">
          <Input label="Quantité" type="number" step="0.00000001" value={form.quantity} onChange={e => setForm(f => ({ ...f, quantity: e.target.value }))} required />
          <Input label="Prix moyen ($)" type="number" step="0.01" value={form.avg_price} onChange={e => setForm(f => ({ ...f, avg_price: e.target.value }))} placeholder="Optionnel" />
        </div>
        <p className="text-xs text-foreground-muted">Le prix actuel sera récupéré automatiquement depuis CoinGecko (en USD).</p>
        <Button type="submit" loading={saving} className="w-full">Enregistrer</Button>
      </form>
    </Modal>
  );
}

function AssetModal({ editing, onClose, onSaved }: any) {
  const [form, setForm] = useState({
    name: editing?.name || "",
    value: editing?.value?.toString() || "",
    currency: editing?.currency || "EUR",
    category: editing?.category || "real_estate",
    notes: editing?.notes || "",
  });
  const [saving, setSaving] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault(); setSaving(true);
    const body = { ...form, value: parseFloat(form.value) };
    if (editing) {
      await fetch(`/api/finances/assets/${editing.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    } else {
      await fetch("/api/finances/assets", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    }
    setSaving(false); onSaved();
  };

  return (
    <Modal open onClose={onClose} title={editing ? "Modifier l'asset" : "Nouvel asset"}>
      <form onSubmit={submit} className="space-y-4">
        <Input label="Nom" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} required placeholder="Appartement Paris 11e" />
        <div className="grid grid-cols-2 gap-3">
          <Input label="Valeur" type="number" step="0.01" value={form.value} onChange={e => setForm(f => ({ ...f, value: e.target.value }))} required placeholder="192000" />
          <div>
            <label className="text-sm font-medium text-foreground-muted block mb-1">Devise</label>
            <select value={form.currency} onChange={e => setForm(f => ({ ...f, currency: e.target.value }))} className="w-full bg-surface border border-border rounded-xl px-3 py-2.5 text-foreground text-sm min-h-[44px] focus:outline-none focus:border-accent-blue">
              {CURRENCIES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
        </div>
        <div>
          <label className="text-sm font-medium text-foreground-muted block mb-1">Catégorie</label>
          <select value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))} className="w-full bg-surface border border-border rounded-xl px-3 py-2.5 text-foreground text-sm min-h-[44px] focus:outline-none focus:border-accent-blue">
            <option value="real_estate">Immobilier</option>
            <option value="vehicle">Véhicule</option>
            <option value="art">Art / Collection</option>
            <option value="business">Entreprise</option>
            <option value="other">Autre</option>
          </select>
        </div>
        <Input label="Notes" value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} placeholder="Optionnel" />
        <Button type="submit" loading={saving} className="w-full">Enregistrer</Button>
      </form>
    </Modal>
  );
}
