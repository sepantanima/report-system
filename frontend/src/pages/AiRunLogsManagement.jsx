import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { DateObject } from "react-multi-date-picker";
import persian from "react-date-object/calendars/persian";
import persian_fa from "react-date-object/locales/persian_fa";
import { ExternalLink, RefreshCw, X } from "lucide-react";
import FormPageLayout from "../components/common/FormPageLayout.jsx";
import ThemedDatePicker from "../components/analysis/ThemedDatePicker.jsx";
import aiRunLogAdminService from "../services/aiRunLogAdminService.js";
import { getSessionRoles, hasRole } from "../utils/userRoles.js";
import { useAppTheme } from "../context/ThemeContext.jsx";
import { getFormPageTheme, FORM_PAGE_MODAL_Z_INDEX } from "../theme/formPageTheme.js";
import {
  REGISTERED_FORM_AI_ACTIONS,
  getActionLabelFa,
  getFormLabelFa,
} from "../constants/aiFormNames.js";

const STATUS_OPTIONS = [
  { value: "", label: "همه وضعیت‌ها" },
  { value: "ok", label: "موفق" },
  { value: "llm_error", label: "خطای فراخوانی مدل" },
  { value: "assembly_error", label: "خطای مونتاژ پرامپت" },
  { value: "config_missing", label: "کانفیگ اکشن یافت نشد" },
];

const STATUS_BADGE = {
  ok: {
    dark: { bg: "rgba(16,185,129,0.15)", color: "#34d399" },
    light: { bg: "rgba(16,185,129,0.12)", color: "#059669" },
    label: "موفق",
  },
  llm_error: {
    dark: { bg: "rgba(239,68,68,0.15)", color: "#f87171" },
    light: { bg: "rgba(239,68,68,0.1)", color: "#dc2626" },
    label: "خطای فراخوانی مدل",
  },
  assembly_error: {
    dark: { bg: "rgba(245,158,11,0.15)", color: "#fbbf24" },
    light: { bg: "rgba(245,158,11,0.12)", color: "#b45309" },
    label: "خطای مونتاژ پرامپت",
  },
  config_missing: {
    dark: { bg: "rgba(148,163,184,0.15)", color: "#94a3b8" },
    light: { bg: "rgba(100,116,139,0.12)", color: "#475569" },
    label: "کانفیگ یافت نشد",
  },
};

const CATEGORY_LABELS = {
  no_config: "بدون پیکربندی",
  model_access: "عدم دسترسی مدل",
  quota: "سهمیه",
  auth: "احراز هویت",
  network: "خطای شبکه",
  timeout: "اتمام مهلت",
  empty_response: "پاسخ خالی",
  unknown: "نامشخص",
};

const fieldLabel = { display: "block", fontSize: 12, marginBottom: 4, opacity: 0.85 };
const DATE_FORMAT = "YYYY/MM/DD";

function dateObjectToIsoStart(d) {
  if (!d) return null;
  const js = new DateObject(d).toDate();
  js.setHours(0, 0, 0, 0);
  return js.toISOString();
}

function dateObjectToIsoEnd(d) {
  if (!d) return null;
  const js = new DateObject(d).toDate();
  js.setHours(23, 59, 59, 999);
  return js.toISOString();
}

function buildFormFilterOptions(extraFormNames = []) {
  const known = new Map(
    [...REGISTERED_FORM_AI_ACTIONS]
      .sort((a, b) => a.label_fa.localeCompare(b.label_fa, "fa"))
      .map((f) => [f.form_name, f.label_fa]),
  );
  for (const name of extraFormNames) {
    if (name && !known.has(name)) known.set(name, `${name} (ثبت‌نشده در سیستم)`);
  }
  const options = [...known.entries()]
    .sort((a, b) => a[1].localeCompare(b[1], "fa"))
    .map(([value, label]) => ({ value, label }));
  return [{ value: "", label: "همه فرم‌ها" }, ...options];
}

function formatDate(iso) {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleString("fa-IR");
  } catch {
    return iso;
  }
}

