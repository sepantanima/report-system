import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Plus, Search, RotateCcw, Edit3, ListOrdered,
  FileDown, Printer, X, ChevronUp, ChevronDown, Loader2, Save,
} from "lucide-react";
import FormPageLayout from "../components/common/FormPageLayout.jsx";
import { DateObject } from "react-multi-date-picker";
import persian from "react-date-object/calendars/persian";
import persian_fa from "react-date-object/locales/persian_fa";
import gregorian from "react-date-object/calendars/gregorian";
import ThemedDatePicker from "../components/analysis/ThemedDatePicker.jsx";
import MultiSelect from "../components/MultiSelect.jsx";
import RichTextEditor, { stripHtml } from "../components/analysis/RichTextEditor.jsx";
import managementSummaryService from "../services/managementSummaryService.js";
import { getSessionRoles, hasPermission, hasRole } from "../utils/userRoles.js";
import { MANAGEMENT_SUMMARY_BODY_MAX } from "../constants/promptFieldLimits.js";
import { FIELD_MGMT_SUMMARY_HELP } from "../content/fieldFormHelp.jsx";
import { clampText } from "../utils/limitInput.js";
import { useAppTheme } from "../context/ThemeContext.jsx";
import { getFormPageTheme } from "../theme/formPageTheme.js";
import {
  getFieldManagementSummaryStyles,
  summaryTypeBadgeStyle,
} from "../theme/fieldManagementSummaryPageStyles.js";

const toPersianDigits = (val) =>
  String(val ?? "").replace(/[0-9]/g, (d) => "۰۱۲۳۴۵۶۷۸۹"[d]);

const toEnDigits = (s) =>
  String(s ?? "").replace(/[۰-۹]/g, (d) => "۰۱۲۳۴۵۶۷۸۹".indexOf(d));

/** تاریخ شمسی ذخیره‌شده YYYY-MM-DD → نمایش ۱۴۰۵/۰۲/۰۸ */
const faStoredJalali = (d) => (d ? toPersianDigits(String(d).replace(/-/g, "/")) : "—");

/** timestamp میلادی → نمایش شمسی */
const faTimestampJalali = (d) => {
  if (!d) return "—";
  try {
    return toPersianDigits(new DateObject(new Date(d)).convert(persian).format("YYYY/MM/DD"));
  } catch {
    return String(d);
  }
};

const KIND_FA = {
  daily: "روزانه",
  weekly: "هفتگی",
  monthly: "ماهانه",
  semi_annual: "شش‌ماهه",
  annual: "سالانه",
  custom: "دلخواه",
};
const TYPE_FA = { provincial: "استانی", special: "یگان", general: "عمومی" };
const STATE_FA = { pending: "در انتظار", verified: "تاییدشده", rejected: "برگشتی" };

/** عنوان در جدول لیست: کوتاه و موجز؛ متن کامل در title/tooltip */
const LIST_TITLE_DISPLAY_MAX = 56;
function displayTitleForList(title) {
  const t = String(title || "").trim();
  if (!t) return "—";
  if (t.length <= LIST_TITLE_DISPLAY_MAX) return t;
  const slice = t.slice(0, LIST_TITLE_DISPLAY_MAX);
  const sp = slice.lastIndexOf(" ");
  const cut = sp > 26 ? slice.slice(0, sp) : slice;
  return `${cut.trim()}…`;
}

const EMPTY_FILTERS = {
  q: "",
  dates: null,
  summaryType: "",
  periodKind: "",
  provinces: [],
  units: [],
  topics: [],
};

