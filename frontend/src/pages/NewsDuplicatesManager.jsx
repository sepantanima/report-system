import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ChevronDown, ChevronUp, Link2, RotateCcw, Search, X } from "lucide-react";
import FormPageLayout from "../components/common/FormPageLayout.jsx";
import { stripHtml } from "../components/analysis/RichTextEditor.jsx";
import NewsHtmlPreview from "../components/news/NewsHtmlPreview.jsx";
import newsMonitorService from "../services/newsMonitorService.js";
import { getSessionRoles, hasPermission } from "../utils/userRoles.js";
import { toPersianDigits } from "../utils/analysisMonitorUtils.js";
import { formatNewsRefDateTime } from "../utils/newsDateDisplay.js";
import { resolveNewsDisplayHtml } from "../utils/newsDisplayHtml.js";
import { NEWS_REVIEW_STATES, NEWS_WORKFLOW_STATES } from "../constants/newsMonitorMeta.js";
import { NEWS_DUPLICATES_HELP } from "../content/newsFormHelp.jsx";
import { useAppTheme } from "../context/ThemeContext.jsx";

function statusBadge(label, color) {
  return (
    <span style={{ padding: "2px 7px", borderRadius: 6, background: `${color}22`, color, fontSize: 11, fontWeight: 600 }}>
      {label}
    </span>
  );
}

