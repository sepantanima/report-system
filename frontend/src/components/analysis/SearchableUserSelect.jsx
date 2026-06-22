import React, { useMemo, useState } from "react";
import { Search } from "lucide-react";

function normalizeUsers(data) {
  if (Array.isArray(data)) return data;
  return data?.users || [];
}

export default function SearchableUserSelect({
  users = [],
  value,
  onChange,
  placeholder = "انتخاب کنید",
  emptyMessage = "کاربری یافت نشد",
  disabled = false,
  inputStyle = {},
  labelStyle = {},
  label,
  required = false,
}) {
  const [search, setSearch] = useState("");
  const list = useMemo(() => normalizeUsers(users), [users]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return list;
    return list.filter((u) => (u.name || u.username || "").toLowerCase().includes(q));
  }, [list, search]);

  const selected = list.find((u) => String(u.id) === String(value));

  return (
    <div>
      {label && (
        <label style={labelStyle}>
          {label}
          {required ? " *" : ""}
        </label>
      )}
      {list.length === 0 ? (
        <p style={{ fontSize: 11, color: "#94a3b8", margin: "6px 0 0", lineHeight: 1.6 }}>{emptyMessage}</p>
      ) : (
        <>
          <div style={{ position: "relative", marginBottom: 6 }}>
            <Search size={14} style={{ position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)", opacity: 0.5, pointerEvents: "none" }} />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="جستجو بر اساس نام..."
              disabled={disabled}
              style={{ ...inputStyle, paddingRight: 32, marginBottom: 0 }}
            />
          </div>
          <select
            style={inputStyle}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            disabled={disabled}
          >
            <option value="">{placeholder}</option>
            {filtered.map((u) => (
              <option key={u.id} value={u.id}>{u.name || u.username}</option>
            ))}
          </select>
          {selected && !search && (
            <p style={{ fontSize: 10, color: "#64748b", margin: "4px 0 0" }}>انتخاب‌شده: {selected.name}</p>
          )}
          {filtered.length === 0 && search && (
            <p style={{ fontSize: 11, color: "#94a3b8", margin: "6px 0 0" }}>نتیجه‌ای برای «{search}» یافت نشد</p>
          )}
        </>
      )}
    </div>
  );
}

export { normalizeUsers };
