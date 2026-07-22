/**
 * دسته‌بندی مجوزها — هم‌راستا با ACTION_CATEGORIES در MainForm.jsx
 */
export const PERMISSION_CATEGORIES = [
  { id: "field", title: "گزارشات میدانی", color: "#06b6d4" },
  { id: "analysis", title: "فرایند تحلیل", color: "#10b981" },
  { id: "news", title: "اخبار و پردازش", color: "#a855f7" },
  { id: "command", title: "مرکز فرماندهی", color: "#e11d48" },
  { id: "system", title: "مدیریت و گزارشات", color: "#f59e0b" },
];

/** نگاشت صریح permission code → category id (از منوی MainForm + seed) */
export const PERMISSION_CODE_CATEGORY = {
  create_report: "field",
  monitor_reports: "field",
  field_mgmt_summary: "field",
  manage_field_entry_limits: "field",
  search_reports: "field",
  analysis_manage: "analysis",
  analysis_topic_approve: "analysis",
  analysis_missions: "analysis",
  analysis_propose: "analysis",
  analysis_review: "analysis",
  analysis_brief_submit: "analysis",
  news_entry: "news",
  news_review: "news",
  news_finalize: "news",
  news_duplicates: "news",
  news_report: "news",
  ai_process: "news",
  analytics: "news",
  manage_news_entry_limits: "news",
  manage_messenger_accounts: "news",
  command_center: "command",
  command_live_news: "command",
  command_annotate: "command",
  command_kpi: "command",
  command_outputs: "command",
  command_outputs_manage: "command",
  command_manage_prompts: "command",
  manage_users: "system",
  sys_settings: "system",
  manage_prompts: "system",
  manage_ai_api: "system",
  manage_messenger: "system",
  manage_news_reports: "system",
  messages: "system",
  manage_announcements: "system",
  manage_message_settings: "system",
  "sync.view": "system",
  "sync.export": "system",
  "sync.import": "system",
  "sync.reconcile": "system",
  "sync.briefing": "system",
  "sync.force_reapply": "system",
  "rbac.manage": "system",
};

const MODULE_TO_CATEGORY = {
  sync: "system",
  command: "command",
  analysis: "analysis",
  news: "news",
  admin: "system",
  rbac: "system",
  general: "system",
};

export function getPermissionCategory(permission) {
  const code = permission?.code || permission;
  if (PERMISSION_CODE_CATEGORY[code]) return PERMISSION_CODE_CATEGORY[code];
  if (typeof permission === "object" && permission.module) {
    return MODULE_TO_CATEGORY[permission.module] || "system";
  }
  if (code.startsWith("sync.")) return "system";
  if (code.startsWith("command_")) return "command";
  if (code.startsWith("analysis_")) return "analysis";
  if (code.startsWith("news_") || code === "news_entry" || code === "news_report") return "news";
  if (["create_report", "monitor_reports", "field_mgmt_summary"].includes(code)) return "field";
  return "system";
}

export function groupPermissionsByCategory(permissions, searchTerm = "") {
  const term = searchTerm.trim().toLowerCase();
  const grouped = Object.fromEntries(PERMISSION_CATEGORIES.map((c) => [c.id, []]));

  for (const p of permissions) {
    const label = (p.label_fa || p.code || "").toLowerCase();
    const code = (p.code || "").toLowerCase();
    const desc = (p.description_fa || "").toLowerCase();
    const cat = PERMISSION_CATEGORIES.find((c) => c.id === getPermissionCategory(p));
    const catTitle = (cat?.title || "").toLowerCase();
    if (term && !label.includes(term) && !code.includes(term) && !catTitle.includes(term) && !desc.includes(term)) {
      continue;
    }
    const categoryId = getPermissionCategory(p);
    if (!grouped[categoryId]) grouped[categoryId] = [];
    grouped[categoryId].push(p);
  }

  for (const id of Object.keys(grouped)) {
    grouped[id].sort((a, b) => (a.label_fa || a.code).localeCompare(b.label_fa || b.code, "fa"));
  }

  return PERMISSION_CATEGORIES.map((cat) => ({
    ...cat,
    permissions: grouped[cat.id] || [],
  })).filter((cat) => cat.permissions.length > 0);
}

export function countFilteredPermissions(permissions, searchTerm = "") {
  return groupPermissionsByCategory(permissions, searchTerm).reduce(
    (sum, cat) => sum + cat.permissions.length,
    0,
  );
}
