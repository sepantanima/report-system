import React, { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Sparkles, Save, X, Search, Loader2, ChevronDown, ChevronUp,
  FileDown, Printer, ListOrdered,
} from "lucide-react";
import FormPageLayout from "../components/common/FormPageLayout.jsx";
import { DateObject } from "react-multi-date-picker";
import persian from "react-date-object/calendars/persian";
import persian_fa from "react-date-object/locales/persian_fa";
import ThemedDatePicker from "../components/analysis/ThemedDatePicker.jsx";
import MultiSelect from "../components/MultiSelect.jsx";
import RichTextEditor, { stripHtml } from "../components/analysis/RichTextEditor.jsx";
import managementSummaryService from "../services/managementSummaryService.js";
import { runFormAiAction, listFormAiActions } from "../services/formAiService.js";
import { FORM_AI_NAMES } from "../constants/aiFormNames.js";
import { getSessionRoles, hasPermission } from "../utils/userRoles.js";
import { MANAGEMENT_SUMMARY_BODY_MAX } from "../constants/promptFieldLimits.js";
import { clampText } from "../utils/limitInput.js";
import { aiMarkdownToHtml } from "../utils/managementSummaryAiText.js";
import { useAppTheme } from "../context/ThemeContext.jsx";
import { getFormPageTheme } from "../theme/formPageTheme.js";
import { getFieldManagementSummaryStyles } from "../theme/fieldManagementSummaryPageStyles.js";

const toPersianDigits = (val) =>
  String(val ?? "").replace(/[0-9]/g, (d) => "۰۱۲۳۴۵۶۷۸۹"[d]);

const toEnDigits = (s) =>
  String(s ?? "").replace(/[۰-۹]/g, (d) => "۰۱۲۳۴۵۶۷۸۹".indexOf(d));

/** DateObject شمسی → رشته YYYY-MM-DD با ارقام لاتین (هم‌فرمت با DB) */
const jalaliStr = (d) => {
  if (!d) return "";
  return toEnDigits(new DateObject(d).format("YYYY-MM-DD")).replace(/[^0-9-]/g, "");
};

const faSlash = (str) => (str ? toPersianDigits(String(str).replace(/-/g, "/")) : "—");

const KIND_FA = {
  daily: "روزانه",
  weekly: "هفتگی",
  monthly: "ماهانه",
  semi_annual: "شش‌ماهه",
  annual: "سالانه",
};
const CLASSIFICATION_OPTIONS = [
  { value: "1", label: "عمومی (کل کشور)" },
  { value: "2", label: "استانی" },
  { value: "3", label: "واحد" },
  { value: "4", label: "خاص" },
];
const CLASSIFICATION_FA = { 1: "عمومی", 2: "استانی", 3: "واحد", 4: "خاص" };
const STATE_FA = { pending: "در انتظار", verified: "تاییدشده", rejected: "برگشتی" };

const faJoin = (items) => {
  const arr = (items || []).filter(Boolean);
  if (!arr.length) return "";
  if (arr.length === 1) return arr[0];
  return `${arr.slice(0, -1).join("، ")} و ${arr[arr.length - 1]}`;
};

