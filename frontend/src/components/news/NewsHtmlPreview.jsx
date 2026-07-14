import React from "react";
import "../../components/analysis/RichTextEditor.css";

const baseStyle = {
  fontSize: "inherit",
  lineHeight: 1.85,
  textAlign: "justify",
  margin: 0,
  wordBreak: "break-word",
};

/**
 * پیش‌نمایش HTML خبر — بدون برش تگ (فقط محدودیت CSS)
 */
export default function NewsHtmlPreview({
  html = "",
  compact = false,
  scrollable = false,
  style,
  className,
  isDarkMode = true,
}) {
  const src = String(html || "").trim();
  if (!src) {
    return <p style={{ ...baseStyle, opacity: 0.5, overflow: "hidden", ...style }}>—</p>;
  }

  const clampedStyle = scrollable
    ? {
        maxHeight: 140,
        overflowY: "auto",
        overflowX: "hidden",
        WebkitOverflowScrolling: "touch",
        display: "block",
      }
    : {
        maxHeight: compact ? 88 : 200,
        WebkitLineClamp: compact ? 4 : 8,
        display: "-webkit-box",
        WebkitBoxOrient: "vertical",
        overflow: "hidden",
      };

  return (
    <div
      className={`rich-text-content news-html-preview ${isDarkMode ? "dark" : "light"} ${className || ""}`}
      style={{
        ...baseStyle,
        ...clampedStyle,
        ...style,
      }}
      dangerouslySetInnerHTML={{ __html: src }}
    />
  );
}
