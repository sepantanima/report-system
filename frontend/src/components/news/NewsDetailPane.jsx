import React, { useState } from "react";
import {
  ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight,
  Save, Copy, CheckCircle, Trash2, SkipForward,
} from "lucide-react";
import RichTextEditor from "../analysis/RichTextEditor.jsx";
import NewsFormatPreviewModal from "./NewsFormatPreviewModal.jsx";
import NewsFormatExportMenu from "./NewsFormatExportMenu.jsx";
import { FORMAT } from "../../utils/newsFormat/index.js";
import { getNewsDisplayStatus } from "../../utils/newsDisplayStatus.js";
import { NEWS_FIELD_LIMITS } from "../../constants/newsFieldLimits.js";
import {
  NEWS_EDITOR_BODY_HEIGHT,
  NEWS_EDITOR_BOX_HEIGHT,
  NEWS_EDITOR_MOBILE_BODY_HEIGHT,
  NEWS_EDITOR_MOBILE_BOX_HEIGHT,
} from "../../constants/newsEditorLayout.js";
import { toPersianDigits } from "../../utils/analysisMonitorUtils.js";
import { pxToEm } from "../../utils/pageFontSize.js";
import { useAppTheme } from "../../context/ThemeContext.jsx";
import { useNewsEditorForm } from "./NewsEditorFormContext.jsx";

