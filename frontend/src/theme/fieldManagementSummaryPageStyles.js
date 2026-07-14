import { FORM_PAGE_MODAL_Z_INDEX } from "./formPageTheme.js";

export function getFieldManagementSummaryStyles(theme, isDarkMode) {
  const inp = {
    padding: "8px 10px",
    borderRadius: 8,
    background: theme.inputBg,
    border: `1px solid ${theme.border}`,
    color: theme.text,
    width: "100%",
    fontFamily: "inherit",
    boxSizing: "border-box",
  };

  const btn = (variant = "ghost") => {
    const base = {
      display: "inline-flex",
      alignItems: "center",
      gap: 6,
      padding: "8px 14px",
      borderRadius: 8,
      cursor: "pointer",
      fontFamily: "inherit",
      fontSize: 13,
    };
    if (variant === "primary") {
      return { ...base, border: "none", background: "#0ea5e9", color: "#fff" };
    }
    if (variant === "purple") {
      return { ...base, border: "none", background: "#7c3aed", color: "#fff" };
    }
    return {
      ...base,
      border: `1px solid ${theme.border}`,
      background: isDarkMode ? "rgba(255,255,255,0.06)" : "#f1f5f9",
      color: theme.text,
    };
  };

  const panel = {
    border: `1px solid ${theme.border}`,
    borderRadius: 12,
    background: isDarkMode ? "rgba(0,0,0,0.15)" : theme.card,
    padding: 14,
    marginBottom: 14,
  };

  const filterPanel = {
    ...panel,
    display: "grid",
    gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))",
    gap: 10,
  };

  const modalOverlay = {
    position: "fixed",
    inset: 0,
    background: "rgba(0,0,0,0.55)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    zIndex: FORM_PAGE_MODAL_Z_INDEX,
    padding: 16,
  };

  const modalBox = (maxWidth = 720) => ({
    background: theme.card,
    border: `1px solid ${theme.border}`,
    borderRadius: 14,
    width: "100%",
    maxWidth,
    maxHeight: "88vh",
    overflowY: "auto",
    padding: 20,
    color: theme.text,
  });

  const tableWrap = {
    overflowX: "auto",
    border: `1px solid ${theme.border}`,
    borderRadius: 12,
  };

  const tableWrapInner = {
    overflowX: "auto",
    border: `1px solid ${theme.border}`,
    borderRadius: 10,
  };

  const readOnlyBox = {
    ...inp,
    background: isDarkMode ? "rgba(0,0,0,0.2)" : "#f1f5f9",
    opacity: 0.95,
  };

  const nestedCard = {
    border: `1px solid ${theme.border}`,
    borderRadius: 10,
    background: isDarkMode ? "rgba(0,0,0,0.2)" : "#f8fafc",
  };

  return {
    inp,
    btn,
    panel,
    filterPanel,
    modalOverlay,
    modalBox,
    tableWrap,
    tableWrapInner,
    readOnlyBox,
    nestedCard,
    tableHeadBg: isDarkMode ? theme.card : "#f1f5f9",
    tableRowBorder: `1px solid ${theme.border}`,
    expandedRowBg: isDarkMode ? "rgba(0,0,0,0.2)" : "#f8fafc",
    theme,
    isDarkMode,
  };
}

export function summaryTypeBadgeStyle(summaryType, isDarkMode) {
  if (summaryType === "general") {
    return {
      background: isDarkMode ? "rgba(34,197,94,0.12)" : "rgba(34,197,94,0.1)",
      color: isDarkMode ? "#86efac" : "#15803d",
      border: `1px solid ${isDarkMode ? "rgba(34,197,94,0.35)" : "rgba(34,197,94,0.35)"}`,
    };
  }
  if (summaryType === "provincial") {
    return {
      background: isDarkMode ? "rgba(59,130,246,0.15)" : "rgba(59,130,246,0.1)",
      color: isDarkMode ? "#93c5fd" : "#1d4ed8",
      border: `1px solid ${isDarkMode ? "rgba(59,130,246,0.4)" : "rgba(59,130,246,0.35)"}`,
    };
  }
  return {
    background: isDarkMode ? "rgba(245,158,11,0.15)" : "rgba(245,158,11,0.12)",
    color: isDarkMode ? "#fcd34d" : "#b45309",
    border: `1px solid ${isDarkMode ? "rgba(245,158,11,0.4)" : "rgba(245,158,11,0.35)"}`,
  };
}
