import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ChevronDown, ChevronUp, GitMerge, Link2, RotateCcw, Search, Sparkles,
} from "lucide-react";
import FormPageLayout from "../components/common/FormPageLayout.jsx";
import MonitorSortBar from "../components/MonitorSortBar.jsx";
import { stripHtml } from "../components/analysis/RichTextEditor.jsx";
import NewsHtmlPreview from "../components/news/NewsHtmlPreview.jsx";
import newsMonitorService from "../services/newsMonitorService.js";
import { getSessionRoles, hasPermission } from "../utils/userRoles.js";
import { toPersianDigits } from "../utils/analysisMonitorUtils.js";
import { formatNewsRefDateTime } from "../utils/newsDateDisplay.js";
import { resolveNewsDisplayHtml } from "../utils/newsDisplayHtml.js";
import { sortItems } from "../utils/listSort.js";
import { useMonitorSort } from "../hooks/useMonitorSort.js";
import {
  NEWS_DUPLICATES_SORT_FIELDS,
  NEWS_DUPLICATES_SORT_STORAGE_KEY,
  newsDuplicatesSortValue,
} from "../constants/monitorSortFields.js";
import {
  DUPLICATE_STATUSES,
  NEWS_PRIORITIES,
  NEWS_QUALITY,
  NEWS_REVIEW_STATES,
  NEWS_WORKFLOW_STATES,
} from "../constants/newsMonitorMeta.js";
import { NEWS_DUPLICATES_HELP } from "../content/newsFormHelp.jsx";
import useAnalysisToast from "../hooks/useAnalysisToast.jsx";
import { useAppTheme } from "../context/ThemeContext.jsx";

const SIMILARITY_RANGES = [
  { key: "today", label: "همان روز خبر" },
  { key: "2days", label: "±۱ روز" },
  { key: "week", label: "±۱ هفته" },
];

const LIST_STATUS_FILTERS = [
  { key: "suspicious", label: "فقط مشکوک" },
  { key: "confirmed", label: "خوشه‌بندی‌شده (۳۰ روز)" },
  { key: "all", label: "مشکوک + خوشه (۳۰ روز)" },
];

function statusBadge(label, color) {
  return (
    <span style={{ padding: "2px 7px", borderRadius: 6, background: `${color}22`, color, fontSize: 11, fontWeight: 600 }}>
      {label}
    </span>
  );
}

function NewsStatusBadges({ item }) {
  const priority = NEWS_PRIORITIES[item.priority] || NEWS_PRIORITIES[3];
  const quality = NEWS_QUALITY[item.quality];
  const review = NEWS_REVIEW_STATES[item.review_state] || { label: item.review_state || "—", color: "#64748b" };
  const workflow = NEWS_WORKFLOW_STATES[item.workflow_status];
  const dup = DUPLICATE_STATUSES[item.duplicate_status] || DUPLICATE_STATUSES.suspicious;

  return (
    <>
      {statusBadge(dup.label, dup.color)}
      {statusBadge(`اهمیت: ${priority.label}`, priority.color)}
      {quality ? statusBadge(`کیفیت: ${quality.label}`, quality.color) : null}
      {statusBadge(review.label, review.color)}
      {workflow ? statusBadge(workflow.label, workflow.color) : null}
    </>
  );
}

