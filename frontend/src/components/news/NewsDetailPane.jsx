import React, { useEffect, useState } from "react";
import {
  ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight,
  Save, Copy, Trash2,
} from "lucide-react";
import RichTextEditor from "../analysis/RichTextEditor.jsx";
import NewsFormatPreviewModal from "./NewsFormatPreviewModal.jsx";
import NewsFormatExportMenu from "./NewsFormatExportMenu.jsx";
import { FORMAT } from "../../utils/newsFormat/index.js";
import { getNewsDisplayStatus } from "../../utils/newsDisplayStatus.js";
import { NEWS_FIELD_LIMITS, validateHighPrioritySummaryRequired, DEFAULT_SUMMARIZE_CHAR_THRESHOLD } from "../../constants/newsFieldLimits.js";
import {
  NEWS_EDITOR_BOX_HEIGHT,
  NEWS_EDITOR_MOBILE_BOX_HEIGHT,
} from "../../constants/newsEditorLayout.js";
import { toPersianDigits } from "../../utils/analysisMonitorUtils.js";
import { pxToEm } from "../../utils/pageFontSize.js";
import { useAppTheme } from "../../context/ThemeContext.jsx";
import { useNewsEditorForm } from "./NewsEditorFormContext.jsx";
import NewsChiefActionButtons from "./NewsChiefActionButtons.jsx";
import newsMonitorService from "../../services/newsMonitorService.js";

