/** محدودیت کاراکتر — هم‌راستا با frontend/src/constants/analysisFieldLimits.js */
export const ANALYSIS_FIELD_LIMITS = {
  short: 80,
  description: 150,
  analysisContent: 2000,
};

export const TOPIC_FIELD_LIMITS = {
  title: ANALYSIS_FIELD_LIMITS.short,
  domain: ANALYSIS_FIELD_LIMITS.short,
  keywords: ANALYSIS_FIELD_LIMITS.short,
  description: ANALYSIS_FIELD_LIMITS.description,
  importance_reason: ANALYSIS_FIELD_LIMITS.description,
};

export const MISSION_FIELD_LIMITS = {
  analysisTitle: ANALYSIS_FIELD_LIMITS.short,
  changeNote: ANALYSIS_FIELD_LIMITS.short,
  analysisContent: ANALYSIS_FIELD_LIMITS.analysisContent,
  guidelines: ANALYSIS_FIELD_LIMITS.description,
  feedback: ANALYSIS_FIELD_LIMITS.description,
  evaluatorComment: ANALYSIS_FIELD_LIMITS.description,
};

export function stripHtml(html = "") {
  if (!html) return "";
  return String(html)
    .replace(/\r\n/g, "\n")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>/gi, "\n")
    .replace(/<\/div>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/[ \t\f\v]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

export function plainTextLength(value = "") {
  if (!value) return 0;
  const str = String(value);
  if (str.includes("<")) return stripHtml(str).length;
  return str.length;
}