function SimilarResultRow({
  row, theme, selected, onToggle, busy,
}) {
  const [expanded, setExpanded] = useState(false);
  const displayHtml = resolveNewsDisplayHtml(row);
  const pct = Number(row.similarity_percent) || 0;

  return (
    <div style={{
      border: `1px solid ${selected ? "rgba(14,165,233,0.55)" : theme.border}`,
      borderRadius: 8,
      background: selected ? "rgba(14,165,233,0.08)" : theme.bg,
      overflow: "hidden",
    }}
    >
      <div style={{ display: "flex", flexWrap: "wrap", gap: 6, alignItems: "center", padding: "8px 10px" }}>
        <label style={{ display: "inline-flex", alignItems: "center", gap: 6, cursor: busy ? "wait" : "pointer", fontSize: 12 }}>
          <input
            type="checkbox"
            checked={selected}
            disabled={busy}
            onChange={() => onToggle(row.id)}
          />
          انتخاب
        </label>
        <span style={{
          padding: "2px 8px", borderRadius: 6, fontSize: 12, fontWeight: 700,
          background: pct >= 80 ? "rgba(34,197,94,0.18)" : "rgba(245,158,11,0.18)",
          color: pct >= 80 ? "#22c55e" : "#f59e0b",
        }}
        >
          {toPersianDigits(pct)}٪ شباهت
        </span>
        <span style={{ fontWeight: 700, color: theme.accent }}>#{toPersianDigits(row.id)}</span>
        <span style={{ fontSize: 12 }}>{row.source}</span>
        <span style={{ fontSize: 11, opacity: 0.75 }}>{formatNewsRefDateTime(row)}</span>
        <NewsStatusBadges item={row} />
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          style={{
            marginRight: "auto", display: "inline-flex", alignItems: "center", gap: 4,
            padding: "4px 8px", borderRadius: 6, border: `1px solid ${theme.border}`,
            background: "transparent", color: theme.text, cursor: "pointer", fontFamily: "inherit", fontSize: 11,
          }}
        >
          {expanded ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
          {expanded ? "بستن متن" : "نمایش متن"}
        </button>
      </div>
      <NewsHtmlPreview
        html={displayHtml}
        compact={!expanded}
        isDarkMode={theme.isDarkMode !== false}
        style={{ fontSize: 12, margin: 0, padding: "0 10px 8px", opacity: 0.9 }}
      />
    </div>
  );
}

function ManualParentResult({ row, theme, busy, onLink }) {
  const [expanded, setExpanded] = useState(false);
  const displayHtml = resolveNewsDisplayHtml(row);

  return (
    <div style={{ border: `1px solid ${theme.border}`, borderRadius: 8, background: theme.bg, overflow: "hidden" }}>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 6, alignItems: "center", padding: "8px 10px" }}>
        <button
          type="button"
          disabled={busy}
          onClick={() => onLink(row)}
          style={{
            display: "inline-flex", alignItems: "center", gap: 6, padding: "6px 10px",
            borderRadius: 8, border: "none", background: "#0ea5e9", color: "#fff",
            cursor: busy ? "wait" : "pointer", fontFamily: "inherit", fontSize: 12, fontWeight: 600,
          }}
        >
          <Link2 size={14} />
          انتخاب به‌عنوان مرجع
        </button>
        <span style={{ fontWeight: 700, color: theme.accent }}>#{toPersianDigits(row.id)}</span>
        <span style={{ fontSize: 12 }}>{row.source}</span>
        <span style={{ fontSize: 11, opacity: 0.75 }}>{formatNewsRefDateTime(row)}</span>
        <NewsStatusBadges item={row} />
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          style={{
            marginRight: "auto", display: "inline-flex", alignItems: "center", gap: 4,
            padding: "4px 8px", borderRadius: 6, border: `1px solid ${theme.border}`,
            background: "transparent", color: theme.text, cursor: "pointer", fontFamily: "inherit", fontSize: 11,
          }}
        >
          {expanded ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
          {expanded ? "بستن متن" : "نمایش متن"}
        </button>
      </div>
      <NewsHtmlPreview
        html={displayHtml}
        compact={!expanded}
        isDarkMode={theme.isDarkMode !== false}
        style={{ fontSize: 12, margin: 0, padding: "0 10px 8px", opacity: 0.9 }}
      />
    </div>
  );
}

