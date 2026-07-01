import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { createPortal } from "react-dom";

import { useNavigate } from "react-router-dom";

import { Bell } from "lucide-react";

import messageService from "../../services/messageService.js";

import { toPersianDigits } from "../../utils/analysisMonitorUtils.js";

import { formatMessageDateTime } from "../../utils/messageDateUtils.js";

import { useAppTheme } from "../../context/ThemeContext.jsx";



export default function NotificationBell({ isDarkMode: isDarkModeProp }) {

  const { isDarkMode: themeIsDark } = useAppTheme();

  const isDarkMode = isDarkModeProp ?? themeIsDark;

  const panel = useMemo(() => ({

    bg: isDarkMode ? "#1e293b" : "#ffffff",

    text: isDarkMode ? "#e2e8f0" : "#1e293b",

    subText: isDarkMode ? "rgba(226,232,240,0.75)" : "#64748b",

    border: isDarkMode ? "rgba(255,255,255,0.12)" : "#e2e8f0",

    divider: isDarkMode ? "rgba(255,255,255,0.08)" : "#e2e8f0",

    itemDivider: isDarkMode ? "rgba(255,255,255,0.06)" : "#f1f5f9",

    footerBg: isDarkMode ? "rgba(56,189,248,0.12)" : "rgba(14,165,233,0.1)",

    link: isDarkMode ? "#7dd3fc" : "#0284c7",

  }), [isDarkMode]);

  const navigate = useNavigate();

  const [count, setCount] = useState(0);

  const [open, setOpen] = useState(false);

  const [preview, setPreview] = useState([]);

  const [menuStyle, setMenuStyle] = useState(null);

  const boxRef = useRef(null);

  const menuRef = useRef(null);

  const triggerRef = useRef(null);



  const refresh = useCallback(async () => {

    try {

      const [c, inbox] = await Promise.all([

        messageService.unreadCount(),

        messageService.inbox({ unread_only: true, limit: 5 }),

      ]);

      setCount(c);

      setPreview(Array.isArray(inbox) ? inbox : []);

    } catch {

      setCount(0);

    }

  }, []);



  const updateMenuPosition = useCallback(() => {

    if (!triggerRef.current) return;

    const rect = triggerRef.current.getBoundingClientRect();

    const margin = 8;

    const vw = window.innerWidth;

    const width = Math.min(320, vw - margin * 2);

    let left = rect.left;

    if (left + width > vw - margin) left = vw - width - margin;

    if (left < margin) left = margin;

    const spaceBelow = window.innerHeight - rect.bottom - margin;

    const maxH = Math.min(360, Math.max(160, spaceBelow - 6));

    const openUp = spaceBelow < 200 && rect.top > spaceBelow;

    const top = openUp ? Math.max(margin, rect.top - maxH - 6) : rect.bottom + 6;

    setMenuStyle({ position: "fixed", top, left, width, maxHeight: maxH, zIndex: 5000 });

  }, []);



  useEffect(() => {

    refresh();

    const t = setInterval(refresh, 60000);

    return () => clearInterval(t);

  }, [refresh]);



  useEffect(() => {

    const onDoc = (e) => {

      if (boxRef.current?.contains(e.target)) return;

      if (menuRef.current?.contains(e.target)) return;

      setOpen(false);

    };

    document.addEventListener("mousedown", onDoc);

    return () => document.removeEventListener("mousedown", onDoc);

  }, []);



  useEffect(() => {

    if (!open) {

      setMenuStyle(null);

      return undefined;

    }

    updateMenuPosition();

    const onMove = () => updateMenuPosition();

    window.addEventListener("scroll", onMove, true);

    window.addEventListener("resize", onMove);

    return () => {

      window.removeEventListener("scroll", onMove, true);

      window.removeEventListener("resize", onMove);

    };

  }, [open, updateMenuPosition]);



  const openMessage = async (id) => {

    try {

      await messageService.markRead(id);

    } catch { /* ignore */ }

    setOpen(false);

    navigate("/messages", { state: { openId: id } });

    refresh();

  };



  const menu = open && menuStyle ? (

    <div

      ref={menuRef}

      style={{

        ...menuStyle,

        background: panel.bg,

        color: panel.text,

        border: `1px solid ${panel.border}`,

        borderRadius: 10,

        boxShadow: "0 8px 24px rgba(0,0,0,0.35)",

        display: "flex",

        flexDirection: "column",

        overflow: "hidden",

      }}

    >

      <div style={{ padding: "8px 12px", fontSize: 12, fontWeight: 700, flexShrink: 0, borderBottom: `1px solid ${panel.divider}` }}>

        پیام‌های نخوانده ({toPersianDigits(String(count))})

      </div>

      <div style={{ overflowY: "auto", flex: 1, minHeight: 0 }}>

        {preview.length === 0 ? (

          <div style={{ padding: 16, fontSize: 12, color: panel.subText, textAlign: "center" }}>پیام جدیدی نیست</div>

        ) : (

          preview.map((m) => (

            <button

              key={m.id}

              type="button"

              onClick={() => openMessage(m.id)}

              style={{

                display: "block",

                width: "100%",

                textAlign: "right",

                padding: "10px 12px",

                border: "none",

                borderBottom: `1px solid ${panel.itemDivider}`,

                background: "transparent",

                color: panel.text,

                cursor: "pointer",

                fontFamily: "inherit",

              }}

            >

              <div style={{ fontWeight: 600, fontSize: 12 }}>

                {m.title || "پیام"}

                {m.is_edited ? <span style={{ color: "#f59e0b", marginRight: 6, fontSize: 10 }}>ویرایش‌شده</span> : null}

              </div>

              <div style={{ fontSize: 11, color: panel.subText, marginTop: 4, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>

                {m.body}

              </div>

              {m.created_at ? (

                <div style={{ fontSize: 10, color: panel.subText, marginTop: 4 }}>

                  {formatMessageDateTime(m.created_at)}

                </div>

              ) : null}

            </button>

          ))

        )}

      </div>

      <button

        type="button"

        onClick={() => { setOpen(false); navigate("/messages"); }}

        style={{

          width: "100%",

          padding: 10,

          border: "none",

          background: panel.footerBg,

          color: panel.link,

          cursor: "pointer",

          fontFamily: "inherit",

          fontSize: 12,

          fontWeight: 600,

          flexShrink: 0,

        }}

      >

        مشاهده همه پیام‌ها

      </button>

    </div>

  ) : null;



  return (

    <div ref={boxRef} style={{ position: "relative", display: "inline-flex" }}>

      <button

        ref={triggerRef}

        type="button"

        className="v3-icon-btn"

        title="پیام‌ها"

        aria-label="پیام‌ها"

        onClick={() => setOpen((v) => !v)}

        style={{ position: "relative" }}

      >

        <Bell size={18} />

        {count > 0 ? (

          <span

            style={{

              position: "absolute",

              top: 2,

              left: 2,

              minWidth: 16,

              height: 16,

              borderRadius: 8,

              background: "#ef4444",

              color: "#fff",

              fontSize: 10,

              fontWeight: "bold",

              display: "flex",

              alignItems: "center",

              justifyContent: "center",

              padding: "0 4px",

            }}

          >

            {toPersianDigits(String(count > 99 ? "99+" : count))}

          </span>

        ) : null}

      </button>

      {typeof document !== "undefined" && menu ? createPortal(menu, document.body) : null}

    </div>

  );

}


