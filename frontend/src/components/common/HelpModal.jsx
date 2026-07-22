import React from "react";
import { X } from "lucide-react";
import { useAppTheme } from "../../context/ThemeContext.jsx";
import { ANALYSIS_MONITOR_CSS } from "../../theme/analysisMonitorStyles.js";

export default function HelpModal({
  open,
  onClose,
  title = "راهنما",
  children,
  maxWidth = 560,
  confirmLabel = "متوجه شدم",
}) {
  const { isDarkMode } = useAppTheme();
  const theme = {
    card: isDarkMode ? "#1e293b" : "#ffffff",
    border: isDarkMode ? "rgba(255,255,255,0.1)" : "#e2e8f0",
  };

  if (!open) return null;

  return (
    <div className="v3-modal-overlay" onClick={onClose}>
      <style>{ANALYSIS_MONITOR_CSS}</style>
      <div
        className="v3-modal-box"
        style={{ background: theme.card, border: `1px solid ${theme.border}`, maxWidth, color: isDarkMode ? "#f1f5f9" : "#1e293b" }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="v3-modal-header-new">
          <button type="button" onClick={onClose} className="v3-icon-btn" style={{ color: "#f87171", border: "none" }} aria-label="بستن">
            <X size={18} />
          </button>
          <span>{title}</span>
        </div>
        <div className="v3-modal-body">{children}</div>
        <div className="v3-modal-footer-new">
          <button type="button" className="v3-btn-footer v3-primary-solid" onClick={onClose}>
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
