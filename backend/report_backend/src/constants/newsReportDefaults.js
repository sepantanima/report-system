/** کلیدهای فرمت برای تنظیمات چاپ */
import { DEFAULT_CUSTOM_PROMPT_POLICY } from "./newsSmartCustomPromptPolicy.js";

export const PRINT_FORMAT_KEYS = [
  "html_card",
  "html_table",
  "txt",
  "pdf_a5_card",
  "pdf_a5_table",
  "pdf_a4",
];

export const PRINT_FORMAT_LABELS = {
  html_card: "HTML کارت",
  html_table: "HTML جدول",
  txt: "TXT متن",
  pdf_a5_card: "PDF A5 کارت",
  pdf_a5_table: "PDF A5 جدول",
  pdf_a4: "PDF A4",
};

const BASE_MARGINS = { margin_top: 10, margin_bottom: 10, margin_left: 10, margin_right: 10 };

export const DEFAULT_PRINT_SETTINGS = {
  html_card: { paper_size: "A4", ...BASE_MARGINS },
  html_table: { paper_size: "A4", ...BASE_MARGINS },
  txt: { paper_size: "A4", ...BASE_MARGINS },
  pdf_a5_card: { paper_size: "A5", ...BASE_MARGINS },
  pdf_a5_table: { paper_size: "A5", ...BASE_MARGINS },
  pdf_a4: { paper_size: "A4", ...BASE_MARGINS },
};

export const DEFAULT_MESSENGER_TEMPLATE = `📌 {{label}}

تاریخ: {{report_date}}
بازه: {{display_from}} تا {{display_to}}

{{news_list}}

{{signature}}
{{hashtags}}`;

/** قالب کپشن فایل ارسالی در پیام‌رسان (گزارش اخبار) */
export const DEFAULT_DOCUMENT_CAPTION_TEMPLATE = `📊 نوع گزارش: {{report_type}}
📅 تاریخ گزارش: {{report_date}}
🕒 از: {{display_from}}
🕒 تا: {{display_to}}
📰 تعداد خبر: {{news_count_text}}
⚙️ نحوه اجرا: {{system_name}}`;

export const DEFAULT_NEWS_ITEM_TEMPLATE = `{{index}}) {{news_date}} {{news_time}}
{{news_source}}
{{news_text}}`;

/** قالب انتشار تحلیل کوتاه در پیام‌رسان */
export const DEFAULT_BRIEF_SUBMISSION_MESSENGER_TEMPLATE = `#تحلیل کوتاه
#{{author_hashtag}}  #{{composition_date}}

{{brief_body}}

#{{submitter_hashtag}}`;

export const DEFAULT_TXT_OUTPUT_TEMPLATE = `📌 {{label}} (TXT متن ساده)

تاریخ: {{report_date}}
بازه زمانی: {{display_from}} تا {{display_to}}
تعداد اخبار: {{news_count_text}}

{{news_list}}`;

/** قالب HTML کارت — {{cards}} جایگزین بلوک‌های خبر می‌شود */
export const DEFAULT_HTML_CARD_TEMPLATE = `<!doctype html>
<html lang="fa" dir="rtl">
<head>
<meta charset="utf-8"/>
<meta name="viewport" content="width=device-width, initial-scale=1"/>
<style>
body { font-family: Tahoma, Vazirmatn, Arial, sans-serif; background:#eef1f4; margin:0; padding:0; direction:rtl; width:100%; box-sizing:border-box; }
.page { width:100%; max-width:100%; margin:0 auto; box-sizing:border-box; padding:8px 10px; }
.header { display:flex; justify-content:space-between; align-items:flex-start; border-bottom:2px solid {{color}}; padding-bottom:10px; margin-bottom:14px; }
.header .title { font-size:18px; font-weight:bold; color:{{color}}; text-align:center; width:100%; }
.meta { display:flex; justify-content:space-between; align-items:center; margin:8px 0 16px; font-size:14px; color:#444; flex-wrap:wrap; gap:10px; }
.meta-item { display:flex; align-items:center; white-space:nowrap; }
.meta .label { font-weight:bold; margin-left:5px; color:#333; }
.meta .value { color:#555; }
.card { background:#fff; border-radius:12px; padding:14px 16px 16px; margin-bottom:18px; box-shadow:0 4px 12px rgba(0,0,0,.10); border-right:4px solid {{color}}; break-inside:avoid; page-break-inside:avoid; }
.card-header { display:flex; flex-wrap:wrap; gap:6px 10px; align-items:center; margin-bottom:10px; font-size:14px; }
.card-header .number { background:{{color}}; color:#fff; padding:2px 8px; border-radius:6px; font-weight:bold; font-size:13px; }
.card-header .datetime { font-weight:bold; color:#333; }
.card-text { font-size:18px; line-height:1.95; color:#111; white-space:pre-wrap; text-align:justify; }
.empty { background:#fff; padding:22px; border-radius:12px; text-align:center; font-size:16px; color:#555; box-shadow:0 2px 8px rgba(0,0,0,.1); break-inside:avoid; page-break-inside:avoid; }
.footer { margin-top:18px; font-size:12px; color:#666; text-align:center; }
@media print {
  .card, .empty { break-inside:avoid; page-break-inside:avoid; }
}
</style>
</head>
<body>
<div class="page">
<div class="header"><div class="title">{{label}}</div></div>
<div class="meta">{{meta}}</div>
{{cards}}
<div class="footer">این گزارش به‌صورت خودکار تولید شده است</div>
</div>
</body>
</html>`;

