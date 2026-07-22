import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowRight, Download, Loader2, Printer, ScrollText } from "lucide-react";
import { useAppTheme } from "../../context/ThemeContext.jsx";
import { toPersianDigits } from "../../utils/analysisMonitorUtils.js";
import commandCenterService from "../../services/commandCenterService.js";
import { rangeFromPreset } from "../../components/command/dashboard/dashboardDateUtils.js";
import { strategyContentToDisplayHtml, STRATEGY_HTML_BODY_CSS } from "../../utils/strategyContentFormat.js";

const TABS = [
  { id: "strategy", title: "تحلیل‌های راهبردی", empty: "خروجی راهبردی تأیید/منتشرشده‌ای در این بازه وجود ندارد." },
  { id: "analyses", title: "تحلیل‌ها", empty: "هنوز تحلیلی برای نمایش در اتاق فرمان در این بازه ثبت نشده است." },
  { id: "briefs", title: "تحلیل‌های کوتاه", empty: "تحلیل کوتاهی برای نمایش در اتاق فرمان در این بازه انتخاب نشده است." },
];

const LIBRARY_RANGE_PRESETS = [
  { id: "today", label: "روز" },
  { id: "week", label: "هفته" },
  { id: "month", label: "ماه" },
  { id: "quarter", label: "فصل" },
  { id: "year", label: "سال" },
];

function formatWhen(value) {
  if (!value) return "—";
  try {
    return toPersianDigits(
      new Date(value).toLocaleString("fa-IR", {
        year: "numeric",
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      }),
    );
  } catch {
    return "—";
  }
}

