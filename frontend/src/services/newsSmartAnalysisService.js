import api from "../api/api.js";

import { FORM_AI_NAMES } from "../constants/aiFormNames.js";



export const ANALYSIS_ACTION_LABELS = {

  analyze_overview: "خلاصه کلی",

  analyze_thematic: "تحلیل موضوعی",

  analyze_trends: "روند و الگو",

  analyze_risk: "ریسک و تهدید",

  analyze_custom: "تحلیل شخصی",

};



export const CUSTOM_PROMPT_SLOTS = ["custom_prompt_1", "custom_prompt_2", "custom_prompt_3"];

export const MAX_CUSTOM_PROMPT_ANALYSES = CUSTOM_PROMPT_SLOTS.length;

export const CUSTOM_PROMPT_ACTION = "analyze_custom";

export const MAX_CUSTOM_PROMPT_LEN = 4000;
export const MAX_CUSTOM_PROMPT_TITLE_LEN = 200;
export const MIN_CUSTOM_PROMPT_LEN = 8;



export function isCustomPromptType(type) {

  return CUSTOM_PROMPT_SLOTS.includes(String(type || "").trim());

}



export function customPromptLabel(type, customPrompt = "", customPromptTitle = "") {

  const title = String(customPromptTitle || "").trim();

  if (title) return title;

  const slot = String(type || "").match(/^custom_prompt_(\d)$/)?.[1];

  const base = slot ? `تحلیل شخصی ${slot}` : "تحلیل شخصی";

  const snippet = String(customPrompt || "").trim().slice(0, 36);

  if (!snippet) return base;

  return `${base} — ${snippet}${String(customPrompt || "").trim().length > 36 ? "…" : ""}`;

}



export function analysisTypeLabel(type, customPrompt = "", customPromptTitle = "") {

  if (isCustomPromptType(type)) return customPromptLabel(type, customPrompt, customPromptTitle);

  return ANALYSIS_ACTION_LABELS[type] || type || "تحلیل";

}



export const STANDARD_ANALYSIS_TYPES = [
  "analyze_overview",
  "analyze_thematic",
  "analyze_trends",
  "analyze_risk",
];

export const ANALYSIS_TYPES = STANDARD_ANALYSIS_TYPES;



const newsSmartAnalysisService = {

  listAiActions: () => api

    .get("/news/smart-analysis/ai/form-actions", {

      params: { form_name: FORM_AI_NAMES.NEWS_SMART_ANALYSIS },

    })

    .then((r) => r.data),



  getCustomPromptPolicy: () => api

    .get("/news/smart-analysis/custom-prompt-policy")

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

  deletePackCustomAnalysis: (packId, analysisType) => api
    .delete(`/news/smart-analysis/packs/${packId}/analyses/${analysisType}`)
    .then((r) => r.data),



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

