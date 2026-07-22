import React, { useEffect, useMemo, useState } from "react";
import { Download } from "lucide-react";
import FormPageLayout from "../components/common/FormPageLayout.jsx";
import { useAppTheme } from "../context/ThemeContext.jsx";
import { useAuth } from "../context/AuthContext.jsx";
import { getFormPageTheme } from "../theme/formPageTheme.js";
import HubOperationGuide, { HubErrorBanner } from "../components/sync/HubOperationGuide.jsx";
import FormStatusBanner from "../components/common/FormStatusBanner.jsx";
import { ADMIN_BRIEFING_HELP } from "../content/adminBriefingHelp.jsx";
import { formatApiError, getHubErrorDetails } from "../utils/apiErrorFormat.js";
import {
  previewAdminBriefing,
  downloadAdminBriefingHtml,
  fetchBriefingHistory,
} from "../services/adminBriefingService.js";

export default function AdminBriefingPage() {
  const { isOfflineHub } = useAuth();
  const { isDarkMode } = useAppTheme();
  const theme = useMemo(() => getFormPageTheme(isDarkMode), [isDarkMode]);
  const [preview, setPreview] = useState(null);
  const [history, setHistory] = useState([]);
  const [message, setMessage] = useState("");
  const [hubError, setHubError] = useState(null);
  const [loading, setLoading] = useState(false);

  const setApiError = (e) => {
    setHubError(getHubErrorDetails(e));
    setMessage(getHubErrorDetails(e) ? "" : formatApiError(e));
  };

  const load = async () => {
    try {
      setPreview(await previewAdminBriefing());
      setHistory(await fetchBriefingHistory());
    } catch (e) {
      setApiError(e);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const handleDownload = async () => {
    setLoading(true);
    setMessage("");
    setHubError(null);
    try {
      const blob = await downloadAdminBriefingHtml();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `admin-briefing-${Date.now()}.html`;
      a.click();
      URL.revokeObjectURL(url);
      setMessage("گزارش HTML دانلود شد — فایل را به راهبر سرور آنلاین تحویل دهید.");
      await load();
    } catch (e) {
      setApiError(e);
    } finally {
      setLoading(false);
    }
  };

  const cardStyle = {
    background: theme.card,
    border: `1px solid ${theme.border}`,
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  };

  return (
    <FormPageLayout
      title="گزارش راهبر آنلاین"
      documentTitle="گزارش راهبر آنلاین"
      subtitle="فقط سرور آفلاین — راهنمای دستی برای ثبت کاربر/نقش روی آنلاین (بدون انتقال اخبار یا گزارش میدان)"
      helpTitle="راهنمای گزارش راهبر"
      onHelp={ADMIN_BRIEFING_HELP}
      toolbarExtra={(
        <button
          type="button"
          disabled={loading || !isOfflineHub}
          onClick={handleDownload}
          className="form-page-btn form-page-btn-primary"
          title={!isOfflineHub ? "این گزارش فقط روی سرور آفلاین تولید می‌شود" : undefined}
        >
          <Download size={16} /> دانلود HTML
        </button>
      )}
    >
      <HubOperationGuide />

      <div style={{ ...cardStyle, lineHeight: 1.85, fontSize: 13 }}>
        <strong style={{ color: theme.text }}>این گزارش چیست؟</strong>
        <ul style={{ margin: "10px 0 0", paddingRight: 20, color: theme.text }}>
          <li>لیست تغییرات <strong>کاربر، نقش و assignment</strong> که روی آفلاین انجام داده‌اید.</li>
          <li>راهبر روی <strong>سرور آنلاین</strong> همان موارد را دستی در «مدیریت کاربران» و «نقش و مجوز» ثبت می‌کند.</li>
          <li>هیچ pack داده‌ای (خبر، میدان، تحلیل) در این فایل نیست — فقط راهنمای اداری است.</li>
          <li>اگر این صفحه را روی آنلاین باز کرده‌اید، به سرور آفلاین بروید یا از VPN/شبکه داخلی استفاده کنید.</li>
        </ul>
      </div>

      <HubErrorBanner details={hubError} isDarkMode={isDarkMode} theme={theme} />

      {message && !hubError && (
        <FormStatusBanner
          variant={message.includes("دانلود") || message.includes("تحویل") ? "success" : "error"}
          isDarkMode={isDarkMode}
          theme={theme}
        >
          {message}
        </FormStatusBanner>
      )}

      {preview && (
        <div style={cardStyle}>
          <h2 style={{ margin: "0 0 12px", fontSize: "0.95em", color: theme.text }}>پیش‌نمایش تغییرات</h2>
          <p style={{ margin: "6px 0", color: theme.text }}>تغییرات کاربر: {preview.user_changes ?? 0}</p>
          <p style={{ margin: "6px 0", color: theme.text }}>تغییرات assignment: {preview.assignment_changes ?? 0}</p>
        </div>
      )}

      <div style={cardStyle}>
        <h2 style={{ margin: "0 0 12px", fontSize: "0.95em", color: theme.text }}>تاریخچه briefing</h2>
        {history.length === 0 ? (
          <p style={{ color: theme.muted, margin: 0 }}>هنوز گزارشی ثبت نشده است.</p>
        ) : (
          <div className="form-page-table-wrap">
            <table className="form-page-table">
              <thead>
                <tr>
                  <th>زمان تولید</th>
                  <th>وضعیت تحویل</th>
                </tr>
              </thead>
              <tbody>
                {history.map((h) => (
                  <tr key={h.briefing_id}>
                    <td>{h.generated_at ? new Date(h.generated_at).toLocaleString("fa-IR") : "—"}</td>
                    <td>{h.delivered_at ? "تحویل شده" : "در انتظار"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </FormPageLayout>
  );
}