export const DEFAULT_HTML_TABLE_TEMPLATE = `<!doctype html>
<html lang="fa" dir="rtl">
<head>
<meta charset="utf-8"/>
<meta name="viewport" content="width=device-width, initial-scale=1"/>
<style>
body{font-family:Tahoma,Vazirmatn,Arial;font-size:12px;direction:rtl;background:#f4f6f8;margin:0;padding:0;width:100%;box-sizing:border-box;}
.page{background:#fff;padding:16px 18px;border:1px solid #ccc;width:100%;max-width:100%;margin:0 auto;box-sizing:border-box;overflow-x:auto;}
.header{text-align:center;border-bottom:2px solid {{color}};padding-bottom:12px;margin-bottom:18px;}
.header .org{font-size:14px;font-weight:bold;color:#333;margin-bottom:4px;}
.header .title{font-size:18px;font-weight:bold;color:{{color}};}
.meta{text-align:center;margin:10px 0 16px;font-size:12px;color:#444;}
table{width:100%;border-collapse:collapse;min-width:480px;}
th,td{border:1px solid #333;padding:6px;text-align:center;vertical-align:middle;}
th{background:#dbe9f6;}
td.text{text-align:right;white-space:pre-wrap;}
tr{break-inside:avoid;page-break-inside:avoid;}
.footer{margin-top:18px;font-size:11px;color:#666;text-align:left;}
</style>
</head>
<body>
<div class="page">
<div class="header">
  {{org_block}}
  <div class="title">{{label}}</div>
</div>
<div class="meta">{{meta}}</div>
<table>
<thead><tr><th>ردیف</th><th>زمان</th><th>متن خبر</th><th>منبع</th><th>وضعیت</th></tr></thead>
<tbody>{{table_rows}}</tbody>
</table>
<div class="footer">این گزارش به صورت خودکار تولید شده است</div>
</div>
</body>
</html>`;

export function cloneDefaultPrintSettings() {
  return JSON.parse(JSON.stringify(DEFAULT_PRINT_SETTINGS));
}

export function mergePrintSettings(stored) {
  const base = cloneDefaultPrintSettings();
  if (!stored || typeof stored !== "object") return base;
  for (const key of PRINT_FORMAT_KEYS) {
    if (stored[key] && typeof stored[key] === "object") {
      base[key] = { ...base[key], ...stored[key] };
    }
  }
  return base;
}

/** نگاشت فرمت تولید به کلید تنظیمات چاپ */
export function resolvePrintFormatKey(format, pdfPaperSize, pdfSource) {
  if (format === "html_card") return "html_card";
  if (format === "html_table" || format === "html") return "html_table";
  if (format === "txt") return "txt";
  if (format === "pdf") {
    if (pdfPaperSize === "A5") {
      return pdfSource === "html_table" ? "pdf_a5_table" : "pdf_a5_card";
    }
    return "pdf_a4";
  }
  return "html_card";
}

export const PACK_FORMAT_KEYS = [
  "txt", "html_card", "html_table", "pdf_a5_card", "pdf_a5_table", "pdf_a4",
];

export const PACK_FORMAT_LABELS = {
  txt: "TXT متن",
  html_card: "HTML کارتی",
  html_table: "HTML جدولی",
  pdf_a5_card: "PDF A5 کارتی",
  pdf_a5_table: "PDF A5 جدولی",
  pdf_a4: "PDF A4",
};

