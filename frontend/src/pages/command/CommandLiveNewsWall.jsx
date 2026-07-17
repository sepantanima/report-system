import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowRight, RefreshCw, Send, Sun, Moon, HelpCircle, Type, X } from "lucide-react";
import { useAppTheme } from "../../context/ThemeContext.jsx";
import { getSessionRoles, hasPermission } from "../../utils/userRoles.js";
import { toPersianDigits } from "../../utils/analysisMonitorUtils.js";
import commandCenterService from "../../services/commandCenterService.js";
import "./CommandLiveNewsWall.css";

const POLL_MS = 12000;
const VIEW_KEY = "command-live-news-view";
const FILTERS_KEY = "command-live-news-filters-collapsed";
const STATS_KEY = "command-live-news-stats-collapsed";
const SETTINGS_KEY = "command-live-news-settings-collapsed";
const DAYS_KEY = "command-live-news-days";
const KIND_KEY = "command-live-news-kind";
const FONT_KEY = "command-live-news-font";
const SCROLL_KEY = "command-live-news-scroll";
const SOURCE_W_KEY = "command-live-news-source-w";

const KIND_FILTERS = [
  { key: "all", label: "همه" },
  { key: "news", label: "اخبار" },
  { key: "field", label: "رصد میدانی" },
];

const STATUS_KEYS = [
  { key: "ok", label: "تأیید شده" },
  { key: "pending", label: "در حال بررسی" },
  { key: "reject", label: "تأیید نشده" },
  { key: "rumor", label: "شایعه" },
];

const PRIO_FILTER_KEYS = [
  { key: "urgent", label: "فوری", priority: 1 },
  { key: "important", label: "مهم", priority: 2 },
  { key: "medium", label: "عادی", priority: 3 },
  { key: "normal", label: "کم‌اهمیت", priority: 4 },
];

function priorityFilterKey(priority) {
  const p = Math.min(4, Math.max(1, parseInt(priority, 10) || 3));
  if (p === 1) return "urgent";
  if (p === 2) return "important";
  if (p === 3) return "medium";
  return "normal";
}

function toggleKey(set, key) {
  set((prev) => {
    const next = new Set(prev);
    if (next.has(key)) next.delete(key);
    else next.add(key);
    return next;
  });
}

const FONT_LEVELS = {
  1: { label: "خیلی کوچک", px: 11 },
  2: { label: "کوچک", px: 13 },
  3: { label: "متوسط", px: 14 },
  4: { label: "بزرگ", px: 16 },
  5: { label: "خیلی بزرگ", px: 18 },
  6: { label: "بزرگ‌ترین", px: 21 },
};

/** پیش‌فرض = عادی (۰.۹) — همان سرعت فعلی */
const SCROLL_SPEEDS = {
  1: { label: "آهسته", step: 0.35 },
  2: { label: "عادی", step: 0.9 },
  3: { label: "تند", step: 1.7 },
  4: { label: "خیلی تند", step: 2.8 },
};

const FONT_ALLOWED = [1, 2, 3, 4, 5, 6];
const DEFAULT_FONT = 3;

const TYPE_COLORS = {
  confirm: "#22c55e",
  deny: "#ef4444",
  investigate: "#f59e0b",
  note: "#38bdf8",
};

const STATUS_LABELS = {
  ok: "تأیید",
  reject: "رد",
  rumor: "شایعه",
  pending: "بررسی",
};

function readIntPref(key, fallback, allowed) {
  const v = parseInt(localStorage.getItem(key), 10);
  return allowed.includes(v) ? v : fallback;
}

function toImpClass(priority) {
  const p = Math.min(4, Math.max(1, parseInt(priority, 10) || 3));
  return ({ 1: 5, 2: 4, 3: 3, 4: 1 })[p] || 3;
}

function feedKeyOf(item) {
  if (!item) return null;
  return item.feed_key || `${item.kind || "news"}:${item.id}`;
}

function normalizeStatus(item) {
  if (item?.kind === "field") return "ok";
  const rs = String(item?.review_state || "").toLowerCase();
  if (rs === "approved") return "ok";
  if (rs === "rejected") return "reject";
  if (rs === "rumor") return "rumor";
  return "pending";
}

function stripPreview(text, max = 280) {
  const t = String(text || "").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
  if (t.length <= max) return t;
  return `${t.slice(0, max)}…`;
}

function formatTimeHmDisplay(raw) {
  if (raw == null || raw === "") return "";
  const digits = String(raw).replace(/[^\d]/g, "");
  if (digits.length < 3) return String(raw).trim();
  const padded = digits.padStart(4, "0").slice(-4);
  return `${padded.slice(0, 2)}:${padded.slice(2, 4)}`;
}

function formatNewsDate(item) {
  const d = String(item.source_date_jalali || item.relay_date_jalali || item.event_date_jalali || "").replace(/-/g, "/");
  const t = formatTimeHmDisplay(item.source_time_hm || item.relay_time_hm || "");
  return toPersianDigits(`${d}${t ? ` ${t}` : ""}`.trim());
}

/** دامنه‌ی انتشار / نوع راز گزارش میدانی — «خاص» در تالار نمایش داده نمی‌شود */
const CLASSIFICATION_META = {
  1: { label: "عمومی", color: "#10b981" },
  2: { label: "استانی", color: "#3b82f6" },
  3: { label: "واحد", color: "#f59e0b" },
};

