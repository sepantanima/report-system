import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Loader2, Pencil, Send, Trash2 } from "lucide-react";
import FormPageLayout from "../components/common/FormPageLayout.jsx";
import MultiSelect from "../components/MultiSelect.jsx";
import MessageReadStatusPanel from "../components/messaging/MessageReadStatusPanel.jsx";
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
import { ROLE_LABELS, getSessionRoles, hasRole } from "../utils/userRoles.js";
import { useAppTheme } from "../context/ThemeContext.jsx";
import { toPersianDigits } from "../utils/analysisMonitorUtils.js";
import { formatMessageDateTime } from "../utils/messageDateUtils.js";
import { priorityLabel } from "../utils/messageLabelUtils.js";
import { MESSAGE_ANNOUNCEMENT_HELP, MESSAGE_PRIORITY_HINTS } from "../content/messageFormHelp.jsx";

const TARGET_TYPES = [
  { value: "all", label: "همه کاربران" },
  { value: "role", label: "نقش" },
  { value: "unit", label: "واحد" },
];

const ROLE_OPTIONS = Object.entries(ROLE_LABELS).map(([value, label]) => ({ value, label }));

const EMPTY_FORM = {
  title: "",
  body: "",
  priority: "important",
  show_as_banner: true,
  target_type: "all",
  target_values: [],
  channel_config_ids: [],
};

function buildTargets(form) {
  if (form.target_type === "all") return [{ target_type: "all", target_value: null }];
  if (form.target_type === "role") {
    return (form.target_values || []).map((v) => ({ target_type: "role", target_value: v }));
  }
  if (form.target_type === "unit") {
    return (form.target_values || []).map((v) => ({ target_type: "unit", target_value: v }));
  }
  return [];
}

function unitToOption(u) {
  const short = u.unit_short_name || u.unit_name || "واحد";
  const full = u.unit_name && u.unit_name !== short ? ` (${u.unit_name})` : "";
  return { value: String(u.unit_cd), label: `${short}${full} — ${u.unit_cd}` };
}

