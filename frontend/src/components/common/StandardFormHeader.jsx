import React from "react";
import { useNavigate } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import { useAppTheme } from "../../context/ThemeContext.jsx";
import { usePageFontSize } from "../../utils/pageFontSize.js";
import PageToolbarButtons from "./PageToolbarButtons.jsx";
import PageUserMenu from "./PageUserMenu.jsx";
import { getFormPageTheme } from "../../theme/formPageTheme.js";

/**
 * هدر استاندارد فرم‌ها: بازگشت، عنوان، ابزار تم/فونت/راهنما
 * variant="page" → نوار چسبان تمام‌عرض (پیش‌فرض)
 * variant="embedded" → داخل کارت فرم (بدون sticky)
 */
export default function StandardFormHeader({
  title,
  subtitle,
  backTo = "/main",
  onBack,
  onHelp,
  showHelp = true,
  showProfile = true,
  showLogout = true,
  headerEnd,
  toolbarExtra,
  subRow,
  variant = "page",
  sticky = true,
}) {
  const navigate = useNavigate();
  const { isDarkMode } = useAppTheme();
  const { level: fontLevel, cycleFont } = usePageFontSize();
  const theme = getFormPageTheme(isDarkMode);

  const handleBack = () => {
    if (onBack) onBack();
    else navigate(backTo);
  };

  const titleBlock = (
    <div className="form-page-header-title" style={{ flex: 1, minWidth: 0, textAlign: "right" }}>
      <h1 style={{ fontSize: variant === "embedded" ? "1em" : "1.1em", margin: 0, fontWeight: 700, color: theme.text, lineHeight: 1.35 }}>
        {title}
      </h1>
      {subtitle ? (
        <div style={{ fontSize: "0.79em", color: theme.muted, marginTop: 2 }}>{subtitle}</div>
      ) : null}
    </div>
  );

  const mainRow = (
    <div className="v3-nav-row form-page-header-main">
      <button type="button" onClick={handleBack} className="v3-icon-btn" title="بازگشت" aria-label="بازگشت">
        <ArrowRight size={18} />
      </button>
      {titleBlock}
      <div className="v3-nav-tools form-page-header-tools">
        {headerEnd}
        <PageToolbarButtons
          fontLevel={fontLevel}
          onCycleFont={cycleFont}
          onHelp={onHelp}
          showHelp={showHelp && !!onHelp}
          btnClass="v3-icon-btn"
        />
        <PageUserMenu showProfile={showProfile} showLogout={showLogout} btnClass="v3-icon-btn" />
      </div>
    </div>
  );

  const extraRow = toolbarExtra ? (
    <div className="v3-nav-row sub form-page-header-actions">{toolbarExtra}</div>
  ) : null;

  const subRowBlock = subRow ? (
    <div className={`v3-nav-row sub form-page-header-sub${toolbarExtra ? " has-actions-above" : ""}`}>{subRow}</div>
  ) : null;

  const body = (
    <>
      {mainRow}
      {extraRow}
      {subRowBlock}
    </>
  );

  if (variant === "embedded") {
    return (
      <div
        style={{
          background: theme.card,
          borderBottom: `1px solid ${theme.border}`,
          padding: "12px 15px",
        }}
      >
        {body}
      </div>
    );
  }

  return (
    <header
      className="v3-navbar form-page-header"
      style={{
        background: theme.card,
        borderBottom: `1px solid ${theme.border}`,
        padding: "12px 16px",
        position: sticky && variant === "page" ? "sticky" : "relative",
        top: 0,
        zIndex: 100,
        backdropFilter: "blur(10px)",
      }}
    >
      {body}
    </header>
  );
}