export default function FieldManagementSummaryCreate() {
  const navigate = useNavigate();
  const { isDarkMode } = useAppTheme();
  const theme = getFormPageTheme(isDarkMode);
  const styles = useMemo(
    () => getFieldManagementSummaryStyles(theme, isDarkMode),
    [theme, isDarkMode],
  );
  const { inp, btn, panel, readOnlyBox, nestedCard, tableRowBorder } = styles;
  const roles = getSessionRoles();
  const allowed = hasPermission(roles, "field_mgmt_summary");

  // بازه
  const [periodMode, setPeriodMode] = useState("auto"); // auto | custom
  const [periodKind, setPeriodKind] = useState("weekly");
  const [endDate, setEndDate] = useState(() => new DateObject({ calendar: persian }));
  const [customStart, setCustomStart] = useState(null);
  const [customEnd, setCustomEnd] = useState(null);

  // فیلترها — دامنهٔ انتشار (classification) تعیین می‌کند استان یا یگان نمایش داده شود
  const [provinces, setProvinces] = useState([]);
  const [units, setUnits] = useState([]);
  const [topics, setTopics] = useState([]);
  const [classifications, setClassifications] = useState(["2"]);
  const [onlyVerified, setOnlyVerified] = useState(true);
  const titleTouchedRef = useRef(false);

  // داده‌های کمکی
  const [provinceOptions, setProvinceOptions] = useState([]);
  const [unitOptions, setUnitOptions] = useState([]);
  const [topicOptions, setTopicOptions] = useState([]);

  // پیش‌نمایش و خلاصه
  const [preview, setPreview] = useState(null);
  const [expandedReport, setExpandedReport] = useState(null);
  const [draftMeta, setDraftMeta] = useState(null);
  const [title, setTitle] = useState("");
  const [summaryBody, setSummaryBody] = useState("");
  const [busy, setBusy] = useState(false);
  const [aiBusy, setAiBusy] = useState(false);
  const [aiActionLabel, setAiActionLabel] = useState("تولید پیش‌نویس با هوش‌افزار");
  const [err, setErr] = useState("");
  const [savedSummary, setSavedSummary] = useState(null);
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

  useEffect(() => {
    if (!allowed) return;
    listFormAiActions(FORM_AI_NAMES.FIELD_MANAGEMENT_SUMMARY_CREATE)
      .then((rows) => {
        const row = (rows || []).find((r) => r.action_name === FORM_AI_NAMES.ACTION_GENERATE_SUMMARY);
        if (row?.button_label_fa) setAiActionLabel(String(row.button_label_fa));
      })
      .catch(() => {});
  }, [allowed]);

  /** محاسبه بازه فعلی (آینه منطق سرور؛ مرجع نهایی سمت سرور است) */
  const resolvedPeriod = useMemo(() => {
    if (periodMode === "custom") {
      const s = jalaliStr(customStart);
      const e = jalaliStr(customEnd);
      if (!s || !e) return null;
      return { kind: "custom", start: s, end: e };
    }
    if (!endDate) return null;
    const end = new DateObject(endDate);
    let start = new DateObject(endDate);
    if (periodKind === "daily") start = new DateObject(endDate);
    else if (periodKind === "weekly") start = start.subtract(6, "days");
    else if (periodKind === "monthly") start = start.subtract(1, "months").add(1, "days");
    else if (periodKind === "semi_annual") start = start.subtract(6, "months").add(1, "days");
    else if (periodKind === "annual") start = start.subtract(1, "years").add(1, "days");
    return { kind: periodKind, start: jalaliStr(start), end: jalaliStr(end) };
  }, [periodMode, periodKind, endDate, customStart, customEnd]);

  const dayCount = useMemo(() => {
    if (!resolvedPeriod) return null;
    try {
      const s = new DateObject({ date: resolvedPeriod.start, format: "YYYY-MM-DD", calendar: persian });
      const e = new DateObject({ date: resolvedPeriod.end, format: "YYYY-MM-DD", calendar: persian });
      return Math.round((e.toUnix() - s.toUnix()) / 86400) + 1;
    } catch {
      return null;
    }
  }, [resolvedPeriod]);

  const buildRangePart = (start, end, days) => {
    if (start === end || days === 1) return `برای یک روز (${faSlash(start)})`;
    return `از ${faSlash(start)} تا ${faSlash(end)}`;
  };

  const onlyGeneralDomain =
    classifications.length === 1 && classifications[0] === "1";
  const showProvinceFilter =
    !onlyGeneralDomain && (!classifications.length || classifications.includes("2"));
  const showUnitFilter =
    !onlyGeneralDomain &&
    (!classifications.length || classifications.includes("3") || classifications.includes("4"));

  /** زیرعنوان زنده (هم‌راستا با buildSubtitle سرور و resolveFilters) */
  const liveSubtitle = useMemo(() => {
    if (!resolvedPeriod) return "";
    const topicsPart = topics.length ? faJoin(topics) : "همه موضوعات";
    const kindPart =
      resolvedPeriod.kind === "custom" ? "گزارش‌های بازه دلخواه" : `گزارش‌های ${KIND_FA[resolvedPeriod.kind]}`;
    const rangePart = buildRangePart(resolvedPeriod.start, resolvedPeriod.end, dayCount);

    let scopePart;
    if (onlyGeneralDomain) {
      scopePart = "دامنه عمومی (کل کشور)";
    } else {
      const scopeBits = [];
      if (classifications.length) {
        const labels = classifications.map((c) => CLASSIFICATION_FA[c]).filter(Boolean);
        if (labels.length) scopeBits.push(`دامنه ${faJoin(labels)}`);
      }
      if (showProvinceFilter) {
        if (provinces.length) {
          scopeBits.push(`برای ${provinces.length > 1 ? "استان‌های" : "استان"} ${faJoin(provinces)}`);
        } else if (classifications.includes("2") || !classifications.length) {
          scopeBits.push("برای همه استان‌ها");
        }
      }
      if (showUnitFilter) {
        const names = units.map((u) => unitOptions.find((o) => o.value === u)?.label || u);
        if (names.length) {
          scopeBits.push(`برای ${names.length > 1 ? "یگان‌های" : "یگان"} ${faJoin(names)}`);
        } else {
          scopeBits.push("برای همه یگان‌ها");
        }
      }
      scopePart = scopeBits.length ? scopeBits.join(" ") : "برای همه دامنه‌ها";
    }
    return `بررسی ${topicsPart} ${kindPart} ${rangePart} ${scopePart}`;
  }, [
    resolvedPeriod,
    topics,
    classifications,
    provinces,
    units,
    unitOptions,
    dayCount,
    onlyGeneralDomain,
    showProvinceFilter,
    showUnitFilter,
  ]);

  /** بدنه درخواست فیلترها برای سرور */
  const buildFilterPayload = () => {
    if (!resolvedPeriod) return null;
    const clsNums = classifications.map((c) => parseInt(c, 10)).filter((n) => [1, 2, 3, 4].includes(n));
    let summary_type = "provincial";
    let provincesPayload = [];
    let unit_codes = [];
    if (clsNums.length === 1 && clsNums[0] === 1) {
      summary_type = "general";
    } else {
      if (showProvinceFilter) provincesPayload = provinces;
      if (showUnitFilter) unit_codes = units;
      if (unit_codes.length) summary_type = "special";
      else if (provincesPayload.length || clsNums.includes(2)) summary_type = "provincial";
      else if (clsNums.some((c) => c === 3 || c === 4)) summary_type = "special";
    }
    return {
      summary_type,
      period_kind: resolvedPeriod.kind,
      period_start: resolvedPeriod.kind === "custom" ? resolvedPeriod.start : undefined,
      period_end: resolvedPeriod.end,
      provinces: provincesPayload,
      unit_codes,
      topics,
      classifications: clsNums,
      only_verified: onlyVerified,
    };
  };

  // تغییر فیلترها پیش‌نمایش و متادیتای AI را باطل می‌کند
  useEffect(() => {
    setPreview(null);
    setDraftMeta(null);
    setExpandedReport(null);
  }, [periodMode, periodKind, endDate, customStart, customEnd, provinces, units, topics, classifications, onlyVerified]);

  useEffect(() => {
    if (!titleTouchedRef.current) {
      const s = (liveSubtitle || "").trim().slice(0, 480);
      if (s) setTitle(s);
    }
  }, [liveSubtitle]);

  const runPreview = async () => {
    const payload = buildFilterPayload();
    if (!payload) {
      setErr("بازه گزارش را کامل انتخاب کنید");
      return;
    }
    setBusy(true);
    setErr("");
    try {
      const data = await managementSummaryService.previewReports(payload);
      setPreview(data);
    } catch (e) {
      setErr(e.response?.data?.error || e.message);
    } finally {
      setBusy(false);
    }
  };

  const runAiDraft = async () => {
    const payload = buildFilterPayload();
    if (!payload) {
      setErr("بازه گزارش را کامل انتخاب کنید");
      return;
    }
    setAiBusy(true);
    setErr("");
    try {
      const data = await runFormAiAction({
        form_name: FORM_AI_NAMES.FIELD_MANAGEMENT_SUMMARY_CREATE,
        action_name: FORM_AI_NAMES.ACTION_GENERATE_SUMMARY,
        form_data: payload,
      });
      const rawDraft = data.draft || data.result_text || "";
      const html = aiMarkdownToHtml(rawDraft);
      setSummaryBody(html || String(rawDraft).replace(/\n/g, "<br/>"));
      setDraftMeta({
        hash_keys: data.hash_keys,
        prompt_key_used: data.prompt_key_used,
        ai_usage_key_used: data.ai_usage_key_used,
        ai_config_id_used: data.ai_config_id_used,
      });
    } catch (e) {
      setErr(e.response?.data?.error || e.message);
    } finally {
      setAiBusy(false);
    }
  };

  const save = async () => {
    const payload = buildFilterPayload();
    if (!payload) {
      setErr("بازه گزارش را کامل انتخاب کنید");
      return;
    }
    if (!stripHtml(summaryBody).trim()) {
      setErr("متن خلاصه الزامی است");
      return;
    }
    if (!title.trim()) {
      setErr("عنوان خلاصه را وارد کنید (ترجیحاً کوتاه و موجز)");
      return;
    }
    setBusy(true);
    setErr("");
    try {
      const result = await managementSummaryService.create({
        ...payload,
        title: title.trim(),
        summary_body: summaryBody,
        hash_keys: draftMeta?.hash_keys || preview?.hash_keys,
        prompt_key_used: draftMeta?.prompt_key_used,
        ai_usage_key_used: draftMeta?.ai_usage_key_used,
        ai_config_id_used: draftMeta?.ai_config_id_used,
      });
      setSavedSummary(result);
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (e) {
      setErr(e.response?.data?.error || e.message);
    } finally {
      setBusy(false);
    }
  };

  const doExport = async (format) => {
    if (!savedSummary?.id) return;
    setExportBusy(true);
    setErr("");
    try {
      await managementSummaryService.downloadExport(savedSummary.id, format, withReports);
    } catch (e) {
      setErr(e.response?.data?.error || e.message);
    } finally {
      setExportBusy(false);
    }
  };

  const doPrint = async () => {
    if (!savedSummary?.id) return;
    setExportBusy(true);
    setErr("");
    try {
      const detail = await managementSummaryService.getById(savedSummary.id);
      const s = detail.summary;
      const refs = withReports ? detail.refs || [] : [];
      const esc = (v) => String(v ?? "").replace(/</g, "&lt;");
      const refsHtml = refs.length
        ? `<h3>فهرست گزارش‌های مرجع</h3>
           <table><thead><tr><th>ردیف</th><th>تاریخ</th><th>یگان</th><th>موضوع</th><th>عنوان</th><th>وضعیت</th></tr></thead>
           <tbody>${refs
             .map(
               (r, i) =>
                 `<tr><td>${toPersianDigits(i + 1)}</td><td>${faSlash(r.date)}</td><td>${esc(r.UnitName || r.UnitShortName)}</td><td>${esc(r.chat_title)}</td><td>${esc(r.title)}</td><td>${esc(STATE_FA[r.state] || r.state)}</td></tr>`,
             )
             .join("")}</tbody></table>`
        : "";
      const html = `<!DOCTYPE html><html dir="rtl"><head><meta charset="utf-8"><title>خلاصه مدیریتی</title>
        <style>body{font-family:Tahoma,Arial,sans-serif;padding:18px;} table{width:100%;border-collapse:collapse;margin-top:8px;} th,td{border:1px solid #333;padding:6px;font-size:12px;} h2{margin-bottom:4px;} .meta{font-size:13px;margin:2px 0;} .body{margin-top:14px;line-height:1.9;}</style></head><body>
        <h2>خلاصه مدیریتی گزارشات میدانی</h2>
        <p class="meta"><b>عنوان:</b> ${esc(s.title)}</p>
        <p class="meta"><b>بازه:</b> ${faSlash(s.period_start)} تا ${faSlash(s.period_end)} | <b>تعداد گزارشات:</b> ${toPersianDigits(s.report_count)}</p>
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

  const startNewSummary = () => {
    setSavedSummary(null);
    setPreview(null);
    setDraftMeta(null);
    setExpandedReport(null);
    setSummaryBody("");
    setTitle("");
    titleTouchedRef.current = false;
    setWithReports(true);
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

  return (
    <FormPageLayout
      title="خلاصه مدیریتی گزارشات میدانی"
      documentTitle="خلاصه مدیریتی میدانی"
      contentPadding="20px"
      toolbarExtra={(
        <button type="button" style={btn()} onClick={() => navigate("/field-management-summary/list")}>
          <ListOrdered size={17} />
          گزارشات قبلی
        </button>
      )}
    >
      {savedSummary ? (
        <div style={{
          ...panel,
          borderColor: isDarkMode ? "rgba(34,197,94,0.45)" : "rgba(34,197,94,0.5)",
          background: isDarkMode ? "rgba(34,197,94,0.08)" : "rgba(34,197,94,0.1)",
        }}
        >
          <strong style={{ fontSize: 15, color: isDarkMode ? "#86efac" : "#15803d" }}>خلاصه با موفقیت ثبت شد</strong>
          <p style={{ margin: "8px 0", fontSize: 13, lineHeight: 1.8 }}>
            شناسه {toPersianDigits(savedSummary.id)} — {savedSummary.title}
          </p>
          <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 14, fontSize: 13 }}>
            <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer" }}>
              <input type="radio" name="withReportsCreate" checked={withReports} onChange={() => setWithReports(true)} />
              همراه با لیست گزارشات
            </label>
            <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer" }}>
              <input type="radio" name="withReportsCreate" checked={!withReports} onChange={() => setWithReports(false)} />
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
            <button type="button" style={btn()} onClick={startNewSummary}>
              ایجاد خلاصه جدید
            </button>
          </div>
        </div>
      ) : null}

      {err ? <div style={{ color: theme.danger || "#dc2626", marginBottom: 12 }}>{err}</div> : null}

      {!savedSummary ? (
      <>
      {/* انتخاب بازه */}
      <div style={panel}>
        <div style={{ display: "flex", alignItems: "center", gap: 14, flexWrap: "wrap", marginBottom: 12 }}>
          <strong style={{ fontSize: 14 }}>بازه گزارش</strong>
          <div style={{ display: "inline-flex", borderRadius: 10, overflow: "hidden", border: `1px solid ${theme.border}` }}>
            <button
              type="button"
              onClick={() => setPeriodMode("auto")}
              style={{
                ...btn(periodMode === "auto" ? "primary" : "ghost"),
                borderRadius: 0,
                border: "none",
              }}
            >
              بازه خودکار
            </button>
            <button
              type="button"
              onClick={() => setPeriodMode("custom")}
              style={{
                ...btn(periodMode === "custom" ? "primary" : "ghost"),
                borderRadius: 0,
                border: "none",
              }}
            >
              بازه دلخواه
            </button>
          </div>
        </div>

        {periodMode === "auto" ? (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: 10 }}>
            <div>
              <label style={{ fontSize: 12, opacity: 0.8 }}>نوع گزارش (بازه)</label>
              <div style={{ fontSize: 11, opacity: 0.65, marginBottom: 4 }}>روزانه، هفتگی، ماهانه، شش‌ماهه یا سالانه</div>
              <select style={inp} value={periodKind} onChange={(e) => setPeriodKind(e.target.value)}>
                <option value="daily">روزانه</option>
                <option value="weekly">هفتگی</option>
                <option value="monthly">ماهانه</option>
                <option value="semi_annual">شش‌ماهه</option>
                <option value="annual">سالانه</option>
              </select>
            </div>
            <div>
              <label style={{ fontSize: 12, opacity: 0.8 }}>تاریخ پایان (شمسی)</label>
              <ThemedDatePicker
                value={endDate}
                onChange={setEndDate}
                calendar={persian}
                locale={persian_fa}
                calendarPosition="bottom-right"
                placeholder="انتخاب تاریخ پایان"
              />
            </div>
            <div>
              <label style={{ fontSize: 12, opacity: 0.8 }}>تاریخ شروع (محاسبه خودکار)</label>
              <div style={readOnlyBox}>
                {resolvedPeriod ? faSlash(resolvedPeriod.start) : "—"}
              </div>
            </div>
          </div>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: 10 }}>
            <div>
              <label style={{ fontSize: 12, opacity: 0.8 }}>از تاریخ (شمسی)</label>
              <ThemedDatePicker
                value={customStart}
                onChange={setCustomStart}
                calendar={persian}
                locale={persian_fa}
                calendarPosition="bottom-right"
                placeholder="از تاریخ"
              />
            </div>
            <div>
              <label style={{ fontSize: 12, opacity: 0.8 }}>تا تاریخ (شمسی)</label>
              <ThemedDatePicker
                value={customEnd}
                onChange={setCustomEnd}
                calendar={persian}
                locale={persian_fa}
                calendarPosition="bottom-right"
                placeholder="تا تاریخ"
              />
            </div>
          </div>
        )}

        {dayCount != null ? (
          <div style={{ marginTop: 10, fontSize: 12, opacity: 0.8 }}>
            تعداد روز بازه: <strong>{toPersianDigits(dayCount)}</strong> روز
          </div>
        ) : null}
      </div>

      {/* فیلترها */}
      <div style={panel}>
        <strong style={{ fontSize: 14, display: "block", marginBottom: 12 }}>فیلتر گزارشات</strong>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: 10 }}>
          <div>
            <label style={{ fontSize: 12, opacity: 0.8 }}>دامنه انتشار (چندانتخابی)</label>
            <MultiSelect
              options={CLASSIFICATION_OPTIONS}
              values={classifications}
              theme={theme}
              onChange={(vals) => {
                setClassifications(vals);
                if (vals.length === 1 && vals[0] === "1") {
                  setProvinces([]);
                  setUnits([]);
                } else {
                  if (!vals.includes("2")) setProvinces([]);
                  if (!vals.includes("3") && !vals.includes("4")) setUnits([]);
                }
              }}
              placeholder="همه دامنه‌ها"
            />
          </div>
          {showProvinceFilter ? (
            <div>
              <label style={{ fontSize: 12, opacity: 0.8 }}>استان‌ها (چندانتخابی)</label>
              <MultiSelect
                options={provinceOptions}
                values={provinces}
                theme={theme}
                onChange={setProvinces}
                placeholder="همه استان‌ها"
              />
            </div>
          ) : null}
          {showUnitFilter ? (
            <div>
              <label style={{ fontSize: 12, opacity: 0.8 }}>یگان (نام کوتاه، چندانتخابی)</label>
              <MultiSelect
                options={unitOptions}
                values={units}
                theme={theme}
                onChange={setUnits}
                placeholder="همه یگان‌ها"
              />
            </div>
          ) : null}
          <div>
            <label style={{ fontSize: 12, opacity: 0.8 }}>موضوعات (شایعات، نقاط قوت و...)</label>
            <MultiSelect
              options={topicOptions}
              values={topics}
              theme={theme}
              onChange={setTopics}
              placeholder="همه موضوعات"
            />
          </div>
          <label style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 20, fontSize: 13, cursor: "pointer" }}>
            <input type="checkbox" checked={onlyVerified} onChange={(e) => setOnlyVerified(e.target.checked)} />
            فقط گزارش‌های تاییدشده
          </label>
        </div>

        <div
          style={{
            marginTop: 14,
            padding: 10,
            borderRadius: 10,
            background: "rgba(14,165,233,0.08)",
            border: "1px dashed rgba(14,165,233,0.4)",
            fontSize: 13,
            lineHeight: 1.9,
          }}
        >
          <span style={{ opacity: 0.7, fontSize: 11, display: "block" }}>عنوان تولیدی</span>
          {liveSubtitle || "بازه گزارش را انتخاب کنید"}
        </div>

        <div style={{ marginTop: 12 }}>
          <button type="button" style={btn("primary")} disabled={busy} onClick={runPreview}>
            {busy ? <Loader2 size={15} style={{ animation: "spin 1s linear infinite" }} /> : <Search size={15} />}
            بررسی گزارشات
          </button>
          {preview ? (
            <span style={{ marginRight: 12, fontSize: 13, opacity: 0.85 }}>
              {toPersianDigits(preview.count)} گزارش در این بازه یافت شد
            </span>
          ) : null}
        </div>
      </div>

      {/* لیست گزارشات برای مطالعه */}
      {preview ? (
        <div style={panel}>
          <strong style={{ fontSize: 14, display: "block", marginBottom: 10 }}>
            گزارشات فیلترشده ({toPersianDigits(preview.count)})
          </strong>
          {preview.reports?.length ? (
            <div style={{ display: "flex", flexDirection: "column", gap: 8, maxHeight: 460, overflowY: "auto" }}>
              {preview.reports.map((r, i) => {
                const open = expandedReport === r.hash_key;
                return (
                  <div key={r.hash_key} style={nestedCard}>
                    <button
                      type="button"
                      onClick={() => setExpandedReport(open ? null : r.hash_key)}
                      style={{
                        width: "100%",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        gap: 8,
                        padding: "9px 12px",
                        background: "transparent",
                        border: "none",
                        color: theme.text,
                        cursor: "pointer",
                        fontFamily: "inherit",
                        fontSize: 13,
                        textAlign: "right",
                      }}
                    >
                      <span style={{ display: "flex", flexWrap: "wrap", gap: 10, alignItems: "center" }}>
                        <span style={{ opacity: 0.55, fontSize: 11 }}>{toPersianDigits(i + 1)}</span>
                        <span style={{ fontWeight: 700, color: isDarkMode ? "#fbbf24" : "#b45309", fontSize: 13 }}>
                          {r.UnitName || r.UnitShortName || "—"}
                        </span>
                        <span style={{ whiteSpace: "nowrap", fontSize: 12, opacity: 0.8 }}>{faSlash(r.date)}</span>
                        <span style={{ color: isDarkMode ? "#7dd3fc" : "#0369a1", fontSize: 12 }}>{r.chat_title}</span>
                        <span>{r.title}</span>
                        {r.StateName ? (
                          <span style={{ fontSize: 11, opacity: 0.65 }}>{r.StateName}</span>
                        ) : null}
                        <span style={{ fontSize: 11, opacity: 0.65 }}>{STATE_FA[r.state] || r.state}</span>
                      </span>
                      {open ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
                    </button>
                    {open ? (
                      <div
                        style={{
                          padding: "0 12px 12px",
                          fontSize: 13,
                          lineHeight: 1.95,
                          whiteSpace: "pre-wrap",
                          borderTop: tableRowBorder,
                        }}
                      >
                        <div style={{ fontSize: 11, opacity: 0.75, marginBottom: 6 }}>متن پاک‌سازی‌شده</div>
                        <div style={{ marginBottom: r.cleaned_text && r.raw_text ? 12 : 0 }}>
                          {r.cleaned_text || r.text || "متنی ثبت نشده است"}
                        </div>
                        {r.cleaned_text && r.raw_text ? (
                          <>
                            <div style={{ fontSize: 11, opacity: 0.75, marginBottom: 6 }}>متن خام (مقایسه)</div>
                            <div style={{ opacity: 0.88, fontSize: 12 }}>{r.raw_text}</div>
                          </>
                        ) : null}
                      </div>
                    ) : null}
                  </div>
                );
              })}
            </div>
          ) : (
            <div style={{ opacity: 0.65, fontSize: 13 }}>گزارشی با این فیلترها یافت نشد.</div>
          )}
        </div>
      ) : null}

      {/* نوشتن خلاصه */}
      <div style={panel}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 8, marginBottom: 10 }}>
          <strong style={{ fontSize: 14 }}>متن خلاصه مدیریتی</strong>
          <button type="button" style={btn("purple")} disabled={aiBusy} onClick={runAiDraft}>
            {aiBusy ? <Loader2 size={15} style={{ animation: "spin 1s linear infinite" }} /> : <Sparkles size={15} />}
            {aiActionLabel}
          </button>
        </div>
        <label style={{ fontSize: 12, opacity: 0.8 }}>عنوان خلاصه</label>
        <div style={{ fontSize: 11, opacity: 0.7, marginBottom: 4 }}>
          با تغییر فیلترها همان «عنوان تولیدی» بالا در این فیلد کپی می‌شود؛ اگر خودتان عنوان را عوض کنید، دیگر به‌صورت خودکار بازنویسی نمی‌شود.
        </div>
        <input
          style={{ ...inp, marginBottom: 12 }}
          value={title}
          maxLength={480}
          placeholder="خلاصه مدیریتی گزارشات میدانی"
          onChange={(e) => {
            titleTouchedRef.current = true;
            setTitle(clampText(e.target.value, 480));
          }}
        />
        <RichTextEditor
          value={summaryBody}
          onChange={setSummaryBody}
          maxLength={MANAGEMENT_SUMMARY_BODY_MAX}
          minHeight={240}
          isDarkMode={isDarkMode}
          placeholder="پس از مطالعه گزارشات، خلاصه مدیریتی را اینجا بنویسید..."
        />
        <div style={{ display: "flex", gap: 8, marginTop: 14, flexWrap: "wrap" }}>
          <button
            type="button"
            style={btn("primary")}
            disabled={busy || !stripHtml(summaryBody).trim() || Boolean(savedSummary)}
            onClick={save}
          >
            <Save size={15} />
            {busy ? "در حال ثبت..." : "ثبت خلاصه"}
          </button>
          {!savedSummary ? (
            <button type="button" style={btn()} onClick={() => navigate("/main")}>
              <X size={15} />
              انصراف
            </button>
          ) : null}
        </div>
      </div>
      </>
      ) : null}

      <style>{`@keyframes spin { from { transform: rotate(0deg);} to { transform: rotate(360deg);} }`}</style>
    </FormPageLayout>
  );
}
