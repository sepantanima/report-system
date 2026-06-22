import React from "react";
import "../../components/analysis/RichTextEditor.css";

const baseStyle = {
  fontSize: "inherit",
  lineHeight: 1.85,
  textAlign: "justify",
  margin: 0,
  overflow: "hidden",
  wordBreak: "break-word",
};

/**
 * پیش‌نمایش HTML خبر — بدون برش تگ (فقط محدودیت CSS)
 */
export default function NewsHtmlPreview({
  html = "",
  compact = false,
  style,
  className,
  isDarkMode = true,
}) {
  const src = String(html || "").trim();
  if (!src) {
    return <p style={{ ...baseStyle, opacity: 0.5, ...style }}>—</p>;
  }

  return (
    <div
      className={`rich-text-content news-html-preview ${isDarkMode ? "dark" : "light"} ${className || ""}`}
      style={{
        ...baseStyle,
        maxHeight: compact ? 88 : 200,
        WebkitLineClamp: compact ? 4 : 8,
        display: "-webkit-box",
        WebkitBoxOrient: "vertical",
        ...style,
      }}
      dangerouslySetInnerHTML={{ __html: src }}
    />
  );
}
