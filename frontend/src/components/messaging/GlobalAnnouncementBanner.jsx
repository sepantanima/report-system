import React, { useCallback, useEffect, useState } from "react";
import messageService from "../../services/messageService.js";
import { formatMessageDateTime } from "../../utils/messageDateUtils.js";
import { useAppTheme } from "../../context/ThemeContext.jsx";

const PRIORITY_STYLE = {
  order: { bg: "rgba(239,68,68,0.15)", border: "rgba(239,68,68,0.4)", color: "#fca5a5" },
  important: { bg: "rgba(245,158,11,0.15)", border: "rgba(245,158,11,0.4)", color: "#fcd34d" },
  normal: { bg: "rgba(56,189,248,0.12)", border: "rgba(56,189,248,0.3)", color: "#bae6fd" },
};

export default function GlobalAnnouncementBanner() {
  const { isDarkMode } = useAppTheme();
  const [banners, setBanners] = useState([]);

  const load = useCallback(async () => {
    try {
      const rows = await messageService.banners();
      setBanners(Array.isArray(rows) ? rows : []);
    } catch {
      setBanners([]);
    }
  }, []);

  useEffect(() => {
    load();
    const t = setInterval(load, 60000);
    return () => clearInterval(t);
  }, [load]);

  const dismiss = async (id) => {
    try {
      await messageService.dismissBanner(id);
      setBanners((prev) => prev.filter((b) => b.id !== id));
    } catch {
      load();
    }
  };

  if (!banners.length) return null;

  return (
    <div style={{ padding: "0 16px 8px", maxWidth: "min(1100px, 96vw)", margin: "0 auto", width: "100%", boxSizing: "border-box" }}>
      {banners.map((b) => {
        const p = PRIORITY_STYLE[b.priority] || PRIORITY_STYLE.normal;
        return (
          <div
            key={b.id}
            style={{
              marginBottom: 8,
              padding: "12px 14px",
              borderRadius: 10,
              background: isDarkMode ? p.bg : p.bg,
              border: `1px solid ${p.border}`,
              color: isDarkMode ? p.color : "#1e293b",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "flex-start" }}>
              <div style={{ flex: 1 }}>
                {b.title ? (
                  <div style={{ fontWeight: 700, marginBottom: 6 }}>
                    {b.title}
                    {b.is_edited || b.edited_at ? (
                      <span style={{ color: "#f59e0b", fontSize: "0.85em", marginRight: 8 }}> (ویرایش‌شده)</span>
                    ) : null}
                  </div>
                ) : null}
                <div style={{ fontSize: 13, lineHeight: 1.7, whiteSpace: "pre-wrap" }}>{b.body}</div>
                {b.sender_name || b.created_at ? (
                  <div style={{ fontSize: 11, opacity: 0.75, marginTop: 8 }}>
                    {b.sender_name ? `— ${b.sender_name}` : ""}
                    {b.created_at ? `${b.sender_name ? " · " : ""}${formatMessageDateTime(b.created_at)}` : ""}
                  </div>
                ) : null}
              </div>
              {b.banner_dismissible !== false ? (
                <button
                  type="button"
                  onClick={() => dismiss(b.id)}
                  style={{
                    flexShrink: 0,
                    padding: "6px 12px",
                    borderRadius: 8,
                    border: `1px solid ${p.border}`,
                    background: "transparent",
                    color: "inherit",
                    cursor: "pointer",
                    fontSize: 12,
                    fontFamily: "inherit",
                  }}
                >
                  متوجه شدم
                </button>
              ) : null}
            </div>
          </div>
        );
      })}
    </div>
  );
}
