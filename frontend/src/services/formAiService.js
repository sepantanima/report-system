import api from "../api/api";

/**
 * اجرای یک اکشن AI از روی کانفیگ سرور.
 * @param {{ form_name: string, action_name: string, form_data: object }} payload
 */
export async function runFormAiAction(payload) {
  const res = await api.post("/reports/ai/run", payload, { timeout: 180000 });
  return res.data;
}

/** لیست اکشن‌های فعال یک فرم (فقط action_name و برچسب دکمه) */
export async function listFormAiActions(formName) {
  const res = await api.get("/reports/ai/form-actions", { params: { form_name: formName } });
  return Array.isArray(res.data) ? res.data : [];
}
