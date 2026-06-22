import React from "react";
import { useNavigate } from "react-router-dom";
import { ArrowRight, HelpCircle } from "lucide-react";
import { useAppTheme } from "../../context/ThemeContext.jsx";
import { getUnitReportFormStyles } from "../../theme/unitReportFormStyles";

export default function AnalysisPageShell({ title, subtitle, children, wide = true, backTo = "/main", onHelp, helpTitle = "راهنما" }) {
  const navigate = useNavigate();
  const { isDarkMode } = useAppTheme();
  const S = getUnitReportFormStyles(isDarkMode);
  const [showHelp, setShowHelp] = React.useState(false);

  return (
    <div style={S.containerStyle}>
      <div style={{ ...S.cardStyle, maxWidth: wide ? "min(1100px, 96vw)" : "min(640px, 94vw)", width: "100%" }}>
        <div style={S.slimHeader}>
          <button type="button" style={S.miniBackBtn} onClick={() => navigate(backTo)} aria-label="بازگشت">
            <ArrowRight size={16} />
          </button>
          <div style={{ textAlign: "left", flex: 1 }}>
            <div style={{ color: S.headingOnCard, fontWeight: "bold", fontSize: "14px" }}>{title}</div>
            {subtitle && <div style={{ color: S.subMuted, fontSize: "11px", marginTop: "2px" }}>{subtitle}</div>}
          </div>
          {onHelp && (
            <button type="button" style={{ ...S.miniBackBtn, marginRight: 8 }} onClick={() => setShowHelp(true)} aria-label="راهنما">
              <HelpCircle size={16} />
            </button>
          )}
        </div>
        <div style={S.formContent}>{children}</div>
      </div>
      {showHelp && onHelp && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)", zIndex: 2000, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }} onClick={() => setShowHelp(false)}>
          <div style={{ background: isDarkMode ? "#1e293b" : "#fff", borderRadius: 14, maxWidth: 560, width: "100%", maxHeight: "85vh", overflow: "auto", padding: 20, border: `1px solid ${isDarkMode ? "#334155" : "#e2e8f0"}` }} onClick={(e) => e.stopPropagation()}>
            <h3 style={{ margin: "0 0 12px", fontSize: 15 }}>{helpTitle}</h3>
            {onHelp()}
            <button type="button" style={{ ...S.sendBtn, width: "100%", marginTop: 16 }} onClick={() => setShowHelp(false)}>بستن</button>
          </div>
        </div>
      )}
    </div>
  );
}