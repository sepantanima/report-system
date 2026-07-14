import React from "react";
import SearchableCombobox from "./SearchableCombobox.jsx";

/** Single-select combobox with built-in search (for static option lists). */
export default function SearchableOptionSelect({
  options = [],
  value,
  onChange,
  placeholder = "انتخاب کنید",
  disabled = false,
  inputStyle = {},
  labelStyle = {},
  label,
  isDarkMode,
  allowEmpty = false,
  emptyLabel = "—",
}) {
  return (
    <SearchableCombobox
      options={options}
      value={value}
      onChange={onChange}
      getOptionValue={(o) => o.value}
      getOptionLabel={(o) => o.label}
      placeholder={placeholder}
      disabled={disabled}
      inputStyle={inputStyle}
      labelStyle={labelStyle}
      label={label}
      isDarkMode={isDarkMode}
      allowClear={allowEmpty}
      clearLabel={emptyLabel}
      required={!allowEmpty}
    />
  );
}
