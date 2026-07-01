import React from "react";
import { Lock, Package } from "lucide-react";
import { formatPackBannerLabel } from "./newsSmartAnalysisUtils.js";
import { toPersianDigits } from "../../utils/analysisMonitorUtils.js";

export default function NewsSmartAnalysisPackBanner({ pack, theme, loading = false }) {
  if (loading) {
    return (
      <div style={{
        marginBottom: 14,
        padding: "12px 14px",
        borderRadius: 10,
        border: `1px solid ${theme.border}`,
        background: theme.isDarkMode ? "rgba(168,85,247,0.1)" : "rgba(124,58,237,0.06)",
        fontSize: 13,
        color: theme.muted,
      }}
      >
        در حال ثبت پک تحلیلی و فریز اخبار…
      </div>
    );
  }

  if (!pack?.id) return null;

  const label = formatPackBannerLabel(pack);
  const modeFa = pack.selection_mode === "subset" ? "زیرمجموعهٔ انتخاب‌شده" : "همهٔ نتایج فیلتر";

  return (
    <div style={{
      marginBottom: 14,
      padding: "12px 14px",
      borderRadius: 10,
      border: `1px solid ${theme.isDarkMode ? "rgba(168,85,247,0.35)" : "rgba(124,58,237,0.25)"}`,
      background: theme.isDarkMode ? "rgba(168,85,247,0.12)" : "rgba(124,58,237,0.08)",
    }}
    >
      <div style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
        <Package size={18} color="#a855f7" style={{ flexShrink: 0, marginTop: 2 }} />
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: theme.text, marginBottom: 4 }}>
            پک تحلیلی فعال
          </div>
          <div style={{ fontSize: 12, color: theme.text, lineHeight: 1.7 }}>
            {label}
          </div>
          <div style={{ fontSize: 11, color: theme.muted, marginTop: 4, lineHeight: 1.7 }}>
            <Lock size={11} style={{ display: "inline", verticalAlign: "middle", marginLeft: 4 }} />
            {toPersianDigits(pack.news_ids?.length ?? pack.news_count ?? 0)}
            {" "}
            شناسهٔ خبر فریزشده · حالت:
            {" "}
            {modeFa}
            {pack.digest_hash && (
              <span title={pack.digest_hash}>
                {" "}
                · هش ورودی AI:
                {" "}
                {pack.digest_hash.slice(0, 8)}
                …
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