export default function NewsDuplicatesManager() {
  const navigate = useNavigate();
  const roles = getSessionRoles();
  const allowed = hasPermission(roles, "news_duplicates");
  const { isDarkMode } = useAppTheme();

  const theme = useMemo(() => ({
    bg: isDarkMode ? "#0f172a" : "#f8fafc",
    card: isDarkMode ? "#1e293b" : "#ffffff",
    border: isDarkMode ? "rgba(255,255,255,0.1)" : "#e2e8f0",
    text: isDarkMode ? "#f1f5f9" : "#1e293b",
    accent: "#38bdf8",
    isDarkMode,
  }), [isDarkMode]);

  const [items, setItems] = useState([]);
  const [stats, setStats] = useState({ suspicious: 0, confirmed: 0, confirmed_30d: 0 });
  const [loading, setLoading] = useState(false);
  const [listFilter, setListFilter] = useState("");
  const [listStatus, setListStatus] = useState("suspicious");
  const [similarityRange, setSimilarityRange] = useState("today");
  const [activeId, setActiveId] = useState(null);
  const [similarById, setSimilarById] = useState({});
  const [similarFilterById, setSimilarFilterById] = useState({});
  const [selectedSimilarById, setSelectedSimilarById] = useState({});
  const [similarLoadingId, setSimilarLoadingId] = useState(null);
  const [manualOpenById, setManualOpenById] = useState({});
  const [manualQueryById, setManualQueryById] = useState({});
  const [manualResultsById, setManualResultsById] = useState({});
  const [busyId, setBusyId] = useState(null);
  const { showToast, Toast } = useAnalysisToast();
  const [expandedItems, setExpandedItems] = useState({});
  const [sortConfig, setSortConfig] = useMonitorSort(
    NEWS_DUPLICATES_SORT_STORAGE_KEY,
    NEWS_DUPLICATES_SORT_FIELDS,
  );

  const loadStats = useCallback(async () => {
    try {
      const s = await newsMonitorService.duplicatesStats();
      setStats({
        suspicious: s?.suspicious || 0,
        confirmed: s?.confirmed || 0,
        confirmed_30d: s?.confirmed_30d || 0,
      });
    } catch {
      /* ignore */
    }
  }, []);

  const loadList = useCallback(async () => {
    setLoading(true);
    try {
      const rows = await newsMonitorService.listDuplicates({
        status: listStatus,
        confirmed_days: listStatus === "suspicious" ? undefined : 30,
        ...(listFilter.trim() ? { q: listFilter.trim() } : {}),
      });
      setItems(rows || []);
      await loadStats();
    } catch (e) {
      showToast(e.response?.data?.error || "خطا در بارگذاری");
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [listFilter, listStatus, loadStats]);

  useEffect(() => {
    if (allowed) loadList();
  }, [allowed, loadList]);

  const sortedItems = useMemo(
    () => sortItems(items, sortConfig, newsDuplicatesSortValue),
    [items, sortConfig],
  );

  const fetchSimilar = useCallback(async (newsId, range = similarityRange) => {
    setSimilarLoadingId(newsId);
    try {
      const result = await newsMonitorService.findSimilarDuplicates(newsId, { range });
      setSimilarById((p) => ({
        ...p,
        [newsId]: { range, items: result?.items || [] },
      }));
      setSelectedSimilarById((p) => ({ ...p, [newsId]: [] }));
    } catch (e) {
      showToast(e.response?.data?.error || "خطا در یافتن اخبار مشابه");
      setSimilarById((p) => ({ ...p, [newsId]: { range, items: [] } }));
    } finally {
      setSimilarLoadingId(null);
    }
  }, [similarityRange]);

  const activateCard = (newsId) => {
    setActiveId(newsId);
    const cached = similarById[newsId];
    if (!cached || cached.range !== similarityRange) {
      fetchSimilar(newsId, similarityRange);
    }
  };

  useEffect(() => {
    if (!activeId) return;
    fetchSimilar(activeId, similarityRange);
    // فقط با تغییر بازهٔ سراسری دوباره جستجو می‌شود
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [similarityRange]);

  const filteredSimilar = (newsId) => {
    const rows = similarById[newsId]?.items || [];
    const q = String(similarFilterById[newsId] || "").trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((r) => {
      const hay = [
        r.source,
        r.preview,
        stripHtml(r.display_html || r.full_text || ""),
        String(r.id),
        r.ref_key,
      ].join(" ").toLowerCase();
      return hay.includes(q);
    });
  };

  const toggleSimilarSelect = (newsId, similarId) => {
    setSelectedSimilarById((p) => {
      const cur = new Set(p[newsId] || []);
      if (cur.has(similarId)) cur.delete(similarId);
      else cur.add(similarId);
      return { ...p, [newsId]: [...cur] };
    });
  };

  const clusterLink = async (item) => {
    const selected = selectedSimilarById[item.id] || [];
    if (!selected.length) {
      showToast("حداقل یک خبر مشابه را انتخاب کنید");
      return;
    }
    const ids = [item.id, ...selected];
    const msg = [
      `${toPersianDigits(ids.length)} خبر انتخاب شده‌اند.`,
      "قدیمی‌ترین خبر به‌عنوان مرجع (اصلی) و بقیه به‌عنوان تکراری تأییدشده پیوند می‌خورند.",
      "",
      "ادامه می‌دهید؟",
    ].join("\n");
    if (!window.confirm(msg)) return;

    setBusyId(item.id);
    try {
      const result = await newsMonitorService.clusterLinkDuplicates(ids);
      const en = result?.enriched;
      const enrichHint = en
        ? ` · اهمیت ${toPersianDigits(en.priority)} · کیفیت ${toPersianDigits(en.quality)}${en.review_state === "approved" ? " · تأیید" : ""}`
        : "";
      showToast(
        `خوشه ثبت شد — مرجع #${toPersianDigits(result.parent_id)} · ${toPersianDigits(result.count)} پیوند${enrichHint}`,
      );
      setActiveId(null);
      setSimilarById((p) => {
        const next = { ...p };
        delete next[item.id];
        return next;
      });
      setSelectedSimilarById((p) => {
        const next = { ...p };
        delete next[item.id];
        return next;
      });
      await loadList();
    } catch (e) {
      showToast(e.response?.data?.error || "خطا در خوشه‌بندی");
    } finally {
      setBusyId(null);
    }
  };

  const searchManualParent = async (newsId, q) => {
    setManualQueryById((p) => ({ ...p, [newsId]: q }));
    if (!q.trim()) {
      setManualResultsById((p) => ({ ...p, [newsId]: [] }));
      return;
    }
    try {
      const rows = await newsMonitorService.searchParent(q);
      setManualResultsById((p) => ({ ...p, [newsId]: (rows || []).filter((r) => r.id !== newsId) }));
    } catch {
      setManualResultsById((p) => ({ ...p, [newsId]: [] }));
    }
  };

  const linkToParent = async (newsId, parentRow) => {
    const plain = stripHtml(parentRow.display_html || parentRow.full_text || parentRow.preview || "").slice(0, 80);
    const msg = [
      `خبر #${newsId} به‌عنوان «تکراری» به خبر #${parentRow.id} (مرجع/اصلی) پیوند می‌خورد.`,
      "",
      `مرجع: ${parentRow.source} · ${formatNewsRefDateTime(parentRow)}`,
      plain ? `«${plain}…»` : "",
      "",
      "ادامه می‌دهید؟",
    ].filter(Boolean).join("\n");
    if (!window.confirm(msg)) return;

    setBusyId(newsId);
    try {
      await newsMonitorService.linkDuplicate(newsId, parentRow.id);
      showToast("تکراری بودن تأیید شد و به خبر مرجع پیوند خورد");
      await loadList();
    } catch (e) {
      showToast(e.response?.data?.error || "خطا در لینک");
    } finally {
      setBusyId(null);
    }
  };

  const clearDuplicate = async (item) => {
    const isConfirmed = item.duplicate_status === "confirmed";
    const msg = isConfirmed
      ? "پیوند تکراری لغو شود و خبر به حالت عادی برگردد؟"
      : "این خبر اشتباه مشکوک بود؟ علامت تکراری برداشته شود؟";
    if (!window.confirm(msg)) return;

    setBusyId(item.id);
    try {
      await newsMonitorService.clearDuplicate(item.id);
      showToast(isConfirmed ? "پیوند تکراری لغو شد" : "علامت مشکوک برداشته شد");
      if (activeId === item.id) setActiveId(null);
      await loadList();
    } catch (e) {
      showToast(e.response?.data?.error || "خطا");
    } finally {
      setBusyId(null);
    }
  };

  if (!allowed) {
    return (
      <div style={{ padding: 24, textAlign: "center", color: "#e2e8f0", background: "#0f172a", minHeight: "100vh" }}>
        <p>دسترسی مجاز نیست.</p>
        <button type="button" onClick={() => navigate("/main")}>بازگشت</button>
      </div>
    );
  }

  const rangeLabel = SIMILARITY_RANGES.find((r) => r.key === similarityRange)?.label || "همان روز خبر";

  return (
    <FormPageLayout
      title="مدیریت تکراری‌ها"
      onHelp={() => NEWS_DUPLICATES_HELP()}
      helpTitle="راهنمای مدیریت تکراری‌ها"
    >
      {Toast}

      <div style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))",
        gap: 10,
        marginBottom: 14,
      }}
      >
        {[
          { label: "مشکوک (باز)", value: stats.suspicious, color: "#f59e0b" },
          { label: "خوشه‌بندی‌شده (۳۰ روز)", value: stats.confirmed_30d, color: "#94a3b8" },
          { label: "خوشه‌بندی کل", value: stats.confirmed, color: "#64748b" },
        ].map((card) => (
          <div
            key={card.label}
            style={{
              padding: "10px 12px", borderRadius: 10, border: `1px solid ${theme.border}`,
              background: theme.card,
            }}
          >
            <div style={{ fontSize: 11, opacity: 0.7, marginBottom: 4 }}>{card.label}</div>
            <div style={{ fontSize: 22, fontWeight: 800, color: card.color }}>
              {toPersianDigits(card.value)}
            </div>
          </div>
        ))}
      </div>

      <p style={{ fontSize: 12, opacity: 0.75, margin: "0 0 14px", lineHeight: 1.9 }}>
        پیش‌فرض فقط اخبار مشکوکِ تعیین‌تکلیف‌نشده است. پس از «برگشت اشتباه» یا «پیوند خوشه» از این لیست خارج می‌شوند.
        بازهٔ شباهت نسبت به <b>تاریخ خود خبر</b> است؛ فقط شباهت بالای ۷۵٪ نمایش داده می‌شود. اخبار برگشت‌به‌فرستنده در رصد شباهت نیستند.
      </p>

      <div style={{
        display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 12, alignItems: "center",
        padding: 12, borderRadius: 10, border: `1px solid ${theme.border}`, background: theme.card,
      }}
      >
        <span style={{ fontSize: 12, fontWeight: 600 }}>نمایش لیست:</span>
        {LIST_STATUS_FILTERS.map((f) => (
          <button
            key={f.key}
            type="button"
            onClick={() => setListStatus(f.key)}
            style={{
              padding: "6px 12px", borderRadius: 8, fontFamily: "inherit", fontSize: 12, cursor: "pointer",
              border: listStatus === f.key ? "1px solid #0ea5e9" : `1px solid ${theme.border}`,
              background: listStatus === f.key ? "rgba(14,165,233,0.18)" : "transparent",
              color: theme.text, fontWeight: listStatus === f.key ? 700 : 500,
            }}
          >
            {f.label}
          </button>
        ))}
        {listStatus !== "suspicious" ? (
          <span style={{ fontSize: 11, opacity: 0.65, lineHeight: 1.7 }}>
            برای جلوگیری از رشد بی‌نهایت، خوشه‌ها فقط ۳۰ روز اخیر (بر اساس آخرین تغییر) نشان داده می‌شوند.
          </span>
        ) : null}
      </div>

      <div style={{
        display: "flex", flexWrap: "wrap", gap: 10, marginBottom: 14, alignItems: "center",
        padding: 12, borderRadius: 10, border: `1px solid ${theme.border}`, background: theme.card,
      }}
      >
        <span style={{ fontSize: 12, fontWeight: 600 }}>بازهٔ رصد شباهت (نسبت به تاریخ خبر):</span>
        {SIMILARITY_RANGES.map((r) => (
          <button
            key={r.key}
            type="button"
            onClick={() => setSimilarityRange(r.key)}
            style={{
              padding: "6px 12px", borderRadius: 8, fontFamily: "inherit", fontSize: 12, cursor: "pointer",
              border: similarityRange === r.key ? "1px solid #0ea5e9" : `1px solid ${theme.border}`,
              background: similarityRange === r.key ? "rgba(14,165,233,0.18)" : "transparent",
              color: theme.text, fontWeight: similarityRange === r.key ? 700 : 500,
            }}
          >
            {r.label}
          </button>
        ))}
        <span style={{ fontSize: 11, opacity: 0.65 }}>
          {activeId
            ? `در حال کار روی خبر #${toPersianDigits(activeId)} · بازه: ${rangeLabel}`
            : `بازه فعال: ${rangeLabel} — یک خبر را انتخاب کنید`}
        </span>
      </div>

      <div style={{ display: "flex", gap: 8, marginBottom: 12, flexWrap: "wrap", alignItems: "center" }}>
        <input
          value={listFilter}
          onChange={(e) => setListFilter(e.target.value)}
          placeholder="فیلتر متنی لیست (متن یا منبع)..."
          style={{
            flex: 1, minWidth: 200, padding: 10, borderRadius: 8, border: `1px solid ${theme.border}`,
            background: theme.card, color: theme.text, fontFamily: "inherit",
          }}
        />
        <button
          type="button"
          onClick={loadList}
          style={{
            padding: "10px 16px", borderRadius: 8, border: "none", background: "#0ea5e9",
            color: "#fff", cursor: "pointer", fontFamily: "inherit",
          }}
        >
          <Search size={16} style={{ display: "inline", marginLeft: 4 }} />
          فیلتر لیست
        </button>
        <div style={{ flex: "1 1 220px", minWidth: 200 }}>
          <MonitorSortBar
            fields={NEWS_DUPLICATES_SORT_FIELDS}
            sortConfig={sortConfig}
            onSortChange={setSortConfig}
            theme={theme}
            compact
          />
        </div>
      </div>

      {loading ? <p style={{ opacity: 0.7 }}>در حال بارگذاری...</p> : null}
      {!loading && !sortedItems.length ? (
        <p style={{ opacity: 0.65 }}>
          {listStatus === "suspicious" ? "خبر مشکوکِ باز یافت نشد." : "موردی در این فیلتر یافت نشد."}
        </p>
      ) : null}

      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {sortedItems.map((item) => {
          const displayHtml = resolveNewsDisplayHtml(item);
          const plainLen = stripHtml(displayHtml).length;
          const expanded = expandedItems[item.id];
          const isConfirmed = item.duplicate_status === "confirmed";
          const isActive = activeId === item.id;
          const similarRows = filteredSimilar(item.id);
          const selectedIds = selectedSimilarById[item.id] || [];
          const hasFetchedSimilar = Object.prototype.hasOwnProperty.call(similarById, item.id);

          return (
            <div
              key={item.id}
              role="button"
              tabIndex={0}
              onClick={() => { if (!isConfirmed) activateCard(item.id); }}
              onKeyDown={(e) => {
                if (!isConfirmed && (e.key === "Enter" || e.key === " ")) {
                  e.preventDefault();
                  activateCard(item.id);
                }
              }}
              style={{
                background: theme.card,
                border: isActive ? "2px solid #0ea5e9" : `1px solid ${theme.border}`,
                boxShadow: isActive ? "0 0 0 3px rgba(14,165,233,0.2)" : "none",
                borderRadius: 12,
                padding: 14,
                cursor: isConfirmed ? "default" : "pointer",
                outline: "none",
              }}
            >
              {isActive ? (
                <div style={{
                  marginBottom: 10, padding: "6px 10px", borderRadius: 8, fontSize: 12, fontWeight: 700,
                  background: "rgba(14,165,233,0.15)", color: "#0ea5e9",
                }}
                >
                  در حال کار روی خبر #
                  {toPersianDigits(item.id)}
                </div>
              ) : null}

              <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 8, fontSize: 12, alignItems: "center" }}>
                <span style={{ color: theme.accent, fontWeight: 700 }}>#{toPersianDigits(item.id)}</span>
                <span>{item.source}</span>
                <span style={{ opacity: 0.8 }}>{formatNewsRefDateTime(item)}</span>
                <NewsStatusBadges item={item} />
                {item.parent_id ? (
                  <span style={{ opacity: 0.8 }}>مرجع: #{toPersianDigits(item.parent_id)} {item.parent_source}</span>
                ) : null}
                <button
                  type="button"
                  disabled={busyId === item.id}
                  onClick={(e) => { e.stopPropagation(); clearDuplicate(item); }}
                  style={{
                    marginRight: "auto", display: "inline-flex", alignItems: "center", gap: 4,
                    padding: "5px 10px", borderRadius: 8, border: "1px solid rgba(239,68,68,0.4)",
                    background: "rgba(239,68,68,0.08)", color: "#f87171", cursor: "pointer",
                    fontFamily: "inherit", fontSize: 11,
                  }}
                >
                  <RotateCcw size={13} />
                  {isConfirmed ? "لغو پیوند تکراری" : "برگشت — اشتباه مشکوک بود"}
                </button>
              </div>

              <div onClick={(e) => e.stopPropagation()}>
                <NewsHtmlPreview
                  html={displayHtml}
                  compact={!expanded}
                  isDarkMode={theme.isDarkMode !== false}
                  style={{ fontSize: 13, margin: "0 0 8px" }}
                />
                {plainLen > 300 ? (
                  <button
                    type="button"
                    onClick={() => setExpandedItems((p) => ({ ...p, [item.id]: !p[item.id] }))}
                    style={{
                      border: "none", background: "none", color: theme.accent, cursor: "pointer",
                      fontFamily: "inherit", fontSize: 11, padding: 0, marginBottom: 10,
                    }}
                  >
                    {expanded ? "نمایش کمتر" : "نمایش متن کامل"}
                  </button>
                ) : null}
              </div>

              {!isConfirmed ? (
                <div
                  onClick={(e) => e.stopPropagation()}
                  style={{ borderTop: `1px solid ${theme.border}`, paddingTop: 12 }}
                >
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 10, alignItems: "center" }}>
                    <button
                      type="button"
                      disabled={similarLoadingId === item.id}
                      onClick={() => {
                        setActiveId(item.id);
                        fetchSimilar(item.id, similarityRange);
                      }}
                      style={{
                        display: "inline-flex", alignItems: "center", gap: 6, padding: "7px 12px",
                        borderRadius: 8, border: "none", background: "#0ea5e9", color: "#fff",
                        cursor: similarLoadingId === item.id ? "wait" : "pointer",
                        fontFamily: "inherit", fontSize: 12, fontWeight: 600,
                      }}
                    >
                      <Sparkles size={14} />
                      {similarLoadingId === item.id ? "در حال یافتن..." : `یافتن اخبار مشابه (${rangeLabel})`}
                    </button>
                    {selectedIds.length > 0 ? (
                      <button
                        type="button"
                        disabled={busyId === item.id}
                        onClick={() => clusterLink(item)}
                        style={{
                          display: "inline-flex", alignItems: "center", gap: 6, padding: "7px 12px",
                          borderRadius: 8, border: "none", background: "#22c55e", color: "#fff",
                          cursor: busyId === item.id ? "wait" : "pointer",
                          fontFamily: "inherit", fontSize: 12, fontWeight: 600,
                        }}
                      >
                        <GitMerge size={14} />
                        پیوند خوشه (
                        {toPersianDigits(selectedIds.length + 1)}
                        {" "}
                        خبر)
                      </button>
                    ) : null}
                  </div>

                  {hasFetchedSimilar || isActive ? (
                    <>
                      <label style={{ fontSize: 11, opacity: 0.75, display: "block", marginBottom: 6 }}>
                        جستجو داخل اخبار مشابه پیدا‌شده
                      </label>
                      <input
                        value={similarFilterById[item.id] || ""}
                        onChange={(e) => setSimilarFilterById((p) => ({ ...p, [item.id]: e.target.value }))}
                        placeholder="فیلتر نتایج مشابه (متن، منبع، شناسه)..."
                        style={{
                          width: "100%", padding: 8, borderRadius: 8, border: `1px solid ${theme.border}`,
                          background: theme.bg, color: theme.text, fontFamily: "inherit",
                          boxSizing: "border-box", marginBottom: 8,
                        }}
                      />
                      {similarLoadingId === item.id ? (
                        <p style={{ fontSize: 11, opacity: 0.65, margin: 0 }}>در حال مقایسهٔ شباهت...</p>
                      ) : similarRows.length > 0 ? (
                        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                          {similarRows.map((r) => (
                            <SimilarResultRow
                              key={r.id}
                              row={r}
                              theme={theme}
                              busy={busyId === item.id}
                              selected={selectedIds.includes(r.id)}
                              onToggle={(sid) => toggleSimilarSelect(item.id, sid)}
                            />
                          ))}
                        </div>
                      ) : (
                        <p style={{ fontSize: 11, opacity: 0.6, margin: 0 }}>
                          {hasFetchedSimilar
                            ? (similarFilterById[item.id]?.trim()
                              ? "در نتایج مشابه فیلتری یافت نشد."
                              : `خبر مشابهی با شباهت بالای ۷۵٪ در بازه «${rangeLabel}» یافت نشد.`)
                            : "برای دیدن نتایج، «یافتن اخبار مشابه» را بزنید."}
                        </p>
                      )}
                    </>
                  ) : null}

                  <div style={{ marginTop: 12 }}>
                    <button
                      type="button"
                      onClick={() => setManualOpenById((p) => ({ ...p, [item.id]: !p[item.id] }))}
                      style={{
                        display: "inline-flex", alignItems: "center", gap: 4, padding: "4px 0",
                        border: "none", background: "none", color: theme.accent, cursor: "pointer",
                        fontFamily: "inherit", fontSize: 11,
                      }}
                    >
                      {manualOpenById[item.id] ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
                      انتخاب دستی مرجع (جستجوی سراسری)
                    </button>
                    {manualOpenById[item.id] ? (
                      <div style={{ marginTop: 8 }}>
                        <input
                          value={manualQueryById[item.id] || ""}
                          onChange={(e) => searchManualParent(item.id, e.target.value)}
                          placeholder="متن، منبع یا ref_key..."
                          style={{
                            width: "100%", padding: 8, borderRadius: 8, border: `1px solid ${theme.border}`,
                            background: theme.bg, color: theme.text, fontFamily: "inherit",
                            boxSizing: "border-box", marginBottom: 8,
                          }}
                        />
                        {(manualResultsById[item.id] || []).length > 0 ? (
                          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                            {(manualResultsById[item.id] || []).map((r) => (
                              <ManualParentResult
                                key={r.id}
                                row={r}
                                theme={theme}
                                busy={busyId === item.id}
                                onLink={(row) => linkToParent(item.id, row)}
                              />
                            ))}
                          </div>
                        ) : (manualQueryById[item.id]?.trim() ? (
                          <p style={{ fontSize: 11, opacity: 0.6, margin: 0 }}>نتیجه‌ای یافت نشد.</p>
                        ) : null)}
                      </div>
                    ) : null}
                  </div>
                </div>
              ) : null}
            </div>
          );
        })}
      </div>
    </FormPageLayout>
  );
}
