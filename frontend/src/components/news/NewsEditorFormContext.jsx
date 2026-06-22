import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import { getNewsRoleLevel, hasPermission } from "../../utils/userRoles.js";
import { newsTextToEditorHtml } from "../../utils/newsTextToEditorHtml.js";

const NewsEditorFormContext = createContext(null);

export function NewsEditorFormProvider({
  item,
  items,
  index,
  roles,
  children,
}) {
  const [form, setForm] = useState(null);

  useEffect(() => {
    if (!item) {
      setForm(null);
      return;
    }
    setForm({
      cleaned_text: item.display_html || item.cleaned_text || "",
      summary: item.summary ? newsTextToEditorHtml(item.summary, item.source_platform) : "",
      review_state: item.review_state || "pending",
      priority: Number(item.priority || 3),
      quality: Number(item.quality || 3),
      status_note: item.status_note || "",
      category_ids: (item.category_ids || item.categories?.map((c) => String(c.id)) || []).map(String),
      source_url: item.source_url || "",
    });
  }, [item?.id, item?.duplicate_status]);

  const set = (k, v) => setForm((f) => (f ? { ...f, [k]: v } : f));

  const buildPayload = () => {
    if (!form) return {};
    return {
      ...form,
      category_ids: form.category_ids.map((x) => parseInt(x, 10)).filter(Number.isFinite),
    };
  };

  const roleLevel = getNewsRoleLevel(roles);
  const canEdit = hasPermission(roles, "news_review") || roleLevel === "monitor";
  const canFinalize = hasPermission(roles, "news_finalize");
  const canDelete = roleLevel === "admin" || roleLevel === "editor" || roleLevel === "chief";

  const value = useMemo(() => ({
    item,
    items,
    index,
    roles,
    form,
    set,
    buildPayload,
    canEdit,
    canFinalize,
    canDelete,
  }), [item, items, index, roles, form, canEdit, canFinalize, canDelete]);

  return (
    <NewsEditorFormContext.Provider value={value}>
      {children}
    </NewsEditorFormContext.Provider>
  );
}

export function useNewsEditorForm() {
  const ctx = useContext(NewsEditorFormContext);
  if (!ctx) throw new Error("useNewsEditorForm must be inside NewsEditorFormProvider");
  return ctx;
}
