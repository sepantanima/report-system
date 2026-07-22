import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Download, Upload, CheckCircle, RefreshCw } from "lucide-react";
import FormPageLayout from "../components/common/FormPageLayout.jsx";
import { useAuth } from "../context/AuthContext.jsx";
import { useAppTheme } from "../context/ThemeContext.jsx";
import { getFormPageTheme } from "../theme/formPageTheme.js";
import PermissionGate from "../components/auth/PermissionGate.jsx";
import {
  fetchSyncStatus,
  previewSyncExport,
  exportSyncPack,
  previewSyncImport,
  applySyncImport,
  reconcileSync,
  downloadPackJson,
} from "../services/syncService.js";
import HubOperationGuide, { HubErrorBanner } from "../components/sync/HubOperationGuide.jsx";
import UnackedExportsBanner from "../components/sync/UnackedExportsBanner.jsx";
import SyncHistoryPanel from "../components/sync/SyncHistoryPanel.jsx";
import FormStatusBanner from "../components/common/FormStatusBanner.jsx";
import { SYNC_MANAGEMENT_HELP } from "../content/syncFormHelp.jsx";
import { formatApiError, getHubErrorDetails } from "../utils/apiErrorFormat.js";

export default function SyncManagementPage() {
  const { isOnlineHub, isOfflineHub, capabilities, instanceMode } = useAuth();
  const { isDarkMode } = useAppTheme();
  const theme = useMemo(() => getFormPageTheme(isDarkMode), [isDarkMode]);
  const [tab, setTab] = useState("status");
  const [status, setStatus] = useState(null);
  const [preview, setPreview] = useState(null);
  const [importPreview, setImportPreview] = useState(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [hubError, setHubError] = useState(null);
  const usbOneWay = status?.usb_one_way !== false;

  const hubLabelFa = isOnlineHub ? "آنلاین" : isOfflineHub ? "آفلاین" : (instanceMode === "offline" ? "آفلاین" : "آنلاین");
  const orgLabel = capabilities?.org_code || "—";

  const setApiError = useCallback((e) => {
    const details = getHubErrorDetails(e);
    setHubError(details);
    setMessage(details ? "" : formatApiError(e));
  }, []);

  const clearErrors = () => {
    setHubError(null);
    setMessage("");
  };

  const loadStatus = useCallback(async () => {
    try {
      setStatus(await fetchSyncStatus());
    } catch (e) {
      setApiError(e);
    }
  }, [setApiError]);

  const load = useCallback(async () => {
    await loadStatus();
  }, [loadStatus]);

  useEffect(() => {
    load();
  }, [load]);

  const handleExportPreview = async () => {
    setLoading(true);
    clearErrors();
    try {
      setPreview(await previewSyncExport());
      setTab("export");
    } catch (e) {
      setApiError(e);
    } finally {
      setLoading(false);
    }
  };

  const handleExport = async () => {
    // #region agent log
    fetch('http://127.0.0.1:7732/ingest/84806bcd-7c67-4feb-bf71-3b9c8b6b47fb',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'338542'},body:JSON.stringify({sessionId:'338542',location:'SyncManagementPage:handleExport:start',message:'download click',timestamp:Date.now(),hypothesisId:'H1'})}).catch(()=>{});
    // #endregion
    setLoading(true);
    clearErrors();
    try {
      setMessage("در حال ساخت pack… لطفاً صبر کنید.");
      const data = await exportSyncPack();
      if (!data?.pack) {
        throw new Error("پاسخ سرور فاقد داده pack است");
      }
      downloadPackJson(data.pack, `sync-pack-${data.pack_id || Date.now()}.json`);
      setMessage(`pack ${data.pack_id} دانلود شد`);
      // #region agent log
      fetch('http://127.0.0.1:7732/ingest/84806bcd-7c67-4feb-bf71-3b9c8b6b47fb',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'338542'},body:JSON.stringify({sessionId:'338542',location:'SyncManagementPage:handleExport:downloaded',message:'downloadPackJson ok',data:{packId:data.pack_id},timestamp:Date.now(),hypothesisId:'H1'})}).catch(()=>{});
      // #endregion
      void loadStatus();
    } catch (e) {
      // #region agent log
      fetch('http://127.0.0.1:7732/ingest/84806bcd-7c67-4feb-bf71-3b9c8b6b47fb',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'338542'},body:JSON.stringify({sessionId:'338542',location:'SyncManagementPage:handleExport:error',message:'export failed',data:{err:String(e?.message||e)},timestamp:Date.now(),hypothesisId:'H3'})}).catch(()=>{});
      // #endregion
      setApiError(e);
    } finally {
      setLoading(false);
      // #region agent log
      fetch('http://127.0.0.1:7732/ingest/84806bcd-7c67-4feb-bf71-3b9c8b6b47fb',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'338542'},body:JSON.stringify({sessionId:'338542',location:'SyncManagementPage:handleExport:finally',message:'loading cleared',timestamp:Date.now(),hypothesisId:'H4'})}).catch(()=>{});
      // #endregion
    }
  };

  const handleImportFile = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setLoading(true);
    clearErrors();
    try {
      const text = await file.text();
      const pack = JSON.parse(text);
      setImportPreview(await previewSyncImport(pack));
      setTab("import");
    } catch (err) {
      setApiError(err);
    } finally {
      setLoading(false);
      e.target.value = "";
    }
  };

  const handleApply = async () => {
    if (!importPreview?.preview_token) return;
    setLoading(true);
    clearErrors();
    try {
      const result = await applySyncImport(importPreview.preview_token);
      setMessage(
        `اعمال شد — ${JSON.stringify(result.counts || {})}. `
        + "روی سرور آنلاین «تأیید تحویل دستی» را بزنید (فایل ack با USB برنمی‌گردد).",
      );
      setImportPreview(null);
      await load();
    } catch (e) {
      setApiError(e);
    } finally {
      setLoading(false);
    }
  };

  const handleReconcileAll = async () => {
    const packIds = (status?.unacked_exports || []).map((r) => r.pack_id);
    if (!packIds.length) return;
    const ok = window.confirm(
      `${packIds.length} بسته را به‌صورت دستی «تحویل‌شده» علامت بزنیم؟\n\n`
        + "فقط وقتی تأیید کنید که همان packها روی سرور آفلاین import شده‌اند.",
    );
    if (!ok) return;
    setLoading(true);
    clearErrors();
    try {
      const result = await reconcileSync(packIds);
      setMessage(`${result.reconciled ?? packIds.length} بسته تأیید دستی شد.`);
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
  };

  const preStyle = {
    background: isDarkMode ? "rgba(0,0,0,0.35)" : "#f8fafc",
    border: `1px solid ${theme.border}`,
    padding: 12,
    borderRadius: 8,
    overflow: "auto",
    fontSize: 12,
    color: theme.text,
    fontFamily: "ui-monospace, monospace",
    direction: "ltr",
    textAlign: "left",
  };

  const tabs = [
    { id: "status", label: "وضعیت" },
    ...(isOnlineHub ? [{ id: "export", label: "خروجی", perm: "sync.export" }] : []),
    ...(isOfflineHub ? [{ id: "import", label: "ورود", perm: "sync.import" }] : []),
    { id: "history", label: "تاریخچه" },
  ];

  return (
    <FormPageLayout
      title="مدیریت همگام‌سازی"
      documentTitle="مدیریت همگام‌سازی"
      subtitle={`سرور ${hubLabelFa} · سازمان ${orgLabel}${usbOneWay ? " · USB یک‌طرفه" : ""}`}
      helpTitle="راهنمای همگام‌سازی"
      onHelp={SYNC_MANAGEMENT_HELP}
      toolbarExtra={(
        <button type="button" disabled={loading} onClick={load} className="form-page-btn form-page-btn-secondary">
          <RefreshCw size={16} /> بروزرسانی
        </button>
      )}
    >
      <HubOperationGuide usbOneWay={usbOneWay} />

      <HubErrorBanner details={hubError} isDarkMode={isDarkMode} theme={theme} />

      {message && !hubError && (
        <FormStatusBanner
          variant={/دانلود|ثبت|تأیید|اعمال/.test(message) ? "success" : "error"}
          isDarkMode={isDarkMode}
          theme={theme}
        >
          {message}
        </FormStatusBanner>
      )}

      {status?.unacked_exports?.length > 0 && isOnlineHub && (
        <UnackedExportsBanner
          unackedExports={status.unacked_exports}
          isDarkMode={isDarkMode}
          theme={theme}
          loading={loading}
          usbOneWay={usbOneWay}
          onReconcileAll={handleReconcileAll}
        />
      )}

      <div className="v3-tab-row">
        {tabs.map((t) => {
          const btn = (
            <button
              key={t.id}
              type="button"
              className={`v3-tab-btn${tab === t.id ? " active" : ""}`}
              onClick={() => setTab(t.id)}
            >
              {t.label}
            </button>
          );
          if (t.perm) {
            return (
              <PermissionGate key={t.id} permission={t.perm}>
                {btn}
              </PermissionGate>
            );
          }
          return btn;
        })}
      </div>

      <div style={cardStyle}>
        {tab === "export" && isOnlineHub && (
          <p style={{ margin: "0 0 12px", fontSize: 13, color: theme.muted, lineHeight: 1.7 }}>
            pack شامل اخبار، گزارش میدانی BOTH آنلاین، تنظیمات و snapshot نقش‌هاست. پس از دانلود، فایل را با USB به سرور آفلاین منتقل کنید.
          </p>
        )}
        {tab === "import" && isOfflineHub && (
          <p style={{ margin: "0 0 12px", fontSize: 13, color: theme.muted, lineHeight: 1.75 }}>
            فایل JSON دریافتی از export آنلاین را انتخاب کنید → پیش‌نمایش → «اعمال».
            <br />
            <strong style={{ color: theme.text }}>هیچ فایلی از این سرور با USB به خارج برنمی‌گردد</strong> — بعد از import، هماهنگ کنید تا روی آنلاین «تأیید تحویل دستی» زده شود.
          </p>
        )}

        {tab === "status" && status && (
          <>
            <p style={{ margin: "8px 0", color: theme.text }}>
              رکوردهای در صف خروجی: <strong>{status.pending_outbound_count ?? 0}</strong>
            </p>
            <p style={{ margin: "8px 0", color: theme.text }}>
              exportهای در انتظار تأیید تحویل: <strong>{status.unacked_exports?.length ?? 0}</strong>
            </p>
            <p style={{ margin: "8px 0", color: theme.text }}>
              exportهای اخیر (in_flight): <strong>{status.in_flight_exports?.length ?? 0}</strong>
            </p>
            {isOnlineHub && usbOneWay && (
              <p style={{ margin: "12px 0 0", fontSize: 12, color: theme.muted, lineHeight: 1.75 }}>
                سیاست USB یک‌طرفه فعال است — پس از import روی آفلاین، اینجا «تأیید تحویل دستی» بزنید (نیاز به مجوز reconcile).
              </p>
            )}
            {isOnlineHub && (
              <PermissionGate permission="sync.export">
                <button type="button" disabled={loading} onClick={handleExportPreview} className="form-page-btn form-page-btn-primary" style={{ marginTop: 8 }}>
                  پیش‌نمایش export
                </button>
              </PermissionGate>
            )}
          </>
        )}

        {tab === "export" && (
          <>
            {preview && <pre style={preStyle}>{JSON.stringify(preview, null, 2)}</pre>}
            <PermissionGate permission="sync.export">
              <button type="button" disabled={loading} onClick={handleExport} className="form-page-btn form-page-btn-primary" style={{ marginTop: 12 }}>
                <Download size={16} /> دانلود pack
              </button>
            </PermissionGate>
          </>
        )}

        {tab === "import" && (
          <>
            <label className="form-page-btn form-page-btn-secondary" style={{ cursor: "pointer", display: "inline-flex" }}>
              <Upload size={16} /> انتخاب فایل pack
              <input type="file" accept=".json,application/json" onChange={handleImportFile} style={{ display: "none" }} />
            </label>
            {importPreview && (
              <>
                <pre style={{ ...preStyle, marginTop: 12 }}>{JSON.stringify(importPreview, null, 2)}</pre>
                {!importPreview.duplicate && (
                  <button type="button" disabled={loading} onClick={handleApply} className="form-page-btn form-page-btn-primary" style={{ marginTop: 12 }}>
                    <CheckCircle size={16} /> اعمال
                  </button>
                )}
              </>
            )}
          </>
        )}

        {tab === "history" && (
          <SyncHistoryPanel
            isOnlineHub={isOnlineHub}
            isDarkMode={isDarkMode}
            theme={theme}
            loading={loading}
            onMessage={(msg) => { clearErrors(); setMessage(msg); }}
            onError={setApiError}
            onReloadStatus={loadStatus}
          />
        )}
      </div>
    </FormPageLayout>
  );
}
