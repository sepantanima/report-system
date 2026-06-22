import api from "../api/api";

const BASE = "/reports/admin/management-summaries";

const managementSummaryService = {
  /** لیست خلاصه‌ها با جستجو/فیلتر/مرتب‌سازی/صفحه‌بندی → { total, rows } */
  list: async (params) => {
    const res = await api.get(BASE, { params });
    return res.data;
  },

  /** جزئیات یک خلاصه به همراه گزارش‌های مرجع → { summary, refs } */
  getById: async (id) => {
    const res = await api.get(`${BASE}/${id}`);
    return res.data;
  },

  /** پیش‌نمایش گزارش‌های منطبق با فیلترها + زیرعنوان پیشنهادی */
  previewReports: async (filters) => {
    const res = await api.post(`${BASE}/preview-reports`, filters);
    return res.data;
  },

  /** تولید پیش‌نویس خلاصه با هوش‌افزار */
  aiDraft: async (filters) => {
    const res = await api.post(`${BASE}/ai-draft`, filters);
    return res.data;
  },

  /** ایجاد خلاصه جدید */
  create: async (payload) => {
    const res = await api.post(BASE, payload);
    return res.data;
  },

  /** ویرایش: متن خلاصه و/یا عنوان */
  updateSummary: async (id, payload) => {
    const res = await api.patch(`${BASE}/${id}`, payload);
    return res.data;
  },

  /** دانلود خروجی PDF/Word با یا بدون لیست گزارشات */
  downloadExport: async (id, format, includeReports) => {
    const res = await api.get(`${BASE}/${id}/export.${format}`, {
      params: { include_reports: includeReports ? 1 : 0 },
      responseType: "blob",
    });
    const url = window.URL.createObjectURL(new Blob([res.data]));
    const a = document.createElement("a");
    a.href = url;
    a.download = `mgmt-summary-${id}.${format}`;
    a.click();
    window.URL.revokeObjectURL(url);
  },

  /** داده‌های کمکی فیلترها */
  getProvinces: async () => {
    const res = await api.get("/reports/admin/provinces");
    return res.data;
  },
  getUnits: async () => {
    const res = await api.get("/users/units");
    return res.data;
  },
  getReportTypes: async () => {
    const res = await api.get("/reports/types");
    return res.data;
  },
};

export default managementSummaryService;
