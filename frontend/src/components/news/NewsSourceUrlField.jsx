import React from "react";
import { ExternalLink } from "lucide-react";
import { NEWS_FIELD_LIMITS } from "../../constants/newsFieldLimits.js";
import { clampText } from "../../utils/limitInput.js";
import { pxToEm } from "../../utils/pageFontSize.js";

function isValidHttpUrl(value) {
  const s = String(value ?? "").trim();
  if (!s) return false;
  try {
    const u = new URL(/^https?:\/\//i.test(s) ? s : `https://${s}`);
    return ["http:", "https:"].includes(u.protocol);
  } catch {
    return false;
  }
}

function toOpenUrl(value) {
  const s = String(value ?? "").trim();
  if (!s) return "";
  return /^https?:\/\//i.test(s) ? s : `https://${s}`;
}

export default function NewsSourceUrlField({ form, set, theme, readOnly = false, compact = false }) {
  const url = form.source_url || "";
  const canOpen = isValidHttpUrl(url);

  const lbl = {
    fontSize: pxToEm(compact ? 11 : 12),
    opacity: 0.9,
    display: "block",
    marginBottom: compact ? 5 : 8,
    fontWeight: 600,
  };

  return (
    <div style={{ marginBottom: compact ? 8 : 14 }}>
      <label style={lbl}>لینک خبر اصلی (اختیاری)</label>
      <div style={{ display: "flex", gap: 6, alignItems: "stretch" }}>
        <input
          type="url"
          dir="ltr"
          disabled={readOnly}
          value={url}
          onChange={(e) => set("source_url", clampText(e.target.value, NEWS_FIELD_LIMITS.sourceUrl))}
          maxLength={NEWS_FIELD_LIMITS.sourceUrl}
          placeholder="https://..."
          style={{
            flex: 1,
            minWidth: 0,
            padding: compact ? "8px 8px" : "10px 8px",
            borderRadius: 8,
            background: theme.card,
            border: `1px solid ${theme.border}`,
            color: theme.text,
            fontFamily: "inherit",
            fontSize: pxToEm(compact ? 11 : 12),
            boxSizing: "border-box",
          }}
        />
        {canOpen ? (
          <a
            href={toOpenUrl(url)}
            target="_blank"
            rel="noopener noreferrer"
            title="مشاهده خبر اصلی"
            aria-label="مشاهده خبر اصلی"
            style={{
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              width: compact ? 36 : 40,
              flexShrink: 0,
              borderRadius: 8,
              border: `1px solid ${theme.border}`,
              background: "rgba(56,189,248,0.12)",
              color: "#38bdf8",
            }}
          >
            <ExternalLink size={compact ? 15 : 16} />
          </a>
        ) : null}
      </div>
    </div>
  );
}
