import React from "react";
import { useNavigate } from "react-router-dom";
import { Radio, ScrollText, FilePenLine } from "lucide-react";
import { getSessionRoles, hasPermission } from "../../../utils/userRoles.js";

const LINKS = [
  { path: "/command/live-news", permission: "command_live_news", title: "تالار اخبار زنده", icon: Radio },
  { path: "/command/outputs", permission: "command_outputs", title: "خروجی‌های راهبردی", icon: ScrollText },
  { path: "/command/prompts", permission: "command_manage_prompts", title: "پرامپت‌های راهبردی", icon: FilePenLine },
];

export default function CommandOpsNav({ theme, returnTo = "/command" }) {
  const navigate = useNavigate();
  const roles = getSessionRoles();
  const visible = LINKS.filter((l) => hasPermission(roles, l.permission));
  if (!visible.length) return null;

  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 14 }}>
      {visible.map((l) => {
        const Icon = l.icon;
        return (
          <button
            key={l.path}
            type="button"
            onClick={() => navigate(l.path, { state: { returnTo } })}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              background: theme.card,
              border: `1px solid ${theme.border}`,
              color: theme.text,
              borderRadius: 8,
              padding: "7px 12px",
              cursor: "pointer",
              fontFamily: "inherit",
              fontSize: 12,
              fontWeight: 600,
            }}
          >
            <Icon size={14} color={theme.accent} />
            {l.title}
          </button>
        );
      })}
    </div>
  );
}