export default function ComposeAnnouncementPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const allowed = hasRole(getSessionRoles(), "admin", "Field_admin", "news_chief");
  const { isDarkMode } = useAppTheme();
  const [pageTab, setPageTab] = useState(location.state?.tab === "sent" ? "sent" : "compose");
  const [form, setForm] = useState({ ...EMPTY_FORM });
  const [channels, setChannels] = useState([]);
  const [unitOptions, setUnitOptions] = useState([]);
  const [audienceCount, setAudienceCount] = useState(null);
  const [sentList, setSentList] = useState([]);
  const [sentLoading, setSentLoading] = useState(false);
  const [selected, setSelected] = useState(null);
  const [detail, setDetail] = useState(null);
  const [editing, setEditing] = useState(false);
  const [editForm, setEditForm] = useState({ title: "", body: "", priority: "important", show_as_banner: true });
  const [sending, setSending] = useState(false);
  const [toast, setToast] = useState("");

  const theme = useMemo(() => ({
    card: isDarkMode ? "#1e293b" : "#fff",
    border: isDarkMode ? "rgba(255,255,255,0.1)" : "#e2e8f0",
    text: isDarkMode ? "#f1f5f9" : "#1e293b",
    input: isDarkMode ? "#0f172a" : "#f8fafc",
    bg: isDarkMode ? "#0f172a" : "#f8fafc",
    muted: isDarkMode ? "#94a3b8" : "#64748b",
    isDarkMode,
  }), [isDarkMode]);

  const announcements = useMemo(
    () => sentList.filter((m) => m.kind === "announcement"),
    [sentList],
  );

  const showToast = useCallback((msg) => {
    setToast(msg);
    setTimeout(() => setToast(""), 3500);
  }, []);

  const loadUnits = useCallback(async (q) => {
    try {
      const rows = await messageService.searchUnits(q);
      setUnitOptions((Array.isArray(rows) ? rows : []).map(unitToOption));
    } catch {
      setUnitOptions([]);
    }
  }, []);

  const loadSent = useCallback(async () => {
    setSentLoading(true);
    try {
      const rows = await messageService.sent();
      setSentList(Array.isArray(rows) ? rows : []);
    } catch {
      setSentList([]);
    } finally {
      setSentLoading(false);
    }
  }, []);

  const openAnnouncement = useCallback(async (m) => {
    setSelected(m);
    setEditing(false);
    try {
      setDetail(await messageService.sentDetail(m.id));
    } catch {
      setDetail(null);
    }
  }, []);

  useEffect(() => {
    if (!allowed) return;
    messageService.alertDestinations().then(setChannels).catch(() => setChannels([]));
    loadSent();
  }, [allowed, loadSent]);

  useEffect(() => {
    if (!allowed || form.target_type !== "unit") return;
    loadUnits("");
  }, [form.target_type, allowed, loadUnits]);

  useEffect(() => {
    if (!allowed || pageTab !== "compose") return;
    const targets = buildTargets(form);
    if (!targets.length) {
      setAudienceCount(null);
      return;
    }
    if (form.target_type !== "all" && !(form.target_values || []).length) {
      setAudienceCount(null);
      return;
    }
    messageService.previewAudience(targets).then((r) => setAudienceCount(r.count)).catch(() => setAudienceCount(null));
  }, [form.target_type, form.target_values, allowed, pageTab]);

  useEffect(() => {
    const openId = location.state?.openId;
    if (!openId || !announcements.length) return;
    const m = announcements.find((x) => String(x.id) === String(openId));
    if (!m) return;
    setPageTab("sent");
    openAnnouncement(m);
    navigate(location.pathname, { replace: true, state: { tab: "sent" } });
  }, [location.state?.openId, announcements, location.pathname, navigate, openAnnouncement]);

  const toggleChannel = (id) => {
    setForm((f) => {
      const ids = f.channel_config_ids.includes(id)
        ? f.channel_config_ids.filter((x) => x !== id)
        : [...f.channel_config_ids, id];
      return { ...f, channel_config_ids: ids };
    });
  };

  const resetComposeForm = () => {
    setForm({ ...EMPTY_FORM });
    setAudienceCount(null);
  };

  const submit = async () => {
    const err = validateMessagePayload(form, { requireTitle: true });
    if (err) return showToast(err);
    const targets = buildTargets(form);
    if (!targets.length) return showToast("مخاطب را مشخص کنید");
    if (form.target_type !== "all" && !(form.target_values || []).length) {
      return showToast("حداقل یک نقش یا واحد انتخاب کنید");
    }
    setSending(true);
    try {
      const res = await messageService.sendAnnouncement({
        title: form.title,
        body: form.body,
        priority: form.priority,
        show_as_banner: form.show_as_banner,
        targets,
        channel_config_ids: form.channel_config_ids,
      });
      resetComposeForm();
      setPageTab("sent");
      await loadSent();
      const row = { id: res.id, kind: "announcement", title: res.title, body: res.body, priority: res.priority, show_as_banner: res.show_as_banner, created_at: res.created_at, read_count: 0, recipient_count: res.recipient_count };
      await openAnnouncement(row);
      showToast("ابلاغ ثبت شد");
    } catch (e) {
      showToast(e.response?.data?.error || "خطا");
    } finally {
      setSending(false);
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
      showToast("ابلاغ ویرایش شد؛ خوانندگان قبلی آن را دوباره به‌عنوان جدید می‌بینند");
      setEditing(false);
      const rows = await messageService.sent();
      const list = Array.isArray(rows) ? rows : [];
      setSentList(list);
      const refreshed = list.find((x) => String(x.id) === String(selected.id));
      if (refreshed) setSelected(refreshed);
      setDetail(await messageService.sentDetail(selected.id));
    } catch (e) {
      showToast(e.response?.data?.error || "خطا");
    }
  };

  const removeSent = async () => {
    if (!selected) return;
    if (!window.confirm("این ابلاغ از لیست ارسالی شما حذف شود؟")) return;
    try {
      await messageService.deleteSent(selected.id);
      setSelected(null);
      setDetail(null);
      setEditing(false);
      showToast("ابلاغ حذف شد");
      await loadSent();
    } catch (e) {
      showToast(e.response?.data?.error || "خطا در حذف");
    }
  };

  if (!allowed) {
    return (
      <div style={{ padding: 24, textAlign: "center" }}>
        <p>دسترسی مجاز نیست</p>
        <button type="button" onClick={() => navigate("/main")}>بازگشت</button>
      </div>
    );
  }

  const inp = messageInput(theme);
  const inpArea = messageInput(theme, true);

  return (
    <FormPageLayout
      title="صدور ابلاغ"
      documentTitle="صدور ابلاغ"
      backTo="/messages"
      maxWidth={MESSAGE_FORM_WIDTH}
      wide
      onHelp={() => <MESSAGE_ANNOUNCEMENT_HELP />}
      helpTitle="راهنمای صدور ابلاغ"
    >
      <style>{MESSAGE_PAGE_CSS}</style>
      {toast ? (
        <div style={{ marginBottom: 10, padding: 10, borderRadius: 10, background: "rgba(14,165,233,0.15)" }}>
          {toast}
        </div>
      ) : null}

      <div className="message-tab-row" style={{ display: "flex", gap: 8, marginBottom: 18, flexWrap: "wrap" }}>
        <button
          type="button"
          onClick={() => { setPageTab("compose"); setSelected(null); setDetail(null); setEditing(false); }}
          style={messageTabBtn(theme, pageTab === "compose", "warn")}
        >
          صدور جدید
        </button>
        <button
          type="button"
          onClick={() => { setPageTab("sent"); setEditing(false); loadSent(); }}
          style={messageTabBtn(theme, pageTab === "sent", "default")}
        >
          ابلاغ‌های من ({toPersianDigits(String(announcements.length))})
        </button>
      </div>

      {pageTab === "compose" ? (
        <div style={messageFormCard(theme)}>
          <label style={{ fontWeight: 600 }}>عنوان ابلاغ</label>
          <input style={{ ...inp, marginTop: 4, marginBottom: 12 }} maxLength={MESSAGE_TITLE_MAX} value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} />

          <label style={{ fontWeight: 600 }}>متن ({toPersianDigits(String(MESSAGE_BODY_MAX))} کاراکتر)</label>
          <textarea style={{ ...inpArea, marginTop: 4 }} maxLength={MESSAGE_BODY_MAX} value={form.body} onChange={(e) => setForm((f) => ({ ...f, body: e.target.value }))} />
          <div style={{ opacity: 0.7, marginBottom: 14, fontSize: "0.86em" }}>
            {toPersianDigits(String(form.body.length))} / {toPersianDigits(String(MESSAGE_BODY_MAX))}
          </div>

          <label style={{ fontWeight: 600 }}>اولویت</label>
          <select style={{ ...inp, marginTop: 4, marginBottom: 6 }} value={form.priority} onChange={(e) => setForm((f) => ({ ...f, priority: e.target.value }))}>
            <option value="normal">عادی</option>
            <option value="important">مهم</option>
            <option value="order">دستور / ابلاغ</option>
          </select>
          <div style={{ lineHeight: 1.85, padding: "10px 12px", marginBottom: 14, borderRadius: 8, background: "rgba(56,189,248,0.08)", border: "1px solid rgba(56,189,248,0.2)", color: theme.text, fontSize: "0.92em" }}>
            {MESSAGE_PRIORITY_HINTS[form.priority]}
          </div>

          <label style={{ fontWeight: 600, display: "block", marginBottom: 8 }}>مخاطب</label>
          <div className="message-audience-row">
            <div className="message-audience-type">
              <select
                style={{ ...inp, marginBottom: 0 }}
                value={form.target_type}
                onChange={(e) => setForm((f) => ({ ...f, target_type: e.target.value, target_values: [] }))}
              >
                {TARGET_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
            </div>
            {form.target_type === "role" ? (
              <div className="message-audience-values">
                <MultiSelect
                  options={ROLE_OPTIONS}
                  values={form.target_values}
                  onChange={(v) => setForm((f) => ({ ...f, target_values: v }))}
                  placeholder="انتخاب نقش..."
                  searchPlaceholder="جستجوی نقش..."
                  theme={theme}
                />
              </div>
            ) : null}
            {form.target_type === "unit" ? (
              <div className="message-audience-values">
                <MultiSelect
                  options={unitOptions}
                  values={form.target_values}
                  onChange={(v) => setForm((f) => ({ ...f, target_values: v }))}
                  placeholder="انتخاب واحد..."
                  searchPlaceholder="جستجو با نام، نام کوتاه یا کد واحد..."
                  theme={theme}
                  remoteSearch
                  onSearchChange={loadUnits}
                />
              </div>
            ) : null}
          </div>

          {audienceCount != null ? (
            <div style={{ marginBottom: 12, color: "#38bdf8", fontSize: "0.92em" }}>
              مخاطب تقریبی: {toPersianDigits(String(audienceCount))} نفر
            </div>
          ) : null}

          <label style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
            <input type="checkbox" checked={form.show_as_banner} onChange={(e) => setForm((f) => ({ ...f, show_as_banner: e.target.checked }))} />
            نمایش به‌صورت بنر در سامانه
          </label>

          {channels.length ? (
            <div style={{ marginBottom: 16 }}>
              <div style={{ fontWeight: 600, marginBottom: 8 }}>انتشار در پیام‌رسان (کانال ابلاغ)</div>
              {channels.map((c) => (
                <label key={c.id} style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                  <input type="checkbox" checked={form.channel_config_ids.includes(c.id)} onChange={() => toggleChannel(c.id)} />
                  {c.title_fa || c.provider_type} (#{c.id})
                </label>
              ))}
            </div>
          ) : null}

          <button type="button" disabled={sending} onClick={submit} style={{ ...messagePrimaryBtn(sending), background: sending ? "rgba(245,158,11,0.45)" : "linear-gradient(135deg, #f59e0b, #ea580c)", boxShadow: sending ? "none" : "0 4px 14px rgba(245,158,11,0.35)" }}>
            {sending ? <Loader2 size={16} className="spin" /> : <Send size={16} />}
            صدور ابلاغ
          </button>
        </div>
      ) : (
        <div className="message-inbox-grid" style={{ ["--message-list-border"]: theme.border }}>
          <div style={{ ...messageFormCard(theme), padding: 0 }} className="message-list-panel">
            <div className="message-list-header" style={{ color: theme.text }}>
              <span>تعداد: {toPersianDigits(String(announcements.length))}</span>
            </div>
            <div className="message-list-scroll">
              {sentLoading ? <div style={{ padding: 16 }}><Loader2 className="spin" /></div> : null}
              {!sentLoading && announcements.length === 0 ? (
                <div style={{ padding: 16, opacity: 0.7 }}>هنوز ابلاغی صادر نکرده‌اید</div>
              ) : null}
              {announcements.map((m) => {
                const isActive = selected && String(selected.id) === String(m.id);
                const read = m.read_count ?? 0;
                const total = m.recipient_count ?? 0;
                return (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => openAnnouncement(m)}
                    style={{
                      width: "100%",
                      border: "none",
                      background: isActive ? "rgba(56,189,248,0.12)" : "transparent",
                      color: theme.text,
                      textAlign: "right",
                      cursor: "pointer",
                      fontFamily: "inherit",
                      padding: "12px 14px",
                      borderBottom: `1px solid ${theme.border}`,
                    }}
                  >
                    <div style={{ fontWeight: 600 }}>
                      {m.title || "ابلاغ"}
                      {m.is_edited || m.edited_at ? (
                        <span style={{ color: "#f59e0b", fontSize: "0.82em", marginRight: 6 }}>ویرایش‌شده</span>
                      ) : null}
                    </div>
                    <div style={{ opacity: 0.7, marginTop: 4, fontSize: "0.86em" }}>
                      {formatMessageDateTime(m.created_at)}
                      {total > 0 ? ` · مشاهده: ${toPersianDigits(String(read))}/${toPersianDigits(String(total))}` : ""}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="message-detail-panel" style={{ ...messageFormCard(theme), minHeight: 220 }}>
            {!selected ? (
              <div style={{ opacity: 0.7 }}>یک ابلاغ را انتخاب کنید</div>
            ) : (
              <>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 10, marginBottom: 8, flexWrap: "wrap" }}>
                  <h3 style={{ margin: 0, fontSize: "1.05em" }}>{selected.title || "ابلاغ"}</h3>
                  <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                    {!editing ? (
                      <button
                        type="button"
                        onClick={() => startEdit(selected)}
                        style={{ ...messageTabBtn(theme, false, "ghost"), display: "inline-flex", alignItems: "center", gap: 6 }}
                      >
                        <Pencil size={15} /> ویرایش
                      </button>
                    ) : null}
                    <button
                      type="button"
                      onClick={removeSent}
                      style={{ ...messageTabBtn(theme, false, "ghost"), display: "inline-flex", alignItems: "center", gap: 6, color: "#f87171" }}
                    >
                      <Trash2 size={15} /> حذف
                    </button>
                  </div>
                </div>
                <div style={{ color: theme.muted, marginBottom: 12, fontSize: "0.9em" }}>
                  {priorityLabel(selected.priority)}
                  {selected.created_at ? ` · ${formatMessageDateTime(selected.created_at)}` : ""}
                  {selected.edited_at ? ` · ویرایش: ${formatMessageDateTime(selected.edited_at)}` : ""}
                </div>
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
                      کسانی که قبلاً خوانده‌اند، ابلاغ را دوباره به‌عنوان جدید/ویرایش‌شده می‌بینند.
                    </p>
                  </div>
                ) : (
                  <div style={{ whiteSpace: "pre-wrap", lineHeight: 1.85, marginBottom: 12 }}>{selected.body}</div>
                )}
                <MessageReadStatusPanel
                  messageId={selected.id}
                  theme={theme}
                  defaultOpen
                  showUnread
                />
                {detail?.messenger_publishes?.length ? (
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
