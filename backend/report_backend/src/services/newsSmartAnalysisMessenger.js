import { applyTemplate } from "./newsReportMessengerTemplate.js";
import { getAllReportDefaults } from "../constants/newsReportDefaults.js";
import { getNewsReportSettings } from "./newsReportSettingsService.js";
import { MESSENGER_TEXT_MAX } from "../constants/newsSmartAnalysisMeta.js";
import { stripHtml } from "./newsTextUtils.js";

const DEFAULT_ANALYSIS_MESSAGE_TEMPLATE = `📌 {{title}}

{{analysis_body}}

{{signature}}
{{hashtags}}`;

export function buildAnalysisMessengerText(analysis, settings = {}) {
  const s = { ...getAllReportDefaults(), ...settings };
  const bodyPlain = stripHtml(analysis.body_html || analysis.body_plain || "")
    .replace(/\s+/g, " ")
    .trim();

  const tpl = s.smart_analysis_messenger_template || DEFAULT_ANALYSIS_MESSAGE_TEMPLATE;
  const signature = s.signature_text || "";
  const hashtags = s.hashtags || "";

  const reserved = applyTemplate(tpl, {
    title: analysis.title || "تحلیل",
    analysis_body: "",
    signature,
    hashtags,
  }).length - (signature.length + hashtags.length);

  const maxBody = Math.max(200, MESSENGER_TEXT_MAX - reserved - 20);
  let body = bodyPlain;
  let truncated = false;
  if (body.length > maxBody) {
    body = `${body.slice(0, maxBody - 1)}…`;
    truncated = true;
  }

  const text = applyTemplate(tpl, {
    title: analysis.title || "تحلیل",
    analysis_body: body,
    signature,
    hashtags,
  });

  return {
    text,
    truncated,
    charCount: text.length,
    maxChars: MESSENGER_TEXT_MAX,
  };
}

export async function buildAnalysisMessengerTextWithSettings(analysis) {
  const settings = await getNewsReportSettings();
  return buildAnalysisMessengerText(analysis, settings);
}
