import pdfMake from "pdfmake";
import path from "path";
import { fileURLToPath } from "url";
import moment from "jalali-moment";
import { stripHtml } from "../constants/analysisFieldLimits.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const fontDir = path.join(__dirname, "../../assets/fonts");

pdfMake.setFonts({
  Vazir: {
    normal: path.join(fontDir, "Vazirmatn-Regular.ttf"),
    bold: path.join(fontDir, "Vazirmatn-Bold.ttf"),
  },
});

pdfMake.setLocalAccessPolicy((filePath) => path.normalize(filePath).startsWith(path.normalize(fontDir)));

const STATUS_FA = {
  Draft: "پیش‌نویس",
  Submitted: "ارسال‌شده",
  ReturnedForRevision: "نیازمند اصلاح",
  Final: "نسخه نهایی",
  FinalApproved: "تایید نهایی",
};

function formatJalali(dateStr) {
  if (!dateStr) return "—";
  try {
    return moment(dateStr).locale("fa").format("jYYYY/jMM/jDD HH:mm");
  } catch {
    return String(dateStr);
  }
}

/** pdfmake با فونت فارسی ترتیب کلمات را معکوس می‌کند — قبل از رندر معکوس می‌کنیم */
function fixPdfPersianText(text) {
  if (text == null || text === "") return "—";
  return String(text)
    .split("\n")
    .map((line) => {
      const words = line.trim().split(/\s+/).filter(Boolean);
      return words.length ? words.reverse().join(" ") : line;
    })
    .join("\n");
}

function pdfText(text, opts = {}) {
  return { text: fixPdfPersianText(text), alignment: "right", ...opts };
}

function rtlCell(text, opts = {}) {
  return pdfText(text ?? "—", opts);
}

function htmlToPdfContent(html = "") {
  if (!html || !String(html).includes("<")) {
    return [pdfText(stripHtml(html) || "—", { alignment: "justify", lineHeight: 1.6, margin: [0, 0, 0, 8] })];
  }
  const blocks = [];
  const parts = String(html)
    .replace(/<br\s*\/?>/gi, "\n")
    .split(/(<h2[^>]*>.*?<\/h2>|<h3[^>]*>.*?<\/h3>|<p[^>]*>.*?<\/p>)/gi)
    .filter(Boolean);

  for (const part of parts) {
    const trimmed = part.trim();
    if (!trimmed) continue;
    if (/^<h2/i.test(trimmed)) {
      blocks.push(pdfText(stripHtml(trimmed), { style: "h2", margin: [0, 10, 0, 6] }));
    } else if (/^<h3/i.test(trimmed)) {
      blocks.push(pdfText(stripHtml(trimmed), { style: "h3", margin: [0, 8, 0, 4] }));
    } else {
      const text = stripHtml(trimmed);
      if (text) {
        blocks.push(pdfText(text, {
          bold: /<strong|<b/i.test(trimmed),
          decoration: /<u/i.test(trimmed) ? "underline" : undefined,
          alignment: "justify",
          lineHeight: 1.65,
          margin: [0, 0, 0, 6],
        }));
      }
    }
  }
  return blocks.length ? blocks : [pdfText(stripHtml(html), { alignment: "justify", lineHeight: 1.6 })];
}