export default function NewsDetailPane({
  onNavigate,
  onSave,
  onFinalize,
  onToggleDuplicate,
  onDelete,
  saving,
  theme,
  isMobile,
}) {
  const { isDarkMode } = useAppTheme();
  const [previewFormat, setPreviewFormat] = useState(null);
  const {
    item, items, index, form, set, buildPayload, canEdit, canFinalize, canDelete,
  } = useNewsEditorForm();

  const editorBodyH = isMobile ? NEWS_EDITOR_MOBILE_BODY_HEIGHT : NEWS_EDITOR_BODY_HEIGHT;
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
  const total = items.length;
  const atStart = index <= 0;
  const atEnd = index >= total - 1;
  const canToggleDuplicate = item.duplicate_status !== "confirmed";

  const dateStr = toPersianDigits(String(item.source_date_jalali || "").replace(/-/g, "/"));
  const timeStr = toPersianDigits(item.source_time_hm || "");
  const dateTimeStr = [dateStr, timeStr].filter(Boolean).join(" ");

  const handleSave = async (advance = false) => {
    await onSave(item.id, buildPayload(), advance);
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
        gap: 4,
        padding: isMobile ? "8px 10px" : "7px 10px",
        borderRadius: 8,
        border: primary ? "none" : `1px solid ${theme.border}`,
        background: primary ? "#0ea5e9" : theme.card,
        color: primary ? "#fff" : theme.text,
        cursor: disabled ? "not-allowed" : "pointer",
        fontFamily: "inherit",
        fontSize: pxToEm(11),
        minHeight: isMobile ? "2.4em" : "2.2em",
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
          width: 36,
          height: 36,
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
      <header style={{ padding: isMobile ? "6px 8px" : "8px 12px", borderBottom: `1px solid ${theme.border}`, flexShrink: 0 }}>
        {isMobile ? (
          <>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 4, alignItems: "center", marginBottom: 4 }}>
              {badge(primaryLabel, `${primaryColor}22`, primaryColor, { fontWeight: 600 })}
              {badge(`#${toPersianDigits(item.id)}`, "rgba(148,163,184,0.15)", theme.text)}
              {dateTimeStr ? badge(dateTimeStr, "rgba(56,189,248,0.12)", "#7dd3fc") : null}
              {secondaryTags.filter((t) => t.label.includes("تکرار") || t.label.includes("مشکوک")).map((t) => (
                <React.Fragment key={t.label}>{badge(t.label, `${t.color}22`, t.color, { fontWeight: 600 })}</React.Fragment>
              ))}
            </div>
            <div
              style={{
                fontSize: pxToEm(10),
                opacity: 0.82,
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
              flex: "0 0 auto",
              height: editorBoxH,
              maxHeight: editorBoxH,
              minHeight: editorBoxH,
              display: "flex",
              flexDirection: "column",
              overflow: "hidden",
            }}
          >
            <RichTextEditor
              value={form.cleaned_text}
              onChange={(html) => set("cleaned_text", html)}
              isDarkMode={isDarkMode}
              minHeight={editorBodyH}
              maxHeight={editorBodyH}
              maxLength={NEWS_FIELD_LIMITS.cleanedText}
              placeholder="متن را ویرایش کنید..."
              allowFullscreen
              allowSourceView
              resizable={false}
            />
          </div>
        ) : (
          <div
            className="rich-text-content news-text-justify"
            style={{
              height: editorBoxH,
              flex: "0 0 auto",
              overflowY: "auto",
              lineHeight: 1.9,
              fontSize: pxToEm(isMobile ? 13 : 14),
            }}
            dangerouslySetInnerHTML={{ __html: form.cleaned_text }}
          />
        )}
      </div>

      <footer
        style={{
          padding: isMobile ? "6px 8px" : "8px 10px",
          borderTop: `1px solid ${theme.border}`,
          display: "flex",
          flexDirection: "column",
          gap: isMobile ? 6 : 8,
          flexShrink: 0,
          background: theme.card,
        }}
      >
        {isMobile ? (
          <>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 4 }}>
              {iconBtn(atStart, () => onNavigate(0), "اولین خبر", <ChevronsRight size={16} />)}
              {iconBtn(atStart, () => onNavigate(index - 1), "خبر قبلی", <ChevronRight size={16} />)}
              <span style={{ fontSize: pxToEm(11), fontWeight: 700, whiteSpace: "nowrap", minWidth: 52, textAlign: "center" }}>
                {toPersianDigits(index + 1)}/{toPersianDigits(total)}
              </span>
              {iconBtn(atEnd, () => onNavigate(index + 1), "خبر بعدی", <ChevronLeft size={16} />)}
              {iconBtn(atEnd, () => onNavigate(total - 1), "آخرین خبر", <ChevronsLeft size={16} />)}
            </div>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 6, flexWrap: "wrap" }}>
              {canEdit ? (
                <>
                  {iconBtn(false, () => handleSave(false), "ذخیره", <Save size={16} />)}
                  {iconBtn(atEnd, () => handleSave(true), "ذخیره و بعدی", <SkipForward size={16} />, { primary: !atEnd })}
                  {canToggleDuplicate ? iconBtn(
                    false,
                    () => onToggleDuplicate?.(item.id, item.duplicate_status === "suspicious"),
                    item.duplicate_status === "suspicious" ? "لغو علامت تکرار" : "مشکوک به تکرار",
                    <Copy size={16} />,
                    { warn: true, active: item.duplicate_status === "suspicious" },
                  ) : null}
                </>
              ) : null}
              {canDelete ? iconBtn(false, handleDelete, "حذف", <Trash2 size={16} />, { danger: true }) : null}
              {canFinalize && item.workflow_status === "reviewed" ? iconBtn(
                false,
                () => onFinalize?.(item.id),
                "تأیید نهایی",
                <CheckCircle size={16} />,
                { primary: true },
              ) : null}
              <NewsFormatExportMenu
                compact={isMobile}
                theme={theme}
                onSelect={setPreviewFormat}
              />
            </div>
          </>
        ) : (
          <>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6, justifyContent: "center", alignItems: "center" }}>
              {navBtn(atStart, () => onNavigate(0), <><ChevronsRight size={15} /> اول</>)}
              {navBtn(atStart, () => onNavigate(index - 1), <><ChevronRight size={15} /> قبلی</>)}
              <span style={{ fontSize: pxToEm(12), fontWeight: 600, padding: "0 0.4em" }}>
                {toPersianDigits(index + 1)} از {toPersianDigits(total)}
              </span>
              {navBtn(atEnd, () => onNavigate(index + 1), <>بعدی <ChevronLeft size={15} /></>)}
              {navBtn(atEnd, () => onNavigate(total - 1), <>آخر <ChevronsLeft size={15} /></>)}
            </div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6, justifyContent: "center" }}>
              {canEdit ? (
                <>
                  {navBtn(false, () => handleSave(false), <><Save size={13} /> ذخیره</>)}
                  {navBtn(atEnd, () => handleSave(true), <><Save size={13} /> ذخیره و بعدی</>, !atEnd)}
                  {canToggleDuplicate ? (
                    <button
                      type="button"
                      disabled={saving}
                      onClick={() => onToggleDuplicate?.(item.id, item.duplicate_status === "suspicious")}
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: 4,
                        padding: "7px 10px",
                        borderRadius: 8,
                        border: item.duplicate_status === "suspicious" ? "1px solid #f59e0b" : `1px solid ${theme.border}`,
                        background: item.duplicate_status === "suspicious" ? "rgba(245,158,11,0.25)" : "transparent",
                        color: item.duplicate_status === "suspicious" ? "#fbbf24" : theme.text,
                        cursor: "pointer",
                        fontFamily: "inherit",
                        fontSize: pxToEm(11),
                        minHeight: "2.2em",
                        fontWeight: item.duplicate_status === "suspicious" ? 700 : 400,
                      }}
                    >
                      <Copy size={13} />
                      {item.duplicate_status === "suspicious" ? "مشکوک به تکرار ✓" : "مشکوک به تکرار"}
                    </button>
                  ) : null}
                </>
              ) : null}
              {canDelete ? (
                <button
                  type="button"
                  disabled={saving}
                  onClick={handleDelete}
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 4,
                    padding: "0.5em 0.75em",
                    borderRadius: 8,
                    border: "1px solid rgba(239,68,68,0.45)",
                    background: "rgba(239,68,68,0.1)",
                    color: "#f87171",
                    cursor: "pointer",
                    fontFamily: "inherit",
                    fontSize: pxToEm(11),
                    minHeight: "2.2em",
                  }}
                >
                  <Trash2 size={13} /> حذف
                </button>
              ) : null}
              {canFinalize && item.workflow_status === "reviewed" ? (
                <button
                  type="button"
                  disabled={saving}
                  onClick={() => onFinalize?.(item.id)}
                  style={{ display: "inline-flex", alignItems: "center", gap: 4, padding: "0.5em 0.75em", borderRadius: 8, border: "none", background: "#22c55e", color: "#fff", cursor: "pointer", fontFamily: "inherit", fontSize: pxToEm(11), minHeight: "2.2em" }}
                >
                  <CheckCircle size={13} /> تأیید نهایی
                </button>
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