function downloadTextFile(filename, text) {
  const blob = new Blob([text || ""], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

function printHtmlDocument(title, html) {
  const win = window.open("", "_blank", "noopener,noreferrer,width=900,height=700");
  if (!win) return;
  const safeTitle = String(title || "").replace(/</g, "&lt;");
  const body = strategyContentToDisplayHtml(html);
  win.document.write(`<!doctype html><html lang="fa" dir="rtl"><head>
    <meta charset="utf-8"/>
    <title>${safeTitle}</title>
    <style>
      body{font-family:Tahoma,Vazirmatn,Arial,sans-serif;line-height:1.9;padding:24px;color:#111}
      h1{font-size:20px;margin:0 0 16px}
      img{max-width:100%}
      ${STRATEGY_HTML_BODY_CSS}
    </style>
  </head><body>
    <h1>${safeTitle}</h1>
    <div class="strategy-html-body">${body || "<p>—</p>"}</div>
  </body></html>`);
  win.document.close();
  win.focus();
  setTimeout(() => {
    try { win.print(); } catch { /* ignore */ }
  }, 250);
}

export default function CommandStrategicOutputs() {
  const navigate = useNavigate();
  const { isDarkMode } = useAppTheme();
  const theme = useMemo(() => ({
    bg: isDarkMode ? "#0f172a" : "#f8fafc",
    card: isDarkMode ? "#1e293b" : "#ffffff",
    border: isDarkMode ? "rgba(255,255,255,0.1)" : "#e2e8f0",
    text: isDarkMode ? "#f1f5f9" : "#0f172a",
    muted: isDarkMode ? "#94a3b8" : "#64748b",
    accent: "#e11d48",
    soft: isDarkMode ? "rgba(225,29,72,0.15)" : "#fff1f2",
  }), [isDarkMode]);

  const [isMobile, setIsMobile] = useState(() =>
    typeof window !== "undefined" ? window.matchMedia("(max-width: 900px)").matches : false,
  );
  useEffect(() => {
    const mq = window.matchMedia("(max-width: 900px)");
    const onChange = () => setIsMobile(mq.matches);
    onChange();
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  const [tab, setTab] = useState("strategy");
  const [library, setLibrary] = useState({ analyses: [], briefs: [], strategy: [] });
  const [selected, setSelected] = useState(null);
  const [rangePreset, setRangePreset] = useState("today");
  const [loading, setLoading] = useState(true);
  const [detailLoading, setDetailLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const range = rangeFromPreset(rangePreset) || rangeFromPreset("today");
        const data = await commandCenterService.listLibrary({
          from: range.from,
          to: range.to,
          preset: rangePreset,
        });
        if (cancelled) return;
        setLibrary({
          analyses: Array.isArray(data?.analyses) ? data.analyses : [],
          briefs: Array.isArray(data?.briefs) ? data.briefs : [],
          strategy: Array.isArray(data?.strategy) ? data.strategy : [],
        });
        setSelected(null);
        setError("");
      } catch (e) {
        if (!cancelled) setError(e?.response?.data?.error || e.message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [rangePreset]);

  const items = library[tab] || [];
  const activeTab = TABS.find((t) => t.id === tab) || TABS[0];

  const openItem = async (kind, id) => {
    setDetailLoading(true);
    setError("");
    try {
      const item = await commandCenterService.getLibraryItem(kind, id);
      setSelected(item);
    } catch (e) {
      setError(e?.response?.data?.error || e.message);
      setSelected(null);
    } finally {
      setDetailLoading(false);
    }
  };

  const bodyHtml = strategyContentToDisplayHtml(
    selected?.html || selected?.text || "",
  );

  return (
    <div style={{ minHeight: "100vh", background: theme.bg, color: theme.text, padding: "16px 18px 40px", direction: "rtl" }}>
      <style>{STRATEGY_HTML_BODY_CSS}</style>
      <div style={{ maxWidth: 1100, margin: "0 auto" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
          <button
            type="button"
            onClick={() => navigate("/command")}
            style={{
              background: theme.card, border: `1px solid ${theme.border}`, color: theme.text,
              borderRadius: 8, width: 38, height: 38, display: "grid", placeItems: "center", cursor: "pointer",
            }}
            aria-label="بازگشت"
          >
            <ArrowRight size={18} />
          </button>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 8, fontWeight: 800, fontSize: 18 }}>
              <ScrollText size={20} color={theme.accent} />
              کتابخانه خروجی‌های اتاق فرمان
            </div>
            <div style={{ color: theme.muted, fontSize: 12, marginTop: 4 }}>
              مشاهده، چاپ و دریافت خروجی — بدون امکان ویرایش یا انتشار
            </div>
          </div>
        </div>

        {error ? (
          <div style={{
            background: theme.soft, border: `1px solid ${theme.accent}`, color: theme.text,
            borderRadius: 10, padding: "10px 12px", marginBottom: 12, fontSize: 13,
          }}>
            {error}
          </div>
        ) : null}

        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 10 }}>
          {LIBRARY_RANGE_PRESETS.map((p) => {
            const active = p.id === rangePreset;
            return (
              <button
                key={p.id}
                type="button"
                onClick={() => setRangePreset(p.id)}
                style={{
                  background: active ? theme.soft : theme.card,
                  color: theme.text,
                  border: `1px solid ${active ? theme.accent : theme.border}`,
                  borderRadius: 8,
                  padding: "6px 12px",
                  cursor: "pointer",
                  fontFamily: "inherit",
                  fontWeight: active ? 700 : 600,
                  fontSize: 12,
                }}
              >
                {p.label}{p.id === "today" ? " (پیش‌فرض)" : ""}
              </button>
            );
          })}
        </div>

        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 14 }}>
          {TABS.map((t) => {
            const active = t.id === tab;
            const count = (library[t.id] || []).length;
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => { setTab(t.id); setSelected(null); }}
                style={{
                  background: active ? theme.accent : theme.card,
                  color: active ? "#fff" : theme.text,
                  border: `1px solid ${active ? theme.accent : theme.border}`,
                  borderRadius: 999,
                  padding: "8px 14px",
                  cursor: "pointer",
                  fontFamily: "inherit",
                  fontWeight: 700,
                  fontSize: 13,
                }}
              >
                {t.title}
                <span style={{ opacity: 0.85, marginRight: 6 }}>({toPersianDigits(count)})</span>
              </button>
            );
          })}
        </div>

        <div style={{
          display: "grid",
          gridTemplateColumns: (selected || detailLoading) && !isMobile
            ? "minmax(240px, 1fr) minmax(0, 1.3fr)"
            : "1fr",
          gap: 14,
          alignItems: "start",
          width: "100%",
          minWidth: 0,
        }}>
          {(!isMobile || !(selected || detailLoading)) ? (
          <div style={{
            background: theme.card, border: `1px solid ${theme.border}`, borderRadius: 14, overflow: "hidden", minWidth: 0,
          }}>
            {loading ? (
              <div style={{ padding: 28, display: "flex", gap: 8, alignItems: "center", color: theme.muted }}>
                <Loader2 size={16} className="spin" /> در حال بارگذاری…
              </div>
            ) : items.length === 0 ? (
              <div style={{ padding: 24, color: theme.muted, fontSize: 13 }}>{activeTab.empty}</div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column" }}>
                {items.map((row) => {
                  const kind = tab === "analyses" ? "analysis" : tab === "briefs" ? "brief" : "strategy";
                  const isActive = selected?.kind === kind && selected?.id === row.id;
                  return (
                    <button
                      key={`${kind}-${row.id}`}
                      type="button"
                      onClick={() => openItem(kind, row.id)}
                      style={{
                        textAlign: "right",
                        background: isActive ? theme.soft : "transparent",
                        border: "none",
                        borderBottom: `1px solid ${theme.border}`,
                        color: theme.text,
                        padding: "14px 16px",
                        cursor: "pointer",
                        fontFamily: "inherit",
                        width: "100%",
                        boxSizing: "border-box",
                      }}
                    >
                      <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 4, wordBreak: "break-word" }}>{row.title || "بدون عنوان"}</div>
                      <div
                        className="strategy-card-preview"
                        style={{ color: theme.muted, fontSize: 12, lineHeight: 1.7, maxHeight: 72, overflow: "hidden" }}
                        dangerouslySetInnerHTML={{
                          __html: strategyContentToDisplayHtml(row.preview_html || row.preview || "") || "<span>بدون پیش‌نمایش</span>",
                        }}
                      />
                      <div style={{ color: theme.muted, fontSize: 11, marginTop: 8 }}>{formatWhen(row.sort_at)}</div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
          ) : null}

          {(selected || detailLoading) ? (
            <div style={{
              background: theme.card, border: `1px solid ${theme.border}`, borderRadius: 14, padding: 16,
              position: isMobile ? "static" : "sticky", top: 12, minWidth: 0, width: "100%", boxSizing: "border-box", overflow: "hidden",
            }}>
              {detailLoading ? (
                <div style={{ display: "flex", gap: 8, alignItems: "center", color: theme.muted, padding: 20 }}>
                  <Loader2 size={16} /> در حال دریافت محتوا…
                </div>
              ) : selected ? (
                <>
                  {isMobile ? (
                    <button
                      type="button"
                      onClick={() => setSelected(null)}
                      style={{
                        ...actionBtn(theme),
                        marginBottom: 10,
                      }}
                    >
                      <ArrowRight size={14} /> بازگشت به فهرست
                    </button>
                  ) : null}
                  <div style={{ display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap", marginBottom: 12 }}>
                    <div style={{ minWidth: 0, flex: "1 1 140px" }}>
                      <div style={{ fontWeight: 800, fontSize: 16, wordBreak: "break-word" }}>{selected.title}</div>
                      <div style={{ color: theme.muted, fontSize: 12, marginTop: 4 }}>
                        {selected.kind === "analysis" ? "تحلیل"
                          : selected.kind === "brief" ? "تحلیل کوتاه"
                            : "تحلیل راهبردی"}
                      </div>
                    </div>
                    <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                      <button
                        type="button"
                        onClick={() => printHtmlDocument(selected.title, bodyHtml)}
                        style={actionBtn(theme)}
                      >
                        <Printer size={14} /> چاپ
                      </button>
                      <button
                        type="button"
                        onClick={() => downloadTextFile(
                          `${selected.title || "output"}.txt`,
                          selected.text || "",
                        )}
                        style={actionBtn(theme)}
                      >
                        <Download size={14} /> دریافت متن
                      </button>
                      <button
                        type="button"
                        onClick={() => downloadTextFile(
                          `${selected.title || "output"}.html`,
                          `<!doctype html><html lang="fa" dir="rtl"><head><meta charset="utf-8"/><title>${String(selected.title || "").replace(/</g, "")}</title><style>body{font-family:Tahoma,Vazirmatn,sans-serif;line-height:1.9;padding:24px;color:#111}${STRATEGY_HTML_BODY_CSS}</style></head><body><h1>${String(selected.title || "").replace(/</g, "")}</h1><div class="strategy-html-body">${bodyHtml}</div></body></html>`,
                        )}
                        style={actionBtn(theme)}
                      >
                        <Download size={14} /> دریافت HTML
                      </button>
                    </div>
                  </div>
                  <div
                    className="strategy-html-body"
                    style={{
                      borderTop: `1px solid ${theme.border}`,
                      paddingTop: 12,
                      lineHeight: 1.9,
                      fontSize: 14,
                      maxHeight: "70vh",
                      overflow: "auto",
                      wordBreak: "break-word",
                      overflowWrap: "anywhere",
                    }}
                    dangerouslySetInnerHTML={{ __html: bodyHtml || "<p style='opacity:.7'>—</p>" }}
                  />
                </>
              ) : null}
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function actionBtn(theme) {
  return {
    display: "inline-flex",
    alignItems: "center",
    gap: 6,
    background: theme.bg,
    border: `1px solid ${theme.border}`,
    color: theme.text,
    borderRadius: 8,
    padding: "7px 10px",
    cursor: "pointer",
    fontFamily: "inherit",
    fontSize: 12,
    fontWeight: 600,
  };
}
