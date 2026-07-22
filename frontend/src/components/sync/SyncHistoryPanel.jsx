import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Archive, CheckCircle2, Search, Trash2 } from "lucide-react";
import PermissionGate from "../auth/PermissionGate.jsx";
import {
  fetchSyncHistory,
  reconcileSync,
  archiveSyncHistory,
  previewPurgeSyncHistory,
  purgeSyncHistory,
} from "../../services/syncService.js";

const RUN_TYPE_FA = { export: "خروجی", import: "ورود", ack: "رسید" };
const ACK_STATUS_FA = {
  pending: "منتظر تأیید",
  received: "تحویل (ack)",
  reconciled_manual: "تأیید دستی",
};

export default function SyncHistoryPanel({
  isOnlineHub,
  isDarkMode,
  theme,
  loading: parentLoading,
  onMessage,
  onError,
  onReloadStatus,
}) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState(new Set());
  const [filters, setFilters] = useState({
    q: "",
    run_type: "",
    ack_status: "",
    pending_only: false,
    include_archived: false,
  });
  const [retentionDays, setRetentionDays] = useState(90);
  const [purgePreview, setPurgePreview] = useState(null);
  const [reconcileNote, setReconcileNote] = useState("");

  const busy = loading || parentLoading;

  const loadHistory = useCallback(async () => {
    setLoading(true);
    try {
      const params = { limit: 200 };
      if (filters.q.trim()) params.q = filters.q.trim();
      if (filters.run_type) params.run_type = filters.run_type;
      if (filters.ack_status) params.ack_status = filters.ack_status;
      if (filters.pending_only) params.pending_only = "1";
      if (filters.include_archived) params.include_archived = "1";
      const data = await fetchSyncHistory(params);
      setItems(data.items || []);
      setSelected(new Set());
      setPurgePreview(null);
    } catch (e) {
      onError?.(e);
    } finally {
      setLoading(false);
    }
  }, [filters, onError]);

  useEffect(() => {
    loadHistory();
  // eslint-disable-next-line react-hooks/exhaustive-deps -- فقط با تغییر فیلتر reload
  }, [filters.q, filters.run_type, filters.ack_status, filters.pending_only, filters.include_archived]);

  const toggleSelect = (packId) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(packId)) next.delete(packId);
      else next.add(packId);
      return next;
    });
  };

  const selectablePending = useMemo(
    () => items.filter((h) => h.run_type === "export" && h.ack_status === "pending" && !h.archived_at),
    [items],
  );

  const selectedPackIds = useMemo(() => [...selected], [selected]);

  const handleReconcileSelected = async () => {
    const packIds = selectedPackIds.filter((id) =>
      items.some((h) => h.pack_id === id && h.run_type === "export" && h.ack_status === "pending"),
    );
    if (!packIds.length) {
      onMessage?.("ردیفی با وضعیت «منتظر تأیید» انتخاب نشده است.");
      return;
    }
    const ok = window.confirm(`${packIds.length} export انتخاب‌شده تأیید شود؟`);
    if (!ok) return;
    setLoading(true);
    try {
      const result = await reconcileSync(packIds, reconcileNote.trim() || null);
      onMessage?.(`${result.reconciled ?? packIds.length} بسته تأیید دستی شد.`);
      setReconcileNote("");
      await loadHistory();
      await onReloadStatus?.();
    } catch (e) {
      onError?.(e);
    } finally {
      setLoading(false);
    }
  };

  const handleArchiveSelected = async () => {
    if (!selectedPackIds.length) return;
    const ok = window.confirm(
      `${selectedPackIds.length} رکورد از لیست فعال خارج (آرشیو) شود؟\n\nexportهای «منتظر تأیید» آرشیو نمی‌شوند.`,
    );
    if (!ok) return;
    setLoading(true);
    try {
      const result = await archiveSyncHistory(selectedPackIds);
      onMessage?.(`${result.archived ?? 0} رکورد آرشیو شد.`);
      await loadHistory();
    } catch (e) {
      onError?.(e);
    } finally {
      setLoading(false);
    }
  };

  const handlePurgePreview = async () => {
    setLoading(true);
    try {
      const preview = await previewPurgeSyncHistory({
        retention_days: retentionDays,
        only_archived: true,
      });
      setPurgePreview(preview);
      onMessage?.(`${preview.eligible_count ?? 0} رکورد واجد شرایط پاکسازی (آرشیوشده، قدیمی‌تر از ${retentionDays} روز).`);
    } catch (e) {
      onError?.(e);
    } finally {
      setLoading(false);
    }
  };

  const handlePurge = async () => {
    const count = purgePreview?.eligible_count ?? 0;
    if (!count) {
      onMessage?.("رکورد واجد شرایط پاکسازی نیست — ابتدا پیش‌نمایش بگیرید.");
      return;
    }
    const ok = window.confirm(
      `${count} رکورد برای همیشه حذف شود؟\n\nفقط آرشیوشده و تأییدشده — exportهای باز حذف نمی‌شوند.`,
    );
    if (!ok) return;
    setLoading(true);
    try {
      const result = await purgeSyncHistory({
        retention_days: retentionDays,
        only_archived: true,
        dry_run: false,
      });
      onMessage?.(`${result.purged ?? 0} رکورد پاکسازی شد.`);
      setPurgePreview(null);
      await loadHistory();
    } catch (e) {
      onError?.(e);
    } finally {
      setLoading(false);
    }
  };

  const inputStyle = {
    background: theme.inputBg,
    border: `1px solid ${theme.border}`,
    color: theme.text,
    borderRadius: 8,
    padding: "8px 10px",
    fontFamily: "inherit",
    fontSize: 13,
    boxSizing: "border-box",
  };

  return (
    <div>
      <div className="form-page-filter-row" style={{ marginBottom: 12 }}>
        <div className="form-page-filter-field" style={{ flex: "1 1 160px", display: "flex", alignItems: "center", gap: 8 }}>
          <Search size={16} style={{ opacity: 0.6, flexShrink: 0 }} />
          <input
            type="search"
            placeholder="جستجو pack_id…"
            value={filters.q}
            onChange={(e) => setFilters((f) => ({ ...f, q: e.target.value }))}
            style={{ ...inputStyle, width: "100%" }}
          />
        </div>
        <select
          value={filters.run_type}
          onChange={(e) => setFilters((f) => ({ ...f, run_type: e.target.value }))}
          style={{ ...inputStyle, flex: "0 1 120px" }}
        >
          <option value="">همه انواع</option>
          <option value="export">خروجی</option>
          <option value="import">ورود</option>
          <option value="ack">رسید</option>
        </select>
        {isOnlineHub && (
          <select
            value={filters.ack_status}
            onChange={(e) => setFilters((f) => ({ ...f, ack_status: e.target.value }))}
            style={{ ...inputStyle, flex: "0 1 140px" }}
          >
            <option value="">همه تحویل</option>
            <option value="pending">منتظر تأیید</option>
            <option value="reconciled_manual">تأیید دستی</option>
            <option value="received">تحویل ack</option>
          </select>
        )}
        <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: theme.muted, cursor: "pointer" }}>
          <input
            type="checkbox"
            checked={filters.pending_only}
            onChange={(e) => setFilters((f) => ({ ...f, pending_only: e.target.checked }))}
          />
          فقط منتظر تأیید
        </label>
        <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: theme.muted, cursor: "pointer" }}>
          <input
            type="checkbox"
            checked={filters.include_archived}
            onChange={(e) => setFilters((f) => ({ ...f, include_archived: e.target.checked }))}
          />
          شامل آرشیو
        </label>
        <button type="button" disabled={busy} onClick={loadHistory} className="form-page-btn form-page-btn-secondary">
          اعمال فیلتر
        </button>
      </div>

      {isOnlineHub && (
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 14, alignItems: "flex-end" }}>
          <PermissionGate permission="sync.reconcile">
            <input
              type="text"
              placeholder="یادداشت تأیید (اختیاری)"
              value={reconcileNote}
              onChange={(e) => setReconcileNote(e.target.value)}
              style={{ ...inputStyle, minWidth: 200, flex: "1 1 200px" }}
            />
            <button
              type="button"
              disabled={busy || !selectedPackIds.length}
              onClick={handleReconcileSelected}
              className="form-page-btn form-page-btn-primary"
              style={{ display: "inline-flex", alignItems: "center", gap: 6 }}
            >
              <CheckCircle2 size={16} />
              تأیید انتخاب‌شده ({selectedPackIds.length})
            </button>
            {selectablePending.length > 0 && (
              <button
                type="button"
                disabled={busy}
                onClick={() => {
                  setSelected(new Set(selectablePending.map((h) => h.pack_id)));
                }}
                className="form-page-btn form-page-btn-secondary"
              >
                انتخاب همه منتظر تأیید ({selectablePending.length})
              </button>
            )}
          </PermissionGate>
          <PermissionGate permission="sync.reconcile">
            <button
              type="button"
              disabled={busy || !selectedPackIds.length}
              onClick={handleArchiveSelected}
              className="form-page-btn form-page-btn-secondary"
              style={{ display: "inline-flex", alignItems: "center", gap: 6 }}
            >
              <Archive size={16} />
              آرشیو انتخاب‌شده
            </button>
          </PermissionGate>
        </div>
      )}

      {isOnlineHub && (
        <PermissionGate permission="sync.purge">
          <div
            style={{
              marginBottom: 14,
              padding: "12px 14px",
              borderRadius: 8,
              border: `1px solid ${theme.border}`,
              background: isDarkMode ? "rgba(0,0,0,0.2)" : "#f8fafc",
              fontSize: 13,
              lineHeight: 1.75,
            }}
          >
            <strong style={{ color: theme.text }}>پاکسازی تاریخچه</strong>
            <p style={{ margin: "6px 0 10px", color: theme.muted }}>
              فقط رکوردهای <b>آرشیوشده</b>، <b>تأییدشده</b> و قدیمی‌تر از N روز — exportهای «منتظر تأیید» هرگز حذف نمی‌شوند.
            </p>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8, alignItems: "center" }}>
              <label style={{ display: "flex", alignItems: "center", gap: 6, color: theme.text }}>
                نگهداری (روز):
                <input
                  type="number"
                  min={30}
                  max={3650}
                  value={retentionDays}
                  onChange={(e) => setRetentionDays(Number(e.target.value) || 90)}
                  style={{ ...inputStyle, width: 72 }}
                />
              </label>
              <button type="button" disabled={busy} onClick={handlePurgePreview} className="form-page-btn form-page-btn-secondary">
                پیش‌نمایش پاکسازی
              </button>
              <button
                type="button"
                disabled={busy || !(purgePreview?.eligible_count > 0)}
                onClick={handlePurge}
                className="form-page-btn form-page-btn-primary"
                style={{ display: "inline-flex", alignItems: "center", gap: 6, background: "#dc2626" }}
              >
                <Trash2 size={16} />
                پاکسازی ({purgePreview?.eligible_count ?? 0})
              </button>
            </div>
          </div>
        </PermissionGate>
      )}

      <div className="form-page-table-wrap">
        <table className="form-page-table">
          <thead>
            <tr>
              {isOnlineHub && <th className="col-narrow" />}
              <th>pack</th>
              <th>نوع</th>
              <th>وضعیت</th>
              {isOnlineHub && <th>تحویل</th>}
              <th>زمان</th>
              <th>یادداشت</th>
            </tr>
          </thead>
          <tbody>
            {items.length === 0 ? (
              <tr>
                <td colSpan={isOnlineHub ? 7 : 5} style={{ textAlign: "center", color: theme.muted, padding: 20 }}>
                  {busy ? "در حال بارگذاری…" : "رکوردی یافت نشد."}
                </td>
              </tr>
            ) : (
              items.map((h) => {
                const canSelect = isOnlineHub && h.run_type === "export" && h.ack_status === "pending" && !h.archived_at;
                return (
                  <tr key={h.id} style={h.archived_at ? { opacity: 0.65 } : undefined}>
                    {isOnlineHub && (
                      <td className="col-narrow">
                        {canSelect ? (
                          <input
                            type="checkbox"
                            checked={selected.has(h.pack_id)}
                            onChange={() => toggleSelect(h.pack_id)}
                          />
                        ) : h.archived_at ? (
                          <span title="آرشیو" style={{ fontSize: 10, color: theme.muted }}>آ</span>
                        ) : null}
                      </td>
                    )}
                    <td className="col-mono" title={h.pack_id}>{String(h.pack_id).slice(0, 8)}…</td>
                    <td>{RUN_TYPE_FA[h.run_type] || h.run_type}</td>
                    <td>{h.status}</td>
                    {isOnlineHub && (
                      <td>{h.run_type === "export" ? (ACK_STATUS_FA[h.ack_status] || h.ack_status || "—") : "—"}</td>
                    )}
                    <td>{h.started_at ? new Date(h.started_at).toLocaleString("fa-IR") : "—"}</td>
                    <td style={{ fontSize: 12, color: theme.muted, maxWidth: 160 }}>{h.reconcile_note || "—"}</td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