export function generateAnalysisPdf({
  analysis,
  version,
  topic,
  assignment,
  scores = [],
  meta = {},
}) {
  const contentBlocks = htmlToPdfContent(version?.content || "");
  const avgScore = scores[0]?.total_score;
  const rangeLabel = meta.date_range_label || "";

  const appendixRows = [
    [rtlCell("عنوان تحلیل", { bold: true }), rtlCell(version?.title || "—")],
    [rtlCell("محور", { bold: true }), rtlCell(topic?.title || assignment?.title || "—")],
    [rtlCell("کد محور", { bold: true }), rtlCell(topic?.topic_code || "—")],
    [rtlCell("نسخه", { bold: true }), rtlCell(String(version?.version_number ?? "—"))],
    [rtlCell("وضعیت", { bold: true }), rtlCell(STATUS_FA[version?.status] || version?.status || "—")],
    [rtlCell("تاریخ ارسال", { bold: true }), rtlCell(formatJalali(version?.submitted_at || version?.created_at))],
    ...(rangeLabel ? [[rtlCell("بازه گزارش", { bold: true }), rtlCell(rangeLabel)]] : []),
    [rtlCell("تحلیل‌گر", { bold: true }), rtlCell(analysis?.analyst_name || meta.analyst_name || "—")],
    [rtlCell("واحد", { bold: true }), rtlCell(meta.unit_name || "—")],
    [rtlCell("راهنما", { bold: true }), rtlCell(meta.mentor_name || assignment?.mentor_name || "—")],
    [rtlCell("مدیر ارجاع", { bold: true }), rtlCell(meta.manager_name || assignment?.manager_name || "—")],
    [rtlCell("تاییدکننده نهایی", { bold: true }), rtlCell(meta.approver_name || "—")],
    [rtlCell("ارزیاب / امتیازدهنده", { bold: true }), rtlCell(meta.evaluator_name || "—")],
    [rtlCell("تاریخ تایید نهایی", { bold: true }), rtlCell(formatJalali(meta.approved_at || analysis?.updated_at))],
    [rtlCell("مهلت انجام", { bold: true }), rtlCell(formatJalali(assignment?.deadline))],
    [rtlCell("تاریخ تولید PDF", { bold: true }), rtlCell(formatJalali(new Date().toISOString()))],
  ];

  const appendixContent = [
    { text: fixPdfPersianText("امتیازدهی و شناسنامه"), style: "certTitle", pageBreak: "before" },
    ...(scores?.length ? [
      pdfText("امتیازدهی", { style: "h2", margin: [0, 0, 0, 8] }),
      {
        table: {
          widths: ["*", 55, 55],
          body: [
            [rtlCell("معیار", { bold: true }), rtlCell("امتیاز", { bold: true, alignment: "center" }), rtlCell("حداکثر", { bold: true, alignment: "center" })],
            ...scores.map((s) => [
              rtlCell(s.name_fa || s.name || "—"),
              rtlCell(String(s.score ?? "—"), { alignment: "center" }),
              rtlCell(String(s.max_score ?? 5), { alignment: "center" }),
            ]),
          ],
        },
        layout: "lightHorizontalLines",
        margin: [0, 0, 0, 12],
      },
      ...(avgScore != null ? [pdfText(`امتیاز کل: ${avgScore}`, { bold: true, margin: [0, 0, 0, 16] })] : []),
    ] : []),
    pdfText("شناسنامه تحلیل", { style: "h2", margin: [0, scores?.length ? 8 : 0, 0, 8] }),
    {
      table: {
        widths: ["32%", "68%"],
        body: appendixRows,
      },
      layout: "lightHorizontalLines",
    },
  ];

  const docDefinition = {
    pageSize: "A4",
    pageMargins: [45, 50, 45, 60],
    defaultStyle: { font: "Vazir", fontSize: 11, alignment: "right" },
    styles: {
      title: { fontSize: 18, bold: true, alignment: "center", margin: [0, 0, 0, 16] },
      h2: { fontSize: 14, bold: true, alignment: "right" },
      h3: { fontSize: 12, bold: true, alignment: "right" },
      certTitle: { fontSize: 14, bold: true, alignment: "center", margin: [0, 0, 0, 12] },
    },
    content: [
      pdfText("گزارش نهایی تحلیل", { style: "title", alignment: "center" }),
      pdfText("متن تحلیل", { style: "h2", margin: [0, 4, 0, 8] }),
      ...contentBlocks,
      ...appendixContent,
    ],
    footer: (currentPage, pageCount) => ({
      text: `صفحه ${currentPage} از ${pageCount}`,
      alignment: "center",
      fontSize: 9,
      color: "#64748b",
      margin: [0, 10, 0, 0],
    }),
  };

  return pdfMake.createPdf(docDefinition).getBuffer();
}
