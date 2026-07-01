import api from "../api/api.js";

import { FORM_AI_NAMES } from "../constants/aiFormNames.js";



export const ANALYSIS_ACTION_LABELS = {

  analyze_overview: "خلاصه کلی",

  analyze_thematic: "تحلیل موضوعی",

  analyze_trends: "روند و الگو",

  analyze_risk: "ریسک و تهدید",

};



export const ANALYSIS_TYPES = Object.keys(ANALYSIS_ACTION_LABELS);



const newsSmartAnalysisService = {

  listAiActions: () => api

    .get("/news/smart-analysis/ai/form-actions", {

      params: { form_name: FORM_AI_NAMES.NEWS_SMART_ANALYSIS },

    })

    .then((r) => r.data),



  runAi: (body) => api.post("/news/smart-analysis/ai/run", {

    form_name: FORM_AI_NAMES.NEWS_SMART_ANALYSIS,

    ...body,

  }, { timeout: 180000 }).then((r) => r.data),



  createPack: (body) => api.post("/news/smart-analysis/packs", body).then((r) => r.data),



  getPack: (id) => api.get(`/news/smart-analysis/packs/${id}`).then((r) => r.data),



  listPacks: (params) => api.get("/news/smart-analysis/packs", { params }).then((r) => r.data),



  getPackNews: (id) => api.get(`/news/smart-analysis/packs/${id}/news`).then((r) => r.data),



  savePackAnalysis: (packId, analysisType, body) => api

    .put(`/news/smart-analysis/packs/${packId}/analyses/${analysisType}`, body)

    .then((r) => r.data),



  deletePack: (id) => api.delete(`/news/smart-analysis/packs/${id}`).then((r) => r.data),



  /** @deprecated use savePackAnalysis */

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

