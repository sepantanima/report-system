import React, { useState, useEffect, useMemo } from "react";
import { CheckCircle, XCircle, Archive, ArrowUpCircle, UserPlus, Star, Send, Save } from "lucide-react";
import RichTextEditor, { stripHtml } from "./RichTextEditor.jsx";
import SearchableUserSelect from "./SearchableUserSelect.jsx";
import MultiSelect from "../MultiSelect.jsx";
import { useAppTheme } from "../../context/ThemeContext.jsx";
import { BRIEF_TERMS } from "../../constants/analysisTerminology.js";
import { BRIEF_FIELD_LIMITS } from "../../constants/analysisFieldLimits.js";
import { BRIEF_QUALITY_META, BRIEF_ENTRY_MODE_META, formatPersianDateShort } from "../../utils/analysisMonitorUtils.js";

const MANAGER_EDITABLE_STATUSES = ["Submitted", "ManagerApproved", "Acknowledged", "EditorApproved", "Published"];

export default function BriefSubmissionDetail({
  item,
  theme,
  analysts = [],
  publishDestinations = [],
  onApproveBank,
  onReject,
  onArchive,
  onStatus,
  onEditorApprove,
  onPublish,
  onEditContent,
  onEditBankContent,
  onPromoteTopic,
  onPromoteMission,
  onSuggestAnalyst,
  onQualityTag,
  onToggleCommandVisibility,
  loading,
}) {
  const { isDarkMode } = useAppTheme();
  const [managerNote, setManagerNote] = useState(item?.manager_note || "");
  const [rejectReason, setRejectReason] = useState(item?.reject_reason || "");
  const [editorNote, setEditorNote] = useState(item?.editor_note || "");
  const [showInCommand, setShowInCommand] = useState(!!item?.show_in_command);
  const [channelIds, setChannelIds] = useState([]);
  const [editContent, setEditContent] = useState("");
  const [analystId, setAnalystId] = useState(item?.author_id ? String(item.author_id) : "");

  const isTopicProposal = item?.entry_mode === "topic_proposal";
  const contentMaxLength = isTopicProposal
    ? BRIEF_FIELD_LIMITS.topicProposalDescription
    : BRIEF_FIELD_LIMITS.content;

  useEffect(() => {
    setManagerNote(item?.manager_note || "");
    setRejectReason(item?.reject_reason || "");
    setEditorNote(item?.editor_note || "");
    setShowInCommand(!!item?.show_in_command);
    setAnalystId(item?.author_id ? String(item.author_id) : "");
    const bankStatuses = ["EditorApproved", "Published"];
    const initial = bankStatuses.includes(item?.status)
      ? (item?.bank_content || item?.content || "")
      : (item?.content || "");
    setEditContent(initial);
    const prevChannel = item?.channel_config_id ? [String(item.channel_config_id)] : [];
    setChannelIds(prevChannel);
  }, [item?.id, item?.manager_note, item?.reject_reason, item?.editor_note, item?.bank_content, item?.content, item?.author_id, item?.status, item?.channel_config_id, item?.show_in_command]);

  const publishChannelOptions = useMemo(
    () => (publishDestinations || []).map((d) => ({
      value: String(d.id),
      label: d.title_fa || d.title || `کانال ${d.id}`,
    })),
    [publishDestinations],
  );

  const multiSelectTheme = useMemo(() => ({
    isDarkMode,
    card: theme.card,
    border: theme.border,
    text: theme.text,
    bg: theme.card,
  }), [isDarkMode, theme]);

  if (!item) {
    return (
      <div style={{ padding: 24, textAlign: "center", opacity: 0.6, fontSize: 13 }}>
        یک تحلیل از لیست انتخاب کنید
      </div>
    );
  }

  const btn = (label, icon, onClick, color, disabled = false) => (
    <button
      type="button"
      className="v3-brief-action-btn"
      disabled={disabled || loading}
      onClick={onClick}
      style={{
        background: color,
        cursor: disabled || loading ? "not-allowed" : "pointer",
        opacity: disabled || loading ? 0.6 : 1,
      }}
    >
      {icon} {label}
    </button>
  );

  const entryMeta = BRIEF_ENTRY_MODE_META[item.entry_mode] || {};
  const isInbox = item.status === "Submitted";
  const isBankItem = ["ManagerApproved", "EditorApproved", "Published"].includes(item.status);
  const isClosed = ["Promoted", "Archived", "Rejected"].includes(item.status);
  const canPromote = isBankItem || item.status === "Acknowledged";
  const canManagerEdit = MANAGER_EDITABLE_STATUSES.includes(item.status);
  const saveHandler = onEditContent || onEditBankContent;

  const handleSaveContent = () => {
    if (!saveHandler) return;
    const payload = { content: editContent };
    if (onEditContent) onEditContent(payload);
    else onEditBankContent?.(payload);
  };

  return (
    <div className="v3-brief-detail-root">
      <div>
        <h3 style={{ margin: "0 0 6px", fontSize: 15, wordBreak: "break-word" }}>{item.title}</h3>
        <div style={{ fontSize: 11, opacity: 0.7 }}>
          {item.submission_code} — ثبت‌کننده: {item.author_name} {item.unit_name ? `(${item.unit_name})` : ""}
        </div>
        <div style={{ fontSize: 11, opacity: 0.75, marginTop: 4, display: "flex", flexWrap: "wrap", gap: 10 }}>
          <span><b>نوع:</b> {entryMeta.label || item.entry_mode || "—"}</span>
          {!isTopicProposal && (
            <>
              <span><b>منبع/نویسنده:</b> {item.attribution_text || item.author_name || "—"}</span>
              {item.composition_date && (
                <span><b>تاریخ نگارش:</b> {formatPersianDateShort(item.composition_date)}</span>
              )}
            </>
          )}
        </div>
      </div>

      <div>
        <label style={{ fontSize: 12, fontWeight: 600, display: "block", marginBottom: 6 }}>
          {canManagerEdit ? "متن تحلیل (قابل ویرایش)" : "متن تحلیل"}
        </label>
        {canManagerEdit && saveHandler ? (
          <>
            <RichTextEditor
              value={editContent}
              onChange={setEditContent}
              isDarkMode={isDarkMode}
              minHeight={160}
              maxHeight={320}
              maxLength={contentMaxLength}
              allowFullscreen
              resizable
            />
            <div style={{ marginTop: 8 }}>
              {btn("ذخیره متن", <Save size={14} />, handleSaveContent, "#6366f1", !stripHtml(editContent).trim())}
            </div>
          </>
        ) : (
          <RichTextEditor
            value={item.bank_content || item.content || ""}
            readOnly
            isDarkMode={isDarkMode}
            minHeight={120}
          />
        )}
      </div>

      {isTopicProposal && item.importance_reason && (
        <div style={{ fontSize: 12, lineHeight: 1.8 }}>
          <b>{BRIEF_TERMS.importanceReasonLabel}:</b> {item.importance_reason}
        </div>
      )}

      {item.tags && (
        <div style={{ fontSize: 12 }}><b>برچسب:</b> {item.tags}</div>
      )}
      {(item.context_type && item.context_type !== "general") && (
        <div style={{ fontSize: 12 }}>
          <b>مرجع:</b> {item.context_type} #{item.context_id || "—"}
        </div>
      )}

      {isInbox && (
        <>
          <div>
            <label style={{ fontSize: 12, fontWeight: 600, display: "block", marginBottom: 6 }}>یادداشت مدیر (اختیاری)</label>
            <textarea
              value={managerNote}
              onChange={(e) => setManagerNote(e.target.value)}
              rows={2}
              style={{ width: "100%", padding: 10, borderRadius: 8, border: `1px solid ${theme.border}`, background: theme.card, color: theme.text, fontFamily: "inherit", resize: "vertical" }}
            />
          </div>
          <div>
            <label style={{ fontSize: 12, fontWeight: 600, display: "block", marginBottom: 6 }}>دلیل رد (در صورت رد)</label>
            <textarea
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              rows={2}
              style={{ width: "100%", padding: 10, borderRadius: 8, border: `1px solid ${theme.border}`, background: theme.card, color: theme.text, fontFamily: "inherit", resize: "vertical" }}
              placeholder="الزامی هنگام رد"
            />
          </div>

          <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12, margin: "4px 0 8px", cursor: "pointer" }}>
            <input
              type="checkbox"
              checked={showInCommand}
              onChange={(e) => setShowInCommand(e.target.checked)}
            />
            نمایش در اتاق فرمان (گزیده؛ پیش‌فرض خاموش)
          </label>

          <div className="v3-brief-action-row">
            {btn(BRIEF_TERMS.approveBank, <CheckCircle size={14} />, () => onApproveBank?.({ manager_note: managerNote, show_in_command: showInCommand }), "#10b981")}
            {btn(BRIEF_TERMS.rejectBtn, <XCircle size={14} />, () => onReject?.({ reject_reason: rejectReason, manager_note: managerNote }), "#ef4444", !rejectReason.trim())}
            {btn("بایگانی", <Archive size={14} />, () => onArchive?.({ manager_note: managerNote }), "#64748b")}
            {isTopicProposal && btn(BRIEF_TERMS.promoteTopic, <ArrowUpCircle size={14} />, () => onPromoteTopic?.({ auto_approve: false }), "#059669")}
          </div>

          <div className="v3-brief-action-row">
            {Object.entries(BRIEF_QUALITY_META).map(([key, meta]) => (
              <button
                key={key}
                type="button"
                disabled={loading}
                onClick={() => onQualityTag(key)}
                style={{
                  padding: "6px 10px",
                  borderRadius: 8,
                  border: `1px solid ${meta.color}55`,
                  background: item.quality_tag === key ? `${meta.color}22` : "transparent",
                  color: meta.color,
                  fontSize: 11,
                  fontWeight: 600,
                  cursor: "pointer",
                  fontFamily: "inherit",
                }}
              >
                <Star size={12} style={{ verticalAlign: "middle", marginLeft: 4 }} />
                {meta.label}
              </button>
            ))}
          </div>
        </>
      )}

      {isBankItem && onToggleCommandVisibility ? (
        <div style={{ borderTop: `1px solid ${theme.border}`, paddingTop: 12 }}>
          <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12, cursor: "pointer" }}>
            <input
              type="checkbox"
              checked={!!item.show_in_command}
              disabled={loading}
              onChange={(e) => onToggleCommandVisibility(e.target.checked)}
            />
            نمایش در اتاق فرمان (فقط موارد گزیده برای فرمانده)
          </label>
        </div>
      ) : null}

      {item.status === "ManagerApproved" && (
        <div style={{ borderTop: `1px solid ${theme.border}`, paddingTop: 12, display: "flex", flexDirection: "column", gap: 10 }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: "#8b5cf6" }}>سر دبیر — تأیید انتشار</div>
          <textarea
            value={editorNote}
            onChange={(e) => setEditorNote(e.target.value)}
            rows={2}
            placeholder="یادداشت سر دبیر (اختیاری)"
            style={{ width: "100%", padding: 10, borderRadius: 8, border: `1px solid ${theme.border}`, background: theme.card, color: theme.text, fontFamily: "inherit", resize: "vertical" }}
          />
          {btn(BRIEF_TERMS.editorApprove, <CheckCircle size={14} />, () => onEditorApprove?.({ editor_note: editorNote }), "#8b5cf6")}
        </div>
      )}

      {(item.status === "EditorApproved" || item.status === "Published") && onPublish && (
        <div style={{ borderTop: `1px solid ${theme.border}`, paddingTop: 12, display: "flex", flexDirection: "column", gap: 10 }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: "#059669" }}>
            {item.status === "Published" ? "انتشار مجدد" : "انتشار"}
          </div>
          {item.status === "Published" && (
            <div style={{ fontSize: 12, color: "#22c55e" }}>
              آخرین انتشار {item.published_at ? `— ${formatPersianDateShort(item.published_at)}` : ""}
              {item.editor_name ? ` — سر دبیر: ${item.editor_name}` : ""}
            </div>
          )}
          {item.publish_error && (
            <div style={{ fontSize: 12, color: "#ef4444" }}>خطای انتشار: {item.publish_error}</div>
          )}
          <div className="v3-brief-publish-row">
            <div>
              <label style={{ fontSize: 12, fontWeight: 600, display: "block", marginBottom: 6 }}>کانال‌های انتشار</label>
              <MultiSelect
                options={publishChannelOptions}
                values={channelIds}
                onChange={setChannelIds}
                placeholder="یک یا چند کانال انتخاب کنید..."
                theme={multiSelectTheme}
              />
            </div>
            {btn(
              item.status === "Published" ? BRIEF_TERMS.republishBtn : BRIEF_TERMS.publishBtn,
              <Send size={14} />,
              () => onPublish?.({ channel_config_ids: channelIds.map((id) => parseInt(id, 10)) }),
              "#059669",
              !channelIds.length,
            )}
          </div>
        </div>
      )}

      {item.status === "Published" && !onPublish && (
        <div style={{ borderTop: `1px solid ${theme.border}`, paddingTop: 12 }}>
          <div style={{ fontSize: 12, color: "#22c55e", marginBottom: 8 }}>
            منتشر شده {item.published_at ? `— ${formatPersianDateShort(item.published_at)}` : ""}
            {item.editor_name ? ` — سر دبیر: ${item.editor_name}` : ""}
          </div>
          {item.publish_error && (
            <div style={{ fontSize: 12, color: "#ef4444", marginBottom: 8 }}>خطای انتشار: {item.publish_error}</div>
          )}
        </div>
      )}

      {canPromote && !isClosed && (
        <div style={{ borderTop: `1px solid ${theme.border}`, paddingTop: 12, display: "flex", flexDirection: "column", gap: 10 }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: "#10b981" }}>ارتقا به فرایند رسمی</div>
          <div className="v3-brief-action-row">
            {btn(BRIEF_TERMS.promoteTopic, <ArrowUpCircle size={14} />, () => onPromoteTopic?.({ auto_approve: true }), "#10b981")}
            {btn(BRIEF_TERMS.suggestAnalyst, <UserPlus size={14} />, () => onSuggestAnalyst?.({ note: managerNote, quality_tag: "promising" }), "#8b5cf6")}
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 10 }}>
            <SearchableUserSelect
              label="تحلیل‌گر (خالی = نویسنده)"
              users={analysts}
              value={analystId}
              onChange={setAnalystId}
              placeholder="نویسنده"
            />
          </div>
          {btn(
            BRIEF_TERMS.promoteMission,
            <ArrowUpCircle size={14} />,
            () => onPromoteMission?.({
              analyst_id: analystId ? parseInt(analystId, 10) : item.author_id,
              guidelines: stripHtml(editContent || item.content).slice(0, 150),
            }),
            "#059669",
          )}
        </div>
      )}

      {item.status === "Acknowledged" && onStatus && (
        <div style={{ fontSize: 12, opacity: 0.7 }}>
          وضعیت قدیمی «دریافت شد» — ترجیحاً از تأیید بانک استفاده کنید.
        </div>
      )}

      {item.promoted_topic_id && (
        <div style={{ fontSize: 12, color: "#22c55e" }}>
          محور مرتبط: #{toPersianDigits(item.promoted_topic_id)}
        </div>
      )}
      {item.reject_reason && isClosed && (
        <div style={{ fontSize: 12, opacity: 0.8 }}><b>دلیل رد:</b> {item.reject_reason}</div>
      )}
      {item.manager_note && (isClosed || item.status === "Rejected") && (
        <div style={{ fontSize: 12, opacity: 0.8 }}><b>یادداشت مدیر:</b> {item.manager_note}</div>
      )}
    </div>
  );
}

function toPersianDigits(val) {
  return String(val).replace(/[0-9]/g, (d) => "۰۱۲۳۴۵۶۷۸۹"[d]);
}
