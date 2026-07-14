import React, { useCallback, useEffect, useState } from "react";
import { CheckCircle2, Eye, FolderOpen, Loader2, Plus, Search, Trash2 } from "lucide-react";
import newsSmartAnalysisService, {
  ANALYSIS_ACTION_LABELS,
  ANALYSIS_TYPES,
  isCustomPromptType,
} from "../../services/newsSmartAnalysisService.js";
import { toPersianDigits } from "../../utils/analysisMonitorUtils.js";
import { countCustomAnalysesFromRow, packStatusLabel } from "./newsSmartAnalysisUtils.js";
import NewsSmartAnalysisPromptViewModal from "./NewsSmartAnalysisPromptViewModal.jsx";

const PAGE_SIZES = [10, 20, 50];

function typeStatusIcons(typesDone = []) {
  return ANALYSIS_TYPES.map((t) => {
    const done = typesDone.includes(t);
    const short = (ANALYSIS_ACTION_LABELS[t] || t).split(" ")[0];
    return (
      <span
        key={t}
        title={ANALYSIS_ACTION_LABELS[t]}
        style={{
          fontSize: 10,
          padding: "2px 6px",
          borderRadius: 4,
          background: done ? "rgba(34,197,94,0.15)" : "rgba(148,163,184,0.12)",
          color: done ? "#22c55e" : "inherit",
          whiteSpace: "nowrap",
        }}
      >
        {done ? "✓" : "·"}
        {" "}
        {short}
      </span>
    );
  });
}

function statusBadge(theme, row) {
  const { text, tone } = packStatusLabel(row);
  const colors = {
    muted: { bg: "rgba(148,163,184,0.15)", color: theme.muted },
    success: { bg: "rgba(34,197,94,0.15)", color: "#22c55e" },
    warning: { bg: "rgba(245,158,11,0.15)", color: "#f59e0b" },
  };
  const c = colors[tone] || colors.muted;
  return (
    <span style={{
      fontSize: 10,
      padding: "2px 8px",
      borderRadius: 4,
      background: c.bg,
      color: c.color,
      whiteSpace: "nowrap",
    }}
    >
      {text}
    </span>
  );
}

