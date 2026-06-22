import api from "../api/api";

const reportService = {
  /**
   * دریافت آمار (Stats) برای نمودار
   * ورودی می‌تواند یک آبجکت شامل تمام فیلترها باشد
   */
  getStats: async (params) => {
    try {
      const response = await api.get("/reports/advanced", {
        params: {
          ...params,
          reportType: "stats", // سیگنال به بک‌اِند برای دریافت دیتای نمودار
        },
      });
      return response.data;
    } catch (error) {
      console.error("خطا در دریافت آمار نمودار:", error);
      throw error;
    }
  },

  /**
   * دریافت لیست گزارشات تفصیلی
   */
  getReportList: async (params) => {
    try {
      // در اینجا پارامترها مستقیماً از کامپوننت جدول می‌آیند
      const response = await api.get("/reports/advanced", {
        params: {
          ...params,
          reportType: "list", // سیگنال به بک‌اِند برای دریافت لیست رکوردها
        },
      });
      return response.data;
    } catch (error) {
      console.error("خطا در دریافت لیست گزارشات:", error);
      throw error;
    }
  },

  /**
   * دریافت خلاصه آمار (ویجت‌های بالایی)
   */
  getSummaryStats: async (params) => {
    try {
      const response = await api.get("/reports/admin/summary-stats", {
        params
      });
      return response.data;
    } catch (error) {
      console.error("خطا در دریافت خلاصه آمار:", error);
      throw error;
    }
  },

  /**
   * دریافت واحدهای فعال بر اساس فیلتر زمان و مکان
   */
  getActiveUnits: async (params) => {
    try {
      const response = await api.get("/reports/admin/active-units", {
        params
      });
      return response.data;
    } catch (error) {
      console.error("خطا در دریافت واحدهای فعال:", error);
      throw error;
    }
  },

  /**
   * دریافت انواع موضوعات گزارش
   */
  getReportTypes: async () => {
    try {
      const response = await api.get("/reports/types");
      return response.data;
    } catch (error) {
      console.error("خطا در دریافت انواع گزارش:", error);
      throw error;
    }
  }
};

export default reportService;