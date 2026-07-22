/** نقش‌ها و دسترسی‌ها — منبع واحد frontend */

export const ROLE_LABELS = {
  admin: "مدیر کل",
  system_admin: "مدیر کل",
  tech_admin: "مدیر فنی",
  analysis_manager: "مدیر تحلیل",
  analyst: "تحلیل‌گر",
  mentor: "راهنما",
  topic_proposer: "پیشنهاددهنده",
  topic_approver: "تصویب‌کننده محور",
  news_monitor: "پایشگر اخبار",
  news_editor: "دبیر اخبار",
  news_chief: "سردبیر اخبار",
  Field_admin: "مدیر میدانی",
  user: "کاربر واحد",
  strategy_viewer: "ناظر راهبردی",
  strategy_commander: "فرمانده راهبردی",
  strategy_analysis_manager: "مدیر تحلیل راهبردی",
};

/** نگاشت برچسب فارسی یا نام‌های قدیمی به شناسه انگلیسی */
const ROLE_ALIASES = {
  "مدیر کل": "admin",
  "مدیر کل سیستم": "admin",
  system_admin: "system_admin",
  tech_admin: "tech_admin",
  "مدیر تحلیل": "analysis_manager",
  "مدیر تحلیل / سردبیر": "analysis_manager",
  "تحلیل‌گر": "analyst",
  "تحلیل گر": "analyst",
  "راهنما": "mentor",
  "راهنما / داور": "mentor",
  "پیشنهاددهنده": "topic_proposer",
  "پیشنهاددهنده موضوع": "topic_proposer",
  "تصویب‌کننده": "topic_approver",
  "تصویب‌کننده محور": "topic_approver",
  "پایشگر اخبار": "news_monitor",
  "دبیر اخبار": "news_editor",
  "سردبیر اخبار": "news_chief",
  "مدیر اخبار": "news_chief",
  news_admin: "news_chief",
  "مدیر میدانی": "Field_admin",
  "مدیر گزارشات میدانی": "Field_admin",
  "کاربر واحد": "user",
  "کاربر واحد (ثبت گزارش)": "user",
  "ناظر راهبردی": "strategy_viewer",
  "فرمانده راهبردی": "strategy_commander",
  "مدیر تحلیل راهبردی": "strategy_analysis_manager",
};

export const ROLE_PERMISSIONS = {
  system_admin: [
    "create_report", "manage_users", "monitor_reports", "news_entry", "news_review",
    "news_finalize", "news_duplicates", "ai_process",
    "search_reports", "sys_settings", "analytics",
    "analysis_manage", "analysis_topic_approve", "analysis_missions", "analysis_propose", "analysis_review",
    "analysis_brief_submit",
    "manage_prompts", "manage_ai_api", "manage_messenger", "manage_news_reports", "field_mgmt_summary", "news_report",
    "manage_field_entry_limits", "manage_news_entry_limits",
    "messages", "manage_announcements", "manage_message_settings",
    "manage_messenger_accounts",
    "command_center", "command_live_news", "command_annotate", "command_kpi",
    "command_outputs", "command_outputs_manage", "command_manage_prompts",
    "sync.view", "sync.export", "sync.import", "sync.reconcile", "sync.briefing", "sync.force_reapply",
    "rbac.manage",
  ],
  tech_admin: [
    "manage_prompts", "manage_ai_api", "manage_messenger", "manage_messenger_accounts",
    "manage_news_reports", "manage_field_entry_limits", "manage_news_entry_limits",
    "manage_message_settings", "sys_settings", "messages",
    "command_manage_prompts", "command_outputs_manage",
    "sync.view", "sync.export", "sync.import", "sync.reconcile", "sync.briefing", "sync.force_reapply",
  ],
  admin: [
    "create_report", "manage_users", "monitor_reports", "news_entry", "news_review",
    "search_reports", "sys_settings", "analytics",
    "analysis_manage", "analysis_topic_approve", "analysis_missions", "analysis_propose", "analysis_review",
    "analysis_brief_submit",
    "manage_prompts", "manage_ai_api", "manage_messenger", "manage_news_reports", "field_mgmt_summary", "news_report",
    "manage_field_entry_limits", "manage_news_entry_limits",
    "messages", "manage_announcements", "manage_message_settings",
    "manage_messenger_accounts",
    "command_center", "command_live_news", "command_annotate", "command_kpi",
    "command_outputs", "command_outputs_manage", "command_manage_prompts",
  ],
  strategy_viewer: [
    "command_center", "command_live_news", "command_kpi", "command_outputs", "sys_settings", "messages",
  ],
  strategy_commander: [
    "command_center", "command_live_news", "command_annotate", "command_kpi",
    "command_outputs",
    "sys_settings", "messages",
  ],
  strategy_analysis_manager: [
    "command_center", "command_live_news", "command_kpi",
    "command_outputs", "command_outputs_manage", "command_manage_prompts",
    "sys_settings", "messages",
  ],
  analysis_manager: [
    "manage_users", "analysis_manage", "analysis_topic_approve", "analysis_propose", "analysis_review", "analysis_brief_submit", "sys_settings", "messages",
  ],
  analyst: ["analysis_missions", "analysis_brief_submit", "sys_settings", "messages"],
  mentor: ["analysis_review", "analysis_brief_submit", "sys_settings", "messages"],
  topic_proposer: ["analysis_propose", "analysis_brief_submit", "sys_settings", "messages"],
  topic_approver: ["analysis_topic_approve", "analysis_brief_submit", "sys_settings", "messages"],
  news_monitor: ["news_entry", "analytics", "analysis_brief_submit", "sys_settings", "messages"],
  news_editor: ["news_review", "news_duplicates", "ai_process", "analytics", "analysis_brief_submit", "sys_settings", "news_report", "messages"],
  news_chief: ["news_review", "news_finalize", "news_duplicates", "ai_process", "analytics", "analysis_brief_submit", "sys_settings", "news_report", "manage_news_reports", "manage_news_entry_limits", "messages", "manage_announcements", "manage_message_settings", "manage_messenger_accounts"],
  Field_admin: [
    "manage_users", "create_report", "monitor_reports", "analytics", "sys_settings", "analysis_topic_approve",
    "analysis_brief_submit",
    "field_mgmt_summary", "manage_field_entry_limits", "messages", "manage_announcements", "manage_message_settings",
    "manage_messenger_accounts",
  ],
  user: [
    "create_report",
    "monitor_reports",
    "news_entry",
    "analysis_brief_submit",
    "analysis_propose",
    "sys_settings",
    "analytics",
    "messages",
  ],
};