function ClassificationChip({ value }) {
  const meta = CLASSIFICATION_META[Number(value)] || CLASSIFICATION_META[1];
  return (
    <span
      className="clw-class-chip"
      style={{ color: meta.color, borderColor: `${meta.color}66`, background: `${meta.color}22` }}
      title="نوع راز / دامنه انتشار"
    >
      {meta.label}
    </span>
  );
}

function fullItemText(item) {
  return String(item?.cleaned_text || item?.summary || item?.raw_text || item?.title || "").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
}

function KindBadge({ kind }) {
  if (kind === "field") {
    return <span className="clw-kind-chip clw-kind-field">میدانی</span>;
  }
  return <span className="clw-kind-chip clw-kind-news">خبر</span>;
}

function StatusBadge({ status, kind }) {
  const key = STATUS_LABELS[status] ? status : "pending";
  const label = kind === "field" && key === "ok" ? "تأیید رصد" : STATUS_LABELS[key];
  return <span className={`clw-badge clw-badge-${key}${kind === "field" ? " clw-badge-field" : ""}`}>{label}</span>;
}

const PRIO_LABELS = {
  5: "فوری",
  4: "مهم",
  3: "عادی",
  2: "کم",
  1: "کم",
};

function PriorityChip({ imp }) {
  const level = Number(imp) || 3;
  return (
    <span className={`clw-prio-chip clw-prio-${level}`} title="درجه اهمیت">
      {PRIO_LABELS[level] || "عادی"}
    </span>
  );
}

function LiveNewsHelp() {
  return (
    <>
      <h3>راهنمای تالار اخبار زنده</h3>
      <p>
        این صفحه برای پایش زنده اخبار و گزارش‌های میدانی تأییدشده در مرکز فرماندهی است.
        داده‌ها از پایگاه‌داده خوانده می‌شوند و هر چند ثانیه به‌صورت خودکار تازه می‌شوند.
      </p>
      <ul>
        <li><b>نوع محتوا:</b> همه، فقط اخبار، یا فقط رصد میدانی — کارت میدانی با زمینه و برچسب متمایز است.</li>
        <li><b>نوع راز (میدانی):</b> عمومی / استانی / واحد روی کارت؛ گزارش‌های «خاص» در تالار نمایش داده نمی‌شوند.</li>
        <li><b>متن کامل:</b> با «ادامه…» بدون باز شدن پنل حاشیه، متن کامل را بخوانید.</li>
        <li><b>نمای لیست / کارت:</b> دو حالت نمایش؛ ترجیح شما ذخیره می‌شود.</li>
        <li><b>بازه زمانی:</b> روز جاری، دو روز اخیر، یا سه روز اخیر.</li>
        <li><b>فیلتر چندانتخابی:</b> وضعیت و اهمیت (OR داخل هر گروه).</li>
        <li><b>حاشیه راهبردی:</b> کلیک روی کارت پنل حاشیه را باز می‌کند. با ضربدر یا Escape بسته می‌شود.</li>
        <li><b>اعلان:</b> برای خبر به دبیر/سردبیر؛ برای میدانی به مدیر رصد.</li>
      </ul>
    </>
  );
}

