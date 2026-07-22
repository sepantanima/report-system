import React from "react";
import { useAuth } from "../../context/AuthContext.jsx";
import { useAppTheme } from "../../context/ThemeContext.jsx";
import { getFormPageTheme } from "../../theme/formPageTheme.js";

/**
 * راهنمای عملیاتی hub آنلاین/آفلاین — بالای فرم‌های sync
 */
export default function HubOperationGuide({ usbOneWay = true }) {
  const { isOnlineHub, isOfflineHub, orgCode, instanceMode } = useAuth();
  const { isDarkMode } = useAppTheme();
  const theme = getFormPageTheme(isDarkMode);
  const modeFa = isOnlineHub ? "آنلاین" : isOfflineHub ? "آفلاین" : (instanceMode === "offline" ? "آفلاین" : "آنلاین");

  const boxStyle = {
    marginBottom: 16,
    padding: "14px 16px",
    borderRadius: 10,
    border: `1px solid ${isDarkMode ? "rgba(56,189,248,0.35)" : "rgba(14,165,233,0.35)"}`,
    background: isDarkMode ? "rgba(56,189,248,0.08)" : "rgba(240,249,255,0.9)",
    color: theme.text,
    fontSize: 13,
    lineHeight: 1.85,
  };

  return (
    <div style={boxStyle}>
      <strong style={{ display: "block", marginBottom: 8, color: isDarkMode ? "#38bdf8" : "#0369a1" }}>
        محیط فعلی: سرور {modeFa}
        {orgCode ? ` · سازمان ${orgCode}` : ""}
        {usbOneWay ? " · USB فقط آنلاین→آفلاین" : ""}
      </strong>
      {isOnlineHub ? (
        <ul style={{ margin: 0, paddingRight: 20 }}>
          <li><strong>اینجا:</strong> export pack، پیش‌نمایش، تأیید تحویل دستی پس از import آفلاین.</li>
          <li><strong>آفلاین:</strong> import pack — هیچ فایلی با USB به اینجا برنمی‌گردد.</li>
          <li>داده از آفلاین به آنلاین sync نمی‌شود.</li>
        </ul>
      ) : (
        <ul style={{ margin: 0, paddingRight: 20 }}>
          <li><strong>اینجا:</strong> import pack دریافتی از آنلاین و اعمال.</li>
          <li><strong>آنلاین:</strong> export و دانلود pack برای USB.</li>
          <li>بعد از import موفق، به اپرator آنلاین بگویید «تأیید تحویل دستی» بزند — فایل ack تولید/دانلود نمی‌شود.</li>
        </ul>
      )}
    </div>
  );
}

export function HubErrorBanner({ details, isDarkMode, theme }) {
  if (!details) return null;

  const bg = isDarkMode ? "rgba(239,68,68,0.16)" : "#fef2f2";
  const border = isDarkMode ? "rgba(248,113,113,0.5)" : "#fecaca";

  return (
    <div
      style={{
        marginBottom: 14,
        padding: "14px 16px",
        borderRadius: 10,
        background: bg,
        border: `1px solid ${border}`,
        color: theme.text,
        fontSize: 13,
        lineHeight: 1.75,
      }}
    >
      <strong style={{ display: "block", marginBottom: 6, color: "#ef4444" }}>
        {details.title}
      </strong>
      <p style={{ margin: "0 0 10px" }}>{details.error}</p>
      {details.hint && (
        <>
          <strong style={{ fontSize: 12, color: theme.muted }}>چه کار کنید:</strong>
          <pre
            style={{
              margin: "8px 0 0",
              whiteSpace: "pre-wrap",
              fontFamily: "inherit",
              fontSize: 12,
              lineHeight: 1.8,
              background: "transparent",
              border: "none",
              padding: 0,
              color: theme.text,
            }}
          >
            {details.hint}
          </pre>
        </>
      )}
    </div>
  );
}
