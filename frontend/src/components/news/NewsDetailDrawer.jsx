import React from "react";
import { ArrowRight } from "lucide-react";
import { NewsEditorFormProvider } from "./NewsEditorFormContext.jsx";
import NewsDetailPane from "./NewsDetailPane.jsx";
import NewsReviewPane from "./NewsReviewPane.jsx";

export default function NewsDetailDrawer({
  open,
  onClose,
  item,
  items,
  index,
  total,
  roles,
  categoryOptions,
  theme,
  ...actionProps
}) {
  if (!open) return null;

  return (
    <div
      dir="rtl"
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 200,
        background: theme.bg,
        display: "flex",
        flexDirection: "column",
        color: theme.text,
        overflow: "hidden",
      }}
    >
      <div
        style={{
          padding: "4px 8px",
          borderBottom: `1px solid ${theme.border}`,
          display: "flex",
          alignItems: "center",
          gap: 8,
          flexShrink: 0,
          background: theme.card,
        }}
      >
        <button
          type="button"
          onClick={onClose}
          title="بازگشت به لیست"
          aria-label="بازگشت به لیست"
          style={{
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            width: 32,
            height: 32,
            padding: 0,
            borderRadius: 8,
            border: `1px solid ${theme.border}`,
            background: theme.bg,
            color: theme.text,
            cursor: "pointer",
            flexShrink: 0,
          }}
        >
          <ArrowRight size={16} />
        </button>
        <span style={{ fontSize: "0.85em", fontWeight: 600, opacity: 0.9 }}>ویرایش خبر</span>
      </div>

      <NewsEditorFormProvider item={item} items={items} index={index} total={total} roles={roles}>
        <div
          style={{
            flex: 1,
            minHeight: 0,
            display: "flex",
            flexDirection: "column",
            overflow: "hidden",
          }}
        >
          <div style={{ flexShrink: 0, padding: "2px 4px 0" }}>
            <NewsDetailPane {...actionProps} theme={theme} isMobile />
          </div>

          <div
            style={{
              flex: 1,
              minHeight: 0,
              overflowY: "auto",
              WebkitOverflowScrolling: "touch",
              padding: "4px 6px 12px",
              borderTop: `1px solid ${theme.border}`,
            }}
          >
            <NewsReviewPane theme={theme} categoryOptions={categoryOptions} compact />
          </div>
        </div>
      </NewsEditorFormProvider>
    </div>
  );
}
