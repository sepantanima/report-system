/** کلیدهای فرمت برای تنظیمات چاپ */
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

export const DEFAULT_NEWS_ITEM_TEMPLATE = `{{index}}) {{news_date}} {{news_time}}
{{news_source}}
{{news_text}}`;

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

export function getAllReportDefaults() {
  return {
    messenger_template: DEFAULT_MESSENGER_TEMPLATE,
    news_item_template: DEFAULT_NEWS_ITEM_TEMPLATE,
    html_card_template: DEFAULT_HTML_CARD_TEMPLATE,
    html_table_template: DEFAULT_HTML_TABLE_TEMPLATE,
    txt_output_template: DEFAULT_TXT_OUTPUT_TEMPLATE,
    print_settings: cloneDefaultPrintSettings(),
  };
}