export const DEFAULT_PACK_DEFAULTS = {
  pack_types: [
    {
      key: "very_important",
      label: "اخبار فوری",
      file_slug: "فوری",
      help: "اخبار با اولویت فوری (سطح ۱)",
      enabled_by_default: true,
      format_keys: ["html_card", "pdf_a5_card", "txt"],
    },
    {
      key: "important",
      label: "اخبار مهم",
      file_slug: "مهم",
      enabled_by_default: true,
      format_keys: ["html_card", "pdf_a5_card"],
    },
    {
      key: "valuable",
      label: "اخبار ارزشمند",
      file_slug: "ارزشمند",
      help: "شامل اخبار فوری و مهم",
      enabled_by_default: true,
      format_keys: ["html_table", "html_card", "pdf_a4"],
    },
    {
      key: "all",
      label: "همه اخبار",
      file_slug: "کل",
      enabled_by_default: true,
      format_keys: ["txt", "html_table"],
    },
  ],
  default_delivery: "zip",
  filename_style: "full_fa",
};

export const DEFAULT_REPORT_WORKFLOW_FILTERS = {
  duplicate: "exclude",
  is_deleted: false,
  statuses: ["published"],
  qualities: [3, 4, 5],
  priorities: [1, 2, 3],
};

export const PACK_PRIORITY_FILTERS = {
  very_important: [1],
  important: [2],
  valuable: [1, 2],
  all: null,
};

export function parsePackFormatKey(formatKey) {
  switch (formatKey) {
    case "html_card": return { format: "html_card" };
    case "html_table": return { format: "html_table" };
    case "txt": return { format: "txt" };
    case "pdf_a5_card": return { format: "pdf", pdf_source: "html_card", pdf_paper_size: "A5" };
    case "pdf_a5_table": return { format: "pdf", pdf_source: "html_table", pdf_paper_size: "A5" };
    case "pdf_a4": return { format: "pdf", pdf_source: "html_card", pdf_paper_size: "A4" };
    default: return { format: "txt" };
  }
}

export function mergePackDefaults(stored) {
  const base = JSON.parse(JSON.stringify(DEFAULT_PACK_DEFAULTS));
  if (!stored || typeof stored !== "object") return base;
  if (Array.isArray(stored.pack_types) && stored.pack_types.length) {
    const byKey = new Map(stored.pack_types.map((t) => [t.key, t]));
    base.pack_types = base.pack_types.map((def) => ({ ...def, ...byKey.get(def.key) }));
    for (const t of stored.pack_types) {
      if (!base.pack_types.some((x) => x.key === t.key)) base.pack_types.push({ ...t });
    }
  }
  if (stored.default_delivery) base.default_delivery = stored.default_delivery;
  if (stored.filename_style) base.filename_style = stored.filename_style;
  return base;
}

export function mergeReportWorkflowFilterDefaults(stored) {
  const base = { ...DEFAULT_REPORT_WORKFLOW_FILTERS };
  if (!stored || typeof stored !== "object") return base;
  if (stored.duplicate != null) base.duplicate = stored.duplicate;
  if (stored.is_deleted != null) base.is_deleted = stored.is_deleted;
  if (Array.isArray(stored.statuses)) base.statuses = [...stored.statuses];
  if (Array.isArray(stored.qualities)) base.qualities = [...stored.qualities];
  if (Array.isArray(stored.priorities)) base.priorities = [...stored.priorities];
  return base;
}

export function getAllReportDefaults() {
  return {
    messenger_template: DEFAULT_MESSENGER_TEMPLATE,
    document_caption_template: DEFAULT_DOCUMENT_CAPTION_TEMPLATE,
    news_item_template: DEFAULT_NEWS_ITEM_TEMPLATE,
    brief_submission_messenger_template: DEFAULT_BRIEF_SUBMISSION_MESSENGER_TEMPLATE,
    html_card_template: DEFAULT_HTML_CARD_TEMPLATE,
    html_table_template: DEFAULT_HTML_TABLE_TEMPLATE,
    txt_output_template: DEFAULT_TXT_OUTPUT_TEMPLATE,
    print_settings: cloneDefaultPrintSettings(),
    custom_prompt_policy: { ...DEFAULT_CUSTOM_PROMPT_POLICY },
    pack_defaults: JSON.parse(JSON.stringify(DEFAULT_PACK_DEFAULTS)),
    report_default_filters: { ...DEFAULT_REPORT_WORKFLOW_FILTERS },
  };
}
