import React from "react";
import { AlertTriangle, CheckCircle2 } from "lucide-react";
import PermissionGate from "../auth/PermissionGate.jsx";

/** هشدار exportهای بدون تأیید تحویل — reconcile-only در USB یک‌طرفه */
export default function UnackedExportsBanner({
  unackedExports = [],
  isDarkMode,
  theme,
  loading,
  usbOneWay = true,
  onReconcileAll,
}) {
  if (!unackedExports?.length) return null;

  const n = unackedExports.length;
  const boxBg = isDarkMode ? "rgba(245,158,11,0.16)" : "#fffbeb";
  const boxBorder = isDarkMode ? "rgba(251,191,36,0.5)" : "rgba(245,158,11,0.45)";

  return (
    <div
      style={{
        marginBottom: 14,
        padding: "14px 16px",
        borderRadius: 10,
        background: boxBg,
        border: `1px solid ${boxBorder}`,
        color: theme.text,
        fontSize: 13,
        lineHeight: 1.85,
      }}
    >
      <div style={{ display: "flex", gap: 10, alignItems: "flex-start", marginBottom: 10 }}>
        <AlertTriangle size={20} style={{ color: "#d97706", flexShrink: 0, marginTop: 2 }} />
        <div>
          <strong style={{ display: "block", marginBottom: 4, color: isDarkMode ? "#fbbf24" : "#b45309" }}>
            {n} بسته خروجی هنوز «تحویل تأیید نشده»
          </strong>
          <p style={{ margin: 0 }}>
            pack از آنلاین export شده؛ اگر روی آفلاین import شده، اینجا تأیید کنید.
            داده روی آفلاین درست است — این فقط دفترچه آنلاین است.
          </p>
        </div>
      </div>

      {usbOneWay ? (
        <ol style={{ margin: "8px 0 12px", paddingRight: 22 }}>
          <li>
            <strong>USB یک‌طرفه:</strong> هیچ فایلی (ack و …) از سرور داخلی با فلش به خارج برنمی‌گردد.
          </li>
          <li>
            <strong>کار شما:</strong> بعد از import روی آفلاین، «تأیید تحویل دستی» را بزنید.
          </li>
          <li>
            export بعدی مجاز است؛ رکوردهای تکراری روی آفلاین skip می‌شوند.
          </li>
        </ol>
      ) : (
        <p style={{ margin: "8px 0 12px", color: theme.muted }}>
          می‌توانید فایل ack را از آفلاین بیاورید یا تأیید دستی بزنید.
        </p>
      )}

      <PermissionGate permission="sync.reconcile">
        <button
          type="button"
          disabled={loading}
          onClick={onReconcileAll}
          className="form-page-btn form-page-btn-primary"
          style={{ display: "inline-flex", alignItems: "center", gap: 6 }}
        >
          <CheckCircle2 size={16} />
          تأیید تحویل دستی ({n} بسته)
        </button>
      </PermissionGate>

      {unackedExports.length <= 5 && (
        <p style={{ margin: "10px 0 0", fontSize: 11, color: theme.muted, fontFamily: "ui-monospace, monospace", direction: "ltr", textAlign: "left" }}>
          pack_id: {unackedExports.map((r) => String(r.pack_id).slice(0, 8)).join(" · ")}
        </p>
      )}
    </div>
  );
}
