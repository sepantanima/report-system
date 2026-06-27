/** کمک‌کنندهٔ فرم مانده اعتبار API هوش — بدون نیاز به SQL */

export const EMPTY_CREDIT_FORM = {
  credit_enabled: false,
  credit_url: "",
  credit_balance_path: "remaining_unit",
  credit_balance_path_secondary: "remaining_irt",
  credit_currency_label: "UNIT",
};

export function creditFieldsFromExtra(extra) {
  const cc = extra?.credit_check;
  if (!cc?.url) return { ...EMPTY_CREDIT_FORM };
  return {
    credit_enabled: true,
    credit_url: String(cc.url || ""),
    credit_balance_path: String(cc.balance_json_path || "balance"),
    credit_balance_path_secondary: cc.balance_json_path_secondary
      ? String(cc.balance_json_path_secondary)
      : "",
    credit_currency_label: String(cc.currency_label || "UNIT"),
  };
}

export function creditFieldsFromTemplate(template) {
  const ex = template?.default_extra_config;
  return creditFieldsFromExtra(ex);
}

export function extraWithoutCreditCheck(extra) {
  const o = extra && typeof extra === "object" ? { ...extra } : {};
  delete o.credit_check;
  return o;
}

export function mergeCreditIntoExtra(extra, creditForm) {
  const out = extra && typeof extra === "object" ? { ...extra } : {};
  if (creditForm.credit_enabled && String(creditForm.credit_url || "").trim()) {
    const cc = {
      method: "GET",
      url: String(creditForm.credit_url).trim(),
      balance_json_path: String(creditForm.credit_balance_path || "balance").trim() || "balance",
    };
    const sec = String(creditForm.credit_balance_path_secondary || "").trim();
    if (sec) cc.balance_json_path_secondary = sec;
    const cur = String(creditForm.credit_currency_label || "").trim();
    if (cur) cc.currency_label = cur;
    out.credit_check = cc;
  } else {
    delete out.credit_check;
  }
  return out;
}

export function rowHasCreditCheck(row, templateCreditBySlug = {}) {
  if (row?.extra_config?.credit_check?.url) return true;
  return !!templateCreditBySlug[row?.provider_type];
}

export function buildTemplateCreditMap(templates) {
  const map = {};
  for (const t of templates || []) {
    map[t.slug] = !!(t.default_extra_config?.credit_check?.url);
  }
  return map;
}
