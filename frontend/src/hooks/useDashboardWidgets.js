import { useCallback, useEffect, useState } from "react";

function loadJson(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw);
  } catch {
    return fallback;
  }
}

export function useDashboardWidgets(storageKey, widgetDefs) {
  const defaultOrder = widgetDefs.map((w) => w.id);
  const defaultOpen = Object.fromEntries(
    widgetDefs.map((w) => [w.id, !!w.defaultOpen]),
  );

  const [order, setOrder] = useState(() => loadJson(`${storageKey}-order`, defaultOrder));
  const [open, setOpen] = useState(() => loadJson(`${storageKey}-open`, defaultOpen));

  useEffect(() => {
    localStorage.setItem(`${storageKey}-order`, JSON.stringify(order));
  }, [storageKey, order]);

  useEffect(() => {
    localStorage.setItem(`${storageKey}-open`, JSON.stringify(open));
  }, [storageKey, open]);

  const toggle = useCallback((id) => {
    setOpen((p) => ({ ...p, [id]: !p[id] }));
  }, []);

  const expandAll = useCallback(() => {
    setOpen(Object.fromEntries(order.map((id) => [id, true])));
  }, [order]);

  const collapseAll = useCallback(() => {
    setOpen(Object.fromEntries(order.map((id) => [id, false])));
  }, [order]);

  const resetLayout = useCallback(() => {
    setOrder(defaultOrder);
    setOpen(defaultOpen);
    localStorage.removeItem(`${storageKey}-order`);
    localStorage.removeItem(`${storageKey}-open`);
  }, [storageKey, defaultOrder, defaultOpen]);

  const move = useCallback((id, direction) => {
    setOrder((prev) => {
      const idx = prev.indexOf(id);
      if (idx < 0) return prev;
      const j = direction === "up" ? idx - 1 : idx + 1;
      if (j < 0 || j >= prev.length) return prev;
      const next = [...prev];
      [next[idx], next[j]] = [next[j], next[idx]];
      return next;
    });
  }, []);

  return { order, open, toggle, expandAll, collapseAll, resetLayout, move };
}