export default function NewsDetailPane({
  onNavigate,
  onSave,
  onFinalize,
  onFinalizePublish,
  onFinalizeBank,
  onChiefReject,
  onToggleDuplicate,
  onDelete,
  saving,
  theme,
  isMobile,
}) {
  const { isDarkMode } = useAppTheme();
  const [previewFormat, setPreviewFormat] = useState(null);
  const [advanceAfterSave, setAdvanceAfterSave] = useState(true);
  const [summarizeThreshold, setSummarizeThreshold] = useState(DEFAULT_SUMMARIZE_CHAR_THRESHOLD);
  const {
    item, items, index, total, form, set, buildPayload, canEdit, canFinalize, canDelete,
  } = useNewsEditorForm();

  useEffect(() => {
    let cancelled = false;
    newsMonitorService.entrySettings().then((s) => {
      if (cancelled) return;
      const n = Number(s?.summarize_char_threshold);
      if (Number.isFinite(n) && n >= 50) setSummarizeThreshold(n);
    }).catch(() => {});
    return () => { cancelled = true; };
  }, []);

  const editorBoxH = isMobile ? NEWS_EDITOR_MOBILE_BOX_HEIGHT : NEWS_EDITOR_BOX_HEIGHT;

  if (!item || !form) {
    return (
      <div style={{
        flex: 1,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        opacity: 0.6,
        fontSize: pxToEm(14),
        padding: 24,
        background: theme.card,
        borderRadius: 12,
        border: `1px solid ${theme.border}`,
        height: "100%",
      }}
      >
        یک خبر از لیست انتخاب کنید.
      </div>
    );
  }

  const { primaryLabel, primaryColor, secondaryTags } = getNewsDisplayStatus(item);
  const navTotal = Math.max(total ?? 0, items.length);
  const atStart = index <= 0;
  const atEnd = index >= items.length - 1;
  const canToggleDuplicate = item.duplicate_status !== "confirmed";

  const dateStr = toPersianDigits(String(item.source_date_jalali || "").replace(/-/g, "/"));
  const timeStr = toPersianDigits(item.source_time_hm || "");
  const dateTimeStr = [dateStr, timeStr].filter(Boolean).join(" ");

  const handleSave = async (advance = false) => {
    const payload = buildPayload();
    const summaryErr = validateHighPrioritySummaryRequired(payload, summarizeThreshold);
    if (summaryErr) {
      window.alert(summaryErr);
      return;
    }
    await onSave(item.id, payload, advance);
  };

  const handleDelete = async () => {
    if (!window.confirm("این خبر به‌صورت منطقی حذف شود؟ (قابل بازیابی از پایگاه نیست در رابط کاربری)")) return;
    await onDelete?.(item.id);
  };

  const navBtn = (disabled, onClick, children, primary = false) => (
    <button
      type="button"
      disabled={disabled || saving}
      onClick={onClick}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 3,
        padding: isMobile ? "5px 7px" : "4px 8px",
        borderRadius: 6,
        border: primary ? "none" : `1px solid ${theme.border}`,
        background: primary ? "#0ea5e9" : theme.card,
        color: primary ? "#fff" : theme.text,
        cursor: disabled ? "not-allowed" : "pointer",
        fontFamily: "inherit",
        fontSize: pxToEm(10),
        minHeight: isMobile ? "1.9em" : "1.85em",
        opacity: disabled ? 0.45 : 1,
      }}
    >
      {children}
    </button>
  );

  const iconBtn = (disabled, onClick, title, icon, opts = {}) => {
    const { primary, danger, warn, active } = opts;
    let bg = theme.card;
    let color = theme.text;
    let border = `1px solid ${theme.border}`;
    if (primary) { bg = "#0ea5e9"; color = "#fff"; border = "none"; }
    if (danger) { bg = "rgba(239,68,68,0.12)"; color = "#f87171"; border = "1px solid rgba(239,68,68,0.4)"; }
    if (warn) { bg = active ? "rgba(245,158,11,0.28)" : "transparent"; color = active ? "#fbbf24" : theme.text; border = active ? "1px solid #f59e0b" : `1px solid ${theme.border}`; }
    const size = isMobile ? 28 : 32;
    return (
      <button
        type="button"
        title={title}
        aria-label={title}
        disabled={disabled || saving}
        onClick={onClick}
        style={{
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          width: size,
          height: size,
          padding: 0,
          borderRadius: 8,
          border,
          background: bg,
          color,
          cursor: disabled ? "not-allowed" : "pointer",
          fontFamily: "inherit",
          flexShrink: 0,
          opacity: disabled ? 0.45 : 1,
        }}
      >
        {icon}
      </button>
    );
  };

  const badge = (text, bg, color, extra = {}) => (
    <span
      style={{
        fontSize: pxToEm(10),
        padding: "0.12em 0.45em",
        borderRadius: 6,
        background: bg,
        color,
        whiteSpace: "nowrap",
        flexShrink: 0,
        ...extra,
      }}
    >
      {text}
    </span>
  );

  return (
    <div
      dir="rtl"
      className="news-detail-pane"
      style={{
        display: "flex",
        flexDirection: "column",
        height: isMobile ? "auto" : "100%",
        minHeight: 0,
        background: theme.card,
        borderRadius: isMobile ? 10 : 12,
        border: `1px solid ${theme.border}`,
        overflow: "hidden",
      }}
    >
      <header style={{ padding: isMobile ? "4px 6px" : "8px 12px", borderBottom: `1px solid ${theme.border}`, flexShrink: 0 }}>
        {isMobile ? (
          <>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 3, alignItems: "center", marginBottom: 2 }}>
              {badge(primaryLabel, `${primaryColor}22`, primaryColor, { fontWeight: 600 })}
              {badge(`#${toPersianDigits(item.id)}`, "rgba(148,163,184,0.15)", theme.text)}
              {dateTimeStr ? badge(dateTimeStr, "rgba(56,189,248,0.12)", "#7dd3fc") : null}
              {secondaryTags.filter((t) => t.label.includes("تکرار") || t.label.includes("مشکوک")).map((t) => (
                <React.Fragment key={t.label}>{badge(t.label, `${t.color}22`, t.color, { fontWeight: 600 })}</React.Fragment>
              ))}
            </div>
            <div
              style={{
                fontSize: pxToEm(9),
                opacity: 0.8,
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}
              title={[item.source, item.sender || item.observer_first_name].filter(Boolean).join(" · ")}
            >
              {item.source || "—"}
              {item.sender || item.observer_first_name ? ` · ${item.sender || item.observer_first_name}` : ""}
            </div>
          </>
        ) : (
          <>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 4 }}>
              {badge(primaryLabel, `${primaryColor}22`, primaryColor, { fontWeight: 600 })}
              {badge(`#${toPersianDigits(item.id)}`, "rgba(148,163,184,0.15)", theme.text)}
              {secondaryTags.filter((t) => t.label.includes("تکرار") || t.label.includes("مشکوک")).map((t) => (
                <React.Fragment key={t.label}>{badge(t.label, `${t.color}22`, t.color, { fontWeight: 600 })}</React.Fragment>
              ))}
            </div>
            <div style={{ fontSize: pxToEm(11), opacity: 0.8, textAlign: "justify" }}>
              {item.source} · {item.sender || item.observer_first_name || "—"} · {dateTimeStr}
            </div>
          </>
        )}
      </header>

      <div
        style={{
          flex: isMobile ? "0 0 auto" : 1,
          minHeight: 0,
          display: "flex",
          flexDirection: "column",
          padding: isMobile ? "4px 6px" : "8px 10px",
          overflow: "hidden",
        }}
      >
        {!isMobile ? (
          <label style={{ fontSize: pxToEm(12), fontWeight: 600, marginBottom: 6, display: "block", flexShrink: 0 }}>
            متن خبر برای انتشار
          </label>
        ) : null}
        {canEdit ? (
          <div
            className="news-editor-resize-wrap"
            style={{
              flex: 1,
              minHeight: 0,
              maxHeight: editorBoxH,
              display: "flex",
              flexDirection: "column",
              overflow: "hidden",
            }}
          >
            <RichTextEditor
              value={form.cleaned_text}
              onChange={(html) => set("cleaned_text", html)}
              isDarkMode={isDarkMode}
              minHeight={120}
              fillContainer
              maxLength={NEWS_FIELD_LIMITS.cleanedText}
              placeholder="متن را ویرایش کنید..."
              allowFullscreen
              allowSourceView
              resizable={false}
            />
          </div>
        ) : (
          <div
            className="rich-text-content news-text-justify page-scalable-text"
            style={{
              flex: 1,
              minHeight: 0,
              maxHeight: editorBoxH,
              overflowY: "auto",
              lineHeight: 1.9,
            }}
            dangerouslySetInnerHTML={{ __html: form.cleaned_text }}
          />
        )}
      </div>

      <footer
        style={{
          padding: isMobile ? "3px 5px 5px" : "5px 8px",
          borderTop: `1px solid ${theme.border}`,
          display: "flex",
          flexDirection: "column",
          gap: isMobile ? 3 : 4,
          flexShrink: 0,
          background: theme.card,
        }}
      >
        {isMobile ? (
          <>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 2 }}>
              {iconBtn(atStart, () => onNavigate(0), "اولین خبر", <ChevronsRight size={14} />)}
              {iconBtn(atStart, () => onNavigate(index - 1), "خبر قبلی", <ChevronRight size={14} />)}
              <span style={{ fontSize: pxToEm(10), fontWeight: 700, whiteSpace: "nowrap", minWidth: 44, textAlign: "center" }}>
                {toPersianDigits(index + 1)}/{toPersianDigits(navTotal)}
              </span>
              {iconBtn(atEnd, () => onNavigate(index + 1), "خبر بعدی", <ChevronLeft size={14} />)}
              {iconBtn(atEnd, () => onNavigate(items.length - 1), "آخرین خبر", <ChevronsLeft size={14} />)}
              {canDelete ? iconBtn(false, handleDelete, "حذف", <Trash2 size={14} />, { danger: true }) : null}
              {canFinalize && item.workflow_status === "reviewed" ? (
                <NewsChiefActionButtons
                  item={item}
                  theme={theme}
                  busy={saving}
                  compact={isMobile}
                  onFinalizeReturn={onFinalize}
                  onFinalizePublish={onFinalizePublish}
                  onFinalizeBank={onFinalizeBank}
                  onChiefReject={onChiefReject}
                />
              ) : null}
              <NewsFormatExportMenu
                compact
                theme={theme}
                onSelect={setPreviewFormat}
              />
            </div>

            {canEdit ? (
              <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                <label
                  title="متن خبر، خلاصه، حکم، اهمیت، کیفیت و دسته‌بندی ذخیره می‌شود"
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 3,
                    fontSize: pxToEm(9),
                    cursor: "pointer",
                    userSelect: "none",
                    whiteSpace: "nowrap",
                    flexShrink: 0,
                    opacity: 0.9,
                  }}
                >
                  <input
                    type="checkbox"
                    checked={advanceAfterSave}
                    onChange={(e) => setAdvanceAfterSave(e.target.checked)}
                    style={{ width: 13, height: 13, accentColor: "#0ea5e9", margin: 0 }}
                  />
                  خبر بعدی
                </label>
                <button
                  type="button"
                  disabled={saving}
                  title="متن خبر، خلاصه، حکم، اهمیت، کیفیت و دسته‌بندی ذخیره می‌شود"
                  onClick={() => handleSave(advanceAfterSave)}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 4,
                    flex: 1,
                    padding: "5px 8px",
                    borderRadius: 6,
                    border: "none",
                    background: "#0ea5e9",
                    color: "#fff",
                    cursor: saving ? "wait" : "pointer",
                    fontFamily: "inherit",
                    fontSize: pxToEm(11),
                    fontWeight: 700,
                    opacity: saving ? 0.7 : 1,
                    minHeight: 30,
                  }}
                >
                  <Save size={13} />
                  ثبت تغییرات
                </button>
              </div>
            ) : null}
          </>
        ) : (
          <>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 4, justifyContent: "center", alignItems: "center" }}>
              {navBtn(atStart, () => onNavigate(0), <><ChevronsRight size={14} /> اول</>)}
              {navBtn(atStart, () => onNavigate(index - 1), <><ChevronRight size={14} /> قبلی</>)}
              <span style={{ fontSize: pxToEm(11), fontWeight: 600, padding: "0 0.25em" }}>
                {toPersianDigits(index + 1)} از {toPersianDigits(navTotal)}
              </span>
              {navBtn(atEnd, () => onNavigate(index + 1), <>بعدی <ChevronLeft size={14} /></>)}
              {navBtn(atEnd, () => onNavigate(items.length - 1), <>آخر <ChevronsLeft size={14} /></>)}
            </div>

            <div style={{ display: "flex", flexWrap: "wrap", gap: 4, justifyContent: "center", alignItems: "center" }}>
              {canEdit ? (
                <>
                  <label
                    title="متن خبر، خلاصه، حکم، اهمیت، کیفیت و دسته‌بندی ذخیره می‌شود"
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 5,
                      fontSize: pxToEm(10),
                      cursor: "pointer",
                      userSelect: "none",
                      whiteSpace: "nowrap",
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={advanceAfterSave}
                      onChange={(e) => setAdvanceAfterSave(e.target.checked)}
                      style={{ width: 14, height: 14, accentColor: "#0ea5e9", margin: 0 }}
                    />
                    بعد از ثبت، خبر بعدی
                  </label>
                  <button
                    type="button"
                    disabled={saving}
                    title="متن خبر، خلاصه، حکم، اهمیت، کیفیت و دسته‌بندی ذخیره می‌شود"
                    onClick={() => handleSave(advanceAfterSave)}
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: 5,
                      padding: "5px 12px",
                      borderRadius: 6,
                      border: "none",
                      background: "#0ea5e9",
                      color: "#fff",
                      cursor: saving ? "wait" : "pointer",
                      fontFamily: "inherit",
                      fontSize: pxToEm(11),
                      fontWeight: 700,
                      opacity: saving ? 0.7 : 1,
                      minHeight: 30,
                    }}
                  >
                    <Save size={13} />
                    ثبت تغییرات
                  </button>
                </>
              ) : null}
              {canEdit && canToggleDuplicate ? (
                <button
                  type="button"
                  disabled={saving}
                  onClick={() => onToggleDuplicate?.(item.id, item.duplicate_status === "suspicious")}
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 3,
                    padding: "4px 8px",
                    borderRadius: 6,
                    border: item.duplicate_status === "suspicious" ? "1px solid #f59e0b" : `1px solid ${theme.border}`,
                    background: item.duplicate_status === "suspicious" ? "rgba(245,158,11,0.25)" : "transparent",
                    color: item.duplicate_status === "suspicious" ? "#fbbf24" : theme.text,
                    cursor: "pointer",
                    fontFamily: "inherit",
                    fontSize: pxToEm(10),
                    minHeight: 30,
                    fontWeight: item.duplicate_status === "suspicious" ? 700 : 400,
                  }}
                >
                  <Copy size={12} />
                  {item.duplicate_status === "suspicious" ? "مشکوک به تکرار ✓" : "مشکوک به تکرار"}
                </button>
              ) : null}
              {canDelete ? (
                <button
                  type="button"
                  disabled={saving}
                  onClick={handleDelete}
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 3,
                    padding: "4px 8px",
                    borderRadius: 6,
                    border: "1px solid rgba(239,68,68,0.45)",
                    background: "rgba(239,68,68,0.1)",
                    color: "#f87171",
                    cursor: "pointer",
                    fontFamily: "inherit",
                    fontSize: pxToEm(10),
                    minHeight: 30,
                  }}
                >
                  <Trash2 size={12} /> حذف
                </button>
              ) : null}
              {canFinalize && item.workflow_status === "reviewed" ? (
                <NewsChiefActionButtons
                  item={item}
                  theme={theme}
                  busy={saving}
                  compact
                  onFinalizeReturn={onFinalize}
                  onFinalizePublish={onFinalizePublish}
                  onFinalizeBank={onFinalizeBank}
                  onChiefReject={onChiefReject}
                />
              ) : null}
              <NewsFormatExportMenu theme={theme} onSelect={setPreviewFormat} />
            </div>
          </>
        )}
      </footer>

      <NewsFormatPreviewModal
        open={!!previewFormat}
        onClose={() => setPreviewFormat(null)}
        htmlSource={form.cleaned_text}
        format={previewFormat}
        theme={theme}
      />
    </div>
  );
}
