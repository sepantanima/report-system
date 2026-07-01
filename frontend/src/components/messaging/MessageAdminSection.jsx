import React, { useCallback, useEffect, useState } from "react";
import { Loader2, Trash2 } from "lucide-react";
import messageService from "../../services/messageService.js";
import MessageReadStatusPanel from "./MessageReadStatusPanel.jsx";
import { messageFormCard, messageTabBtn } from "./messageFormUi.js";
import { formatMessageDateTime } from "../../utils/messageDateUtils.js";
import { kindLabel, priorityLabel } from "../../utils/messageLabelUtils.js";
import { toPersianDigits } from "../../utils/analysisMonitorUtils.js";

const CATALOG_FILTERS = [
  ["", "همه"],
  ["direct", "مستقیم"],
  ["announcement", "ابلاغ"],
  ["entity", "دستور"],
];

export default function MessageAdminSection({ theme, showDeleted, onToast }) {
  const [view, setView] = useState("catalog");
  const [kindFilter, setKindFilter] = useState("");
  const [catalog, setCatalog] = useState([]);
  const [broadcasts, setBroadcasts] = useState([]);
  const [pairs, setPairs] = useState([]);
  const [selectedPair, setSelectedPair] = useState(null);
  const [thread, setThread] = useState(null);
  const [selectedMsg, setSelectedMsg] = useState(null);
  const [detail, setDetail] = useState(null);
  const [loading, setLoading] = useState(true);

  const loadCatalog = useCallback(async () => {
    const rows = await messageService.adminAll({
      include_deleted: showDeleted,
      kind: kindFilter || undefined,
      limit: 200,
    });
    setCatalog(Array.isArray(rows) ? rows : []);
  }, [showDeleted, kindFilter]);

  const loadBroadcasts = useCallback(async () => {
    const rows = await messageService.adminBroadcasts();
    setBroadcasts(Array.isArray(rows) ? rows : []);
  }, []);

  const loadPairs = useCallback(async () => {
    const rows = await messageService.adminConversations();
    setPairs(Array.isArray(rows) ? rows : []);
  }, []);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      if (view === "catalog") await loadCatalog();
      else if (view === "broadcasts") await loadBroadcasts();
      else if (view === "conversations") await loadPairs();
    } catch (e) {
      onToast?.(e.response?.data?.error || "خطا در بارگذاری");
    } finally {
      setLoading(false);
    }
  }, [view, loadCatalog, loadBroadcasts, loadPairs, onToast]);

  useEffect(() => { refresh(); }, [refresh]);

  const openMessage = async (m) => {
    setSelectedMsg(m);
    try {
      setDetail(await messageService.adminMessageDetail(m.id));
    } catch {
      setDetail(null);
    }
  };

  const openPair = async (pair) => {
    setSelectedPair(pair);
    setSelectedMsg(null);
    setDetail(null);
    try {
      const data = await messageService.adminConversationThread(pair.u1, pair.u2);
      setThread(data);
    } catch (e) {
      setThread(null);
      onToast?.(e.response?.data?.error || "خطا");
    }
  };

  const permanentDelete = async (id) => {
    if (!window.confirm("پیام برای همه به‌طور قطعی حذف شود؟")) return;
    try {
      await messageService.permanentDelete(id);
      onToast?.("حذف قطعی انجام شد");
      setSelectedMsg(null);
      setDetail(null);
      await refresh();
    } catch (e) {
      onToast?.(e.response?.data?.error || "خطا");
    }
  };

  const pairLabel = (p) => {
    const n1 = p.user1_name || p.user1_username || p.u1;
    const n2 = p.user2_name || p.user2_username || p.u2;
    return `${n1} ↔ ${n2}`;
  };

  return (
    <div>
      <div style={{ display: "flex", gap: 8, marginBottom: 14, flexWrap: "wrap" }}>
        {[
          ["catalog", "دسته‌بندی همه"],
          ["broadcasts", "ابلاغ و دستور"],
          ["conversations", "گفتگوها"],
        ].map(([id, label]) => (
          <button
            key={id}
            type="button"
            onClick={() => {
              setView(id);
              setSelectedMsg(null);
              setDetail(null);
              setSelectedPair(null);
              setThread(null);
            }}
            style={messageTabBtn(theme, view === id, view === id ? "default" : "ghost")}
          >
            {label}
          </button>
        ))}
      </div>

      {view === "catalog" ? (
        <div style={{ display: "flex", gap: 6, marginBottom: 12, flexWrap: "wrap" }}>
          {CATALOG_FILTERS.map(([k, label]) => (
            <button
              key={k || "all"}
              type="button"
              onClick={() => setKindFilter(k)}
              style={messageTabBtn(theme, kindFilter === k, "ghost")}
            >
              {label}
            </button>
          ))}
        </div>
      ) : null}

      <div className="message-inbox-grid" style={{ ["--message-list-border"]: theme.border }}>
        <div style={{ ...messageFormCard(theme), padding: 0 }} className="message-list-panel">
          <div className="message-list-header" style={{ color: theme.text }}>
            {view === "catalog" && `پیام‌ها: ${toPersianDigits(String(catalog.length))}`}
            {view === "broadcasts" && `ابلاغ/دستور: ${toPersianDigits(String(broadcasts.length))}`}
            {view === "conversations" && `گفتگو: ${toPersianDigits(String(pairs.length))}`}
          </div>
          <div className="message-list-scroll">
            {loading ? <div style={{ padding: 16 }}><Loader2 className="spin" /></div> : null}
            {view === "catalog" && !loading && catalog.length === 0 ? (
              <div style={{ padding: 16, opacity: 0.7 }}>موردی نیست</div>
            ) : null}
            {view === "catalog" && catalog.map((m) => (
              <button
                key={m.id}
                type="button"
                onClick={() => openMessage(m)}
                style={{
                  display: "block",
                  width: "100%",
                  textAlign: "right",
                  padding: "10px 14px",
                  border: "none",
                  borderBottom: `1px solid ${theme.border}`,
                  background: selectedMsg?.id === m.id ? "rgba(56,189,248,0.12)" : "transparent",
                  color: theme.text,
                  cursor: "pointer",
                  fontFamily: "inherit",
                }}
              >
                <div style={{ fontWeight: 600, fontSize: 13 }}>{m.title || "پیام"}</div>
                <div style={{ opacity: 0.75, marginTop: 4, fontSize: "0.84em" }}>
                  {kindLabel(m.kind)} · {priorityLabel(m.priority)} · {m.sender_name}
                </div>
                <div style={{ opacity: 0.65, marginTop: 4, fontSize: "0.82em" }}>
                  {formatMessageDateTime(m.created_at)}
                  {m.recipient_count != null ? ` · ${toPersianDigits(String(m.read_count || 0))}/${toPersianDigits(String(m.recipient_count))} خوانده` : ""}
                </div>
              </button>
            ))}

            {view === "broadcasts" && !loading && broadcasts.length === 0 ? (
              <div style={{ padding: 16, opacity: 0.7 }}>ابلاغی ثبت نشده</div>
            ) : null}
            {view === "broadcasts" && broadcasts.map((m) => (
              <button
                key={m.id}
                type="button"
                onClick={() => openMessage(m)}
                style={{
                  display: "block",
                  width: "100%",
                  textAlign: "right",
                  padding: "10px 14px",
                  border: "none",
                  borderBottom: `1px solid ${theme.border}`,
                  background: selectedMsg?.id === m.id ? "rgba(56,189,248,0.12)" : "transparent",
                  color: theme.text,
                  cursor: "pointer",
                  fontFamily: "inherit",
                }}
              >
                <div style={{ fontWeight: 600, fontSize: 13 }}>
                  <span style={{ color: m.priority === "order" ? "#f87171" : "#38bdf8", marginLeft: 6 }}>
                    {kindLabel(m.kind)}
                  </span>
                  {m.title || "بدون عنوان"}
                </div>
                <div style={{ opacity: 0.7, marginTop: 4, fontSize: "0.84em" }}>
                  {m.sender_name} · {formatMessageDateTime(m.created_at)}
                </div>
                <div style={{ marginTop: 6, fontSize: "0.82em", color: "#38bdf8" }}>
                  مشاهده: {toPersianDigits(String(m.read_count || 0))} از {toPersianDigits(String(m.recipient_count || 0))}
                  {m.dismissed_count ? ` · بنر بسته: ${toPersianDigits(String(m.dismissed_count))}` : ""}
                </div>
              </button>
            ))}

            {view === "conversations" && !loading && pairs.length === 0 ? (
              <div style={{ padding: 16, opacity: 0.7 }}>گفتگوی مستقیمی نیست</div>
            ) : null}
            {view === "conversations" && pairs.map((p) => (
              <button
                key={`${p.u1}-${p.u2}`}
                type="button"
                onClick={() => openPair(p)}
                style={{
                  display: "block",
                  width: "100%",
                  textAlign: "right",
                  padding: "10px 14px",
                  border: "none",
                  borderBottom: `1px solid ${theme.border}`,
                  background: selectedPair?.u1 === p.u1 && selectedPair?.u2 === p.u2 ? "rgba(56,189,248,0.12)" : "transparent",
                  color: theme.text,
                  cursor: "pointer",
                  fontFamily: "inherit",
                }}
              >
                <div style={{ fontWeight: 600, fontSize: 13 }}>{pairLabel(p)}</div>
                <div style={{ opacity: 0.7, marginTop: 4, fontSize: "0.84em" }}>
                  {toPersianDigits(String(p.message_count))} پیام · آخرین: {formatMessageDateTime(p.last_at)}
                </div>
              </button>
            ))}
          </div>
        </div>

        <div className="message-detail-panel" style={{ ...messageFormCard(theme), minHeight: 280 }}>
          {view === "conversations" && thread ? (
            <>
              <h3 style={{ margin: "0 0 12px", fontSize: "1.05em" }}>
                گفتگوی {thread.user_a?.name || thread.user_a?.username} و {thread.user_b?.name || thread.user_b?.username}
              </h3>
              <div style={{ maxHeight: "min(60vh, 480px)", overflowY: "auto", display: "flex", flexDirection: "column", gap: 10 }}>
                {thread.messages.map((m) => (
                  <div
                    key={m.id}
                    style={{
                      padding: "10px 12px",
                      borderRadius: 10,
                      background: "rgba(56,189,248,0.08)",
                      border: `1px solid ${theme.border}`,
                    }}
                  >
                    <div style={{ fontSize: 12, fontWeight: 700, color: theme.muted, marginBottom: 4 }}>
                      {m.sender_name || m.sender_username} · {formatMessageDateTime(m.created_at)}
                    </div>
                    {m.title ? <div style={{ fontWeight: 600, marginBottom: 4 }}>{m.title}</div> : null}
                    <div style={{ whiteSpace: "pre-wrap", lineHeight: 1.75, fontSize: "0.92em" }}>{m.body}</div>
                  </div>
                ))}
              </div>
            </>
          ) : selectedMsg && detail ? (
            <>
              <div style={{ display: "flex", justifyContent: "space-between", gap: 8, flexWrap: "wrap", marginBottom: 8 }}>
                <h3 style={{ margin: 0, fontSize: "1.05em" }}>{detail.title || "پیام"}</h3>
                <button
                  type="button"
                  onClick={() => permanentDelete(detail.id)}
                  style={{ ...messageTabBtn(theme, false, "ghost"), color: "#ef4444", display: "inline-flex", alignItems: "center", gap: 4 }}
                >
                  <Trash2 size={14} /> حذف قطعی
                </button>
              </div>
              <div style={{ color: theme.muted, fontSize: "0.9em", marginBottom: 10 }}>
                {kindLabel(detail.kind)} · {priorityLabel(detail.priority)} · {detail.sender_name}
                {detail.created_at ? ` · ${formatMessageDateTime(detail.created_at)}` : ""}
              </div>
              <div style={{ whiteSpace: "pre-wrap", lineHeight: 1.85, marginBottom: 12 }}>{detail.body}</div>
              {detail.read_status ? (
                <MessageReadStatusPanel
                  messageId={detail.id}
                  theme={theme}
                  data={detail.read_status}
                  defaultOpen={view === "broadcasts"}
                  showUnread
                />
              ) : null}
              {detail.messenger_publishes?.length ? (
                <div style={{ marginTop: 12, fontSize: "0.92em" }}>
                  <strong>انتشار پیام‌رسان:</strong>
                  <ul style={{ paddingRight: 18 }}>
                    {detail.messenger_publishes.map((p) => (
                      <li key={p.id}>{p.channel_title || p.channel_config_id}: {p.status === "ok" ? "موفق" : p.error_message || "خطا"}</li>
                    ))}
                  </ul>
                </div>
              ) : null}
            </>
          ) : (
            <div style={{ opacity: 0.7 }}>
              {view === "conversations" ? "یک گفتگو را انتخاب کنید" : "یک پیام را انتخاب کنید"}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
