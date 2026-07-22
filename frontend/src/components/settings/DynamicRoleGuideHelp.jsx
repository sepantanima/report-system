import React, { useEffect, useState, useMemo } from "react";
import api from "../../api/api";
import { ROLE_LABELS } from "../../utils/userRoles.js";
import { AnalystSuggestionWorkflowHelp } from "../../content/analystSuggestionHelp.jsx";

const UI_LEGACY_ROLE_MAP = { system_admin: "admin" };

const MODULE_LABELS = {
  general: "عمومی",
  news: "اخبار",
  analysis: "تحلیل",
  admin: "مدیریت سامانه",
  command: "راهبرد",
  sync: "همگام‌سازی",
  rbac: "دسترسی و نقش",
};

function roleDisplayLabel(code, labelFa) {
  const uiCode = UI_LEGACY_ROLE_MAP[code] || code;
  return labelFa || ROLE_LABELS[uiCode] || ROLE_LABELS[code] || code;
}

function RolePermissionsBlock({ role }) {
  const grouped = useMemo(() => {
    const map = new Map();
    for (const p of role.permissions || []) {
      const mod = p.module || "general";
      if (!map.has(mod)) map.set(mod, []);
      map.get(mod).push(p);
    }
    return [...map.entries()].sort((a, b) => a[0].localeCompare(b[0], "fa"));
  }, [role.permissions]);

  return (
    <div style={{ marginTop: 14, paddingBottom: 8, borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
      <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 6, color: "#38bdf8" }}>
        {roleDisplayLabel(role.code, role.label_fa)}
      </div>
      {grouped.length === 0 ? (
        <p style={{ margin: 0, fontSize: 12, opacity: 0.65 }}>مجوزی به این نقش تخصیص داده نشده است.</p>
      ) : (
        grouped.map(([mod, perms]) => (
          <div key={mod} style={{ marginBottom: 10 }}>
            <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 4, opacity: 0.85 }}>
              {MODULE_LABELS[mod] || mod}
            </div>
            <ul style={{ paddingRight: 18, margin: "4px 0", lineHeight: 1.85, fontSize: 12 }}>
              {perms.map((p) => (
                <li key={p.code}>
                  <b>{p.label_fa || p.code}</b>
                  {p.description_fa ? ` — ${p.description_fa}` : ""}
                </li>
              ))}
            </ul>
          </div>
        ))
      )}
    </div>
  );
}

export default function DynamicRoleGuideHelp() {
  const [roles, setRoles] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    api.get("/users/role-guide")
      .then((res) => {
        if (!cancelled) {
          setRoles(res.data?.roles || []);
          setError("");
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setRoles([]);
          setError(err.response?.data?.error || "بارگذاری راهنمای نقش‌ها ممکن نشد");
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, []);

  return (
    <div style={{ fontSize: 13, lineHeight: 1.9, textAlign: "justify" }}>
      <p>
        هر کاربر می‌تواند <b>چند نقش هم‌زمان</b> داشته باشد. منوی صفحه اصلی، اجتماع مجوزهای همه نقش‌های فعال اوست.
      </p>
      <p style={{ marginTop: 8, fontSize: 12, opacity: 0.85 }}>
        فهرست مجوزهای هر نقش در زیر از <b>تنظیمات زنده RBAC</b> خوانده می‌شود — اگر در «مدیریت نقش و مجوز» تغییری
        بدهید، همین راهنما پس از باز کردن مجدد به‌روز است.
      </p>

      <div style={{ marginTop: 18, marginBottom: 18, paddingTop: 12, borderTop: "1px solid rgba(255,255,255,0.08)" }}>
        <AnalystSuggestionWorkflowHelp />
      </div>

      <div style={{ marginTop: 8, marginBottom: 10, fontSize: 13, fontWeight: 700, color: "#38bdf8" }}>
        نقش‌ها و مجوزهای فعلی سامانه
      </div>

      {loading && <p style={{ opacity: 0.6, fontSize: 12 }}>در حال بارگذاری…</p>}
      {error && !loading && (
        <p style={{ color: "#f87171", fontSize: 12 }}>{error}</p>
      )}
      {!loading && roles?.map((role) => (
        <RolePermissionsBlock key={role.code} role={role} />
      ))}
    </div>
  );
}
