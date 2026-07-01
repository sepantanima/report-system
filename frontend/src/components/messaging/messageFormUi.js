/** استایل‌های مشترک فرم‌های پیام */

export const MESSAGE_FORM_WIDTH = "min(96vw, 920px)";

export const MESSAGE_PAGE_CSS = `
  .message-inbox-grid {
    display: grid;
    grid-template-columns: minmax(260px, 1fr) minmax(280px, 1.4fr);
    gap: 18px;
    width: 100%;
  }
  @media (max-width: 768px) {
    .message-inbox-grid {
      grid-template-columns: 1fr;
    }
    .message-inbox-grid .message-detail-panel {
      min-height: 180px;
    }
    .message-audience-row {
      flex-direction: column !important;
      align-items: stretch !important;
    }
    .message-audience-row .message-audience-type {
      flex: 1 1 100% !important;
      max-width: none !important;
    }
    .message-tab-row {
      gap: 6px !important;
    }
    .message-tab-row button {
      flex: 1 1 calc(50% - 4px);
      min-width: 0;
      font-size: 0.88em !important;
      padding: 8px 10px !important;
    }
  }
  .message-audience-row {
    display: flex;
    flex-wrap: wrap;
    gap: 10px;
    align-items: flex-start;
    margin-bottom: 12px;
  }
  .message-audience-type {
    flex: 0 0 200px;
    max-width: 220px;
    min-width: 0;
  }
  .message-audience-values {
    flex: 1 1 280px;
    min-width: 0;
    overflow: visible;
  }
  .multiselect-root {
    position: relative;
    overflow: visible;
  }
  .message-list-panel {
    display: flex;
    flex-direction: column;
    max-height: min(70vh, 560px);
    min-height: 280px;
    overflow: hidden;
  }
  .message-list-header {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
    padding: 10px 14px;
    border-bottom: 1px solid var(--message-list-border, rgba(255,255,255,0.1));
    flex-shrink: 0;
    font-size: 0.88em;
  }
  .message-list-scroll {
    flex: 1;
    min-height: 0;
    overflow-y: auto;
    -webkit-overflow-scrolling: touch;
  }
  .message-list-item {
    display: flex;
    align-items: flex-start;
    gap: 8px;
    width: 100%;
    text-align: right;
    border: none;
    border-bottom: 1px solid var(--message-list-border, rgba(255,255,255,0.08));
    background: transparent;
    cursor: pointer;
    font-family: inherit;
    padding: 10px 12px;
    box-sizing: border-box;
  }
  .message-list-item-check {
    flex-shrink: 0;
    margin-top: 4px;
    cursor: pointer;
  }
  @media (max-width: 768px) {
    .message-list-panel {
      max-height: min(55vh, 420px);
    }
  }
`;

export function messageFormCard(theme) {
  return {
    width: "100%",
    maxWidth: MESSAGE_FORM_WIDTH,
    margin: "0 auto",
    background: theme.card,
    border: `1px solid ${theme.border}`,
    borderRadius: 14,
    padding: "20px 24px",
    overflow: "visible",
    boxSizing: "border-box",
  };
}

export function messageInput(theme, multiline = false) {
  return {
    width: "100%",
    maxWidth: "100%",
    padding: "10px 12px",
    borderRadius: 10,
    border: `1px solid ${theme.border}`,
    background: theme.input,
    color: theme.text,
    fontFamily: "inherit",
    boxSizing: "border-box",
    display: "block",
    ...(multiline ? { minHeight: 140, resize: "vertical", overflow: "auto" } : {}),
  };
}

export function messageTabBtn(theme, active, variant = "default") {
  const variants = {
    default: { bg: "#0ea5e9", idle: theme.card },
    warn: { bg: "linear-gradient(135deg, #f59e0b, #ea580c)", idle: theme.card },
    ghost: { bg: theme.card, idle: theme.card },
  };
  const v = variants[variant] || variants.default;
  return {
    padding: "9px 16px",
    borderRadius: 10,
    border: active ? "none" : `1px solid ${theme.border}`,
    background: active ? v.bg : v.idle,
    color: active && variant !== "ghost" ? "#fff" : theme.text,
    cursor: "pointer",
    fontFamily: "inherit",
    fontSize: "0.93em",
    fontWeight: active ? 700 : 500,
    boxShadow: active ? "0 2px 8px rgba(14,165,233,0.25)" : "none",
    transition: "all 0.15s ease",
  };
}

export function messagePrimaryBtn(disabled = false) {
  return {
    display: "inline-flex",
    alignItems: "center",
    gap: 8,
    padding: "11px 22px",
    borderRadius: 10,
    border: "none",
    background: disabled ? "rgba(14,165,233,0.45)" : "linear-gradient(135deg, #0ea5e9, #0284c7)",
    color: "#fff",
    cursor: disabled ? "not-allowed" : "pointer",
    fontFamily: "inherit",
    fontWeight: 700,
    fontSize: "0.95em",
    boxShadow: disabled ? "none" : "0 4px 14px rgba(14,165,233,0.35)",
  };
}

export function messageChip(theme) {
  return {
    display: "inline-flex",
    alignItems: "center",
    gap: 6,
    padding: "4px 10px",
    borderRadius: 20,
    background: "rgba(56,189,248,0.15)",
    border: `1px solid rgba(56,189,248,0.35)`,
    color: theme.text,
    fontSize: "0.86em",
    marginLeft: 6,
    marginBottom: 6,
  };
}
