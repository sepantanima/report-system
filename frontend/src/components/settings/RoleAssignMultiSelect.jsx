import React, { useMemo } from "react";
import MultiSelect from "../MultiSelect.jsx";

/** ترتیب نمایش گروه‌های نقش در dropdown */
const ROLE_GROUP_ORDER = {
  user: 0,
  admin: 1,
  tech_admin: 1,
  Field_admin: 1,
  analysis_manager: 2,
  analyst: 2,
  mentor: 2,
  topic_proposer: 2,
  topic_approver: 2,
  news_monitor: 3,
  news_editor: 3,
  news_chief: 3,
  strategy_viewer: 4,
  strategy_commander: 4,
  strategy_analysis_manager: 4,
};

function roleSortKey(roleId) {
  return ROLE_GROUP_ORDER[roleId] ?? 9;
}

export default function RoleAssignMultiSelect({
  roles = [],
  values = [],
  onChange,
  theme,
  isDarkMode,
  disabled = false,
}) {
  const options = useMemo(
    () =>
      [...roles]
        .sort(
          (a, b) =>
            roleSortKey(a.id) - roleSortKey(b.id)
            || (a.label || "").localeCompare(b.label || "", "fa"),
        )
        .map((r) => ({ value: r.id, label: r.label })),
    [roles],
  );

  const handleChange = (next) => {
    if (!next?.length) {
      onChange(["user"]);
      return;
    }
    onChange(next);
  };

  const multiTheme = useMemo(
    () => ({
      card: theme?.card,
      border: theme?.border,
      text: theme?.text,
      bg: theme?.inputBg,
      isDarkMode: isDarkMode !== false,
    }),
    [theme, isDarkMode],
  );

  return (
    <div>
      <MultiSelect
        options={options}
        values={values}
        onChange={handleChange}
        disabled={disabled}
        theme={multiTheme}
        placeholder="یک یا چند نقش انتخاب کنید…"
        searchPlaceholder="جستجو نقش (مثلاً تحلیل‌گر، پایشگر، مدیر)…"
      />
      <p style={{ margin: "8px 0 0", fontSize: 11, color: theme?.muted || "inherit", lineHeight: 1.7 }}>
        {values.length
          ? `${values.length} نقش فعال — با × روی هر برچسب می‌توانید حذف کنید. حداقل یک نقش باید باقی بماند.`
          : "حداقل یک نقش (معمولاً «کاربر واحد») برای ورود به سامانه لازم است."}
      </p>
    </div>
  );
}
