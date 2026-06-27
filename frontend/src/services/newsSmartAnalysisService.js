import api from "../api/api.js";
import { FORM_AI_NAMES } from "../constants/aiFormNames.js";

export const ANALYSIS_ACTION_LABELS = {
  analyze_overview: "خلاصه کلی",
  analyze_thematic: "تحلیل موضوعی",
  analyze_trends: "روند و الگو",
  analyze_risk: "ریسک و تهدید",
};

const newsSmartAnalysisService = {
  listAiActions: () => api
    .get("/news/smart-analysis/ai/form-actions", {
      params: { form_name: FORM_AI_NAMES.NEWS_SMART_ANALYSIS },
    })
    .then((r) => r.data),

  runAi: (body) => api.post("/news/smart-analysis/ai/run", {
    form_name: FORM_AI_NAMES.NEWS_SMART_ANALYSIS,
    ...body,
  }).then((r) => r.data),

  save: (body) => api.post("/news/smart-analyses", body).then((r) => r.data),

  get: (id) => api.get(`/news/smart-analyses/${id}`).then((r) => r.data),

  list: (params) => api.get("/news/smart-analyses", { params }).then((r) => r.data),

  remove: (id) => api.delete(`/news/smart-analyses/${id}`).then((r) => r.data),

  publish: (id, destinationId) => api.post(`/news/smart-analyses/${id}/publish`, {
    destination_id: destinationId,
  }).then((r) => r.data),

  download: async (id, format, fileName) => {
    const ext = format === "pdf" ? "pdf" : format === "docx" ? "docx" : "txt";
    const res = await api.get(`/news/smart-analyses/${id}/export.${ext}`, { responseType: "blob" });
    const url = window.URL.createObjectURL(res.data);
    const a = document.createElement("a");
    a.href = url;
    a.download = fileName || `smart-analysis-${id}.${ext}`;
    a.click();
    window.URL.revokeObjectURL(url);
    return res;
  },
};

export default newsSmartAnalysisService;
