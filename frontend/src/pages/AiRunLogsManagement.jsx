import React, { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ExternalLink, RefreshCw, X } from "lucide-react";
import FormPageLayout from "../components/common/FormPageLayout.jsx";
import aiRunLogAdminService from "../services/aiRunLogAdminService.js";
import { getSessionRoles, hasRole } from "../utils/userRoles.js";

const STATUS_OPTIONS = [
  { value: "", label: "همه وضعیت‌ها" },
  { value: "ok", label: "موفق (ok)" },
  { value: "llm_error", label: "خطای LLM" },
  { value: "assembly_error", label: "خطای مونتاژ پرامپت" },
  { value: "config_missing", label: "کانفیگ اکشن یافت نشد" },
];

const FORM_OPTIONS = [
  { value: "", label: "همه فرم‌ها" },
  { value: "news_smart_analysis", label: "تحلیل هوشمند اخبار" },
  { value: "news_monitor_manage", label: "پایش خبر" },
  { value: "field_management_summary_create", label: "خلاصه مدیریتی میدان" },
];

const STATUS_BADGE = {
  ok: { bg: "rgba(16,185,129,0.15)", color: "#34d399", label: "موفق" },
  llm_error: { bg: "rgba(239,68,68,0.15)", color: "#f87171", label: "خطای LLM" },
  assembly_error: { bg: "rgba(245,158,11,0.15)", color: "#fbbf24", label: "مونتاژ" },
  config_missing: { bg: "rgba(148,163,184,0.15)", color: "#94a3b8", label: "بدون کانفیگ" },
};

const CATEGORY_LABELS = {
  no_config: "بدون پیکربندی",
  model_access: "عدم دسترسی مدل",
  quota: "سهمیه",
  auth: "احراز هویت",
  timeout: "timeout",
  empty_response: "پاسخ خالی",
  unknown: "نامشخص",
};

const inp = {
  padding: 8,
  borderRadius: 6,
  background: "#1e293b",
  border: "1px solid #334155",
  color: "#fff",
  fontFamily: "inherit",
};

function formatDate(iso) {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleString("fa-IR");
  } catch {
    return iso;
  }
}

function StatusBadge({ status }) {
  const s = STATUS_BADGE[status] || { bg: "rgba(100,116,139,0.2)", color: "#cbd5e1", label: status };
  return (
    <span style={{
      display: "inline-block",
      padding: "2px 8px",
      borderRadius: 999,
      fontSize: 12,
      background: s.bg,
      color: s.color,
    }}
    >
      {s.label}
    </span>
  );
}

