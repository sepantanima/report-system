/** محدودیت کاراکتر — هم‌راستا با frontend/src/constants/analysisFieldLimits.js */
export const ANALYSIS_FIELD_LIMITS = {
  short: 150,
  description: 300,
  axisDescription: 2500,
  analysisContent: 6000,
  briefTitle: 200,
  briefContent: 3000,
  briefTags: 80,
};

export const TOPIC_FIELD_LIMITS = {
  title: ANALYSIS_FIELD_LIMITS.short,
  domain: ANALYSIS_FIELD_LIMITS.short,
  keywords: ANALYSIS_FIELD_LIMITS.short,
  description: ANALYSIS_FIELD_LIMITS.axisDescription,
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

export const BRIEF_FIELD_LIMITS = {
  title: ANALYSIS_FIELD_LIMITS.briefTitle,
  content: ANALYSIS_FIELD_LIMITS.briefContent,
  topicProposalDescription: ANALYSIS_FIELD_LIMITS.axisDescription,
  importance_reason: ANALYSIS_FIELD_LIMITS.description,
  tags: ANALYSIS_FIELD_LIMITS.briefTags,
  attribution: 500,
  managerNote: ANALYSIS_FIELD_LIMITS.description,
  rejectReason: ANALYSIS_FIELD_LIMITS.description,
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
