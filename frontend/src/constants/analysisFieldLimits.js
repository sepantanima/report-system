/**
 * محدودیت کاراکتر فیلدهای ماژول تحلیل — برای تغییر، فقط این فایل را ویرایش کنید.
 * short: عناوین و متن‌های کوتاه
 * description: توضیحات کوتاه (بازخورد، دستورالعمل، …)
 * axisDescription: شرح محور
 * analysisContent: متن اصلی تحلیل
 */
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
  topicProposalTitle: TOPIC_FIELD_LIMITS.title,
  topicProposalDescription: TOPIC_FIELD_LIMITS.description,
  importance_reason: TOPIC_FIELD_LIMITS.importance_reason,
  tags: ANALYSIS_FIELD_LIMITS.briefTags,
  attribution: 500,
  managerNote: ANALYSIS_FIELD_LIMITS.description,
  rejectReason: ANALYSIS_FIELD_LIMITS.description,
};

export function decodeHtmlEntities(text = "") {
  return String(text ?? "")
    .replace(/&amp;nbsp;/gi, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;lt;/gi, "<")
    .replace(/&amp;gt;/gi, ">")
    .replace(/&amp;quot;/gi, '"')
    .replace(/&amp;#39;/gi, "'")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");
}

export function stripHtml(html = "") {
  if (!html) return "";
  return decodeHtmlEntities(
    String(html)
      .replace(/\r\n/g, "\n")
      .replace(/<br\s*\/?>/gi, "\n")
      .replace(/<\/p>/gi, "\n")
      .replace(/<\/div>/gi, "\n")
      .replace(/<[^>]+>/g, ""),
  )
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
