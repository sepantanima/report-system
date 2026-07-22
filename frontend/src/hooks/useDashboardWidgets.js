import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import commandCenterService from "../services/commandCenterService.js";

function loadJson(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw);
  } catch {
    return fallback;
  }
}

/**
 * چیدمان ویجت داشبورد: localStorage + همگام‌سازی اختیاری با سرور
 */
export function useDashboardWidgets(storageKey, widgetDefs, { syncServer = false } = {}) {
  const defaultOrder = useMemo(() => widgetDefs.map((w) => w.id), [widgetDefs]);
  const defaultOpen = useMemo(
    () => Object.fromEntries(widgetDefs.map((w) => [w.id, !!w.defaultOpen])),
    [widgetDefs],
  );
  const defaultVisible = useMemo(
    () => Object.fromEntries(widgetDefs.map((w) => [w.id, true])),
    [widgetDefs],
  );

  const [order, setOrder] = useState(() => {
    const saved = loadJson(`${storageKey}-order`, defaultOrder);
    const known = new Set(defaultOrder);
    const filtered = saved.filter((id) => known.has(id));
    for (const id of defaultOrder) if (!filtered.includes(id)) filtered.push(id);
    return filtered;
  });
  const [open, setOpen] = useState(() => ({ ...defaultOpen, ...loadJson(`${storageKey}-open`, {}) }));
  const [visible, setVisible] = useState(() => ({ ...defaultVisible, ...loadJson(`${storageKey}-visible`, {}) }));
  const hydrated = useRef(false);
  const skipNextSave = useRef(false);

  useEffect(() => {
    if (!syncServer) return;
    let cancelled = false;
    commandCenterService
      .dashboardLayout()
      .then((res) => {
        if (cancelled || !res?.layout) return;
        const L = res.layout;
        skipNextSave.current = true;
        if (Array.isArray(L.order) && L.order.length) {
          const known = new Set(defaultOrder);
          const next = L.order.filter((id) => known.has(id));
          for (const id of defaultOrder) if (!next.includes(id)) next.push(id);
          setOrder(next);
        }
        if (L.open && typeof L.open === "object") setOpen((p) => ({ ...p, ...L.open }));
        if (L.visible && typeof L.visible === "object") setVisible((p) => ({ ...p, ...L.visible }));
        hydrated.current = true;
      })
      .catch(() => {
        hydrated.current = true;
      });
    return () => {
      cancelled = true;
    };
  }, [syncServer, defaultOrder]);

  useEffect(() => {
    localStorage.setItem(`${storageKey}-order`, JSON.stringify(order));
  }, [storageKey, order]);

  useEffect(() => {
    localStorage.setItem(`${storageKey}-open`, JSON.stringify(open));
  }, [storageKey, open]);

  useEffect(() => {
    localStorage.setItem(`${storageKey}-visible`, JSON.stringify(visible));
  }, [storageKey, visible]);

  useEffect(() => {
    if (!syncServer) return;
    if (skipNextSave.current) {
      skipNextSave.current = false;
      return;
    }
    const t = setTimeout(() => {
      commandCenterService
        .saveDashboardLayout({ order, open, visible })
        .catch(() => {});
    }, 600);
    return () => clearTimeout(t);
  }, [syncServer, order, open, visible]);

  const toggle = useCallback((id) => {
    setOpen((p) => ({ ...p, [id]: !p[id] }));
  }, []);

  const toggleVisible = useCallback((id) => {
    setVisible((p) => ({ ...p, [id]: p[id] === false }));
  }, []);

  const setWidgetVisible = useCallback((id, val) => {
    setVisible((p) => ({ ...p, [id]: !!val }));
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
    setVisible(defaultVisible);
    localStorage.removeItem(`${storageKey}-order`);
    localStorage.removeItem(`${storageKey}-open`);
    localStorage.removeItem(`${storageKey}-visible`);
    if (syncServer) {
      commandCenterService.saveDashboardLayout({
        order: defaultOrder,
        open: defaultOpen,
        visible: defaultVisible,
      }).catch(() => {});
    }
  }, [storageKey, defaultOrder, defaultOpen, defaultVisible, syncServer]);

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

  return {
    order,
    open,
    visible,
    toggle,
    toggleVisible,
    setWidgetVisible,
    expandAll,
    collapseAll,
    resetLayout,
    move,
  };
}
