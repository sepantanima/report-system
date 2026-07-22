import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Loader2, Reply, Send, Settings, Trash2, Pencil, CheckCheck } from "lucide-react";
import FormPageLayout from "../components/common/FormPageLayout.jsx";
import MultiSelect from "../components/MultiSelect.jsx";
import MessageReadStatusPanel from "../components/messaging/MessageReadStatusPanel.jsx";
import MessageAdminSection from "../components/messaging/MessageAdminSection.jsx";
import {
  messageFormCard,
  messageInput,
  messagePrimaryBtn,
  messageTabBtn,
  MESSAGE_FORM_WIDTH,
  MESSAGE_PAGE_CSS,
} from "../components/messaging/messageFormUi.js";
import messageService from "../services/messageService.js";
import { MESSAGE_BODY_MAX, MESSAGE_TITLE_MAX, validateMessagePayload } from "../constants/messageFieldLimits.js";
import { getSessionRoles, hasRole } from "../utils/userRoles.js";
import { useAppTheme } from "../context/ThemeContext.jsx";
import { toPersianDigits } from "../utils/analysisMonitorUtils.js";
import { formatMessageDateTime } from "../utils/messageDateUtils.js";
import { MESSAGE_INBOX_HELP } from "../content/messageFormHelp.jsx";
import useAnalysisToast from "../hooks/useAnalysisToast.jsx";

