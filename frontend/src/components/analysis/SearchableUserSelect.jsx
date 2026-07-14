import React, { useCallback, useMemo } from "react";
import SearchableCombobox from "./SearchableCombobox.jsx";

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
  isDarkMode,
}) {
  const list = useMemo(() => normalizeUsers(users), [users]);

  const filterUsers = useCallback((options, q) => {
    const query = q.trim().toLowerCase();
    if (!query) return options;
    return options.filter((u) =>
      (u.name || "").toLowerCase().includes(query) ||
      (u.username || "").toLowerCase().includes(query) ||
      (u.unit_name || "").toLowerCase().includes(query),
    );
  }, []);

  const getUserLabel = useCallback((u) => u.name || u.username || "", []);

  const renderUser = useCallback((u, active) => (
    <>
      <span style={{ fontWeight: active ? 600 : 400 }}>{u.name || u.username}</span>
      {(u.username || u.unit_name) && (
        <span style={{ display: "block", fontSize: 10, opacity: 0.65, marginTop: 2 }}>
          {[u.username, u.unit_name].filter(Boolean).join(" · ")}
        </span>
      )}
    </>
  ), []);

  return (
    <SearchableCombobox
      options={list}
      value={value}
      onChange={onChange}
      getOptionValue={(u) => u.id}
      getOptionLabel={getUserLabel}
      filterOptions={filterUsers}
      renderOption={renderUser}
      placeholder={placeholder}
      emptyListMessage={emptyMessage}
      disabled={disabled}
      inputStyle={inputStyle}
      labelStyle={labelStyle}
      label={label}
      required={required}
      isDarkMode={isDarkMode}
      allowClear={!required}
      clearLabel={placeholder}
    />
  );
}

export { normalizeUsers };
