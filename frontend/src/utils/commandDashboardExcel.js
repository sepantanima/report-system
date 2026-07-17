import { exportWorkbook } from "./excelExport.js";
import { formatGregorianAsJalali } from "../components/command/dashboard/dashboardDateUtils.js";

const STATUS_FA = { green: "مطلوب", yellow: "نیازمند توجه", red: "بحرانی", gray: "بدون فعالیت" };
const ALERT_PRIORITY_FA = { high: "بالا", medium: "متوسط", low: "پایین" };

function flattenProcesses(processes) {
  const rows = [];
  (processes || []).forEach((p) => {
    (p.stages || []).forEach((s) => {
      rows.push({
        process: p.title,
        stage: s.label,
        count: s.count,
      });
    });
  });
  return rows;
}

function flattenProducts(products) {
  const items = products?.items || products || [];
  return (Array.isArray(items) ? items : []).map((p) => ({
    label: p.label,
    value: p.value,
    prev: p.prev_value,
    delta: p.delta_pct,
    status: STATUS_FA[p.status] || p.status || "",
  }));
}

/** @param {object} data — payload داشبورد */
export function buildCommandDashboardSheets(data) {
  const sheets = [];

  const kpi = (data?.kpi_bar || []).map((k) => ({
    label: k.label,
    value: k.value,
    prev: k.prev_value,
    delta: k.delta_pct,
    status: STATUS_FA[k.status] || k.status || "",
  }));
  if (kpi.length) {
    sheets.push({
      name: "KPI",
      rows: kpi,
      columnMap: {
        label: "شاخص",
        value: "مقدار",
        prev: "دوره قبل",
        delta: "تغییر٪",
        status: "وضعیت",
      },
    });
  }

  const procRows = flattenProcesses(data?.processes);
  if (procRows.length) {
    sheets.push({
      name: "فرآیندها",
      rows: procRows,
      columnMap: { process: "فرآیند", stage: "مرحله", count: "تعداد" },
    });
  }

  const prodRows = flattenProducts(data?.products);
  if (prodRows.length) {
    sheets.push({
      name: "محصولات",
      rows: prodRows,
      columnMap: {
        label: "محصول",
        value: "تعداد",
        prev: "دوره قبل",
        delta: "تغییر٪",
        status: "وضعیت",
      },
    });
  }

  const alerts = (data?.alerts || []).map((a) => ({
    title: a.title,
    message: a.message,
    priority: ALERT_PRIORITY_FA[a.priority] || a.priority,
    owner: a.owner,
    status: a.status,
  }));
  if (alerts.length) {
    sheets.push({
      name: "هشدارها",
      rows: alerts,
      columnMap: {
        title: "عنوان",
        message: "پیام",
        priority: "اولویت",
        owner: "مسئول",
        status: "وضعیت",
      },
    });
  }

  const health = data?.health;
  if (health) {
    sheets.push({
      name: "سلامت",
      rows: [
        {
          metric: "امتیاز کلی",
          value: health.system_score,
          status: STATUS_FA[health.system_status] || health.system_status,
        },
        ...(health.components || []).map((c) => ({
          metric: c.label || c.id,
          value: c.score,
          status: STATUS_FA[c.status] || c.status,
        })),
      ],
      columnMap: { metric: "شاخص", value: "امتیاز", status: "وضعیت" },
    });
  }

  const roles = (data?.roles || []).map((r) => ({
    role: r.label || r.role,
    activity: r.activity,
    overdue: r.tasks_overdue,
    status: STATUS_FA[r.status] || r.status,
  }));
  if (roles.length) {
    sheets.push({
      name: "نقش‌ها",
      rows: roles,
      columnMap: {
        role: "نقش",
        activity: "فعالیت",
        overdue: "معوق",
        status: "وضعیت",
      },
    });
  }

  const units = (data?.units_heatmap || []).map((u) => ({
    unit: u.name || u.unit_name,
    province: u.province,
    activity: u.activity,
    score: u.health_score,
    status: STATUS_FA[u.status] || u.status,
  }));
  if (units.length) {
    sheets.push({
      name: "یگان‌ها",
      rows: units,
      columnMap: {
        unit: "یگان",
        province: "استان",
        activity: "فعالیت",
        score: "امتیاز",
        status: "وضعیت",
      },
    });
  }

  const users = (data?.users_leaderboard?.most_active || data?.users_leaderboard || []).map((u) => ({
    name: u.name || u.username,
    unit: u.unit_name,
    activity: u.activity,
    news: u.news_actions,
    field: u.field_reports,
    analysis: u.analyses_done,
    online: u.online ? "بله" : "خیر",
  }));
  if (Array.isArray(users) && users.length) {
    sheets.push({
      name: "کاربران",
      rows: users,
      columnMap: {
        name: "کاربر",
        unit: "یگان",
        activity: "فعالیت",
        news: "اخبار",
        field: "رصد",
        analysis: "تحلیل",
        online: "آنلاین",
      },
    });
  }

  const provinces = (data?.provinces_heat || []).map((p) => ({
    province: p.province || p.label || p.id,
    activity: p.activity,
    score: p.health_score,
    status: STATUS_FA[p.status] || p.status,
  }));
  if (provinces.length) {
    sheets.push({
      name: "استان‌ها",
      rows: provinces,
      columnMap: {
        province: "استان",
        activity: "فعالیت",
        score: "امتیاز",
        status: "وضعیت",
      },
    });
  }

  const ai = data?.ai_performance;
  if (ai) {
    sheets.push({
      name: "AI",
      rows: [
        { metric: "درخواست‌ها", value: ai.total_requests },
        { metric: "موفق", value: ai.success_count },
        { metric: "ناموفق", value: ai.fail_count },
        { metric: "نرخ موفقیت٪", value: ai.success_rate_pct },
        { metric: "میانگین پاسخ (ms)", value: ai.avg_response_ms },
      ],
      columnMap: { metric: "شاخص", value: "مقدار" },
    });
  }

  return sheets;
}

export function exportCommandDashboardExcel(data, filters) {
  const sheets = buildCommandDashboardSheets(data);
  if (!sheets.length) return false;

  const titleRow = `داشبورد فرماندهی ${formatGregorianAsJalali(filters.from)} تا ${formatGregorianAsJalali(filters.to)}`;
  exportWorkbook(sheets, `command-dashboard-${filters.from}-${filters.to}`, { titleRow });
  return true;
}
