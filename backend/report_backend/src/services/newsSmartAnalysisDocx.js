import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  AlignmentType,
} from "docx";
import { stripHtml } from "./newsTextUtils.js";
import { analysisTypeLabelFa } from "../constants/newsSmartAnalysisMeta.js";

function toPersianDigits(val) {
  return String(val ?? "").replace(/[0-9]/g, (d) => "۰۱۲۳۴۵۶۷۸۹"[d]);
}

function jalaliPlain(ymd) {
  if (!ymd) return "—";
  return toPersianDigits(String(ymd).replace(/-/g, "/"));
}

function rtlParagraph(text, opts = {}) {
  return new Paragraph({
    bidirectional: true,
    alignment: opts.alignment ?? AlignmentType.JUSTIFIED,
    children: [new TextRun({ text: String(text ?? ""), rightToLeft: true })],
    spacing: opts.spacing,
  });
}

function bodyParagraphs(body) {
  const plain = stripHtml(body || "").replace(/\r/g, "");
  const lines = plain.split(/\n+/).filter((l) => l.trim());
  if (!lines.length) return [rtlParagraph("(بدون متن)")];
  return lines.map((line) => rtlParagraph(line.trim(), { spacing: { after: 120 } }));
}

export async function buildSmartAnalysisDocx(analysis) {
  const title = analysis.title || analysisTypeLabelFa(analysis.analysis_type);
  const meta = [
    `نوع تحلیل: ${analysisTypeLabelFa(analysis.analysis_type)}`,
    `بازه: ${jalaliPlain(analysis.period_from)} تا ${jalaliPlain(analysis.period_to)}`,
    `تعداد اخبار: ${toPersianDigits(analysis.news_count ?? 0)}`,
  ].join("  |  ");

  const doc = new Document({
    sections: [{
      properties: {},
      children: [
        rtlParagraph(title, { alignment: AlignmentType.CENTER, spacing: { after: 200 } }),
        rtlParagraph(meta, { spacing: { after: 300 } }),
        ...bodyParagraphs(analysis.body_html || analysis.body_plain),
      ],
    }],
  });

  return Packer.toBuffer(doc);
}

export function buildSmartAnalysisPrintHtml(analysis, settings = {}) {
  const color = settings.report_color || "#7c3aed";
  const org = settings.organization_name || settings.system_name || "";
  const body = analysis.body_html || `<pre>${stripHtml(analysis.body_plain || "")}</pre>`;
  return `<!doctype html>
<html lang="fa" dir="rtl">
<head>
<meta charset="utf-8"/>
<title>${analysis.title || "تحلیل"}</title>
<style>
body { font-family: Tahoma, Vazirmatn, Arial, sans-serif; margin: 24px; direction: rtl; color: #111; }
h1 { color: ${color}; font-size: 22px; border-bottom: 2px solid ${color}; padding-bottom: 8px; }
.meta { color: #555; font-size: 13px; margin: 12px 0 20px; }
.content { line-height: 1.9; font-size: 15px; text-align: justify; }
.footer { margin-top: 32px; font-size: 11px; color: #666; text-align: center; }
@media print { body { margin: 12mm; } }
</style>
</head>
<body>
<h1>${analysis.title || "تحلیل هوشمند اخبار"}</h1>
<div class="meta">${org ? `${org} · ` : ""}${analysisTypeLabelFa(analysis.analysis_type)} · ${jalaliPlain(analysis.period_from)} تا ${jalaliPlain(analysis.period_to)} · ${toPersianDigits(analysis.news_count ?? 0)} خبر</div>
<div class="content">${body}</div>
<div class="footer">${settings.signature_text || ""}</div>
</body>
</html>`;
}
