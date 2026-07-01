import React from "react";
import { Loader2 } from "lucide-react";
import { ANALYSIS_ACTION_LABELS } from "../../services/newsSmartAnalysisService.js";

export default function NewsSmartAnalysisProgressOverlay({ actionName, theme }) {
  const label = ANALYSIS_ACTION_LABELS[actionName] || "تحلیل هوشمند";

  return (
    <div
      role="alertdialog"
      aria-busy="true"
      aria-live="assertive"
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 2000,
        background: theme.isDarkMode ? "rgba(15,23,42,0.72)" : "rgba(15,23,42,0.45)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        backdropFilter: "blur(3px)",
        pointerEvents: "all",
      }}
    >
      <div
        style={{
          background: theme.card,
          padding: "28px 32px",
          borderRadius: 14,
          boxShadow: "0 20px 50px rgba(0,0,0,0.28)",
          textAlign: "center",
          maxWidth: 380,
          width: "min(92vw, 380px)",
          border: `1px solid ${theme.border}`,
        }}
      >
        <Loader2
          size={40}
          color="#a855f7"
          style={{ animation: "smartAnalysisSpin 1s linear infinite", marginBottom: 16 }}
        />
        <div style={{ fontSize: 16, fontWeight: 700, color: theme.text, marginBottom: 8 }}>
          در حال تحلیل هوشمند
        </div>
        <div style={{ fontSize: 14, color: theme.text, marginBottom: 6 }}>
          {label}
        </div>
        <div style={{ fontSize: 12, color: theme.muted, lineHeight: 1.8 }}>
          لطفاً صبر کنید؛ این مرحله ممکن است چند دقیقه طول بکشد.
          <br />
          تا پایان تحلیل امکان تغییر فرم وجود ندارد.
        </div>
      </div>
      <style>{`
        @keyframes smartAnalysisSpin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