function StatusBadge({ status, isDarkMode }) {
  const entry = STATUS_BADGE[status];
  const palette = entry
    ? (isDarkMode ? entry.dark : entry.light)
    : (isDarkMode
      ? { bg: "rgba(100,116,139,0.2)", color: "#cbd5e1" }
      : { bg: "rgba(100,116,139,0.12)", color: "#475569" });
  const label = entry?.label || status;
  return (
    <span style={{
      display: "inline-block",
      padding: "2px 8px",
      borderRadius: 999,
      fontSize: 12,
      background: palette.bg,
      color: palette.color,
    }}
    >
      {label}
    </span>
  );
}

function getAiRunLogsStyles(theme, isDarkMode) {
  const inp = {
    padding: "8px 10px",
    borderRadius: 6,
    background: theme.inputBg,
    border: `1px solid ${theme.border}`,
    color: theme.text,
    fontFamily: "inherit",
    boxSizing: "border-box",
    fontSize: 14,
  };

  const preBlock = {
    background: isDarkMode ? "#0f172a" : "#f1f5f9",
    color: theme.text,
    border: `1px solid ${theme.border}`,
    padding: 12,
    borderRadius: 8,
    overflow: "auto",
    fontSize: 12,
    whiteSpace: "pre-wrap",
  };

  const errorBox = {
    marginBottom: 16,
    padding: 12,
    borderRadius: 8,
    background: isDarkMode ? "rgba(239,68,68,0.08)" : "#fef2f2",
    border: `1px solid ${isDarkMode ? "rgba(239,68,68,0.3)" : "#fecaca"}`,
    fontSize: 13,
    lineHeight: 1.7,
    color: theme.text,
  };

  return {
    inp,
    preBlock,
    errorBox,
    errorText: isDarkMode ? "#f87171" : "#dc2626",
    hintText: isDarkMode ? "#fcd34d" : "#b45309",
    linkColor: theme.accent,
    tableHeadBg: isDarkMode ? theme.card : "#f1f5f9",
    rowBorder: theme.border,
  };
}

