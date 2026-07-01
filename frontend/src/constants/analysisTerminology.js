/** Central UI labels for the analysis module (محور → تصویب → ارجاع → تحلیل). */

export const ANALYSIS_TERMS = {
  axis: "محور",
  axisDescription: "شرح محور",
  axisRequired: "محور الزامی است",
  axisMaxLength: (max) => `محور حداکثر ${max} کاراکتر باشد`,
  descriptionRequired: "شرح محور الزامی است",
  descriptionMaxLength: (max) => `شرح محور حداکثر ${max} کاراکتر باشد`,
  suggestedDeadline: "مهلت پیشنهادی",
  suggestedDeadlineHint: "اختیاری — از تقویم شمسی انتخاب کنید؛ فقط امروز یا روزهای بعد مجاز است",
  suggestedDeadlineInvalid: "مهلت پیشنهادی نامعتبر است. لطفاً تاریخ را فقط از تقویم انتخاب کنید (نوشتن دستی ممکن است خطا بدهد).",
  suggestedDeadlinePast: "مهلت پیشنهادی نمی‌تواند قبل از امروز باشد.",
  missionDeadline: "مهلت مأموریت",
  ratified: "تصویب شده",
  ratify: "تصویب",
  ratifyDecision: "تصمیم تصویب",
  ratifyPageTitle: "تصویب محور",
  ratifyHelpTitle: "راهنمای تصویب محور",
  editAxisContent: "ویرایش محتوای محور",
  ratifyTab: "تصویب محورها",
  assignTab: "ارجاع مأموریت",
  assignPageTitle: "ارجاع مأموریت",
  assignGateMessage: "فقط محورهای تصویب‌شده قابل ارجاع هستند.",
  createMissionForRatified: "ایجاد مأموریت برای محور تصویب‌شده",
  myAxesPageTitle: "محورهای تحلیل من",
  newAxis: "محور جدید",
  registerAxis: "ثبت محور",
  editAxis: "ویرایش محور",
  proposeAxisMenu: "ثبت محور تحلیل",
  ratifyAxesMenu: "تصویب محورها",
  axisLabelPrefix: "محور:",
  finalApproval: "تایید نهایی",
};

export const WORKFLOW_STEPS = [
  { id: "propose", label: "ثبت محور" },
  { id: "ratify", label: "تصویب" },
  { id: "assign", label: "ارجاع" },
  { id: "analyze", label: "تحلیل" },
];

export const APPROVAL_DECISIONS = [
  { value: "approve", label: ANALYSIS_TERMS.ratify },
  { value: "reject", label: "رد" },
  { value: "needs_info", label: "برگشت برای اصلاح" },
  { value: "close", label: "بستن" },
];