export default function CommandLiveNewsWall() {
  const navigate = useNavigate();
  const { isDarkMode, toggleDarkMode } = useAppTheme();
  const roles = getSessionRoles();
  const canAnnotate = hasPermission(roles, "command_annotate");

  const scrollRef = useRef(null);
  const pausedRef = useRef(false);
  const scrollStepRef = useRef(SCROLL_SPEEDS[2].step);

  const [items, setItems] = useState([]);
  const [types, setTypes] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [clock, setClock] = useState("");
  const [view, setView] = useState(() => localStorage.getItem(VIEW_KEY) || "grid");
  const [filtersCollapsed, setFiltersCollapsed] = useState(() => localStorage.getItem(FILTERS_KEY) === "1");
  const [statsCollapsed, setStatsCollapsed] = useState(() => localStorage.getItem(STATS_KEY) === "1");
  const [settingsCollapsed, setSettingsCollapsed] = useState(() => localStorage.getItem(SETTINGS_KEY) !== "0");
  const [days, setDays] = useState(() => readIntPref(DAYS_KEY, 1, [1, 2, 3]));
  const [kindFilter, setKindFilter] = useState(() => {
    const v = localStorage.getItem(KIND_KEY);
    return ["all", "news", "field"].includes(v) ? v : "all";
  });
  const [fontLevel, setFontLevel] = useState(() => readIntPref(FONT_KEY, DEFAULT_FONT, FONT_ALLOWED));
  const [scrollSpeed, setScrollSpeed] = useState(() => readIntPref(SCROLL_KEY, 2, [1, 2, 3, 4]));
  const [statusSet, setStatusSet] = useState(() => new Set());
  const [prioSet, setPrioSet] = useState(() => new Set());
  const [sourceW, setSourceW] = useState(() => {
    const v = parseInt(localStorage.getItem(SOURCE_W_KEY), 10);
    return Number.isFinite(v) && v >= 48 && v <= 220 ? v : 72;
  });
  const [search, setSearch] = useState("");
  const [selectedKey, setSelectedKey] = useState(null);
  const [previewItem, setPreviewItem] = useState(null);
  const [annotations, setAnnotations] = useState([]);
  const [showHelp, setShowHelp] = useState(false);
  const [form, setForm] = useState({
    annotation_type: "investigate",
    body: "",
    notify: false,
  });
  const [busy, setBusy] = useState(false);

  scrollStepRef.current = SCROLL_SPEEDS[scrollSpeed]?.step || SCROLL_SPEEDS[2].step;

  const newsFontPx = FONT_LEVELS[fontLevel]?.px || 14;

  const loadFeed = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const data = await commandCenterService.liveNews({ days, limit: 200, kind: kindFilter });
      const nextItems = Array.isArray(data?.items) ? data.items : [];
      // #region agent log
      {
        const kinds = nextItems.map((n) => n.kind || "news");
        let transitions = 0;
        for (let i = 1; i < kinds.length; i += 1) if (kinds[i] !== kinds[i - 1]) transitions += 1;
        const firstFieldIdx = kinds.indexOf("field");
        const lastNewsIdx = kinds.lastIndexOf("news");
        const segregated = firstFieldIdx >= 0 && lastNewsIdx >= 0 && transitions === 1
          && kinds.slice(0, firstFieldIdx).every((k) => k === "news")
          && kinds.slice(firstFieldIdx).every((k) => k === "field");
        fetch("http://127.0.0.1:7732/ingest/84806bcd-7c67-4feb-bf71-3b9c8b6b47fb", {
          method: "POST",
          headers: { "Content-Type": "application/json", "X-Debug-Session-Id": "e87c62" },
          body: JSON.stringify({
            sessionId: "e87c62",
            runId: "post-fix",
            hypothesisId: "H1-fix",
            location: "CommandLiveNewsWall.jsx:loadFeed",
            message: "frontend received feed order",
            data: {
              kindFilter,
              days,
              total: nextItems.length,
              newsCount: kinds.filter((k) => k === "news").length,
              fieldCount: kinds.filter((k) => k === "field").length,
              transitions,
              firstFieldIdx,
              lastNewsIdx,
              segregated,
              viewportW: typeof window !== "undefined" ? window.innerWidth : null,
              head: nextItems.slice(0, 20).map((n, i) => ({
                i,
                kind: n.kind || "news",
                id: n.id,
                date: n.source_date_jalali || n.relay_date_jalali,
                time: n.source_time_hm || n.relay_time_hm,
                prio: n.priority,
              })),
              aroundFirstField: firstFieldIdx >= 0
                ? nextItems.slice(Math.max(0, firstFieldIdx - 3), firstFieldIdx + 5).map((n, j) => ({
                  i: Math.max(0, firstFieldIdx - 3) + j,
                  kind: n.kind || "news",
                  id: n.id,
                  date: n.source_date_jalali || n.relay_date_jalali,
                  time: n.source_time_hm || n.relay_time_hm,
                }))
                : [],
            },
            timestamp: Date.now(),
          }),
        }).catch(() => {});
      }
      // #endregion
      setItems(nextItems);
      setError("");
    } catch (e) {
      setError(e?.response?.data?.error || e.message || "خطا در دریافت تالار");
    } finally {
      if (!silent) setLoading(false);
    }
  }, [days, kindFilter]);

  useEffect(() => {
    loadFeed(false);
    commandCenterService.annotationTypes().then((d) => setTypes(d?.types || {})).catch(() => {});
    const t = setInterval(() => loadFeed(true), POLL_MS);
    return () => clearInterval(t);
  }, [loadFeed]);

  useEffect(() => {
    const tick = () => {
      const now = new Date();
      const dateStr = now.toLocaleDateString("fa-IR", {
        weekday: "long",
        day: "numeric",
        month: "long",
        year: "numeric",
      });
      const timeStr = now.toLocaleTimeString("fa-IR", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
      setClock(`${dateStr} ساعت ${timeStr}`);
    };
    tick();
    const t = setInterval(tick, 1000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    if (!selectedKey) {
      setAnnotations([]);
      return;
    }
    const [kind, id] = String(selectedKey).split(":");
    commandCenterService.listAnnotations(id, kind)
      .then((d) => setAnnotations(Array.isArray(d?.items) ? d.items : []))
      .catch(() => setAnnotations([]));
  }, [selectedKey]);

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === "Escape") {
        if (previewItem) setPreviewItem(null);
        else if (showHelp) setShowHelp(false);
        else setSelectedKey(null);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [showHelp, previewItem]);

  const openFullText = (item, e) => {
    e?.stopPropagation?.();
    e?.preventDefault?.();
    setPreviewItem(item);
  };

  const searchFiltered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return items;
    return items.filter((n) => {
      const blob = `${n.id} ${n.kind || ""} ${n.title || ""} ${n.summary || ""} ${n.cleaned_text || ""} ${n.source || ""} ${n.unit_name || ""} ${n.topic || ""} ${n.province || ""}`.toLowerCase();
      return blob.includes(q);
    });
  }, [items, search]);

  const filtered = useMemo(() => {
    return searchFiltered.filter((n) => {
      const st = normalizeStatus(n);
      const sMatch = statusSet.size === 0 || statusSet.has(st);
      const pk = priorityFilterKey(n.priority);
      const iMatch = prioSet.size === 0 || prioSet.has(pk);
      return sMatch && iMatch;
    });
  }, [searchFiltered, statusSet, prioSet]);

  // #region agent log
  useEffect(() => {
    if (view === "grid" || !filtered.length) return undefined;
    const t = setTimeout(() => {
      const table = scrollRef.current?.querySelector?.(".clw-news-table");
      if (!table) return;
      const ths = [...table.querySelectorAll("thead th")];
      const cols = ths.map((th, i) => ({
        i,
        label: (th.textContent || "").trim().slice(0, 24),
        w: Math.round(th.getBoundingClientRect().width),
        display: window.getComputedStyle(th).display,
        hiddenClass: th.classList.contains("clw-col-desktop"),
      }));
      const summary = table.querySelector("td.clw-td-summary");
      fetch("http://127.0.0.1:7732/ingest/84806bcd-7c67-4feb-bf71-3b9c8b6b47fb", {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-Debug-Session-Id": "e87c62" },
        body: JSON.stringify({
          sessionId: "e87c62",
          runId: "post-fix",
          hypothesisId: "H4-H5",
          location: "CommandLiveNewsWall.jsx:measureCols",
          message: "table column widths",
          data: {
            viewportW: window.innerWidth,
            tableW: Math.round(table.getBoundingClientRect().width),
            summaryW: summary ? Math.round(summary.getBoundingClientRect().width) : null,
            cols,
          },
          timestamp: Date.now(),
        }),
      }).catch(() => {});
    }, 400);
    return () => clearTimeout(t);
  }, [view, filtered.length, selectedKey]);
  // #endregion

  /** آمار از قبل از فیلتر وضعیت/اهمیت تا تاگل‌ها شمارندهٔ واقعی داشته باشند */
  const stats = useMemo(() => {
    const base = searchFiltered;
    return {
      filtered: filtered.length,
      news: base.filter((n) => (n.kind || "news") === "news").length,
      field: base.filter((n) => n.kind === "field").length,
      ok: base.filter((n) => normalizeStatus(n) === "ok").length,
      pending: base.filter((n) => normalizeStatus(n) === "pending").length,
      reject: base.filter((n) => normalizeStatus(n) === "reject").length,
      rumor: base.filter((n) => normalizeStatus(n) === "rumor").length,
      urgent: base.filter((n) => Number(n.priority) === 1).length,
      important: base.filter((n) => Number(n.priority) === 2).length,
      medium: base.filter((n) => Number(n.priority) === 3).length,
      normal: base.filter((n) => {
        const p = Number(n.priority);
        return !Number.isFinite(p) || p >= 4;
      }).length,
    };
  }, [searchFiltered, filtered.length]);

  const startSourceResize = (e) => {
    e.preventDefault();
    e.stopPropagation();
    const startX = e.clientX;
    const startW = sourceW;
    const onMove = (ev) => {
      // RTL: کشیدن به چپ = عریض‌تر
      const delta = startX - ev.clientX;
      const next = Math.min(220, Math.max(48, startW + delta));
      setSourceW(next);
    };
    const onUp = () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
      setSourceW((w) => {
        localStorage.setItem(SOURCE_W_KEY, String(w));
        return w;
      });
    };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
  };

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return undefined;
    const timer = setInterval(() => {
      if (pausedRef.current) return;
      const maxScroll = el.scrollHeight - el.clientHeight;
      if (maxScroll <= 1) return;
      const step = scrollStepRef.current;
      // اسکرول گردشی: انتهای لیست → برگشت به ابتدا
      if (el.scrollTop >= maxScroll - 1) {
        el.scrollTop = 0;
      } else {
        const next = el.scrollTop + step;
        el.scrollTop = next >= maxScroll ? 0 : next;
      }
    }, 40);
    return () => clearInterval(timer);
  }, [view, filtered.length]);

  const changeView = (next) => {
    setView(next);
    localStorage.setItem(VIEW_KEY, next);
  };

  const changeDays = (v) => {
    const n = Number(v);
    setDays(n);
    localStorage.setItem(DAYS_KEY, String(n));
  };

  const changeKind = (v) => {
    setKindFilter(v);
    localStorage.setItem(KIND_KEY, v);
    setSelectedKey(null);
  };

  const changeFont = (v) => {
    const n = Number(v);
    setFontLevel(n);
    localStorage.setItem(FONT_KEY, String(n));
  };

  const cycleFont = () => {
    const next = fontLevel >= 6 ? 1 : fontLevel + 1;
    changeFont(next);
  };

  const changeScroll = (v) => {
    const n = Number(v);
    setScrollSpeed(n);
    localStorage.setItem(SCROLL_KEY, String(n));
  };

  const closeDetail = () => setSelectedKey(null);

  const submitAnnotation = async () => {
    if (!selectedKey || !canAnnotate || !selected) return;
    const kind = selected.kind === "field" ? "field" : "news";
    setBusy(true);
    try {
      await commandCenterService.createAnnotation(selected.id, {
        annotation_type: form.annotation_type,
        body: form.body,
        notify: form.notify,
        notify_roles: form.notify
          ? (kind === "field" ? ["Field_admin"] : ["news_chief", "news_editor"])
          : [],
      }, kind);
      setForm((f) => ({ ...f, body: "" }));
      const d = await commandCenterService.listAnnotations(selected.id, kind);
      setAnnotations(Array.isArray(d?.items) ? d.items : []);
      await loadFeed(true);
    } catch (e) {
      alert(e?.response?.data?.error || e.message || "ثبت حاشیه ناموفق بود");
    } finally {
      setBusy(false);
    }
  };

  const selected = items.find((x) => feedKeyOf(x) === selectedKey) || null;

  return (
    <div
      className={`clw-root${isDarkMode ? "" : " clw-light"}`}
      style={{ ["--clw-news-font"]: `${newsFontPx}px` }}
    >
      <header>
        <div className="clw-title-row">
          <div className="clw-header-section right">
            <div className="clw-control-btns">
              <button type="button" className="clw-icon-btn" onClick={() => navigate("/command")}>
                <ArrowRight size={14} /> مرکز فرماندهی
              </button>
              <button
                type="button"
                className={`clw-icon-btn${!filtersCollapsed ? " active" : ""}`}
                onClick={() => {
                  setFiltersCollapsed((v) => {
                    localStorage.setItem(FILTERS_KEY, !v ? "1" : "0");
                    return !v;
                  });
                }}
              >
                فیلتر
              </button>
              <button
                type="button"
                className={`clw-icon-btn${!statsCollapsed ? " active" : ""}`}
                onClick={() => {
                  setStatsCollapsed((v) => {
                    localStorage.setItem(STATS_KEY, !v ? "1" : "0");
                    return !v;
                  });
                }}
              >
                آمار
              </button>
              <button
                type="button"
                className={`clw-icon-btn${!settingsCollapsed ? " active" : ""}`}
                onClick={() => {
                  setSettingsCollapsed((v) => {
                    localStorage.setItem(SETTINGS_KEY, !v ? "1" : "0");
                    return !v;
                  });
                }}
              >
                تنظیمات
              </button>
            </div>
          </div>

          <div className="clw-header-section center">
            <h1 className="clw-page-title">تالار اخبار و رصد — مرکز فرماندهی</h1>
            <div className="clw-current-date-time">{clock || "…"}</div>
          </div>

          <div className="clw-header-section left">
            <button type="button" className="clw-icon-btn" onClick={() => setShowHelp(true)} title="راهنما">
              <HelpCircle size={14} /> راهنما
            </button>
            <button type="button" className="clw-icon-btn" onClick={cycleFont} title={`فونت: ${FONT_LEVELS[fontLevel].label}`}>
              <Type size={14} /> {toPersianDigits(fontLevel)}
            </button>
            <button type="button" className="clw-icon-btn" onClick={toggleDarkMode} title="تغییر تم">
              {isDarkMode ? <Sun size={14} /> : <Moon size={14} />}
            </button>
          </div>
        </div>

        <div className={`clw-filters-wrap${filtersCollapsed ? " clw-collapsed" : ""}`}>
          <div className="clw-filter-body">
            <div className="clw-view-switcher">
              <button type="button" className={view === "table" ? "active" : ""} onClick={() => changeView("table")}>
                لیست
              </button>
              <button type="button" className={view === "grid" ? "active" : ""} onClick={() => changeView("grid")}>
                کارت
              </button>
            </div>

            <div className="clw-search-box">
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="جستجو در کد، خلاصه و متن…"
              />
              <span className="clw-search-icon">⌕</span>
            </div>

            <label>
              بازه:
              <select value={days} onChange={(e) => changeDays(e.target.value)}>
                <option value={1}>روز جاری</option>
                <option value={2}>دو روز اخیر</option>
                <option value={3}>سه روز اخیر</option>
              </select>
            </label>

            <div className="clw-multi-filters">
              <span className="clw-multi-label">نوع:</span>
              {KIND_FILTERS.map((k) => (
                <button
                  key={k.key}
                  type="button"
                  className={`clw-chip-toggle${kindFilter === k.key ? " pressed" : ""}${k.key === "field" ? " clw-chip-field" : ""}`}
                  onClick={() => changeKind(k.key)}
                >
                  {k.label}
                </button>
              ))}
            </div>

            <div className="clw-multi-filters">
              <span className="clw-multi-label">وضعیت:</span>
              {STATUS_KEYS.map((s) => (
                <button
                  key={s.key}
                  type="button"
                  className={`clw-chip-toggle${statusSet.has(s.key) ? " pressed" : ""}`}
                  onClick={() => toggleKey(setStatusSet, s.key)}
                >
                  {s.label}
                </button>
              ))}
              {statusSet.size > 0 ? (
                <button type="button" className="clw-chip-toggle clear" onClick={() => setStatusSet(new Set())}>
                  پاک کردن
                </button>
              ) : null}
            </div>

            <div className="clw-multi-filters">
              <span className="clw-multi-label">اهمیت:</span>
              {PRIO_FILTER_KEYS.map((p) => (
                <button
                  key={p.key}
                  type="button"
                  className={`clw-chip-toggle${prioSet.has(p.key) ? " pressed" : ""}`}
                  onClick={() => toggleKey(setPrioSet, p.key)}
                >
                  {p.label}
                </button>
              ))}
              {prioSet.size > 0 ? (
                <button type="button" className="clw-chip-toggle clear" onClick={() => setPrioSet(new Set())}>
                  پاک کردن
                </button>
              ) : null}
            </div>

            <button type="button" className="clw-icon-btn accent" onClick={() => loadFeed(false)}>
              <RefreshCw size={13} /> بروزرسانی
            </button>
          </div>
        </div>

        <div className={`clw-filters-wrap${settingsCollapsed ? " clw-collapsed" : ""}`}>
          <div className="clw-filter-body">
            <label>
              اندازه فونت اخبار:
              <select value={fontLevel} onChange={(e) => changeFont(e.target.value)}>
                {Object.entries(FONT_LEVELS).map(([k, v]) => (
                  <option key={k} value={k}>{v.label}</option>
                ))}
              </select>
            </label>
            <label>
              سرعت اسکرول:
              <select value={scrollSpeed} onChange={(e) => changeScroll(e.target.value)}>
                {Object.entries(SCROLL_SPEEDS).map(([k, v]) => (
                  <option key={k} value={k}>{v.label}{Number(k) === 2 ? " (پیش‌فرض)" : ""}</option>
                ))}
              </select>
            </label>
          </div>
        </div>

        <div className={`clw-stats-row${statsCollapsed ? " clw-collapsed" : ""}`}>
          <div className="clw-stats-bar">
            <div className="clw-stats-group right">
              <div className="clw-stat-pill clw-stat-static" style={{ borderRight: "3px solid var(--clw-muted)" }}>
                نمایش: <b>{toPersianDigits(stats.filtered)}</b>
              </div>
              <div className="clw-stat-pill clw-stat-static clw-stat-news" style={{ borderRight: "3px solid var(--clw-accent)" }}>
                خبر: <b>{toPersianDigits(stats.news)}</b>
              </div>
              <div className="clw-stat-pill clw-stat-static clw-stat-field" style={{ borderRight: "3px solid var(--clw-field)" }}>
                میدانی: <b>{toPersianDigits(stats.field)}</b>
              </div>
              <button
                type="button"
                className={`clw-stat-pill clw-stat-btn${statusSet.has("ok") ? " pressed" : ""}`}
                style={{ borderRight: "3px solid #16a34a", color: "#16a34a" }}
                onClick={() => toggleKey(setStatusSet, "ok")}
              >
                تأیید: <b>{toPersianDigits(stats.ok)}</b>
              </button>
              <button
                type="button"
                className={`clw-stat-pill clw-stat-btn${statusSet.has("pending") ? " pressed" : ""}`}
                style={{ borderRight: "3px solid #ca8a04", color: "#ca8a04" }}
                onClick={() => toggleKey(setStatusSet, "pending")}
              >
                بررسی: <b>{toPersianDigits(stats.pending)}</b>
              </button>
              <button
                type="button"
                className={`clw-stat-pill clw-stat-btn${statusSet.has("reject") ? " pressed" : ""}`}
                style={{ borderRight: "3px solid #78716c", color: "#78716c" }}
                onClick={() => toggleKey(setStatusSet, "reject")}
              >
                رد: <b>{toPersianDigits(stats.reject)}</b>
              </button>
              <button
                type="button"
                className={`clw-stat-pill clw-stat-btn${statusSet.has("rumor") ? " pressed" : ""}`}
                style={{ borderRight: "3px solid #9333ea", color: "#9333ea" }}
                onClick={() => toggleKey(setStatusSet, "rumor")}
              >
                شایعه: <b>{toPersianDigits(stats.rumor)}</b>
              </button>
            </div>
            <div className="clw-stats-group left">
              <button
                type="button"
                className={`clw-stat-pill clw-stat-btn${prioSet.has("urgent") ? " pressed" : ""}`}
                style={{ borderRight: "3px solid #c2410c" }}
                onClick={() => toggleKey(setPrioSet, "urgent")}
              >
                فوری: <b>{toPersianDigits(stats.urgent)}</b>
              </button>
              <button
                type="button"
                className={`clw-stat-pill clw-stat-btn${prioSet.has("important") ? " pressed" : ""}`}
                style={{ borderRight: "3px solid #ea580c" }}
                onClick={() => toggleKey(setPrioSet, "important")}
              >
                مهم: <b>{toPersianDigits(stats.important)}</b>
              </button>
              <button
                type="button"
                className={`clw-stat-pill clw-stat-btn${prioSet.has("medium") ? " pressed" : ""}`}
                style={{ borderRight: "3px solid #ca8a04" }}
                onClick={() => toggleKey(setPrioSet, "medium")}
              >
                متوسط: <b>{toPersianDigits(stats.medium)}</b>
              </button>
              <button
                type="button"
                className={`clw-stat-pill clw-stat-btn${prioSet.has("normal") ? " pressed" : ""}`}
                style={{ borderRight: "3px solid #94a3b8" }}
                onClick={() => toggleKey(setPrioSet, "normal")}
              >
                عادی: <b>{toPersianDigits(stats.normal)}</b>
              </button>
            </div>
          </div>
        </div>
      </header>

      {error ? <div className="clw-error">{error}</div> : null}
      {loading && !items.length ? <div className="clw-error" style={{ color: "var(--clw-muted)" }}>در حال بارگذاری…</div> : null}

      <div className={`clw-main-layout${selected ? " with-detail" : ""}`}>
        <main className="clw-main">
          <div
            ref={scrollRef}
            className={view === "grid" ? "clw-news-grid" : "clw-table-container"}
            onMouseEnter={() => { pausedRef.current = true; }}
            onMouseLeave={() => { pausedRef.current = false; }}
          >
            {view === "grid" ? (
              filtered.map((n) => {
                const key = feedKeyOf(n);
                const imp = toImpClass(n.priority);
                const st = normalizeStatus(n);
                const isField = n.kind === "field";
                const hasAnn = Number(n.annotation_count) > 0;
                const full = fullItemText(n);
                const preview = stripPreview(n.summary || n.cleaned_text || n.title, 320);
                const isTruncated = full.length > 320;
                return (
                  <button
                    key={key}
                    type="button"
                    className={`clw-news-card imp-${imp} st-${st}${isField ? " clw-card-field" : " clw-card-news"}${selectedKey === key ? " selected" : ""}`}
                    onClick={() => setSelectedKey(key)}
                    title={isField ? `گزارش میدانی #${n.id}` : `خبر #${n.id}`}
                  >
                    <div className="clw-card-body">
                      <div className="clw-card-top-chips">
                        <span style={{ display: "inline-flex", gap: 6, alignItems: "center", flexWrap: "wrap" }}>
                          <KindBadge kind={n.kind || "news"} />
                          {isField ? <ClassificationChip value={n.classification} /> : null}
                        </span>
                        {hasAnn ? (
                          <span className="clw-ann-chip">دستور {toPersianDigits(n.annotation_count)}</span>
                        ) : null}
                      </div>
                      <div className="clw-card-header-info">
                        <span>#{toPersianDigits(n.id)} · {formatNewsDate(n)}</span>
                        <PriorityChip imp={imp} />
                      </div>
                      <div className="clw-card-summary-text">
                        {preview}
                        {isTruncated ? (
                          <span
                            role="link"
                            tabIndex={0}
                            className="clw-more-link"
                            onClick={(e) => openFullText(n, e)}
                            onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") openFullText(n, e); }}
                          >
                            {" "}ادامه…
                          </span>
                        ) : null}
                      </div>
                      <div className="clw-card-footer-info">
                        <span>
                          {isField
                            ? [n.unit_name || n.source, n.topic].filter(Boolean).join(" · ") || "—"
                            : (n.source || n.sender || "—")}
                        </span>
                        <StatusBadge status={st} kind={n.kind} />
                      </div>
                    </div>
                  </button>
                );
              })
            ) : (
              <table className="clw-news-table">
                <colgroup>
                  <col className="clw-col-desktop" style={{ width: 52 }} />
                  <col className="clw-col-kind" style={{ width: 56 }} />
                  <col className="clw-col-desktop" style={{ width: 110 }} />
                  <col className="clw-col-summary" />
                  <col className="clw-col-desktop" style={{ width: 72 }} />
                  <col className="clw-col-desktop" style={{ width: sourceW }} />
                  <col className="clw-col-desktop" style={{ width: 72 }} />
                  <col className="clw-col-desktop" style={{ width: 52 }} />
                </colgroup>
                <thead>
                  <tr>
                    <th className="clw-col-desktop">ردیف</th>
                    <th className="clw-col-kind">نوع</th>
                    <th className="clw-col-desktop">تاریخ</th>
                    <th className="clw-col-summary">خلاصه</th>
                    <th className="clw-col-desktop">اهمیت</th>
                    <th className="clw-col-desktop clw-th-source">
                      منبع / واحد
                      <span
                        className="clw-col-resizer"
                        onMouseDown={startSourceResize}
                        title="کشیدن برای تغییر عرض"
                      />
                    </th>
                    <th className="clw-col-desktop">وضعیت</th>
                    <th className="clw-col-desktop">دستور</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((n, idx) => {
                    const key = feedKeyOf(n);
                    const imp = toImpClass(n.priority);
                    const st = normalizeStatus(n);
                    const isField = n.kind === "field";
                    const full = fullItemText(n);
                    const isTruncated = full.length > 220;
                    return (
                      <tr
                        key={key}
                        className={`imp-${imp} st-${st}${isField ? " clw-row-field" : ""}${selectedKey === key ? " selected" : ""}`}
                        onClick={() => setSelectedKey(key)}
                        title={isField ? `گزارش میدانی #${n.id}` : `خبر #${n.id}`}
                      >
                        <td className="clw-col-desktop">{toPersianDigits(idx + 1)}</td>
                        <td className="clw-col-kind">
                          <div className="clw-kind-cell">
                            <KindBadge kind={n.kind || "news"} />
                            {isField ? <ClassificationChip value={n.classification} /> : null}
                          </div>
                        </td>
                        <td className="clw-col-desktop">{formatNewsDate(n)}</td>
                        <td className="clw-td-summary clw-col-summary">
                          {stripPreview(n.summary || n.cleaned_text || n.title, 220)}
                          {isTruncated ? (
                            <button
                              type="button"
                              className="clw-more-link"
                              onClick={(e) => openFullText(n, e)}
                            >
                              ادامه…
                            </button>
                          ) : null}
                        </td>
                        <td className="clw-col-desktop"><PriorityChip imp={imp} /></td>
                        <td className="clw-col-desktop clw-td-source" title={n.source || n.unit_name || ""}>
                          {isField ? (n.unit_name || n.source || "—") : (n.source || "—")}
                        </td>
                        <td className="clw-col-desktop"><StatusBadge status={st} kind={n.kind} /></td>
                        <td className="clw-col-desktop">
                          {Number(n.annotation_count) > 0
                            ? toPersianDigits(n.annotation_count)
                            : "—"}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}

            {!loading && !filtered.length ? (
              <div className="clw-error" style={{ color: "var(--clw-muted)" }}>موردی برای نمایش نیست</div>
            ) : null}
          </div>
        </main>

        {selected ? (
          <aside className="clw-detail">
            <button type="button" className="clw-detail-close" onClick={closeDetail} title="بستن (Escape)">
              <X size={16} />
            </button>
            <div style={{ paddingLeft: 36 }} className={selected.kind === "field" ? "clw-detail-field" : ""}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6, flexWrap: "wrap" }}>
                <KindBadge kind={selected.kind || "news"} />
                {selected.kind === "field" ? <ClassificationChip value={selected.classification} /> : null}
                <h2 style={{ margin: 0 }}>
                  {selected.title || (selected.kind === "field"
                    ? `گزارش میدانی #${toPersianDigits(selected.id)}`
                    : `خبر #${toPersianDigits(selected.id)}`)}
                </h2>
              </div>
              <div className="clw-detail-meta">
                {formatNewsDate(selected)}
                {selected.kind === "field" && selected.unit_name ? ` · ${selected.unit_name}` : ""}
                {selected.kind === "field" && selected.province ? ` · ${selected.province}` : ""}
                {selected.kind === "field" && selected.topic ? ` · ${selected.topic}` : ""}
                {selected.kind !== "field" && selected.source ? ` · ${selected.source}` : ""}
                {selected.kind !== "field" && selected.sender ? ` · ${selected.sender}` : ""}
                {" · "}
                <StatusBadge status={normalizeStatus(selected)} kind={selected.kind} />
              </div>
              <div className="clw-detail-body" style={{ fontSize: newsFontPx }}>
                {fullItemText(selected) || "—"}
              </div>
              {fullItemText(selected).length > 800 ? (
                <button
                  type="button"
                  className="clw-more-link"
                  style={{ marginBottom: 12, display: "inline-block" }}
                  onClick={() => setPreviewItem(selected)}
                >
                  باز کردن متن در پنجره بزرگ‌تر
                </button>
              ) : null}

              <h3 style={{ fontSize: 13, color: selected.kind === "field" ? "var(--clw-field)" : "var(--clw-accent)", marginBottom: 8 }}>حواشی راهبردی</h3>
              <div className="clw-ann-list">
                {annotations.map((a) => (
                  <div key={a.id} className="clw-ann-item">
                    <div style={{ color: TYPE_COLORS[a.annotation_type] || "var(--clw-accent)", fontWeight: 700, marginBottom: 4 }}>
                      {types[a.annotation_type] || a.annotation_type}
                      <span style={{ color: "var(--clw-muted)", fontWeight: 400, marginRight: 8 }}>
                        · {a.author_name || a.author_username || "—"}
                      </span>
                    </div>
                    <div>{a.body || "—"}</div>
                  </div>
                ))}
                {!annotations.length ? (
                  <div style={{ color: "var(--clw-muted)", fontSize: 12 }}>هنوز حاشیه‌ای ثبت نشده</div>
                ) : null}
              </div>

              {canAnnotate ? (
                <div style={{ borderTop: "1px solid var(--clw-border2)", paddingTop: 12 }}>
                  <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 8 }}>ثبت دستور / نظر</div>
                  <select
                    value={form.annotation_type}
                    onChange={(e) => setForm((f) => ({ ...f, annotation_type: e.target.value }))}
                  >
                    {(Object.keys(types).length ? Object.entries(types) : Object.entries({
                      confirm: "تأیید",
                      deny: "تکذیب",
                      investigate: "بررسی بیشتر",
                      note: "یادداشت",
                    })).map(([k, label]) => (
                      <option key={k} value={k}>{label}</option>
                    ))}
                  </select>
                  <textarea
                    value={form.body}
                    onChange={(e) => setForm((f) => ({ ...f, body: e.target.value }))}
                    rows={3}
                    placeholder="متن دستور یا یادداشت…"
                  />
                  <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12, marginBottom: 10, color: "var(--clw-muted)" }}>
                    <input
                      type="checkbox"
                      checked={form.notify}
                      onChange={(e) => setForm((f) => ({ ...f, notify: e.target.checked }))}
                    />
                    اعلان به {selected.kind === "field" ? "مدیر رصد میدانی" : "دبیر و سردبیر اخبار"}
                  </label>
                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                    <button
                      type="button"
                      className="clw-icon-btn accent"
                      disabled={busy}
                      onClick={submitAnnotation}
                    >
                      <Send size={14} /> ثبت حاشیه
                    </button>
                    <button type="button" className="clw-icon-btn" onClick={closeDetail}>
                      بستن پنل
                    </button>
                  </div>
                </div>
              ) : (
                <button type="button" className="clw-icon-btn" onClick={closeDetail} style={{ marginTop: 8 }}>
                  بستن پنل
                </button>
              )}
            </div>
          </aside>
        ) : null}
      </div>

      {previewItem ? (
        <div className="clw-help-overlay" onClick={() => setPreviewItem(null)}>
          <div className="clw-text-modal" onClick={(e) => e.stopPropagation()}>
            <div className="clw-text-modal-head">
              <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                <KindBadge kind={previewItem.kind || "news"} />
                {previewItem.kind === "field" ? <ClassificationChip value={previewItem.classification} /> : null}
                <strong>
                  {previewItem.title
                    || (previewItem.kind === "field"
                      ? `گزارش میدانی #${toPersianDigits(previewItem.id)}`
                      : `خبر #${toPersianDigits(previewItem.id)}`)}
                </strong>
              </div>
              <button type="button" className="clw-icon-btn" onClick={() => setPreviewItem(null)}>بستن</button>
            </div>
            <div className="clw-detail-meta" style={{ marginBottom: 10 }}>
              {formatNewsDate(previewItem)}
              {previewItem.kind === "field" && previewItem.unit_name ? ` · ${previewItem.unit_name}` : ""}
              {previewItem.kind !== "field" && previewItem.source ? ` · ${previewItem.source}` : ""}
            </div>
            <div className="clw-text-modal-body" style={{ fontSize: newsFontPx }}>
              {fullItemText(previewItem) || "—"}
            </div>
            <div className="clw-text-modal-actions">
              <button
                type="button"
                className="clw-icon-btn"
                onClick={() => {
                  setSelectedKey(feedKeyOf(previewItem));
                  setPreviewItem(null);
                }}
              >
                باز کردن حاشیه راهبردی
              </button>
              <button type="button" className="clw-icon-btn" onClick={() => setPreviewItem(null)}>بستن</button>
            </div>
          </div>
        </div>
      ) : null}

      {showHelp ? (
        <div className="clw-help-overlay" onClick={() => setShowHelp(false)}>
          <div className="clw-help-modal" onClick={(e) => e.stopPropagation()}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
              <strong>راهنما</strong>
              <button type="button" className="clw-icon-btn" onClick={() => setShowHelp(false)}>بستن</button>
            </div>
            <LiveNewsHelp />
          </div>
        </div>
      ) : null}
    </div>
  );
}