export default function AiRunLogsManagement() {
  const navigate = useNavigate();
  const allowed = hasRole(getSessionRoles(), "admin");
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");
  const [detail, setDetail] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);

  const [filterForm, setFilterForm] = useState("news_smart_analysis");
  const [filterStatus, setFilterStatus] = useState("");
  const [filterConfigId, setFilterConfigId] = useState("");
  const [filterFrom, setFilterFrom] = useState("");
  const [filterTo, setFilterTo] = useState("");

  const fetchLogs = useCallback(async () => {
    if (!allowed) return;
    setLoading(true);
    setErr("");
    try {
      const params = { limit: 50 };
      if (filterForm.trim()) params.form_name = filterForm.trim();
      if (filterStatus.trim()) params.status = filterStatus.trim();
      if (filterConfigId.trim()) params.ai_config_id = filterConfigId.trim();
      if (filterFrom.trim()) params.from = new Date(filterFrom).toISOString();
      if (filterTo.trim()) params.to = new Date(filterTo).toISOString();
      const data = await aiRunLogAdminService.listLogs(params);
      setRows(Array.isArray(data) ? data : []);
    } catch (e) {
      setErr(e.response?.data?.error || e.message);
    } finally {
      setLoading(false);
    }
  }, [allowed, filterForm, filterStatus, filterConfigId, filterFrom, filterTo]);

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
      <div style={{ padding: 24, color: "#e2e8f0", fontFamily: "inherit" }}>
        دسترسی به این بخش فقط برای راهبر مجاز است.
      </div>
    );
  }

  return (
    <FormPageLayout
      title="لاگ اجرای AI"
      documentTitle="لاگ اجرای AI"
      toolbarExtra={(
        <button type="button" onClick={fetchLogs} style={{ ...inp, cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 6 }}>
          <RefreshCw size={14} /> بروزرسانی
        </button>
      )}
    >
      <p style={{ fontSize: 13, color: "#94a3b8", marginTop: 0, marginBottom: 16, lineHeight: 1.7 }}>
        برای عیب‌یابی تحلیل هوشمند و سایر اکشن‌های AI؛ علت دقیق (مدل، سهمیه، کلید API، پرامپت) را اینجا ببینید.
      </p>

      {err && <div style={{ color: "#f87171", marginBottom: 12 }}>{err}</div>}

      <div style={{ display: "flex", flexWrap: "wrap", gap: 10, marginBottom: 16, alignItems: "flex-end" }}>
        <label style={{ fontSize: 12 }}>
          فرم
          <select style={{ ...inp, display: "block", marginTop: 4, minWidth: 200 }} value={filterForm} onChange={(e) => setFilterForm(e.target.value)}>
            {FORM_OPTIONS.map((o) => <option key={o.value || "all"} value={o.value}>{o.label}</option>)}
          </select>
        </label>
        <label style={{ fontSize: 12 }}>
          وضعیت
          <select style={{ ...inp, display: "block", marginTop: 4, minWidth: 160 }} value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}>
            {STATUS_OPTIONS.map((o) => <option key={o.value || "all"} value={o.value}>{o.label}</option>)}
          </select>
        </label>
        <label style={{ fontSize: 12 }}>
          config_id
          <input style={{ ...inp, display: "block", marginTop: 4, width: 100 }} value={filterConfigId} onChange={(e) => setFilterConfigId(e.target.value)} placeholder="8" />
        </label>
        <label style={{ fontSize: 12 }}>
          از تاریخ
          <input type="datetime-local" style={{ ...inp, display: "block", marginTop: 4 }} value={filterFrom} onChange={(e) => setFilterFrom(e.target.value)} />
        </label>
        <label style={{ fontSize: 12 }}>
          تا تاریخ
          <input type="datetime-local" style={{ ...inp, display: "block", marginTop: 4 }} value={filterTo} onChange={(e) => setFilterTo(e.target.value)} />
        </label>
      </div>

      {loading ? <p>در حال بارگذاری…</p> : (
        <div className="form-page-table-wrap">
          <table className="form-page-table">
            <thead>
              <tr style={{ background: "#1e293b" }}>
                {["زمان", "فرم", "اکشن", "وضعیت", "کاربر", "usage_key", "config", "خلاصه خطا", ""].map((h) => (
                  <th key={h || "act"} style={{ borderBottom: "1px solid #334155", fontSize: 12 }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 ? (
                <tr><td colSpan={9} style={{ padding: 16, color: "#94a3b8" }}>لاگی یافت نشد.</td></tr>
              ) : rows.map((row) => (
                <tr key={row.id} style={{ cursor: "pointer" }} onClick={() => openDetail(row.id)}>
                  <td style={{ borderBottom: "1px solid #1e293b", fontSize: 12, whiteSpace: "nowrap" }}>{formatDate(row.created_at)}</td>
                  <td style={{ borderBottom: "1px solid #1e293b", fontSize: 12 }}>{row.form_name}</td>
                  <td style={{ borderBottom: "1px solid #1e293b", fontSize: 12 }}>{row.action_name}</td>
                  <td style={{ borderBottom: "1px solid #1e293b" }}><StatusBadge status={row.status} /></td>
                  <td style={{ borderBottom: "1px solid #1e293b", fontSize: 12 }}>{row.user_name || row.user_username || "—"}</td>
                  <td style={{ borderBottom: "1px solid #1e293b", fontSize: 11, fontFamily: "monospace" }}>{row.usage_key_used || "—"}</td>
                  <td style={{ borderBottom: "1px solid #1e293b", fontSize: 12 }}>{row.ai_config_id ?? "—"}</td>
                  <td style={{ borderBottom: "1px solid #1e293b", fontSize: 12, maxWidth: 280, overflow: "hidden", textOverflow: "ellipsis" }}>
                    {row.error_summary || (row.status === "ok" ? "—" : row.error_message || "—")}
                  </td>
                  <td style={{ borderBottom: "1px solid #1e293b", fontSize: 12, color: "#38bdf8" }}>جزئیات</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {(detail || detailLoading) && (
        <div style={{
          position: "fixed", inset: 0, background: "rgba(0,0,0,0.65)", zIndex: 60,
          display: "flex", alignItems: "center", justifyContent: "center", padding: 16,
        }}
        >
          <div style={{
            background: "#1e293b", borderRadius: 12, width: "min(760px, 96vw)",
            maxHeight: "90vh", overflow: "auto", padding: 24, border: "1px solid #334155",
          }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
              <h2 style={{ margin: 0, fontSize: 18 }}>
                {detailLoading ? "در حال بارگذاری…" : `لاگ #${detail?.id}`}
              </h2>
              <button type="button" onClick={() => setDetail(null)} style={{ background: "none", border: "none", color: "#94a3b8", cursor: "pointer" }}>
                <X size={20} />
              </button>
            </div>

            {detail && !detailLoading && (
              <>
                <div style={{ display: "grid", gap: 8, fontSize: 13, marginBottom: 16 }}>
                  <div><strong>زمان:</strong> {formatDate(detail.created_at)}</div>
                  <div><strong>فرم / اکشن:</strong> {detail.form_name} / {detail.action_name}</div>
                  <div><strong>وضعیت:</strong> <StatusBadge status={detail.status} /></div>
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
                  <div style={{
                    marginBottom: 16, padding: 12, borderRadius: 8,
                    background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.3)",
                    fontSize: 13, lineHeight: 1.7,
                  }}
                  >
                    <div><strong>دسته:</strong> {detail.error_diagnostic.category_label_fa || CATEGORY_LABELS[detail.error_diagnostic.category] || detail.error_diagnostic.category}</div>
                    <div><strong>خلاصه:</strong> {detail.error_summary || detail.error_diagnostic.message_fa}</div>
                    {detail.error_diagnostic.hint_fa && (
                      <div style={{ marginTop: 8, color: "#fcd34d" }}><strong>راهنما:</strong> {detail.error_diagnostic.hint_fa}</div>
                    )}
                  </div>
                )}

                {Array.isArray(detail.error_attempts) && detail.error_attempts.length > 0 && (
                  <div style={{ marginBottom: 16 }}>
                    <h3 style={{ fontSize: 14, margin: "0 0 8px" }}>تلاش‌های provider</h3>
                    <div className="form-page-table-wrap">
                      <table className="form-page-table" style={{ fontSize: 12 }}>
                        <thead>
                          <tr>
                            {["config", "provider", "model", "دسته", "HTTP", "کد", "retry?", "پیام"].map((h) => (
                              <th key={h} style={{ borderBottom: "1px solid #334155" }}>{h}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {detail.error_attempts.map((a, i) => (
                            <tr key={i}>
                              <td style={{ borderBottom: "1px solid #1e293b" }}>{a.config_id}</td>
                              <td style={{ borderBottom: "1px solid #1e293b" }}>{a.provider_type}</td>
                              <td style={{ borderBottom: "1px solid #1e293b", fontFamily: "monospace" }}>{a.model_id}</td>
                              <td style={{ borderBottom: "1px solid #1e293b" }}>{CATEGORY_LABELS[a.category] || a.category}</td>
                              <td style={{ borderBottom: "1px solid #1e293b" }}>{a.http_status ?? "—"}</td>
                              <td style={{ borderBottom: "1px solid #1e293b", fontFamily: "monospace" }}>{a.provider_code || "—"}</td>
                              <td style={{ borderBottom: "1px solid #1e293b" }}>{a.retried ? "بله" : "خیر"}</td>
                              <td style={{ borderBottom: "1px solid #1e293b", maxWidth: 200 }}>{a.message_fa}</td>
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
                    <pre style={{ background: "#0f172a", padding: 12, borderRadius: 8, overflow: "auto", maxHeight: 200, fontSize: 12, whiteSpace: "pre-wrap" }}>
                      {detail.response_text.slice(0, 4000)}
                      {detail.response_text.length > 4000 ? "\n…" : ""}
                    </pre>
                  </div>
                )}

                {detail.request_text && (
                  <div>
                    <h3 style={{ fontSize: 14, margin: "0 0 8px" }}>متن درخواست (پرامپت)</h3>
                    <pre style={{ background: "#0f172a", padding: 12, borderRadius: 8, overflow: "auto", maxHeight: 240, fontSize: 11, whiteSpace: "pre-wrap" }}>
                      {detail.request_text.slice(0, 6000)}
                      {detail.request_text.length > 6000 ? "\n…" : ""}
                    </pre>
                  </div>
                )}

                {!detail.error_diagnostic && detail.error_message && (
                  <div style={{ marginTop: 12, fontSize: 13, color: "#fca5a5" }}>
                    <strong>خطا:</strong> {detail.error_message}
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      )}
    </FormPageLayout>
  );
}