export default function MessageInboxPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const roles = getSessionRoles();
  const isManager = hasRole(roles, "admin", "Field_admin", "news_chief");
  const isSystemAdmin = hasRole(roles, "admin");
  const { isDarkMode } = useAppTheme();
  const [tab, setTab] = useState(location.state?.tab || "inbox");
  const [inbox, setInbox] = useState([]);
  const [sent, setSent] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);
  const [detail, setDetail] = useState(null);

  const [directForm, setDirectForm] = useState({ title: "", body: "" });
  const [recipients, setRecipients] = useState([]);
  const [userOptions, setUserOptions] = useState([]);
  const [sending, setSending] = useState(false);
  const { showToast, Toast } = useAnalysisToast();
  const [checkedIds, setCheckedIds] = useState(() => new Set());
  const [showDeleted, setShowDeleted] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editForm, setEditForm] = useState({ title: "", body: "", priority: "important", show_as_banner: true });
  const openIdHandledRef = useRef(false);
  const userPickedRef = useRef(false);

  const theme = useMemo(() => ({
    card: isDarkMode ? "#1e293b" : "#fff",
    border: isDarkMode ? "rgba(255,255,255,0.1)" : "#e2e8f0",
    text: isDarkMode ? "#f1f5f9" : "#1e293b",
    input: isDarkMode ? "#0f172a" : "#f8fafc",
    bg: isDarkMode ? "#0f172a" : "#f8fafc",
    muted: isDarkMode ? "#94a3b8" : "#64748b",
    isDarkMode,
  }), [isDarkMode]);

  const recipientIds = useMemo(() => recipients.map((r) => String(r.id)), [recipients]);

  const mergedUserOptions = useMemo(() => {
    const map = new Map();
    recipients.forEach((r) => map.set(String(r.id), { value: String(r.id), label: `${r.label} (${r.username || r.id})` }));
    userOptions.forEach((o) => map.set(String(o.value), o));
    return [...map.values()];
  }, [recipients, userOptions]);

  const loadUsers = useCallback(async (q) => {
    if (q.length < 2) {
      setUserOptions([]);
      return;
    }
    try {
      const hits = await messageService.searchUsers(q);
      setUserOptions((Array.isArray(hits) ? hits : []).map((u) => ({
        value: String(u.id),
        label: `${u.name || u.username} (${u.username})`,
      })));
    } catch {
      setUserOptions([]);
    }
  }, []);

  const loadInbox = useCallback(async () => {
    const rows = await messageService.inbox({ limit: 100, include_deleted: showDeleted && isSystemAdmin });
    setInbox(Array.isArray(rows) ? rows : []);
  }, [showDeleted, isSystemAdmin]);

  const loadSent = useCallback(async () => {
    const rows = await messageService.sent({ include_deleted: showDeleted && isSystemAdmin });
    setSent(Array.isArray(rows) ? rows : []);
  }, [showDeleted, isSystemAdmin]);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      if (tab === "inbox") await loadInbox();
      else if (tab === "sent") await loadSent();
    } finally {
      setLoading(false);
    }
  }, [tab, loadInbox, loadSent]);

  useEffect(() => { refresh(); }, [refresh]);

  useEffect(() => {
    if (tab !== "compose") refresh();
  }, [showDeleted]);

  useEffect(() => {
    if (location.state?.tab) setTab(location.state.tab);
  }, [location.state?.tab]);

  useEffect(() => {
    const openId = location.state?.openId;
    if (!openId || !inbox.length || openIdHandledRef.current || userPickedRef.current) return;
    const m = inbox.find((x) => String(x.id) === String(openId));
    if (!m) return;
    openIdHandledRef.current = true;
    openMessage(m, { fromNavigation: true });
    navigate(location.pathname, { replace: true, state: { ...location.state, openId: undefined } });
  }, [location.state?.openId, inbox, location.pathname, navigate]);

  const onRecipientsChange = (vals) => {
    const labelMap = new Map(mergedUserOptions.map((o) => [String(o.value), o.label]));
    setRecipients((prev) => {
      const prevMap = new Map(prev.map((r) => [String(r.id), r]));
      return vals.map((id) => {
        const sid = String(id);
        const existing = prevMap.get(sid);
        if (existing) return existing;
        const lbl = labelMap.get(sid) || sid;
        const m = lbl.match(/^(.+?)\s*\(([^)]+)\)$/);
        return { id: parseInt(sid, 10), label: m ? m[1] : lbl, username: m ? m[2] : sid };
      });
    });
  };

  const openMessage = async (m, opts = {}) => {
    const { fromNavigation = false } = opts;
    if (!fromNavigation) userPickedRef.current = true;
    const messageId = m.id;
    setSelected(m);
    setEditing(false);
    if (tab === "inbox") {
      try {
        if (!m.read_at) await messageService.markRead(messageId);
        const rows = await messageService.inbox({ limit: 100, include_deleted: showDeleted && isSystemAdmin });
        const nextInbox = Array.isArray(rows) ? rows : [];
        setInbox(nextInbox);
        const refreshed = nextInbox.find((x) => String(x.id) === String(messageId));
        if (refreshed) setSelected(refreshed);
      } catch { /* ignore */ }
      setDetail(null);
      return;
    }
    try {
      if (tab === "sent") setDetail(await messageService.sentDetail(m.id));
      else setDetail(null);
    } catch {
      setDetail(null);
    }
  };

  const startReply = (m) => {
    const titleBase = m.title?.trim() || "پیام";
    const replyTitle = titleBase.startsWith("پاسخ:") ? titleBase : `پاسخ: ${titleBase}`;
    const quote = `\n\n---\n${m.sender_name || "فرستنده"}:\n${m.body || ""}`;
    setDirectForm({
      title: replyTitle.slice(0, MESSAGE_TITLE_MAX),
      body: quote.trim().slice(0, MESSAGE_BODY_MAX),
    });
    if (m.sender_id) {
      setRecipients([{
        id: m.sender_id,
        label: m.sender_name || m.sender_username || "فرستنده",
        username: m.sender_username || "",
      }]);
    }
    setTab("compose");
    setSelected(null);
    setDetail(null);
  };

  const sendDirect = async () => {
    const err = validateMessagePayload(directForm);
    if (err) return showToast(err);
    if (!recipients.length) return showToast("حداقل یک گیرنده انتخاب کنید");
    setSending(true);
    try {
      await messageService.sendDirect({
        title: directForm.title,
        body: directForm.body,
        recipient_ids: recipients.map((r) => r.id),
      });
      showToast(`پیام به ${toPersianDigits(String(recipients.length))} نفر ارسال شد`);
      setDirectForm({ title: "", body: "" });
      setRecipients([]);
      setTab("sent");
      await loadSent();
    } catch (e) {
      showToast(e.response?.data?.error || "خطا");
    } finally {
      setSending(false);
    }
  };

  const goSettings = () => {
    navigate("/SystemSetting?tab=messaging", {
      state: { returnTo: "/messages", returnState: { tab } },
    });
  };

  const toggleCheck = (id, e) => {
    e?.stopPropagation?.();
    setCheckedIds((prev) => {
      const next = new Set(prev);
      const sid = String(id);
      if (next.has(sid)) next.delete(sid);
      else next.add(sid);
      return next;
    });
  };

  const toggleCheckAll = () => {
    if (checkedIds.size === list.length) setCheckedIds(new Set());
    else setCheckedIds(new Set(list.map((m) => String(m.id))));
  };

  const bulkDelete = async (scope) => {
    const ids = [...checkedIds].map((x) => parseInt(x, 10));
    if (!ids.length) return showToast("پیامی انتخاب نشده");
    const labels = {
      inbox: "پیام‌های انتخاب‌شده از دریافتی حذف شوند؟",
      sent: "پیام‌های انتخاب‌شده از ارسالی حذف شوند؟",
      permanent: "پیام‌های انتخاب‌شده برای همه به‌طور قطعی حذف می‌شوند. ادامه؟",
    };
    if (!window.confirm(labels[scope])) return;
    try {
      await messageService.bulkDelete(ids, scope);
      setCheckedIds(new Set());
      setSelected(null);
      setDetail(null);
      showToast(scope === "permanent" ? "حذف قطعی انجام شد" : "حذف انجام شد");
      await refresh();
    } catch (e) {
      showToast(e.response?.data?.error || "خطا");
    }
  };

  const bulkMarkRead = async () => {
    const ids = [...checkedIds].map((x) => parseInt(x, 10));
    if (!ids.length) return showToast("پیامی انتخاب نشده");
    try {
      const res = await messageService.bulkMarkRead(ids);
      setCheckedIds(new Set());
      showToast(`${toPersianDigits(String(res.marked ?? ids.length))} پیام به‌عنوان خوانده‌شده ثبت شد`);
      const rows = await messageService.inbox({ limit: 100, include_deleted: showDeleted && isSystemAdmin });
      const nextInbox = Array.isArray(rows) ? rows : [];
      setInbox(nextInbox);
      if (selected) {
        const refreshed = nextInbox.find((x) => String(x.id) === String(selected.id));
        if (refreshed) setSelected(refreshed);
      }
    } catch (e) {
      showToast(e.response?.data?.error || "خطا");
    }
  };

  const startEdit = (m) => {
    setEditForm({
      title: m.title || "",
      body: m.body || "",
      priority: m.priority || "important",
      show_as_banner: m.show_as_banner !== false,
    });
    setEditing(true);
  };

  const saveEdit = async () => {
    if (!selected) return;
    const err = validateMessagePayload(editForm, { requireTitle: true });
    if (err) return showToast(err);
    try {
      await messageService.updateMessage(selected.id, editForm);
      showToast("پیام ویرایش شد؛ خوانندگان قبلی آن را دوباره به‌عنوان جدید می‌بینند");
      setEditing(false);
      await refresh();
      if (tab === "sent") setDetail(await messageService.sentDetail(selected.id));
    } catch (e) {
      showToast(e.response?.data?.error || "خطا");
    }
  };

  const removeMessage = async (mode) => {
    if (!selected) return;
    const id = selected.id;
    const labels = {
      inbox: "این پیام از لیست دریافتی شما حذف شود؟",
      sent: "این پیام از لیست ارسالی شما حذف شود؟",
      permanent: "پیام برای همه کاربران به‌طور قطعی حذف می‌شود. ادامه می‌دهید؟",
    };
    if (!window.confirm(labels[mode])) return;
    try {
      if (mode === "inbox") await messageService.deleteInbox(id);
      else if (mode === "sent") await messageService.deleteSent(id);
      else await messageService.permanentDelete(id);
      setSelected(null);
      setDetail(null);
      showToast(mode === "permanent" ? "پیام به‌طور قطعی حذف شد" : "پیام حذف شد");
      await refresh();
    } catch (e) {
      showToast(e.response?.data?.error || "خطا در حذف پیام");
    }
  };

  const list = tab === "inbox" ? inbox : tab === "sent" ? sent : [];
  const bulkScope = tab === "inbox" ? "inbox" : tab === "sent" ? "sent" : null;
  const canEditSelected = selected && tab === "sent" && ["announcement", "entity"].includes(selected.kind);
  const inp = messageInput(theme);
  const inpArea = messageInput(theme, true);

  return (
    <FormPageLayout
      title="پیام‌ها"
      documentTitle="پیام‌ها"
      backTo="/main"
      maxWidth={MESSAGE_FORM_WIDTH}
      wide
      onHelp={() => <MESSAGE_INBOX_HELP />}
      helpTitle="راهنمای پیام‌ها"
    >
      <style>{MESSAGE_PAGE_CSS}</style>
      {Toast}

      <div className="message-tab-row" style={{ display: "flex", gap: 8, marginBottom: 18, flexWrap: "wrap" }}>
        {[
          ["inbox", "دریافتی", "default"],
          ["sent", "ارسالی", "default"],
          ["compose", "پیام مستقیم", "default"],
        ].map(([id, label, variant]) => (
          <button
            key={id}
            type="button"
            onClick={() => { setTab(id); setSelected(null); setDetail(null); setCheckedIds(new Set()); setEditing(false); }}
            style={messageTabBtn(theme, tab === id, variant)}
          >
            {label}
          </button>
        ))}
        {isSystemAdmin ? (
          <button type="button" onClick={() => { setTab("admin"); setSelected(null); setDetail(null); setCheckedIds(new Set()); }} style={messageTabBtn(theme, tab === "admin", "ghost")}>
            نظارت مدیر کل
          </button>
        ) : null}
        {isManager ? (
          <button type="button" onClick={() => navigate("/messages/compose")} style={messageTabBtn(theme, false, "warn")}>
            صدور ابلاغ
          </button>
        ) : null}
        {isManager ? (
          <button type="button" onClick={goSettings} style={{ ...messageTabBtn(theme, false, "ghost"), display: "inline-flex", alignItems: "center", gap: 6 }}>
            <Settings size={15} /> تنظیمات سقف
          </button>
        ) : null}
      </div>

      {isSystemAdmin && tab !== "compose" ? (
        <label style={{ display: "inline-flex", alignItems: "center", gap: 8, marginBottom: 12, fontSize: "0.9em", cursor: "pointer" }}>
          <input type="checkbox" checked={showDeleted} onChange={(e) => { setShowDeleted(e.target.checked); setCheckedIds(new Set()); }} />
          نمایش پیام‌های حذف‌شده (منطقی)
        </label>
      ) : null}

      {tab === "admin" ? (
        <MessageAdminSection theme={theme} showDeleted={showDeleted} onToast={showToast} />
      ) : tab === "compose" ? (
        <div style={messageFormCard(theme)}>
          <label style={{ fontWeight: 600, display: "block", marginBottom: 8 }}>گیرندگان (چندانتخابی)</label>
          <MultiSelect
            options={mergedUserOptions}
            values={recipientIds}
            onChange={onRecipientsChange}
            placeholder="جستجو و انتخاب کاربر..."
            searchPlaceholder="حداقل ۲ حرف از نام یا نام کاربری..."
            theme={theme}
            remoteSearch
            onSearchChange={loadUsers}
          />

          <label style={{ fontWeight: 600, display: "block", marginTop: 14 }}>عنوان (اختیاری)</label>
          <input
            style={{ ...inp, marginTop: 4, marginBottom: 12 }}
            maxLength={MESSAGE_TITLE_MAX}
            value={directForm.title}
            onChange={(e) => setDirectForm((f) => ({ ...f, title: e.target.value }))}
          />
          <label style={{ fontWeight: 600 }}>متن</label>
          <textarea
            style={{ ...inpArea, marginTop: 4 }}
            maxLength={MESSAGE_BODY_MAX}
            value={directForm.body}
            onChange={(e) => setDirectForm((f) => ({ ...f, body: e.target.value }))}
          />
          <div style={{ opacity: 0.7, marginTop: 6, marginBottom: 14, fontSize: "0.86em" }}>
            {toPersianDigits(String(directForm.body.length))} / {toPersianDigits(String(MESSAGE_BODY_MAX))}
          </div>
          <button type="button" disabled={sending} onClick={sendDirect} style={messagePrimaryBtn(sending)}>
            {sending ? <Loader2 size={16} className="spin" /> : <Send size={16} />}
            ارسال به {recipients.length ? toPersianDigits(String(recipients.length)) : "۰"} نفر
          </button>
        </div>
      ) : (
        <div className="message-inbox-grid" style={{ ["--message-list-border"]: theme.border }}>
          <div style={{ ...messageFormCard(theme), padding: 0 }} className="message-list-panel">
            <div className="message-list-header" style={{ color: theme.text }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                <span>تعداد: {toPersianDigits(String(list.length))}</span>
                {list.length > 0 ? (
                  <label style={{ display: "inline-flex", alignItems: "center", gap: 4, cursor: "pointer" }}>
                    <input type="checkbox" checked={list.length > 0 && checkedIds.size === list.length} onChange={toggleCheckAll} />
                    انتخاب همه
                  </label>
                ) : null}
              </div>
              {checkedIds.size > 0 && tab === "inbox" ? (
                <button
                  type="button"
                  onClick={bulkMarkRead}
                  style={{ ...messageTabBtn(theme, false, "ghost"), display: "inline-flex", alignItems: "center", gap: 4 }}
                >
                  <CheckCheck size={14} />
                  خوانده‌شده ({toPersianDigits(String(checkedIds.size))})
                </button>
              ) : null}
              {checkedIds.size > 0 && bulkScope ? (
                <button
                  type="button"
                  onClick={() => bulkDelete(bulkScope)}
                  style={{ ...messageTabBtn(theme, false, "ghost"), color: bulkScope === "permanent" ? "#ef4444" : "#f87171", display: "inline-flex", alignItems: "center", gap: 4 }}
                >
                  <Trash2 size={14} />
                  حذف ({toPersianDigits(String(checkedIds.size))})
                </button>
              ) : null}
            </div>
            <div className="message-list-scroll">
              {loading ? <div style={{ padding: 16 }}><Loader2 className="spin" /></div> : null}
              {!loading && list.length === 0 ? <div style={{ padding: 16, opacity: 0.7 }}>موردی نیست</div> : null}
              {list.map((m) => {
                const sid = String(m.id);
                const isActive = selected && String(selected.id) === sid;
                const isChecked = checkedIds.has(sid);
                const deleted = m.is_recipient_deleted || m.is_sender_deleted || m.recipient_deleted_at || m.sender_deleted_at;
                return (
                  <div
                    key={m.id}
                    className="message-list-item"
                    style={{
                      color: theme.text,
                      background: isActive ? "rgba(56,189,248,0.12)" : "transparent",
                      borderBottom: `1px solid ${theme.border}`,
                      opacity: deleted ? 0.55 : 1,
                    }}
                  >
                    <input
                      type="checkbox"
                      className="message-list-item-check"
                      checked={isChecked}
                      onChange={(e) => toggleCheck(m.id, e)}
                      onClick={(e) => e.stopPropagation()}
                    />
                    <button
                      type="button"
                      onClick={() => openMessage(m)}
                      style={{ flex: 1, border: "none", background: "transparent", color: "inherit", textAlign: "right", cursor: "pointer", fontFamily: "inherit", padding: 0 }}
                    >
                      <div style={{ fontWeight: m.read_at || tab === "sent" ? 500 : 700 }}>
                        {m.title || "پیام"}
                        {!m.read_at && tab === "inbox" ? " •" : ""}
                        {m.is_edited || m.edited_at ? (
                          <span style={{ color: "#f59e0b", fontSize: "0.82em", marginRight: 6 }}>ویرایش‌شده</span>
                        ) : null}
                        {deleted ? <span style={{ color: "#94a3b8", fontSize: "0.82em", marginRight: 6 }}>حذف‌شده</span> : null}
                      </div>
                      <div style={{ opacity: 0.7, marginTop: 4, fontSize: "0.86em" }}>
                        {m.sender_name || "—"} — {formatMessageDateTime(m.created_at)}
                      </div>
                      {m.entity_ref ? (
                        <div style={{ marginTop: 4, display: "inline-flex", alignItems: "center", gap: 4, fontSize: "0.78em", color: "#0ea5e9", background: "rgba(56,189,248,0.1)", border: "1px solid rgba(56,189,248,0.22)", borderRadius: 6, padding: "1px 6px", maxWidth: "100%" }}>
                          <span>🔗</span>
                          <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                            {m.entity_ref.type === "news" ? "خبر" : "گزارش"}: {m.entity_ref.label}
                          </span>
                        </div>
                      ) : null}
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
          <div className="message-detail-panel" style={{ ...messageFormCard(theme), minHeight: 220 }}>
            {!selected ? (
              <div style={{ opacity: 0.7 }}>یک پیام را انتخاب کنید</div>
            ) : (
              <>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 10, marginBottom: 8, flexWrap: "wrap" }}>
                  <h3 style={{ margin: 0, fontSize: "1.05em" }}>{selected.title || "پیام"}</h3>
                  <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                    {tab === "inbox" && selected.sender_id ? (
                      <button
                        type="button"
                        onClick={() => startReply(selected)}
                        style={{ ...messageTabBtn(theme, false, "ghost"), display: "inline-flex", alignItems: "center", gap: 6, flexShrink: 0 }}
                      >
                        <Reply size={15} /> پاسخ
                      </button>
                    ) : null}
                    {tab === "inbox" ? (
                      <button
                        type="button"
                        onClick={() => removeMessage("inbox")}
                        style={{ ...messageTabBtn(theme, false, "ghost"), display: "inline-flex", alignItems: "center", gap: 6, color: "#f87171" }}
                      >
                        <Trash2 size={15} /> حذف
                      </button>
                    ) : null}
                    {tab === "sent" ? (
                      <button
                        type="button"
                        onClick={() => removeMessage("sent")}
                        style={{ ...messageTabBtn(theme, false, "ghost"), display: "inline-flex", alignItems: "center", gap: 6, color: "#f87171" }}
                      >
                        <Trash2 size={15} /> حذف
                      </button>
                    ) : null}
                    {isSystemAdmin && (tab === "inbox" || tab === "sent") ? (
                      <button
                        type="button"
                        onClick={() => removeMessage("permanent")}
                        style={{ ...messageTabBtn(theme, false, "ghost"), display: "inline-flex", alignItems: "center", gap: 6, color: "#ef4444" }}
                        title="حذف قطعی برای همه"
                      >
                        <Trash2 size={15} /> حذف قطعی
                      </button>
                    ) : null}
                    {canEditSelected && !editing ? (
                      <button
                        type="button"
                        onClick={() => startEdit(selected)}
                        style={{ ...messageTabBtn(theme, false, "ghost"), display: "inline-flex", alignItems: "center", gap: 6 }}
                      >
                        <Pencil size={15} /> ویرایش
                      </button>
                    ) : null}
                    {tab === "admin" && isSystemAdmin ? (
                      <button
                        type="button"
                        onClick={() => removeMessage("permanent")}
                        style={{ ...messageTabBtn(theme, false, "ghost"), display: "inline-flex", alignItems: "center", gap: 6, color: "#ef4444" }}
                      >
                        <Trash2 size={15} /> حذف قطعی
                      </button>
                    ) : null}
                  </div>
                </div>
                <div style={{ color: theme.muted, marginBottom: 12, fontSize: "0.9em" }}>
                  {selected.sender_name}
                  {selected.created_at ? ` · ${formatMessageDateTime(selected.created_at)}` : ""}
                  {selected.edited_at ? ` · ویرایش: ${formatMessageDateTime(selected.edited_at)}` : ""}
                </div>
                {selected.entity_ref ? (
                  <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 8, marginBottom: 14, padding: "8px 12px", borderRadius: 10, background: "rgba(56,189,248,0.08)", border: "1px solid rgba(56,189,248,0.25)", fontSize: "0.88em", color: theme.text }}>
                    <span style={{ fontWeight: 700, color: "#0ea5e9" }}>
                      {selected.entity_ref.type === "news" ? "🔗 مربوط به خبر:" : "🔗 مربوط به گزارش شما:"}
                    </span>
                    {selected.entity_ref.topic ? (
                      <span style={{ padding: "1px 8px", borderRadius: 6, background: "rgba(148,163,184,0.18)" }}>{selected.entity_ref.topic}</span>
                    ) : null}
                    {selected.entity_ref.label ? (
                      <span style={{ fontWeight: 600 }}>«{selected.entity_ref.label}»</span>
                    ) : null}
                    {selected.entity_ref.date ? (
                      <span style={{ opacity: 0.75 }}>{toPersianDigits(String(selected.entity_ref.date))}</span>
                    ) : null}
                    {selected.entity_ref.code ? (
                      <span style={{ opacity: 0.7, fontFamily: "monospace", direction: "ltr" }}>#{selected.entity_ref.code}</span>
                    ) : null}
                  </div>
                ) : null}
                {editing ? (
                  <div>
                    <label style={{ fontWeight: 600 }}>عنوان</label>
                    <input style={{ ...inp, marginTop: 4, marginBottom: 10 }} maxLength={MESSAGE_TITLE_MAX} value={editForm.title} onChange={(e) => setEditForm((f) => ({ ...f, title: e.target.value }))} />
                    <label style={{ fontWeight: 600 }}>متن</label>
                    <textarea style={{ ...inpArea, marginTop: 4 }} maxLength={MESSAGE_BODY_MAX} value={editForm.body} onChange={(e) => setEditForm((f) => ({ ...f, body: e.target.value }))} />
                    <label style={{ fontWeight: 600, display: "block", marginTop: 10 }}>اولویت</label>
                    <select style={{ ...inp, marginTop: 4, marginBottom: 10 }} value={editForm.priority} onChange={(e) => setEditForm((f) => ({ ...f, priority: e.target.value }))}>
                      <option value="normal">عادی</option>
                      <option value="important">مهم</option>
                      <option value="order">دستور</option>
                    </select>
                    <label style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
                      <input type="checkbox" checked={editForm.show_as_banner} onChange={(e) => setEditForm((f) => ({ ...f, show_as_banner: e.target.checked }))} />
                      نمایش بنر
                    </label>
                    <div style={{ display: "flex", gap: 8 }}>
                      <button type="button" onClick={saveEdit} style={messagePrimaryBtn(false)}>ذخیره ویرایش</button>
                      <button type="button" onClick={() => setEditing(false)} style={messageTabBtn(theme, false, "ghost")}>انصراف</button>
                    </div>
                    <p style={{ fontSize: "0.85em", opacity: 0.75, marginTop: 10 }}>
                      کسانی که قبلاً خوانده‌اند، پیام را دوباره به‌عنوان ابلاغ جدید/ویرایش‌شده می‌بینند.
                    </p>
                  </div>
                ) : (
                  <div style={{ whiteSpace: "pre-wrap", lineHeight: 1.85 }}>{selected.body}</div>
                )}
                {(tab === "sent" || tab === "admin") && detail?.read_status ? (
                  <MessageReadStatusPanel messageId={selected.id} theme={theme} />
                ) : null}
                {(tab === "sent" || tab === "admin") && detail?.messenger_publishes?.length ? (
                  <div style={{ marginTop: 12, fontSize: "0.92em" }}>
                    <strong>پیام‌رسان:</strong>
                    <ul style={{ paddingRight: 18 }}>
                      {detail.messenger_publishes.map((p) => (
                        <li key={p.id}>{p.channel_title || p.channel_config_id}: {p.status === "ok" ? "موفق" : p.error_message || "خطا"}</li>
                      ))}
                    </ul>
                  </div>
                ) : null}
              </>
            )}
          </div>
        </div>
      )}
    </FormPageLayout>
  );
}
