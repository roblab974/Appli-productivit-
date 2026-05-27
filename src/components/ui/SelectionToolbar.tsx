"use client";

import { CheckSquare, Square, X, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface Props {
  selectionMode: boolean;
  selectedCount: number;
  totalCount: number;
  onToggleMode: () => void;
  onSelectAll: () => void;
  onClear: () => void;
  onDelete: () => void;
  label?: string;
}

/**
 * Barre de sélection multiple à placer en haut d'une liste.
 * - Si selectionMode est désactivé : affiche juste "Sélectionner"
 * - Si activé : affiche la barre avec compteur + actions
 */
export default function SelectionToolbar({
  selectionMode, selectedCount, totalCount,
  onToggleMode, onSelectAll, onClear, onDelete,
  label = "éléments",
}: Props) {
  if (!selectionMode) {
    if (totalCount === 0) return null;
    return (
      <div className="flex justify-end mb-2">
        <button
          onClick={onToggleMode}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-surface text-foreground-muted hover:text-foreground border border-border cursor-pointer transition-colors"
        >
          <CheckSquare size={13} /> Sélectionner
        </button>
      </div>
    );
  }

  const allSelected = selectedCount === totalCount && totalCount > 0;

  return (
    <div className="sticky top-0 z-20 -mx-4 px-4 py-2.5 mb-3 bg-background/90 backdrop-blur-md border-b border-border/50 flex items-center gap-2">
      <button
        onClick={allSelected ? onClear : onSelectAll}
        className="flex items-center gap-1.5 px-2 py-1.5 rounded-lg text-xs font-medium hover:bg-surface cursor-pointer transition-colors"
      >
        {allSelected
          ? <CheckSquare size={14} className="text-accent-blue" />
          : <Square size={14} className="text-foreground-muted" />}
        <span className={cn(allSelected ? "text-accent-blue" : "text-foreground-muted")}>
          {allSelected ? "Tout désélec." : "Tout sélec."}
        </span>
      </button>

      <span className="text-xs text-foreground-muted flex-1">
        {selectedCount} {label}
      </span>

      <button
        onClick={onDelete}
        disabled={selectedCount === 0}
        className={cn(
          "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer",
          selectedCount === 0
            ? "bg-surface text-foreground-muted opacity-50 cursor-not-allowed"
            : "bg-accent-red/15 text-accent-red border border-accent-red/30 hover:bg-accent-red/25"
        )}
      >
        <Trash2 size={13} /> Supprimer
      </button>

      <button
        onClick={onToggleMode}
        className="p-1.5 rounded-lg text-foreground-muted hover:text-foreground hover:bg-surface cursor-pointer transition-colors"
        aria-label="Annuler"
      >
        <X size={14} />
      </button>
    </div>
  );
}

/**
 * Petite checkbox réutilisable à placer dans chaque ligne sélectionnable.
 */
export function SelectCheckbox({ checked, onChange }: { checked: boolean; onChange: () => void }) {
  return (
    <button
      onClick={(e) => { e.stopPropagation(); onChange(); }}
      className="flex-shrink-0 cursor-pointer active:scale-90 transition-transform"
      aria-label={checked ? "Désélectionner" : "Sélectionner"}
    >
      {checked
        ? <CheckSquare size={18} className="text-accent-blue" />
        : <Square size={18} className="text-foreground-muted hover:text-foreground transition-colors" />}
    </button>
  );
}
