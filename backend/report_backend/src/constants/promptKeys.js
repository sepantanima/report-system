/** نگاشت دامنه انتشار گزارش میدانی (۱–۴) به کلید پرامپت در tbl_app_prompts */
export const PROMPT_KEY_BY_CLASSIFICATION = {
  1: "field.management_summary.classification_1",
  2: "field.management_summary.classification_2",
  3: "field.management_summary.classification_3",
  4: "field.management_summary.classification_4",
};

export function promptKeyForClassification(classification) {
  const n = parseInt(classification, 10);
  return PROMPT_KEY_BY_CLASSIFICATION[n] || PROMPT_KEY_BY_CLASSIFICATION[1];
}