function ParentSearchResult({ row, theme, busy, onLink }) {
  const [expanded, setExpanded] = useState(false);
  const review = NEWS_REVIEW_STATES[row.review_state]?.label || row.review_state || "—";
  const reviewColor = NEWS_REVIEW_STATES[row.review_state]?.color || "#64748b";
  const workflow = NEWS_WORKFLOW_STATES[row.workflow_status]?.label || row.workflow_status || "";
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
        {statusBadge(review, reviewColor)}
        {workflow ? statusBadge(workflow, NEWS_WORKFLOW_STATES[row.workflow_status]?.color || "#64748b") : null}
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
          {expanded ? "بستن متن" : "نمایش متن کامل"}
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
  }), [isDarkMode]);

  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [parentSearch, setParentSearch] = useState({});
  const [parentResults, setParentResults] = useState({});
  const [busyId, setBusyId] = useState(null);
  const [toast, setToast] = useState("");
  const [expandedItems, setExpandedItems] = useState({});

  const showToast = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(""), 3500);
  };

  const loadList = useCallback(async () => {
    setLoading(true);
    try {
      const rows = await newsMonitorService.listDuplicates({
        ...(searchTerm.trim() ? { q: searchTerm.trim() } : {}),
      });
      setItems(rows || []);
    } catch (e) {
      showToast(e.response?.data?.error || "خطا در بارگذاری");
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [searchTerm]);

  useEffect(() => {
    if (allowed) loadList();
  }, [allowed, loadList]);

  const searchParent = async (newsId, q) => {
    setParentSearch((p) => ({ ...p, [newsId]: q }));
    if (!q.trim()) {
      setParentResults((p) => ({ ...p, [newsId]: [] }));
      return;
    }
    try {
      const rows = await newsMonitorService.searchParent(q);
      setParentResults((p) => ({ ...p, [newsId]: rows.filter((r) => r.id !== newsId) }));
    } catch {
      setParentResults((p) => ({ ...p, [newsId]: [] }));
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

  return (
    <FormPageLayout
      title="مدیریت تکراری‌ها"
      onHelp={() => NEWS_DUPLICATES_HELP()}
      helpTitle="راهنمای مدیریت تکراری‌ها"
    >
      {toast ? (
        <div style={{ marginBottom: 12, padding: "8px 12px", borderRadius: 8, background: "rgba(14,165,233,0.15)", border: "1px solid rgba(14,165,233,0.35)", fontSize: 13 }}>
          {toast}
        </div>
      ) : null}

      <p style={{ fontSize: 12, opacity: 0.75, margin: "0 0 14px", lineHeight: 1.9 }}>
        اخبار «مشکوک به تکرار» (علامت‌گذاری‌شده توسط دبیر) اینجا بدون محدودیت تاریخ فهرست می‌شوند.
        برای جزئیات فرایند، دکمه «راهنما» را ببینید.
      </p>

      <div style={{ display: "flex", gap: 8, marginBottom: 16, flexWrap: "wrap" }}>
        <input
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="جستجو در متن یا منبع..."
          style={{ flex: 1, minWidth: 200, padding: 10, borderRadius: 8, border: `1px solid ${theme.border}`, background: theme.card, color: theme.text, fontFamily: "inherit" }}
        />
        <button type="button" onClick={loadList} style={{ padding: "10px 16px", borderRadius: 8, border: "none", background: "#0ea5e9", color: "#fff", cursor: "pointer", fontFamily: "inherit" }}>
          <Search size={16} style={{ display: "inline", marginLeft: 4 }} />
          جستجو
        </button>
      </div>

      {loading ? <p style={{ opacity: 0.7 }}>در حال بارگذاری...</p> : null}
      {!loading && !items.length ? <p style={{ opacity: 0.65 }}>خبر مشکوک به تکراری یافت نشد.</p> : null}

      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {items.map((item) => {
          const displayHtml = resolveNewsDisplayHtml(item);
          const plainLen = stripHtml(displayHtml).length;
          const expanded = expandedItems[item.id];
          const results = parentResults[item.id] || [];
          const isConfirmed = item.duplicate_status === "confirmed";

          return (
            <div key={item.id} style={{ background: theme.card, border: `1px solid ${theme.border}`, borderRadius: 12, padding: 14 }}>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 8, fontSize: 12, alignItems: "center" }}>
                <span style={{ color: theme.accent, fontWeight: 700 }}>#{toPersianDigits(item.id)}</span>
                <span>{item.source}</span>
                <span style={{ opacity: 0.8 }}>{formatNewsRefDateTime(item)}</span>
                <span style={{ padding: "2px 8px", borderRadius: 6, background: isConfirmed ? "rgba(148,163,184,0.2)" : "rgba(245,158,11,0.15)", color: isConfirmed ? "#94a3b8" : "#f59e0b" }}>
                  {isConfirmed ? "تکراری تأییدشده" : "مشکوک"}
                </span>
                {item.parent_id ? (
                  <span style={{ opacity: 0.8 }}>مرجع: #{toPersianDigits(item.parent_id)} {item.parent_source}</span>
                ) : null}
                <button
                  type="button"
                  disabled={busyId === item.id}
                  onClick={() => clearDuplicate(item)}
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
                  style={{ border: "none", background: "none", color: theme.accent, cursor: "pointer", fontFamily: "inherit", fontSize: 11, padding: 0, marginBottom: 10 }}
                >
                  {expanded ? "نمایش کمتر" : "نمایش متن کامل"}
                </button>
              ) : null}

              {!isConfirmed ? (
                <div style={{ borderTop: `1px solid ${theme.border}`, paddingTop: 12 }}>
                  <label style={{ fontSize: 11, opacity: 0.75, display: "block", marginBottom: 6 }}>
                    جستجوی خبر مرجع (خبر اصلی — همه اخبار غیرتکراری، بدون محدودیت تاریخ)
                  </label>
                  <input
                    value={parentSearch[item.id] || ""}
                    onChange={(e) => searchParent(item.id, e.target.value)}
                    placeholder="متن، منبع یا ref_key..."
                    style={{ width: "100%", padding: 8, borderRadius: 8, border: `1px solid ${theme.border}`, background: theme.bg, color: theme.text, fontFamily: "inherit", boxSizing: "border-box", marginBottom: 8 }}
                  />
                  {results.length > 0 ? (
                    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                      {results.map((r) => (
                        <ParentSearchResult
                          key={r.id}
                          row={r}
                          theme={theme}
                          busy={busyId === item.id}
                          onLink={(row) => linkToParent(item.id, row)}
                        />
                      ))}
                    </div>
                  ) : (parentSearch[item.id]?.trim() ? (
                    <p style={{ fontSize: 11, opacity: 0.6, margin: 0 }}>نتیجه‌ای یافت نشد — عبارت دیگری امتحان کنید.</p>
                  ) : null)}
                </div>
              ) : null}
            </div>
          );
        })}
      </div>
    </FormPageLayout>
  );
}