export default function FieldManagementSummary() {
  const navigate = useNavigate();
  const { isDarkMode } = useAppTheme();
  const theme = getFormPageTheme(isDarkMode);
  const styles = useMemo(
    () => getFieldManagementSummaryStyles(theme, isDarkMode),
    [theme, isDarkMode],
  );
  const { inp, btn, filterPanel, modalOverlay, modalBox, tableWrap, tableWrapInner, tableHeadBg, tableRowBorder, expandedRowBg } = styles;
  const roles = getSessionRoles();
  const allowed = hasPermission(roles, "field_mgmt_summary");
  const isAdmin = hasRole(roles, "admin");

  const [filters, setFilters] = useState(EMPTY_FILTERS);
  const [sortBy, setSortBy] = useState("created_at");
  const [sortDir, setSortDir] = useState("desc");
  const [page, setPage] = useState(0);
  const limit = 20;

  const [data, setData] = useState({ total: 0, rows: [] });
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  const [provinceOptions, setProvinceOptions] = useState([]);
  const [unitOptions, setUnitOptions] = useState([]);
  const [topicOptions, setTopicOptions] = useState([]);

  // مودال‌ها
  const [editTarget, setEditTarget] = useState(null); // { id }
  const [editTitle, setEditTitle] = useState("");
  const [editBody, setEditBody] = useState("");
  const [editBusy, setEditBusy] = useState(false);
  const [reportsTarget, setReportsTarget] = useState(null); // { summary, refs }
  const [expandedRef, setExpandedRef] = useState(null);
  const [exportTarget, setExportTarget] = useState(null); // row
  const [withReports, setWithReports] = useState(true);
  const [exportBusy, setExportBusy] = useState(false);

  useEffect(() => {
    if (!allowed) return;
    managementSummaryService.getProvinces().then(
      (list) => setProvinceOptions((list || []).map((p) => ({ value: p, label: p }))),
      () => {},
    );
    managementSummaryService.getUnits().then(
      (list) =>
        setUnitOptions(
          (list || []).map((u) => ({
            value: String(u.UnitCode),
            label: (u.display_name || u.Name || u.name || u.UnitShortName || String(u.UnitCode)).trim(),
          })),
        ),
      () => {},
    );
    managementSummaryService.getReportTypes().then(
      (list) => setTopicOptions((list || []).map((t) => ({ value: t.title_fa, label: t.title_fa }))),
      () => {},
    );
  }, [allowed]);

  const queryParams = useMemo(() => {
    const params = {
      limit,
      offset: page * limit,
      sort_by: sortBy,
      sort_dir: sortDir,
    };
    if (filters.q.trim()) params.q = filters.q.trim();
    if (filters.summaryType) params.summary_type = filters.summaryType;
    if (filters.periodKind) params.period_kind = filters.periodKind;
    if (filters.provinces.length) params.provinces = filters.provinces.join(",");
    if (filters.units.length) params.units = filters.units.join(",");
    if (filters.topics.length) params.topics = filters.topics.join(",");
    if (filters.dates?.[0]) {
      const from = new DateObject(filters.dates[0]).convert(gregorian).format("YYYY-MM-DD");
      const to = filters.dates[1]
        ? new DateObject(filters.dates[1]).convert(gregorian).format("YYYY-MM-DD")
        : from;
      params.created_from = toEnDigits(from);
      params.created_to = toEnDigits(to);
    }
    return params;
  }, [filters, sortBy, sortDir, page]);

  const load = useCallback(async () => {
    if (!allowed) return;
    setLoading(true);
    setErr("");
    try {
      const res = await managementSummaryService.list(queryParams);
      setData({ total: res.total || 0, rows: res.rows || [] });
    } catch (e) {
      setErr(e.response?.data?.error || e.message);
    } finally {
      setLoading(false);
    }
  }, [allowed, queryParams]);

  useEffect(() => {
    load();
  }, [load]);

  const toggleSort = (col) => {
    if (sortBy === col) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortBy(col);
      setSortDir("desc");
    }
    setPage(0);
  };

  const setFilter = (patch) => {
    setFilters((f) => ({ ...f, ...patch }));
    setPage(0);
  };

  const openEdit = async (row) => {
    try {
      const detail = await managementSummaryService.getById(row.id);
      setEditTarget({ id: row.id });
      setEditTitle(detail.summary.title || "");
      setEditBody(detail.summary.summary_body || "");
    } catch (e) {
      setErr(e.response?.data?.error || e.message);
    }
  };

  const saveEdit = async () => {
    if (!editTarget) return;
    setEditBusy(true);
    try {
      await managementSummaryService.updateSummary(editTarget.id, {
        summary_body: editBody,
        title: editTitle.trim(),
      });
      setEditTarget(null);
      await load();
    } catch (e) {
      setErr(e.response?.data?.error || e.message);
    } finally {
      setEditBusy(false);
    }
  };

  const openReports = async (row) => {
    try {
      const detail = await managementSummaryService.getById(row.id);
      setReportsTarget(detail);
      setExpandedRef(null);
    } catch (e) {
      setErr(e.response?.data?.error || e.message);
    }
  };

  const doExport = async (format) => {
    if (!exportTarget) return;
    setExportBusy(true);
    try {
      await managementSummaryService.downloadExport(exportTarget.id, format, withReports);
    } catch (e) {
      setErr(e.response?.data?.error || e.message);
    } finally {
      setExportBusy(false);
    }
  };

  const doPrint = async () => {
    if (!exportTarget) return;
    setExportBusy(true);
    try {
      const detail = await managementSummaryService.getById(exportTarget.id);
      const s = detail.summary;
      const refs = withReports ? detail.refs || [] : [];
      const esc = (v) => String(v ?? "").replace(/</g, "&lt;");
      const refsHtml = refs.length
        ? `<h3>فهرست گزارش‌های مرجع</h3>
           <table><thead><tr><th>ردیف</th><th>تاریخ</th><th>یگان</th><th>موضوع</th><th>عنوان</th><th>وضعیت</th></tr></thead>
           <tbody>${refs
             .map(
               (r, i) =>
                 `<tr><td>${toPersianDigits(i + 1)}</td><td>${faStoredJalali(r.date)}</td><td>${esc(r.UnitName || r.UnitShortName)}</td><td>${esc(r.chat_title)}</td><td>${esc(r.title)}</td><td>${esc(STATE_FA[r.state] || r.state)}</td></tr>`,
             )
             .join("")}</tbody></table>`
        : "";
      const html = `<!DOCTYPE html><html dir="rtl"><head><meta charset="utf-8"><title>خلاصه مدیریتی</title>
        <style>body{font-family:Tahoma,Arial,sans-serif;padding:18px;} table{width:100%;border-collapse:collapse;margin-top:8px;} th,td{border:1px solid #333;padding:6px;font-size:12px;} h2{margin-bottom:4px;} .meta{font-size:13px;margin:2px 0;} .body{margin-top:14px;line-height:1.9;}</style></head><body>
        <h2>خلاصه مدیریتی گزارشات میدانی</h2>
        <p class="meta"><b>عنوان:</b> ${esc(s.title)}</p>
        <p class="meta"><b>نوع خلاصه:</b> ${TYPE_FA[s.summary_type] || ""} | <b>نوع گزارش:</b> ${KIND_FA[s.period_kind] || ""} | <b>بازه:</b> ${faStoredJalali(s.period_start)} تا ${faStoredJalali(s.period_end)} | <b>تعداد گزارشات:</b> ${toPersianDigits(s.report_count)}</p>
        <div class="body">${s.summary_body || ""}</div>
        ${refsHtml}
        </body></html>`;
      const w = window.open("", "_blank");
      w.document.write(html);
      w.document.close();
      w.onload = () => w.print();
    } catch (e) {
      setErr(e.response?.data?.error || e.message);
    } finally {
      setExportBusy(false);
    }
  };

  if (!allowed) {
    return (
      <div style={{ padding: 24, textAlign: "center", color: theme.text, background: theme.bg, minHeight: "100vh" }}>
        <p>دسترسی مجاز نیست.</p>
        <button type="button" style={btn()} onClick={() => navigate("/main")}>
          بازگشت
        </button>
      </div>
    );
  }

  const SortHeader = ({ col, children, width }) => (
    <th
      onClick={() => toggleSort(col)}
      style={{ padding: "10px 8px", cursor: "pointer", whiteSpace: "nowrap", userSelect: "none", width }}
    >
      <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
        {children}
        {sortBy === col ? (sortDir === "asc" ? <ChevronUp size={13} /> : <ChevronDown size={13} />) : null}
      </span>
    </th>
  );

  const totalPages = Math.max(1, Math.ceil(data.total / limit));

  return (
    <FormPageLayout
      title="گزارشات قبلی — خلاصه مدیریتی"
      documentTitle="خلاصه مدیریتی میدانی"
      onHelp={() => <FIELD_MGMT_SUMMARY_HELP />}
      helpTitle="راهنمای خلاصه مدیریتی میدانی"
      contentPadding="20px"
      toolbarExtra={(
        <>
          {isAdmin ? (
            <button type="button" style={{ ...btn(), fontSize: "0.86em" }} onClick={() => navigate("/admin/prompts")}>
              پرامپت‌ها
            </button>
          ) : null}
          <button type="button" className="v3-add-fab" style={{ padding: "6px 12px", fontSize: "0.86em" }} onClick={() => navigate("/field-management-summary")}>
            <Plus size={17} />
            خلاصه جدید
          </button>
        </>
      )}
    >
      {err ? <div style={{ color: theme.danger || "#dc2626", marginBottom: 12 }}>{err}</div> : null}

      {/* نوار فیلتر */}
      <div style={filterPanel}>
        <div>
          <label style={{ fontSize: 12, opacity: 0.8, color: theme.muted }}>جستجو (عنوان / جزء عنوان)</label>
          <div style={{ position: "relative" }}>
            <input
              style={{ ...inp, paddingLeft: 30 }}
              value={filters.q}
              onChange={(e) => setFilter({ q: e.target.value })}
              placeholder="جستجو..."
            />
            <Search size={15} style={{ position: "absolute", left: 8, top: 11, opacity: 0.5 }} />
          </div>
        </div>
        <div>
          <label style={{ fontSize: 12, opacity: 0.8, color: theme.muted }}>بازه تاریخ ایجاد (شمسی)</label>
          <ThemedDatePicker
            value={filters.dates}
            onChange={(d) => setFilter({ dates: d })}
            range
            calendar={persian}
            locale={persian_fa}
            calendarPosition="bottom-right"
            placeholder="انتخاب بازه"
          />
        </div>
        <div>
          <label style={{ fontSize: 12, opacity: 0.8, color: theme.muted }}>نوع خلاصه</label>
          <select style={inp} value={filters.summaryType} onChange={(e) => setFilter({ summaryType: e.target.value })}>
            <option value="">همه</option>
            <option value="general">عمومی</option>
            <option value="provincial">استانی</option>
            <option value="special">یگان</option>
          </select>
        </div>
        <div>
          <label style={{ fontSize: 12, opacity: 0.8, color: theme.muted }}>نوع گزارش</label>
          <select style={inp} value={filters.periodKind} onChange={(e) => setFilter({ periodKind: e.target.value })}>
            <option value="">همه</option>
            <option value="daily">روزانه</option>
            <option value="weekly">هفتگی</option>
            <option value="monthly">ماهانه</option>
            <option value="semi_annual">شش‌ماهه</option>
            <option value="annual">سالانه</option>
            <option value="custom">دلخواه</option>
          </select>
        </div>
        <div>
          <label style={{ fontSize: 12, opacity: 0.8, color: theme.muted }}>استان‌ها</label>
          <MultiSelect
            options={provinceOptions}
            values={filters.provinces}
            onChange={(v) => setFilter({ provinces: v })}
            placeholder="همه استان‌ها"
            theme={theme}
          />
        </div>
        <div>
          <label style={{ fontSize: 12, opacity: 0.8, color: theme.muted }}>یگان‌ها</label>
          <MultiSelect
            options={unitOptions}
            values={filters.units}
            onChange={(v) => setFilter({ units: v })}
            placeholder="همه یگان‌ها"
            theme={theme}
          />
        </div>
        <div>
          <label style={{ fontSize: 12, opacity: 0.8, color: theme.muted }}>موضوعات</label>
          <MultiSelect
            options={topicOptions}
            values={filters.topics}
            onChange={(v) => setFilter({ topics: v })}
            placeholder="همه موضوعات"
            theme={theme}
          />
        </div>
        <div style={{ display: "flex", alignItems: "flex-end" }}>
          <button type="button" style={{ ...btn(), color: "#f59e0b" }} onClick={() => setFilters(EMPTY_FILTERS)}>
            <RotateCcw size={15} />
            پاک‌سازی فیلترها
          </button>
        </div>
      </div>

      {/* جدول */}
      <div style={tableWrap}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13, minWidth: 980, color: theme.text }}>
          <thead>
            <tr style={{ background: tableHeadBg, textAlign: "right" }}>
              <th style={{ padding: "10px 8px", width: 48 }}>ردیف</th>
              <SortHeader col="created_at">تاریخ ایجاد</SortHeader>
              <SortHeader col="summary_type">نوع خلاصه</SortHeader>
              <SortHeader col="title">عنوان</SortHeader>
              <th style={{ padding: "10px 8px", minWidth: 220 }}>جزء عنوان</th>
              <SortHeader col="period_start">بازه گزارش</SortHeader>
              <SortHeader col="period_kind">نوع گزارش</SortHeader>
              <SortHeader col="report_count">گزارشات بررسی‌شده</SortHeader>
              <th style={{ padding: "10px 8px", width: 130 }}>عملیات</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={9} style={{ padding: 24, textAlign: "center" }}>
                  <Loader2 size={20} style={{ animation: "spin 1s linear infinite" }} />
                </td>
              </tr>
            ) : data.rows.length ? (
              data.rows.map((row, i) => (
                <tr key={row.id} style={{ borderTop: tableRowBorder }}>
                  <td style={{ padding: 8 }}>{toPersianDigits(page * limit + i + 1)}</td>
                  <td style={{ padding: 8, whiteSpace: "nowrap" }}>{faTimestampJalali(row.created_at)}</td>
                  <td style={{ padding: 8 }}>
                    <span
                      style={{
                        padding: "2px 10px",
                        borderRadius: 999,
                        fontSize: 12,
                        ...summaryTypeBadgeStyle(row.summary_type, isDarkMode),
                      }}
                    >
                      {TYPE_FA[row.summary_type] || row.summary_type}
                    </span>
                  </td>
                  <td
                    style={{ padding: 8, maxWidth: 220, wordBreak: "break-word" }}
                    title={String(row.title || "").trim() || undefined}
                  >
                    {displayTitleForList(row.title)}
                  </td>
                  <td style={{ padding: 8, maxWidth: 320, fontSize: 12, opacity: 0.85 }}>{row.subtitle || "—"}</td>
                  <td style={{ padding: 8, whiteSpace: "nowrap", fontSize: 12 }}>
                    {faStoredJalali(row.period_start)} تا {faStoredJalali(row.period_end)}
                  </td>
                  <td style={{ padding: 8 }}>{KIND_FA[row.period_kind] || row.period_kind}</td>
                  <td style={{ padding: 8, textAlign: "center" }}>{toPersianDigits(row.report_count)}</td>
                  <td style={{ padding: 8 }}>
                    <div style={{ display: "flex", gap: 6 }}>
                      <button type="button" title="ویرایش متن خلاصه" onClick={() => openEdit(row)} style={{ ...btn(), padding: 7 }}>
                        <Edit3 size={15} color="#38bdf8" />
                      </button>
                      <button type="button" title="لیست گزارشات مربوطه" onClick={() => openReports(row)} style={{ ...btn(), padding: 7 }}>
                        <ListOrdered size={15} color="#a78bfa" />
                      </button>
                      <button
                        type="button"
                        title="خروجی"
                        onClick={() => {
                          setExportTarget(row);
                          setWithReports(true);
                        }}
                        style={{ ...btn(), padding: 7 }}
                      >
                        <FileDown size={15} color="#34d399" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={9} style={{ padding: 24, textAlign: "center", opacity: 0.65 }}>
                  خلاصه‌ای یافت نشد
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* صفحه‌بندی */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 12, fontSize: 13 }}>
        <span style={{ opacity: 0.75 }}>
          مجموع: {toPersianDigits(data.total)} خلاصه — صفحه {toPersianDigits(page + 1)} از {toPersianDigits(totalPages)}
        </span>
        <div style={{ display: "flex", gap: 8 }}>
          <button type="button" style={btn()} disabled={page === 0} onClick={() => setPage((p) => Math.max(0, p - 1))}>
            قبلی
          </button>
          <button type="button" style={btn()} disabled={page + 1 >= totalPages} onClick={() => setPage((p) => p + 1)}>
            بعدی
          </button>
        </div>
      </div>

      {/* مودال ویرایش (فقط متن خلاصه) */}
      {editTarget ? (
        <div style={modalOverlay}>
          <div style={modalBox(760)}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
              <h3 style={{ margin: 0, fontSize: 15 }}>ویرایش خلاصه مدیریتی — {editTitle.trim() || `#${editTarget.id}`}</h3>
              <button type="button" onClick={() => setEditTarget(null)} style={{ ...btn(), padding: 6 }}>
                <X size={16} />
              </button>
            </div>
            <p style={{ fontSize: 12, opacity: 0.7, marginTop: 0 }}>
              عنوان و متن خلاصه قابل ویرایش هستند؛ سایر مشخصات (بازه و فیلترها) تغییر نمی‌کنند.
            </p>
            <label style={{ fontSize: 12, opacity: 0.8, display: "block", marginBottom: 6 }}>عنوان خلاصه</label>
            <input
              type="text"
              style={{ ...inp, marginBottom: 14 }}
              value={editTitle}
              maxLength={480}
              onChange={(e) => setEditTitle(clampText(e.target.value, 480))}
              placeholder="عنوان موجز"
            />
            <RichTextEditor value={editBody} onChange={setEditBody} maxLength={MANAGEMENT_SUMMARY_BODY_MAX} minHeight={220} isDarkMode={isDarkMode} />
            <div style={{ display: "flex", gap: 8, marginTop: 14, justifyContent: "flex-end" }}>
              <button type="button" style={btn()} onClick={() => setEditTarget(null)}>
                انصراف
              </button>
              <button
                type="button"
                style={btn("primary")}
                disabled={editBusy || !stripHtml(editBody).trim() || !editTitle.trim()}
                onClick={saveEdit}
              >
                <Save size={15} />
                {editBusy ? "در حال ذخیره..." : "ذخیره تغییرات"}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {/* مودال لیست گزارشات مربوطه */}
      {reportsTarget ? (
        <div style={modalOverlay}>
          <div style={modalBox(880)}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
              <h3 style={{ margin: 0, fontSize: 15 }}>
                گزارشات مربوطه ({toPersianDigits(reportsTarget.refs?.length || 0)}) — {reportsTarget.summary?.title}
              </h3>
              <button type="button" onClick={() => setReportsTarget(null)} style={{ ...btn(), padding: 6 }}>
                <X size={16} />
              </button>
            </div>
            <p style={{ fontSize: 12, opacity: 0.7, marginTop: 0 }}>{reportsTarget.summary?.subtitle}</p>
            <div style={tableWrapInner}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12, color: theme.text }}>
                <thead>
                  <tr style={{ background: tableHeadBg, textAlign: "right" }}>
                    <th style={{ padding: 8 }}>ردیف</th>
                    <th style={{ padding: 8 }}>تاریخ</th>
                    <th style={{ padding: 8 }}>استان</th>
                    <th style={{ padding: 8 }}>یگان</th>
                    <th style={{ padding: 8 }}>موضوع</th>
                    <th style={{ padding: 8 }}>عنوان</th>
                    <th style={{ padding: 8 }}>وضعیت</th>
                    <th style={{ padding: 8 }}>عملیات</th>
                  </tr>
                </thead>
                <tbody>
                  {(reportsTarget.refs || []).map((r, i) => (
                    <React.Fragment key={r.hash_key}>
                      <tr style={{ borderTop: tableRowBorder }}>
                        <td style={{ padding: 8 }}>{toPersianDigits(i + 1)}</td>
                        <td style={{ padding: 8, whiteSpace: "nowrap" }}>{faStoredJalali(r.date)}</td>
                        <td style={{ padding: 8 }}>{r.StateName || "—"}</td>
                        <td style={{ padding: 8 }}>{r.UnitName || r.UnitShortName || "—"}</td>
                        <td style={{ padding: 8 }}>{r.chat_title || "—"}</td>
                        <td style={{ padding: 8, maxWidth: 240 }}>{r.title || "—"}</td>
                        <td style={{ padding: 8 }}>{STATE_FA[r.state] || r.state || "—"}</td>
                        <td style={{ padding: 8 }}>
                          <button
                            type="button"
                            style={{ ...btn(), padding: "4px 10px", fontSize: 11 }}
                            onClick={() => setExpandedRef(expandedRef === r.hash_key ? null : r.hash_key)}
                          >
                            {expandedRef === r.hash_key ? "بستن" : "نمایش کامل"}
                          </button>
                        </td>
                      </tr>
                      {expandedRef === r.hash_key ? (
                        <tr>
                          <td colSpan={8} style={{ padding: 12, background: expandedRowBg, lineHeight: 1.9, whiteSpace: "pre-wrap", color: theme.text }}>
                            {r.cleaned_text || r.raw_text || "متنی ثبت نشده است"}
                          </td>
                        </tr>
                      ) : null}
                    </React.Fragment>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      ) : null}

      {/* مودال خروجی */}
      {exportTarget ? (
        <div style={modalOverlay}>
          <div style={modalBox(420)}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
              <h3 style={{ margin: 0, fontSize: 15 }}>خروجی — {exportTarget.title || `#${exportTarget.id}`}</h3>
              <button type="button" onClick={() => setExportTarget(null)} style={{ ...btn(), padding: 6 }}>
                <X size={16} />
              </button>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 16, fontSize: 13 }}>
              <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer" }}>
                <input type="radio" name="withReports" checked={withReports} onChange={() => setWithReports(true)} />
                همراه با لیست گزارشات
              </label>
              <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer" }}>
                <input type="radio" name="withReports" checked={!withReports} onChange={() => setWithReports(false)} />
                فقط خلاصه (بدون لیست گزارشات)
              </label>
            </div>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              <button type="button" style={btn("primary")} disabled={exportBusy} onClick={() => doExport("pdf")}>
                <FileDown size={15} />
                PDF
              </button>
              <button type="button" style={btn("primary")} disabled={exportBusy} onClick={() => doExport("docx")}>
                <FileDown size={15} />
                Word
              </button>
              <button type="button" style={btn()} disabled={exportBusy} onClick={doPrint}>
                <Printer size={15} />
                چاپ
              </button>
            </div>
          </div>
        </div>
      ) : null}

      <style>{`@keyframes spin { from { transform: rotate(0deg);} to { transform: rotate(360deg);} }`}</style>
    </FormPageLayout>
  );
}
