"use client";

import { useCallback, useState } from "react";

/**
 * Hook utilitaire pour gérer la sélection multiple dans une liste.
 *
 * Usage :
 *   const sel = useSelection<number>();
 *   ...
 *   <SelectCheckbox checked={sel.isSelected(item.id)} onChange={() => sel.toggle(item.id)} />
 *   <SelectionToolbar
 *     selectionMode={sel.mode}
 *     selectedCount={sel.size}
 *     totalCount={items.length}
 *     onToggleMode={sel.toggleMode}
 *     onSelectAll={() => sel.selectAll(items.map(i => i.id))}
 *     onClear={sel.clear}
 *     onDelete={() => handleBulkDelete(sel.ids)}
 *   />
 */
export function useSelection<T extends string | number = number>() {
  const [mode, setMode] = useState(false);
  const [set, setSet] = useState<Set<T>>(new Set());

  const toggle = useCallback((id: T) => {
    setSet(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }, []);

  const selectAll = useCallback((ids: T[]) => {
    setSet(new Set(ids));
  }, []);

  const clear = useCallback(() => setSet(new Set()), []);

  const toggleMode = useCallback(() => {
    setMode(m => {
      if (m) setSet(new Set());
      return !m;
    });
  }, []);

  const exitMode = useCallback(() => {
    setMode(false);
    setSet(new Set());
  }, []);

  const isSelected = useCallback((id: T) => set.has(id), [set]);

  return {
    mode,
    size: set.size,
    ids: Array.from(set),
    isSelected,
    toggle,
    selectAll,
    clear,
    toggleMode,
    exitMode,
  };
}
