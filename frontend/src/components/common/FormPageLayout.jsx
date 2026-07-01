import React, { useEffect, useState } from "react";
import { useAppTheme } from "../../context/ThemeContext.jsx";
import { usePageFontSize } from "../../utils/pageFontSize.js";
import { ANALYSIS_MONITOR_CSS } from "../../theme/analysisMonitorStyles.js";
import { FORM_PAGE_CSS } from "../../theme/formPageStyles.js";
import { getFormPageTheme } from "../../theme/formPageTheme.js";
import StandardFormHeader from "./StandardFormHeader.jsx";
import HelpModal from "./HelpModal.jsx";
import GlobalAnnouncementBanner from "../messaging/GlobalAnnouncementBanner.jsx";
import NotificationBell from "../messaging/NotificationBell.jsx";

/**
 * قالب یکسان صفحات فرم: تم، فونت، هدر، راهنما
 * card=true → محتوا داخل کارت مرکزی (مثل AnalysisPageShell)
 */
export default function FormPageLayout({
  title,
  subtitle,
  documentTitle,
  backTo = "/main",
  onBack,
  onHelp,
  helpTitle = "راهنما",
  showHelp = true,
  headerEnd,
  toolbarExtra,
  subRow,
  children,
  card = false,
  wide = true,
  maxWidth,
  contentPadding,
  fillViewport = false,
  headerVariant = "page",
}) {
  const { isDarkMode } = useAppTheme();
  const { fontSizePx } = usePageFontSize();
  const theme = getFormPageTheme(isDarkMode);
  const [helpOpen, setHelpOpen] = useState(false);

  const resolvedTitle = documentTitle || title;
  useEffect(() => {
    if (resolvedTitle) document.title = resolvedTitle;
  }, [resolvedTitle]);

  const contentMaxWidth = maxWidth ?? (wide ? "min(1100px, 96vw)" : "min(640px, 94vw)");
  const padding = contentPadding ?? (card ? undefined : "16px 16px 32px");

  const openHelp = onHelp ? () => setHelpOpen(true) : undefined;

  const header = (
    <StandardFormHeader
      title={title}
      subtitle={subtitle}
      backTo={backTo}
      onBack={onBack}
      onHelp={openHelp}
      showHelp={showHelp}
      headerEnd={(
        <>
          {headerEnd}
          <NotificationBell isDarkMode={isDarkMode} />
        </>
      )}
      toolbarExtra={toolbarExtra}
      subRow={subRow}
      variant={card ? "embedded" : headerVariant}
    />
  );

  const body = card ? (
    <div
      style={{
        background: theme.bg,
        minHeight: fillViewport ? "100vh" : undefined,
        padding: "15px 10px",
        direction: "rtl",
      }}
    >
      <div
        style={{
          background: theme.card,
          borderRadius: 14,
          maxWidth: wide ? "min(1100px, 96vw)" : "min(640px, 94vw)",
          width: "100%",
          margin: "0 auto",
          border: `1px solid ${theme.border}`,
          overflow: "hidden",
        }}
      >
        {header}
        <GlobalAnnouncementBanner />
        <div style={{ padding: padding ?? "18px" }}>{children}</div>
      </div>
    </div>
  ) : (
    <>
      {header}
      <GlobalAnnouncementBanner />
      <main
        style={{
          maxWidth: contentMaxWidth,
          margin: "0 auto",
          padding,
          flex: fillViewport ? 1 : undefined,
          overflow: fillViewport ? "auto" : undefined,
        }}
      >
        {children}
      </main>
    </>
  );

  return (
    <div
      dir="rtl"
      className="page-font-root"
      style={{
        minHeight: fillViewport ? "100vh" : "100vh",
        background: theme.bg,
        color: theme.text,
        fontFamily: "Tahoma, sans-serif",
        fontSize: fontSizePx,
        ["--page-font-size"]: fontSizePx,
        display: fillViewport && !card ? "flex" : "block",
        flexDirection: fillViewport && !card ? "column" : undefined,
        overflow: fillViewport && !card ? "hidden" : undefined,
      }}
    >
      <style>{ANALYSIS_MONITOR_CSS}</style>
      <style>{FORM_PAGE_CSS}</style>
      {body}
      {onHelp ? (
        <HelpModal open={helpOpen} onClose={() => setHelpOpen(false)} title={helpTitle}>
          {typeof onHelp === "function" ? onHelp() : onHelp}
        </HelpModal>
      ) : null}
    </div>
  );
}
