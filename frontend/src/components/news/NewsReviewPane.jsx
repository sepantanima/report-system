import React from "react";
import NewsEditorSidebar from "./NewsEditorSidebar.jsx";
import { useNewsEditorForm } from "./NewsEditorFormContext.jsx";

export default function NewsReviewPane({ theme, categoryOptions, compact = false }) {
  const { form, set, canEdit, item } = useNewsEditorForm();

  if (!item || !form) {
    return (
      <div style={{ padding: 12, opacity: 0.5, fontSize: 13, textAlign: "center" }}>
        پنل بررسی
      </div>
    );
  }

  if (!canEdit) return null;

  return (
    <NewsEditorSidebar
      form={form}
      set={set}
      categoryOptions={categoryOptions}
      theme={theme}
      scrollable={!compact}
      compact={compact}
    />
  );
}