export function decodeToken(token) {
  try {
    const base64 = token.split(".")[1].replace(/-/g, "+").replace(/_/g, "/");
    return JSON.parse(
      decodeURIComponent(
        window.atob(base64).split("").map((c) => "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2)).join("")
      )
    );
  } catch {
    return {};
  }
}

export function parseUserRoles(rawRole) {
  if (rawRole == null || rawRole === "") return [];
  if (Array.isArray(rawRole)) {
    return rawRole.map((r) => String(r).trim()).filter(Boolean);
  }
  const str = String(rawRole).trim();
  if (!str) return [];

  if (str.startsWith("[")) {
    try {
      const parsed = JSON.parse(str);
      if (Array.isArray(parsed)) {
        return parsed.map((r) => String(r).trim()).filter(Boolean);
      }
    } catch {
      /* fall through */
    }
  }

  if (str.includes("{") || str.includes("}")) {
    return str.replace(/[{}"\s]/g, "").split(",").filter(Boolean);
  }

  if (str.includes(",")) {
    return str.split(",").map((r) => r.trim()).filter(Boolean);
  }

  return [str];
}

export function normalizeRoleKey(role) {
  const key = String(role || "").trim();
  if (!key) return "";
  if (ROLE_PERMISSIONS[key]) return key;
  if (ROLE_ALIASES[key]) return ROLE_ALIASES[key];
  const lower = key.toLowerCase();
  if (ROLE_PERMISSIONS[lower]) return lower;
  return key;
}

export function normalizeRoles(rawRoles) {
  const parsed = parseUserRoles(rawRoles);
  const normalized = parsed.map(normalizeRoleKey).filter(Boolean);
  return [...new Set(normalized)];
}

export function getSessionRoles() {
  if (typeof window === "undefined") return ["user"];

  const token = localStorage.getItem("token");
  if (token) {
    const decoded = decodeToken(token);
    const fromToken = normalizeRoles(decoded.role);
    if (fromToken.length) return fromToken;
  }

  const fromStorage = normalizeRoles(localStorage.getItem("role"));
  return fromStorage.length ? fromStorage : ["user"];
}

export function serializeRoles(roles) {
  return JSON.stringify(normalizeRoles(roles));
}

export function getRoleLabelFa(roleKey) {
  const key = normalizeRoleKey(roleKey);
  return ROLE_LABELS[key] || roleKey || "نقش نامشخص";
}

export function getStoredPermissions() {
  try {
    const raw = localStorage.getItem("permissions");
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

export function getPermissionsForRoles(roles) {
  const stored = getStoredPermissions();
  if (stored?.length) return new Set(stored);
  const perms = new Set();
  normalizeRoles(roles).forEach((role) => {
    const key = role === "admin" ? "system_admin" : role;
    (ROLE_PERMISSIONS[key] || ROLE_PERMISSIONS[role] || []).forEach((p) => perms.add(p));
  });
  return perms;
}

export function hasPermission(roles, permission) {
  const stored = getStoredPermissions();
  if (stored?.length) {
    const set = new Set(stored);
    if (set.has("rbac.manage")) return true;
    return set.has(permission);
  }
  return getPermissionsForRoles(roles).has(permission);
}

export function hasRole(roles, ...allowed) {
  const normalized = normalizeRoles(roles);
  if (normalized.includes("admin")) return true;
  return allowed.some((r) => normalized.includes(r));
}

export function persistSessionRoles(roles) {
  if (typeof window === "undefined") return;
  localStorage.setItem("role", serializeRoles(roles));
}

export function getNewsRoleLevel(roles) {
  const normalized = normalizeRoles(roles);
  if (normalized.includes("admin")) return "admin";
  if (normalized.includes("news_chief")) return "chief";
  if (normalized.includes("news_editor")) return "editor";
  if (normalized.includes("news_monitor")) return "monitor";
  return null;
}