export default function NewsSmartAnalysisHistoryTable({
  theme,
  refreshKey = 0,
  onError,
  activePackId,
  onOpenPack,
  onCreateNew,
  isLanding = false,
}) {
  const [rows, setRows] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [deletingId, setDeletingId] = useState(null);
  const [promptView, setPromptView] = useState(null);

  useEffect(() => {
    const t = setTimeout(() => {
      setSearch(searchInput.trim());
      setPage(1);
    }, 350);
    return () => clearTimeout(t);
  }, [searchInput]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await newsSmartAnalysisService.listPacks({
        page,
        page_size: pageSize,
        q: search || undefined,
      });
      setRows(r.rows || []);
      setTotal(r.total || 0);
    } catch (e) {
      onError?.(e.response?.data?.error || e.message);
    } finally {
      setLoading(false);
    }
  }, [onError, page, pageSize, search]);

  useEffect(() => { load(); }, [load, refreshKey]);

  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const rowOffset = (page - 1) * pageSize;

  const onDelete = async (id) => {
    if (!window.confirm("این بسته تحلیلی و همهٔ تحلیل‌هایش حذف شود؟")) return;
    setDeletingId(id);
    try {
      await newsSmartAnalysisService.deletePack(id);
      await load();
    } catch (e) {
      onError?.(e.response?.data?.error || e.message);
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div style={{ marginTop: isLanding ? 0 : 24 }}>
      <div style={{
        display: "flex",
        flexWrap: "wrap",
        gap: 12,
        alignItems: "flex-start",
        justifyContent: "space-between",
        marginBottom: 12,
      }}
      >
        <div>
          <h2 style={{ fontSize: isLanding ? 20 : 15, margin: "0 0 6px" }}>
            {isLanding ? "بسته‌های تحلیل هوشمند" : "بایگانی بسته‌های تحلیلی"}
            {" "}
            (
            {toPersianDigits(total)}
            )
          </h2>
          <p style={{ fontSize: 12, color: theme.muted, margin: 0, lineHeight: 1.7 }}>
            {isLanding
              ? "لیست بسته‌های تحلیلی با بازهٔ ثابت و اخبار فریزشده. یک بسته را باز کنید یا بستهٔ جدید بسازید."
              : "هر بسته تحلیلی یک بازهٔ خبری ثابت با اخبار فریزشده است. با «باز کردن» کل جلسه (فیلتر، اخبار، تحلیل‌ها) بازیابی می‌شود."}
          </p>
        </div>
        {isLanding && onCreateNew && (
          <button
            type="button"
            onClick={onCreateNew}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
              padding: "10px 16px",
              borderRadius: 8,
              border: "1px solid #7c3aed",
              background: theme.isDarkMode ? "rgba(168,85,247,0.15)" : "rgba(124,58,237,0.08)",
              color: "#7c3aed",
              cursor: "pointer",
              fontFamily: "inherit",
              fontSize: 13,
              fontWeight: 600,
              whiteSpace: "nowrap",
            }}
          >
            <Plus size={16} />
            ایجاد بسته تحلیلی جدید
          </button>
        )}
      </div>

      <div style={{ display: "flex", flexWrap: "wrap", gap: 10, marginBottom: 10, alignItems: "center" }}>
        <div style={{ position: "relative", flex: "1 1 200px", minWidth: 180 }}>
          <Search size={14} style={{ position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)", color: theme.muted }} />
          <input
            type="search"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="جستجو در عنوان بسته تحلیلی یا شناسه..."
            style={{
              width: "100%",
              padding: "8px 32px 8px 10px",
              borderRadius: 8,
              border: `1px solid ${theme.border}`,
              background: theme.card,
              color: theme.text,
              fontFamily: "inherit",
              fontSize: 12,
              boxSizing: "border-box",
            }}
          />
        </div>
        <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: theme.muted }}>
          در صفحه
          <select
            value={pageSize}
            onChange={(e) => { setPageSize(Number(e.target.value)); setPage(1); }}
            style={{
              padding: "6px 8px",
              borderRadius: 6,
              border: `1px solid ${theme.border}`,
              background: theme.card,
              color: theme.text,
              fontFamily: "inherit",
              fontSize: 12,
            }}
          >
            {PAGE_SIZES.map((n) => (
              <option key={n} value={n}>{toPersianDigits(n)}</option>
            ))}
          </select>
        </label>
      </div>

      <div style={{ overflowX: "auto", border: `1px solid ${theme.border}`, borderRadius: 8 }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12, minWidth: 720 }}>
          <thead>
            <tr style={{ borderBottom: `1px solid ${theme.border}`, background: theme.isDarkMode ? "#0f172a" : "#f5f5f5" }}>
              <th style={{ padding: 8, textAlign: "right" }}>بسته تحلیلی</th>
              <th style={{ padding: 8 }}>وضعیت</th>
              <th style={{ padding: 8 }}>بازه</th>
              <th style={{ padding: 8 }}>اخبار</th>
              <th style={{ padding: 8 }}>تحلیل‌ها</th>
              <th style={{ padding: 8 }}>عملیات</th>
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr>
                <td colSpan={6} style={{ padding: 20, textAlign: "center" }}>
                  <Loader2 size={14} style={{ animation: "spin 1s linear infinite", verticalAlign: "middle" }} />
                  {" "}
                  بارگذاری…
                </td>
              </tr>
            )}
            {!loading && rows.length === 0 && (
              <tr>
                <td colSpan={6} style={{ padding: 20, textAlign: "center", color: theme.muted }}>
                  {search ? "نتیجه‌ای یافت نشد." : "بستهٔ تحلیلی ثبت نشده است."}
                  {isLanding && !search && onCreateNew && (
                    <div style={{ marginTop: 12 }}>
                      <button
                        type="button"
                        onClick={onCreateNew}
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: 6,
                          padding: "8px 14px",
                          borderRadius: 8,
                          border: "1px solid #7c3aed",
                          background: theme.isDarkMode ? "rgba(168,85,247,0.15)" : "rgba(124,58,237,0.08)",
                          color: "#7c3aed",
                          cursor: "pointer",
                          fontFamily: "inherit",
                          fontSize: 12,
                        }}
                      >
                        <Plus size={14} />
                        ایجاد اولین بسته
                      </button>
                    </div>
                  )}
                </td>
              </tr>
            )}
            {!loading && rows.map((row) => {
              const isActive = activePackId != null && row.id === activePackId;
              const typesDone = row.types_done || row.analysis_types_done || [];
              const standardDone = typesDone.filter((t) => ANALYSIS_TYPES.includes(t));
              const customAnalyses = (row.analyses_summary || []).filter((a) => isCustomPromptType(a.analysis_type));
              return (
                <tr
                  key={row.id}
                  style={{
                    borderBottom: `1px solid ${theme.border}`,
                    background: isActive
                      ? (theme.isDarkMode ? "rgba(168,85,247,0.1)" : "rgba(124,58,237,0.06)")
                      : "transparent",
                  }}
                >
                  <td style={{ padding: 8, maxWidth: 280 }}>
                    <div style={{ fontWeight: isActive ? 700 : 500 }}>
                      {(row.title || "—").slice(0, 80)}
                      {isActive && (
                        <span style={{ fontSize: 10, color: "#a855f7", marginRight: 6 }}> (فعال)</span>
                      )}
                    </div>
                    <div style={{ fontSize: 10, color: theme.muted, marginTop: 2 }}>
                      #
                      {toPersianDigits(row.id)}
                    </div>
                  </td>
                  <td style={{ padding: 8 }}>{statusBadge(theme, row)}</td>
                  <td style={{ padding: 8, whiteSpace: "nowrap" }}>
                    {toPersianDigits(row.period_from || "—")}
                    {row.period_to && row.period_to !== row.period_from && (
                      <>
                        {" "}
                        —
                        {" "}
                        {toPersianDigits(row.period_to)}
                      </>
                    )}
                  </td>
                  <td style={{ padding: 8, whiteSpace: "nowrap" }}>
                    {toPersianDigits(row.news_count ?? 0)}
                  </td>
                  <td style={{ padding: 8 }}>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 4, alignItems: "center" }}>
                      {typeStatusIcons(standardDone)}
                      {row.types_complete && (
                        <CheckCircle2 size={14} color="#22c55e" title="هر چهار تحلیل ذخیره شده" />
                      )}
                      {customAnalyses.length > 0 && customAnalyses.map((ca) => {
                        const promptTitle = ca.custom_prompt_title || ca.title || "تحلیل شخصی";
                        return (
                          <button
                            key={ca.analysis_type}
                            type="button"
                            title="مشاهده پرامپت"
                            onClick={() => setPromptView({
                              title: promptTitle,
                              prompt: ca.custom_prompt || "",
                            })}
                            style={{
                              fontSize: 10,
                              padding: "2px 8px",
                              borderRadius: 4,
                              background: "rgba(168,85,247,0.15)",
                              color: "#7c3aed",
                              whiteSpace: "nowrap",
                              border: "none",
                              cursor: ca.custom_prompt ? "pointer" : "default",
                              fontFamily: "inherit",
                              display: "inline-flex",
                              alignItems: "center",
                              gap: 4,
                            }}
                          >
                            ✦
                            {promptTitle.slice(0, 28)}
                            {promptTitle.length > 28 ? "…" : ""}
                            {ca.custom_prompt && <Eye size={10} />}
                          </button>
                        );
                      })}
                      {customAnalyses.length === 0 && countCustomAnalysesFromRow(row) > 0 && (
                        <span
                          style={{
                            fontSize: 10,
                            padding: "2px 8px",
                            borderRadius: 4,
                            background: "rgba(168,85,247,0.15)",
                            color: "#7c3aed",
                          }}
                        >
                          ✦
                          {" "}
                          {toPersianDigits(countCustomAnalysesFromRow(row))}
                          {" "}
                          تحلیل شخصی
                        </span>
                      )}
                    </div>
                  </td>
                  <td style={{ padding: 8 }}>
                    <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
                      <button
                        type="button"
                        onClick={() => onOpenPack?.(row.id)}
                        style={iconBtn(theme, false, true)}
                      >
                        <FolderOpen size={12} />
                        باز کردن
                      </button>
                      <button
                        type="button"
                        title="حذف بسته"
                        disabled={deletingId === row.id}
                        onClick={() => onDelete(row.id)}
                        style={iconBtn(theme, true)}
                      >
                        {deletingId === row.id ? <Loader2 size={12} /> : <Trash2 size={12} />}
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {total > 0 && (
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 10, flexWrap: "wrap", gap: 8, fontSize: 12 }}>
          <span style={{ color: theme.muted }}>
            نمایش {toPersianDigits(rowOffset + 1)}–{toPersianDigits(Math.min(rowOffset + rows.length, total))} از {toPersianDigits(total)}
          </span>
          <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
            <button
              type="button"
              disabled={page <= 1 || loading}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              style={pageBtn(theme)}
            >
              قبلی
            </button>
            <span>{toPersianDigits(page)} / {toPersianDigits(totalPages)}</span>
            <button
              type="button"
              disabled={page >= totalPages || loading}
              onClick={() => setPage((p) => p + 1)}
              style={pageBtn(theme)}
            >
              بعدی
            </button>
          </div>
        </div>
      )}

      <NewsSmartAnalysisPromptViewModal
        open={!!promptView}
        theme={theme}
        title={promptView?.title}
        prompt={promptView?.prompt}
        onDismiss={() => setPromptView(null)}
      />
    </div>
  );
}

function iconBtn(theme, danger = false, primary = false) {
  return {
    padding: "4px 8px",
    borderRadius: 6,
    border: `1px solid ${danger ? "#ef4444" : primary ? "#7c3aed" : theme.border}`,
    background: primary ? (theme.isDarkMode ? "rgba(168,85,247,0.15)" : "rgba(124,58,237,0.08)") : theme.card,
    color: danger ? "#ef4444" : primary ? "#7c3aed" : theme.text,
    cursor: "pointer",
    fontFamily: "inherit",
    fontSize: 11,
    display: "inline-flex",
    alignItems: "center",
    gap: 4,
  };
}

function pageBtn(theme) {
  return {
    padding: "6px 12px",
    borderRadius: 6,
    border: `1px solid ${theme.border}`,
    background: theme.card,
    color: theme.text,
    cursor: "pointer",
    fontFamily: "inherit",
    fontSize: 12,
  };
}
