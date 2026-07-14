import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import { getNewsRoleLevel, hasPermission } from "../../utils/userRoles.js";
import { newsContentToEditorHtml } from "../../utils/newsTextToEditorHtml.js";

const NewsEditorFormContext = createContext(null);

export function NewsEditorFormProvider({
  item,
  items,
  index,
  total,
  roles,
  children,
}) {
  const [form, setForm] = useState(null);

  useEffect(() => {
    if (!item) {
      setForm(null);
      return;
    }
    const cleanedSrc = item.display_html || item.cleaned_text || "";
    const cleanedForEditor = newsContentToEditorHtml(cleanedSrc, item.source_platform);
    const summaryForEditor = item.summary
      ? newsContentToEditorHtml(item.summary, item.source_platform)
      : "";
    setForm({
      cleaned_text: cleanedForEditor,
      summary: summaryForEditor,
      review_state: item.review_state || "pending",
      priority: Number(item.priority || 3),
      quality: Number(item.quality || 3),
      status_note: item.status_note || "",
      category_ids: (item.category_ids || item.categories?.map((c) => String(c.id)) || []).map(String),
      source_url: item.source_url || "",
      relevance_status: item.relevance_status || "unset",
    });
  }, [
    item?.id,
    item?.duplicate_status,
    item?.priority,
    item?.quality,
    item?.relevance_status,
    item?.editorial_state,
    item?.summary,
    item?.updated_at,
    item?.category_ids,
    item?.categories,
    item?.display_html,
    item?.cleaned_text,
  ]);

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

  const navTotal = total ?? items.length;

  const value = useMemo(() => ({
    item,
    items,
    index,
    total: navTotal,
    roles,
    form,
    set,
    buildPayload,
    canEdit,
    canFinalize,
    canDelete,
  }), [item, items, index, navTotal, roles, form, canEdit, canFinalize, canDelete]);

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
