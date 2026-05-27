"use client";

import { useEffect, useState, useCallback } from "react";
import { Wallet, Repeat, ShoppingBag, Heart } from "lucide-react";
import PageHeader from "@/components/ui/PageHeader";
import { cn } from "@/lib/utils";
import PatrimoineTab from "./PatrimoineTab";
import SubscriptionsTab from "./SubscriptionsTab";
import PurchasesTab from "./PurchasesTab";
import WishlistTab from "./WishlistTab";

type Tab = "patrimoine" | "subscriptions" | "purchases" | "wishlist";

const TABS = [
  { key: "patrimoine" as Tab, label: "Patrimoine", icon: Wallet },
  { key: "subscriptions" as Tab, label: "Abonnements", icon: Repeat },
  { key: "purchases" as Tab, label: "Achats", icon: ShoppingBag },
  { key: "wishlist" as Tab, label: "Wishlist", icon: Heart },
];

export default function FinancesClient() {
  const [tab, setTab] = useState<Tab>("patrimoine");
  const [currency, setCurrency] = useState("EUR");

  // Charger la devise d'affichage au montage
  useEffect(() => {
    fetch("/api/finances/settings").then(r => r.json()).then(d => {
      if (d.display_currency) setCurrency(d.display_currency);
    }).catch(() => {});
  }, []);

  const changeCurrency = useCallback(async (c: string) => {
    setCurrency(c);
    await fetch("/api/finances/settings", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ display_currency: c }),
    });
  }, []);

  return (
    <div className="px-4 pb-4 max-w-lg mx-auto">
      <PageHeader title="Finances" />

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

      {tab === "patrimoine" && <PatrimoineTab currency={currency} onCurrencyChange={changeCurrency} />}
      {tab === "subscriptions" && <SubscriptionsTab currency={currency} />}
      {tab === "purchases" && <PurchasesTab currency={currency} />}
      {tab === "wishlist" && <WishlistTab currency={currency} />}
    </div>
  );
}
