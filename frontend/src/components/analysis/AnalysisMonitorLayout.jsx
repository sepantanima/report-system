import React, { useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import ThemedDatePicker from "../../components/analysis/ThemedDatePicker.jsx";
import persian from "react-date-object/calendars/persian";
import persian_fa from "react-date-object/locales/persian_fa";
import {
  Search, ArrowRight, Filter, X, RotateCcw, SlidersHorizontal, Plus,
} from "lucide-react";
import { useAppTheme } from "../../context/ThemeContext.jsx";
import { BASE_PAGE_FONT_PX, usePageFontSize } from "../../utils/pageFontSize.js";
import PageToolbarButtons from "../common/PageToolbarButtons.jsx";
import PageUserMenu from "../common/PageUserMenu.jsx";
import NotificationBell from "../messaging/NotificationBell.jsx";
import { ANALYSIS_MONITOR_CSS } from "../../theme/analysisMonitorStyles.js";
import { FORM_PAGE_CSS } from "../../theme/formPageStyles.js";
import { toPersianDigits } from "../../utils/analysisMonitorUtils.js";

export default function AnalysisMonitorLayout({
  pageTitle,
  searchPlaceholder = "جستجو...",
  searchTerm,
  onSearchChange,
  dates,
  onDatesChange,
  stats = [],
  onStatClick,
  showFilters,
  onToggleFilters,
  onResetFilters,
  filterContent,
  loading,
  onHelp,
  helpTitle = "راهنما",
  onAdd,
  addLabel = "جدید",
  subNavExtra,
  tabs,
  activeTab,
  onTabChange,
  children,
  backTo = "/main",
  fillViewport = false,
}) {
  const navigate = useNavigate();
  const sidebarRef = useRef(null);
  const { isDarkMode } = useAppTheme();
  const { level: fontLevel, cycleFont, fontSizePx } = usePageFontSize();
  const [showHelp, setShowHelp] = React.useState(false);

  const theme = {
    bg: isDarkMode ? "#0f172a" : "#f8fafc",
    card: isDarkMode ? "#1e293b" : "#ffffff",
    border: isDarkMode ? "rgba(255,255,255,0.1)" : "#e2e8f0",
    text: isDarkMode ? "#f1f5f9" : "#1e293b",
    inputBg: isDarkMode ? "rgba(0,0,0,0.2)" : "#fff",
  };

  useEffect(() => {
    document.title = pageTitle;
  }, [pageTitle]);

  useEffect(() => {
    const handler = (e) => {
      if (showFilters && sidebarRef.current && !sidebarRef.current.contains(e.target) && !e.target.closest(".v3-filter-btn-trigger")) {
        onToggleFilters(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [showFilters, onToggleFilters]);

  const openHelp = () => {
    if (onHelp) setShowHelp(true);
  };

  return (
    <div
      className="page-font-root"
      style={{
        background: theme.bg,
        height: "100vh",
        display: "flex",
        flexDirection: "column",
        direction: "rtl",
        color: theme.text,
        overflow: "hidden",
        fontFamily: "Tahoma, sans-serif",
        fontSize: BASE_PAGE_FONT_PX,
        ["--input-font-size"]: fontSizePx,
      }}
    >
      <style>{ANALYSIS_MONITOR_CSS}</style>
      <style>{FORM_PAGE_CSS}</style>

      <header className="v3-navbar" style={{ background: theme.card, borderBottom: `1px solid ${theme.border}` }}>
        <div className="v3-nav-row">
          <button type="button" onClick={() => navigate(backTo)} className="v3-icon-btn"><ArrowRight size={18} /></button>
          <div className="v3-search-input" style={{ background: theme.inputBg, border: `1px solid ${theme.border}` }}>
            <Search size={16} />
            <input placeholder={searchPlaceholder} value={searchTerm} onChange={(e) => onSearchChange(e.target.value)} />
          </div>
          <div className="v3-nav-tools">
            <button type="button" onClick={() => onToggleFilters(!showFilters)} className={`v3-icon-btn v3-filter-btn-trigger ${showFilters ? "active" : ""}`} title="فیلتر"><Filter size={18} /></button>
            <NotificationBell isDarkMode={isDarkMode} />
            <PageToolbarButtons fontLevel={fontLevel} onCycleFont={cycleFont} onHelp={openHelp} showHelp={!!onHelp} btnClass="v3-icon-btn" />
            <PageUserMenu btnClass="v3-icon-btn" />
          </div>
          {onAdd && (
            <button type="button" className="v3-add-fab v3-add-fab-row" onClick={onAdd}><Plus size={16} /> {addLabel}</button>
          )}
        </div>
        <div className="v3-nav-row sub">
          <div className="v3-nav-date-priority-row">
            <div className="v3-date-box v3-date-row" style={{ border: `1px solid ${theme.border}`, background: theme.inputBg, color: theme.text }}>
              <ThemedDatePicker isDarkMode={isDarkMode} value={dates} onChange={onDatesChange} range calendar={persian} locale={persian_fa} calendarPosition="bottom-right" placeholder="فیلتر تاریخ ثبت (اختیاری)" />
            </div>
            {subNavExtra}
          </div>
          {stats.length > 0 && (
            <div className="v3-summary-bar">
              {stats.map((s, idx) => {
                const clickable = Boolean(onStatClick && (s.filterKey || s.tabId));
                return (
                <React.Fragment key={s.key || idx}>
                  {idx > 0 && <div className="v3-stat-divider" />}
                  <div
                    className={`v3-stat-seg${clickable ? " v3-stat-clickable" : ""}`}
                    style={{ "--seg-color": s.color }}
                    role={clickable ? "button" : undefined}
                    tabIndex={clickable ? 0 : undefined}
                    onClick={clickable ? () => onStatClick(s) : undefined}
                    onKeyDown={clickable ? (e) => { if (e.key === "Enter" || e.key === " ") onStatClick(s); } : undefined}
                  >
                    <span>{s.label}</span>
                    <b>{toPersianDigits(s.value ?? 0)}</b>
                  </div>
                </React.Fragment>
                );
              })}
            </div>
          )}
        </div>
      </header>

      <aside ref={sidebarRef} className={`v3-side-filter ${showFilters ? "open" : ""}`} style={{ background: theme.card, borderLeft: `1px solid ${theme.border}` }}>
        <div className="v3-filter-header">
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}><SlidersHorizontal size={16} /><span>فیلترها</span></div>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <button type="button" onClick={onResetFilters} className="v3-reset-btn"><RotateCcw size={12} /> پاک کردن</button>
            <X size={18} style={{ cursor: "pointer" }} onClick={() => onToggleFilters(false)} />
          </div>
        </div>
        <div>{filterContent}</div>
      </aside>

      <main className={`v3-content-scroll${fillViewport ? " v3-content-fill" : ""}`}>
        {tabs?.length > 0 && (
          <div className="v3-tab-row">
            {tabs.map((t) => (
              <button
                key={t.id}
                type="button"
                className={`v3-tab-btn ${activeTab === t.id ? "active" : ""}`}
                style={{ color: activeTab === t.id ? "#38bdf8" : theme.text, borderColor: theme.border }}
                onClick={() => onTabChange(t.id)}
              >
                {t.icon && <t.icon size={14} />}
                <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                  {t.label}
                  {t.badge > 0 && (
                    <span
                      className={`v3-tab-badge v3-tab-badge-${t.badgeTone || "count"}`}
                      style={t.badgeTone === "custom" ? t.badgeStyle : undefined}
                    >
                      {toPersianDigits(t.badge > 99 ? "99+" : t.badge)}
                    </span>
                  )}
                </span>
              </button>
            ))}
          </div>
        )}
        {loading ? <p style={{ opacity: 0.6, fontSize: "13px" }}>در حال بارگذاری...</p> : children}
      </main>

      {showHelp && onHelp && (
        <div className="v3-modal-overlay" onClick={() => setShowHelp(false)}>
          <div className="v3-modal-box" style={{ background: theme.card, border: `1px solid ${theme.border}` }} onClick={(e) => e.stopPropagation()}>
            <div className="v3-modal-header-new">
              <button type="button" onClick={() => setShowHelp(false)} className="v3-icon-btn" style={{ color: "#f87171", border: "none" }}><X size={18} /></button>
              <span>{helpTitle}</span>
            </div>
            <div className="v3-modal-body">{onHelp()}</div>
            <div className="v3-modal-footer-new">
              <button type="button" className="v3-btn-footer v3-primary-solid" onClick={() => setShowHelp(false)}>متوجه شدم</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