export default function AiRunLogsManagement() {
  const navigate = useNavigate();
  const { isDarkMode } = useAppTheme();
  const theme = useMemo(() => getFormPageTheme(isDarkMode), [isDarkMode]);
  const styles = useMemo(() => getAiRunLogsStyles(theme, isDarkMode), [theme, isDarkMode]);
  const { inp, preBlock, errorBox, errorText, hintText, linkColor, tableHeadBg, rowBorder } = styles;
  const allowed = hasRole(getSessionRoles(), "admin");
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");
  const [detail, setDetail] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);

  const [filterForm, setFilterForm] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [filterConfigId, setFilterConfigId] = useState("");
  const [filterFromDate, setFilterFromDate] = useState(null);
  const [filterToDate, setFilterToDate] = useState(null);

  const formFilterOptions = useMemo(
    () => buildFormFilterOptions(rows.map((r) => r.form_name)),
    [rows],
  );

  const datePickerProps = {
    calendar: persian,
    locale: persian_fa,
    format: DATE_FORMAT,
    isDarkMode,
    calendarPosition: "bottom-right",
  };

  const fetchLogs = useCallback(async () => {
    if (!allowed) return;
    setLoading(true);
    setErr("");
    try {
      const params = { limit: 50 };
      if (filterForm.trim()) params.form_name = filterForm.trim();
      if (filterStatus.trim()) params.status = filterStatus.trim();
      if (filterConfigId.trim()) params.ai_config_id = filterConfigId.trim();
      const fromIso = dateObjectToIsoStart(filterFromDate);
      const toIso = dateObjectToIsoEnd(filterToDate);
      if (fromIso) params.from = fromIso;
      if (toIso) params.to = toIso;
      const data = await aiRunLogAdminService.listLogs(params);
      setRows(Array.isArray(data) ? data : []);
    } catch (e) {
      setErr(e.response?.data?.error || e.message);
    } finally {
      setLoading(false);
    }
  }, [allowed, filterForm, filterStatus, filterConfigId, filterFromDate, filterToDate]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  const openDetail = async (id) => {
    setDetailLoading(true);
    setErr("");
    try {
      const row = await aiRunLogAdminService.getLog(id);
      setDetail(row);
    } catch (e) {
      setErr(e.response?.data?.error || e.message);
    } finally {
      setDetailLoading(false);
    }
  };

  if (!allowed) {
    return (
      <div style={{ padding: 24, color: theme.text, fontFamily: "inherit" }}>
        دسترسی به این بخش فقط برای راهبر مجاز است.
      </div>
    );
  }

  return (
    <>
    <FormPageLayout
      title="لاگ اجرای AI"
      documentTitle="لاگ اجرای AI"
      toolbarExtra={(
        <button type="button" onClick={fetchLogs} style={{ ...inp, cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 6 }}>
          <RefreshCw size={14} /> بروزرسانی
        </button>
      )}
    >
      <p style={{ fontSize: 13, color: theme.muted, marginTop: 0, marginBottom: 16, lineHeight: 1.7 }}>
        برای عیب‌یابی تحلیل هوشمند و سایر اکشن‌های AI؛ علت دقیق (مدل، سهمیه، کلید API، پرامپت) را اینجا ببینید.
      </p>

      {err && <div style={{ color: errorText, marginBottom: 12 }}>{err}</div>}

      <div className="form-page-filter-row">
        <div className="form-page-filter-field">
          <label style={fieldLabel}>فرم</label>
          <select style={{ ...inp, marginBottom: 0, width: "100%" }} value={filterForm} onChange={(e) => setFilterForm(e.target.value)}>
            {formFilterOptions.map((o) => <option key={o.value || "all"} value={o.value}>{o.label}</option>)}
          </select>
        </div>
        <div className="form-page-filter-field">
          <label style={fieldLabel}>وضعیت</label>
          <select style={{ ...inp, marginBottom: 0, width: "100%" }} value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}>
            {STATUS_OPTIONS.map((o) => <option key={o.value || "all"} value={o.value}>{o.label}</option>)}
          </select>
        </div>
        <div className="form-page-filter-field">
          <label style={fieldLabel}>شناسه کانفیگ API</label>
          <input style={{ ...inp, marginBottom: 0, width: "100%" }} value={filterConfigId} onChange={(e) => setFilterConfigId(e.target.value)} placeholder="مثلاً ۷" inputMode="numeric" />
        </div>
        <div className="form-page-filter-field">
          <label style={fieldLabel}>از تاریخ</label>
          <ThemedDatePicker
            {...datePickerProps}
            value={filterFromDate}
            onChange={setFilterFromDate}
            placeholder="انتخاب تاریخ"
          />
        </div>
        <div className="form-page-filter-field">
          <label style={fieldLabel}>تا تاریخ</label>
          <ThemedDatePicker
            {...datePickerProps}
            value={filterToDate}
            onChange={setFilterToDate}
            placeholder="انتخاب تاریخ"
          />
        </div>
        <div className="form-page-filter-actions">
          <button type="button" onClick={fetchLogs} className="form-page-btn form-page-btn-secondary">
            اعمال فیلتر
          </button>
          <button
            type="button"
            onClick={() => {
              setFilterForm("");
              setFilterStatus("");
              setFilterConfigId("");
              setFilterFromDate(null);
              setFilterToDate(null);
            }}
            className="form-page-btn form-page-btn-secondary"
          >
            پاک کردن فیلتر
          </button>
        </div>
      </div>

      {loading ? <p>در حال بارگذاری…</p> : (
        <div className="form-page-table-wrap">
          <table className="form-page-table">
            <thead>
              <tr style={{ background: tableHeadBg }}>
                {["زمان", "فرم", "اکشن", "وضعیت", "کاربر", "usage_key", "config", "خلاصه خطا", ""].map((h) => (
                  <th key={h || "act"} style={{ borderBottom: `1px solid ${rowBorder}`, fontSize: 12 }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 ? (
                <tr><td colSpan={9} style={{ padding: 16, color: theme.muted }}>لاگی یافت نشد.</td></tr>
              ) : rows.map((row) => (
                <tr key={row.id} style={{ cursor: "pointer" }} onClick={() => openDetail(row.id)}>
                  <td style={{ borderBottom: `1px solid ${rowBorder}`, fontSize: 12, whiteSpace: "nowrap" }}>{formatDate(row.created_at)}</td>
                  <td style={{ borderBottom: `1px solid ${rowBorder}`, fontSize: 12 }} title={row.form_name}>{getFormLabelFa(row.form_name)}</td>
                  <td style={{ borderBottom: `1px solid ${rowBorder}`, fontSize: 12 }} title={row.action_name}>{getActionLabelFa(row.form_name, row.action_name)}</td>
                  <td style={{ borderBottom: `1px solid ${rowBorder}` }}><StatusBadge status={row.status} isDarkMode={isDarkMode} /></td>
                  <td style={{ borderBottom: `1px solid ${rowBorder}`, fontSize: 12 }}>{row.user_name || row.user_username || "—"}</td>
                  <td style={{ borderBottom: `1px solid ${rowBorder}`, fontSize: 11, fontFamily: "monospace" }}>{row.usage_key_used || "—"}</td>
                  <td style={{ borderBottom: `1px solid ${rowBorder}`, fontSize: 12 }}>{row.ai_config_id ?? "—"}</td>
                  <td style={{ borderBottom: `1px solid ${rowBorder}`, fontSize: 12, maxWidth: 280, overflow: "hidden", textOverflow: "ellipsis" }}>
                    {row.error_summary || (row.status === "ok" ? "—" : row.error_message || "—")}
                  </td>
                  <td style={{ borderBottom: `1px solid ${rowBorder}`, fontSize: 12, color: linkColor }}>جزئیات</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

    </FormPageLayout>

      {(detail || detailLoading) && (
        <div
          className="v3-modal-overlay"
          onClick={() => !detailLoading && setDetail(null)}
          role="presentation"
        >
          <div
            className="v3-modal-box"
            style={{
              background: theme.card,
              color: theme.text,
              width: "min(760px, 96vw)",
              maxHeight: "min(90vh, calc(100vh - 32px))",
              overflow: "hidden",
              display: "flex",
              flexDirection: "column",
              border: `1px solid ${theme.border}`,
              zIndex: FORM_PAGE_MODAL_Z_INDEX,
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              gap: 12,
              padding: "16px 20px",
              borderBottom: `1px solid ${theme.border}`,
              background: theme.card,
              flexShrink: 0,
            }}
            >
              <h2 style={{ margin: 0, fontSize: 18, color: theme.text }}>
                {detailLoading ? "در حال بارگذاری…" : `لاگ #${detail?.id}`}
              </h2>
              <button
                type="button"
                onClick={() => setDetail(null)}
                disabled={detailLoading}
                className="v3-icon-btn"
                style={{ color: errorText, border: "none", flexShrink: 0 }}
                aria-label="بستن"
              >
                <X size={20} />
              </button>
            </div>

            <div style={{ overflow: "auto", padding: "16px 20px 20px", flex: 1 }}>
            {detail && !detailLoading && (
              <>
                <div style={{ display: "grid", gap: 8, fontSize: 13, marginBottom: 16 }}>
                  <div><strong>زمان:</strong> {formatDate(detail.created_at)}</div>
                  <div>
                    <strong>فرم / اکشن:</strong>{" "}
                    {getFormLabelFa(detail.form_name)} / {getActionLabelFa(detail.form_name, detail.action_name)}
                    <span style={{ opacity: 0.55, fontSize: 11, marginRight: 6 }} dir="ltr">({detail.form_name} / {detail.action_name})</span>
                  </div>
                  <div><strong>وضعیت:</strong> <StatusBadge status={detail.status} isDarkMode={isDarkMode} /></div>
                  <div><strong>کاربر:</strong> {detail.user_name || detail.user_username || "—"}</div>
                  <div><strong>usage_key:</strong> {detail.usage_key_used || "—"}</div>
                  <div><strong>prompt_key:</strong> {detail.prompt_key || "—"}</div>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                    <strong>ai_config_id:</strong> {detail.ai_config_id ?? "—"}
                    {detail.ai_config_id ? (
                      <button
                        type="button"
                        onClick={() => navigate(`/admin/ai-api-configs?highlight=${detail.ai_config_id}`)}
                        style={{ ...inp, cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 4, fontSize: 12, padding: "4px 8px" }}
                      >
                        <ExternalLink size={12} /> مدیریت API
                      </button>
                    ) : null}
                  </div>
                </div>

                {detail.error_diagnostic && (
                  <div style={errorBox}>
                    <div><strong>دسته:</strong> {detail.error_diagnostic.category_label_fa || CATEGORY_LABELS[detail.error_diagnostic.category] || detail.error_diagnostic.category}</div>
                    <div><strong>خلاصه:</strong> {detail.error_summary || detail.error_diagnostic.message_fa}</div>
                    {detail.error_diagnostic.hint_fa && (
                      <div style={{ marginTop: 8, color: hintText }}><strong>راهنما:</strong> {detail.error_diagnostic.hint_fa}</div>
                    )}
                  </div>
                )}

                {Array.isArray(detail.error_attempts) && detail.error_attempts.length > 0 && (
                  <div style={{ marginBottom: 16 }}>
                    <h3 style={{ fontSize: 14, margin: "0 0 8px" }}>تلاش‌های provider</h3>
                    <div className="form-page-table-wrap">
                      <table className="form-page-table" style={{ fontSize: 12 }}>
                        <thead>
                          <tr style={{ background: tableHeadBg }}>
                            {["config", "provider", "model", "دسته", "HTTP", "کد", "retry?", "پیام"].map((h) => (
                              <th key={h} style={{ borderBottom: `1px solid ${rowBorder}` }}>{h}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {detail.error_attempts.map((a, i) => (
                            <tr key={i}>
                              <td style={{ borderBottom: `1px solid ${rowBorder}` }}>{a.config_id}</td>
                              <td style={{ borderBottom: `1px solid ${rowBorder}` }}>{a.provider_type}</td>
                              <td style={{ borderBottom: `1px solid ${rowBorder}`, fontFamily: "monospace" }}>{a.model_id}</td>
                              <td style={{ borderBottom: `1px solid ${rowBorder}` }}>{CATEGORY_LABELS[a.category] || a.category}</td>
                              <td style={{ borderBottom: `1px solid ${rowBorder}` }}>{a.http_status ?? "—"}</td>
                              <td style={{ borderBottom: `1px solid ${rowBorder}`, fontFamily: "monospace" }}>{a.provider_code || "—"}</td>
                              <td style={{ borderBottom: `1px solid ${rowBorder}` }}>{a.retried ? "بله" : "خیر"}</td>
                              <td style={{ borderBottom: `1px solid ${rowBorder}`, maxWidth: 200 }}>{a.message_fa}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {detail.status === "ok" && detail.response_text && (
                  <div style={{ marginBottom: 16 }}>
                    <h3 style={{ fontSize: 14, margin: "0 0 8px" }}>پاسخ مدل</h3>
                    <pre style={{ ...preBlock, maxHeight: 200 }}>
                      {detail.response_text.slice(0, 4000)}
                      {detail.response_text.length > 4000 ? "\n…" : ""}
                    </pre>
                  </div>
                )}

                {detail.request_text && (
                  <div>
                    <h3 style={{ fontSize: 14, margin: "0 0 8px" }}>متن درخواست (پرامپت)</h3>
                    <pre style={{ ...preBlock, maxHeight: 240, fontSize: 11 }}>
                      {detail.request_text.slice(0, 6000)}
                      {detail.request_text.length > 6000 ? "\n…" : ""}
                    </pre>
                  </div>
                )}

                {!detail.error_diagnostic && detail.error_message && (
                  <div style={{ marginTop: 12, fontSize: 13, color: errorText }}>
                    <strong>خطا:</strong> {detail.error_message}
                  </div>
                )}
              </>
            )}
            </div>

            <div style={{
              padding: "12px 20px",
              borderTop: `1px solid ${theme.border}`,
              display: "flex",
              justifyContent: "flex-end",
              flexShrink: 0,
              background: theme.card,
            }}
            >
              <button
                type="button"
                onClick={() => setDetail(null)}
                disabled={detailLoading}
                style={{ ...inp, cursor: detailLoading ? "wait" : "pointer" }}
              >
                بستن
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
