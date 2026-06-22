import React, { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowRight, Sparkles, Save, X, Search, Loader2, ChevronDown, ChevronUp,
} from "lucide-react";
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

const inputStyle = {
  padding: "8px 10px",
  borderRadius: 8,
  background: "#1e293b",
  border: "1px solid #334155",
  color: "#e2e8f0",
  width: "100%",
  fontFamily: "inherit",
  boxSizing: "border-box",
};

const btnStyle = (variant = "ghost") => ({
  display: "inline-flex",
  alignItems: "center",
  gap: 6,
  padding: "8px 14px",
  borderRadius: 8,
  cursor: "pointer",
  fontFamily: "inherit",
  fontSize: 13,
  border: variant === "ghost" ? "1px solid #334155" : "none",
  background:
    variant === "primary" ? "#0ea5e9" : variant === "purple" ? "#7c3aed" : "#1e293b",
  color: variant === "ghost" ? "#e2e8f0" : "#fff",
});

const cardStyle = {
  border: "1px solid #334155",
  borderRadius: 12,
  background: "#111c2e",
  padding: 14,
  marginBottom: 14,
};

export default function FieldManagementSummaryCreate() {
  const navigate = useNavigate();
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
      await managementSummaryService.create({
        ...payload,
        title: title.trim(),
        summary_body: summaryBody,
        hash_keys: draftMeta?.hash_keys || preview?.hash_keys,
        prompt_key_used: draftMeta?.prompt_key_used,
        ai_usage_key_used: draftMeta?.ai_usage_key_used,
        ai_config_id_used: draftMeta?.ai_config_id_used,
      });
      navigate("/field-management-summary");
    } catch (e) {
      setErr(e.response?.data?.error || e.message);
    } finally {
      setBusy(false);
    }
  };

  if (!allowed) {
    return (
      <div style={{ padding: 24, textAlign: "center", color: "#e2e8f0", background: "#0f172a", minHeight: "100vh" }}>
        <p>دسترسی مجاز نیست.</p>
        <button type="button" style={btnStyle()} onClick={() => navigate("/main")}>
          بازگشت
        </button>
      </div>
    );
  }

  return (
    <div dir="rtl" style={{ minHeight: "100vh", background: "#0f172a", color: "#e2e8f0", padding: 20 }}>
      {/* هدر */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 10, marginBottom: 16 }}>
        <button type="button" style={btnStyle()} onClick={() => navigate("/field-management-summary")}>
          <ArrowRight size={18} />
          بازگشت به لیست
        </button>
        <h1 style={{ margin: 0, fontSize: 20 }}>ایجاد خلاصه مدیریتی جدید</h1>
        <span />
      </div>

      {err ? <div style={{ color: "#f87171", marginBottom: 12 }}>{err}</div> : null}

      {/* انتخاب بازه */}
      <div style={cardStyle}>
        <div style={{ display: "flex", alignItems: "center", gap: 14, flexWrap: "wrap", marginBottom: 12 }}>
          <strong style={{ fontSize: 14 }}>بازه گزارش</strong>
          <div style={{ display: "inline-flex", borderRadius: 10, overflow: "hidden", border: "1px solid #334155" }}>
            <button
              type="button"
              onClick={() => setPeriodMode("auto")}
              style={{
                ...btnStyle(periodMode === "auto" ? "primary" : "ghost"),
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
                ...btnStyle(periodMode === "custom" ? "primary" : "ghost"),
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
              <select style={inputStyle} value={periodKind} onChange={(e) => setPeriodKind(e.target.value)}>
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
              <div style={{ ...inputStyle, background: "#0d1626", opacity: 0.85 }}>
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
      <div style={cardStyle}>
        <strong style={{ fontSize: 14, display: "block", marginBottom: 12 }}>فیلتر گزارشات</strong>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: 10 }}>
          <div>
            <label style={{ fontSize: 12, opacity: 0.8 }}>دامنه انتشار (چندانتخابی)</label>
            <MultiSelect
              options={CLASSIFICATION_OPTIONS}
              values={classifications}
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
          <button type="button" style={btnStyle("primary")} disabled={busy} onClick={runPreview}>
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
        <div style={cardStyle}>
          <strong style={{ fontSize: 14, display: "block", marginBottom: 10 }}>
            گزارشات فیلترشده ({toPersianDigits(preview.count)})
          </strong>
          {preview.reports?.length ? (
            <div style={{ display: "flex", flexDirection: "column", gap: 8, maxHeight: 460, overflowY: "auto" }}>
              {preview.reports.map((r, i) => {
                const open = expandedReport === r.hash_key;
                return (
                  <div key={r.hash_key} style={{ border: "1px solid #28395a", borderRadius: 10, background: "#0d1626" }}>
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
                        color: "#e2e8f0",
                        cursor: "pointer",
                        fontFamily: "inherit",
                        fontSize: 13,
                        textAlign: "right",
                      }}
                    >
                      <span style={{ display: "flex", flexWrap: "wrap", gap: 10, alignItems: "center" }}>
                        <span style={{ opacity: 0.55, fontSize: 11 }}>{toPersianDigits(i + 1)}</span>
                        <span style={{ fontWeight: 700, color: "#fbbf24", fontSize: 13 }}>
                          {r.UnitName || r.UnitShortName || "—"}
                        </span>
                        <span style={{ whiteSpace: "nowrap", fontSize: 12, opacity: 0.8 }}>{faSlash(r.date)}</span>
                        <span style={{ color: "#7dd3fc", fontSize: 12 }}>{r.chat_title}</span>
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
                          borderTop: "1px solid #1f2c44",
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
      <div style={cardStyle}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 8, marginBottom: 10 }}>
          <strong style={{ fontSize: 14 }}>متن خلاصه مدیریتی</strong>
          <button type="button" style={btnStyle("purple")} disabled={aiBusy} onClick={runAiDraft}>
            {aiBusy ? <Loader2 size={15} style={{ animation: "spin 1s linear infinite" }} /> : <Sparkles size={15} />}
            {aiActionLabel}
          </button>
        </div>
        <label style={{ fontSize: 12, opacity: 0.8 }}>عنوان خلاصه</label>
        <div style={{ fontSize: 11, opacity: 0.7, marginBottom: 4 }}>
          با تغییر فیلترها همان «عنوان تولیدی» بالا در این فیلد کپی می‌شود؛ اگر خودتان عنوان را عوض کنید، دیگر به‌صورت خودکار بازنویسی نمی‌شود.
        </div>
        <input
          style={{ ...inputStyle, marginBottom: 12 }}
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
          placeholder="پس از مطالعه گزارشات، خلاصه مدیریتی را اینجا بنویسید..."
        />
        <div style={{ display: "flex", gap: 8, marginTop: 14 }}>
          <button
            type="button"
            style={btnStyle("primary")}
            disabled={busy || !stripHtml(summaryBody).trim()}
            onClick={save}
          >
            <Save size={15} />
            {busy ? "در حال ثبت..." : "ثبت"}
          </button>
          <button type="button" style={btnStyle()} onClick={() => navigate("/field-management-summary")}>
            <X size={15} />
            انصراف
          </button>
        </div>
      </div>

      <style>{`@keyframes spin { from { transform: rotate(0deg);} to { transform: rotate(360deg);} }`}</style>
    </div>
  );
}
