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

/** جهت راست‌به‌چپ برای متن فارسی در pdfmake (جلوگیری از معکوس شدن ترتیب کلمات) */
const RLE = "\u202B";
const PDF_POP = "\u202C";
/** نمایش درست YYYY/MM/DD با ارقام فارسی داخل پاراگراف RTL */
const LRE = "\u202A";

function rtlPdfPersian(s) {
  if (s == null || s === "") return "—";
  const t = String(s).trim();
  if (!t || t === "—") return t || "—";
  return RLE + t + PDF_POP;
}

function ltrPdfDateFragment(s) {
  if (s == null || s === "" || s === "—") return "—";
  return LRE + String(s) + PDF_POP;
}

function normalizePdfText(text) {
  if (text == null || text === "") return "—";
  return String(text);
}

function toPersianDigits(val) {
  return String(val ?? "").replace(/[0-9]/g, (d) => "۰۱۲۳۴۵۶۷۸۹"[d]);
}

/** تاریخ شمسی ذخیره‌شده به صورت YYYY-MM-DD → رشتهٔ ۱۴۰۵/۰۳/۲۳ (سال/ماه/روز) */
function jalaliYmdPlain(ymd) {
  if (!ymd) return "—";
  const s = String(ymd).replace(/-/g, "/").trim();
  const parts = s.split("/").filter(Boolean);
  if (parts.length !== 3) return toPersianDigits(s);
  const [y, m, d] = parts;
  return `${toPersianDigits(y)}/${toPersianDigits(String(m).padStart(2, "0"))}/${toPersianDigits(String(d).padStart(2, "0"))}`;
}

function jalaliCreatedPlain(iso) {
  if (!iso) return "—";
  try {
    const s = moment(iso).locale("fa").format("jYYYY/jMM/jDD");
    return jalaliYmdPlain(s);
  } catch {
    return "—";
  }
}

function pdfInlineDateRange(start, end) {
  const d1 = jalaliYmdPlain(start);
  const d2 = jalaliYmdPlain(end);
  const inner = `از ${ltrPdfDateFragment(d1)} تا ${ltrPdfDateFragment(d2)}`;
  return {
    text: rtlPdfPersian(inner),
    alignment: "justify",
    direction: "rtl",
    font: "Vazir",
  };
}

function pdfText(text, opts = {}) {
  const { alignment: al, ...rest } = opts;
  return {
    text: normalizePdfText(text),
    alignment: al ?? "justify",
    direction: "rtl",
    font: "Vazir",
    ...rest,
  };
}

/** سلول جدول یا متن */
function rtlCell(textOrObj, opts = {}) {
  if (textOrObj != null && typeof textOrObj === "object" && !Array.isArray(textOrObj)) {
    const { alignment: al, fontSize, bold, margin, ...rest } = opts;
    return {
      font: "Vazir",
      direction: textOrObj.direction ?? "rtl",
      alignment: al ?? textOrObj.alignment ?? "justify",
      fontSize: fontSize ?? textOrObj.fontSize,
      bold: bold ?? textOrObj.bold,
      margin: margin ?? textOrObj.margin,
      ...textOrObj,
      ...rest,
    };
  }
  const raw = normalizePdfText(textOrObj);
  const wrapped = raw === "—" ? raw : rtlPdfPersian(raw);
  return pdfText(wrapped, { alignment: opts.alignment ?? "justify", ...opts });
}

function metaLine(label, valueContent) {
  const leftCol =
    typeof valueContent === "object" && valueContent.text !== undefined && !Array.isArray(valueContent)
      ? { ...valueContent, font: "Vazir", alignment: valueContent.alignment || "justify" }
      : pdfText(typeof valueContent === "string" && valueContent !== "—" ? rtlPdfPersian(valueContent) : valueContent, {
          alignment: "justify",
        });
  return {
    margin: [0, 0, 0, 5],
    columnGap: 8,
    columns: [
      { width: "*", ...leftCol },
      {
        width: 118,
        text: rtlPdfPersian(normalizePdfText(label)),
        bold: true,
        alignment: "justify",
        direction: "rtl",
        font: "Vazir",
      },
    ],
  };
}

function summaryBodyToPdfStack(plain) {
  const blocks = [];
  const lines = String(plain || "").split("\n");
  for (const line of lines) {
    const t = line.trim();
    if (!t) {
      blocks.push({ text: "\n", fontSize: 6, margin: [0, 2, 0, 0] });
      continue;
    }
    const m4 = t.match(/^\*\*\*\*(.+)\*\*\*\*$/);
    if (m4) {
      blocks.push({
        text: rtlPdfPersian(m4[1].trim()),
        bold: true,
        fontSize: 12,
        margin: [0, 10, 0, 6],
        alignment: "justify",
        direction: "rtl",
        font: "Vazir",
      });
      blocks.push({ text: "\n", fontSize: 4 });
      continue;
    }
    const m2 = t.match(/^\*\*(.+)\*\*$/);
    if (m2) {
      blocks.push({
        text: rtlPdfPersian(m2[1].trim()),
        bold: true,
        margin: [0, 6, 0, 4],
        alignment: "justify",
        direction: "rtl",
        font: "Vazir",
      });
      blocks.push({ text: "\n", fontSize: 4 });
      continue;
    }
    blocks.push({
      text: rtlPdfPersian(t),
      alignment: "justify",
      lineHeight: 1.55,
      direction: "rtl",
      margin: [0, 0, 0, 4],
      font: "Vazir",
    });
  }
  return { stack: blocks, margin: [0, 0, 0, 8] };
}

function cleanReportSnippet(row) {
  const raw = row.cleaned_text || row.raw_text || "";
  return String(raw).replace(/\s+/g, " ").trim().slice(0, 900);
}

const CLASS_FA = { 1: "عمومی", 2: "استانی", 3: "واحد", 4: "خاص" };
const KIND_FA = {
  daily: "روزانه",
  weekly: "هفتگی",
  monthly: "ماهانه",
  semi_annual: "شش‌ماهه",
  annual: "سالانه",
  custom: "دلخواه",
};
const TYPE_FA = { provincial: "استانی", special: "یگان", general: "عمومی" };

const EVENT_STATE_FA = {
  pending: "در انتظار",
  verified: "تاییدشده",
  rejected: "برگشتی",
};

function classificationLabels(summary) {
  if (summary.classifications?.length) {
    return summary.classifications.map((c) => CLASS_FA[c] || String(c)).filter(Boolean).join("، ");
  }
  if (summary.classification != null) {
    return CLASS_FA[summary.classification] || String(summary.classification);
  }
  return null;
}

function stateLabelFa(state) {
  if (state == null || state === "") return "—";
  const k = String(state).toLowerCase().trim();
  return EVENT_STATE_FA[k] || String(state);
}

const REF_HEADERS_LTR = ["متن", "وضعیت", "عنوان", "موضوع", "یگان", "تاریخ", "ردیف"];
const REF_WIDTHS_LTR = ["*", 40, 56, 64, 72, 52, 28];

export async function generateFieldManagementSummaryPdf({ summary, refs = [], includeReports = true }) {
  const metaStack = [
    metaLine("عنوان", summary.title || "—"),
    metaLine("نوع خلاصه (دامنه)", TYPE_FA[summary.summary_type] || summary.summary_type || "—"),
    metaLine("نوع گزارش (بازه)", KIND_FA[summary.period_kind] || summary.period_kind),
    metaLine("بازه گزارش", pdfInlineDateRange(summary.period_start, summary.period_end)),
    metaLine("تعداد گزارشات بررسی‌شده", {
      text: ltrPdfDateFragment(toPersianDigits(summary.report_count ?? refs.length)),
      alignment: "justify",
      direction: "rtl",
      font: "Vazir",
    }),
    metaLine("تاریخ ایجاد", {
      text: ltrPdfDateFragment(jalaliCreatedPlain(summary.created_at)),
      alignment: "justify",
      direction: "rtl",
      font: "Vazir",
    }),
  ];

  if (summary.summary_type === "provincial" && summary.provinces?.length) {
    metaStack.splice(3, 0, metaLine("استان‌ها", summary.provinces.join("، ")));
  }
  if (summary.summary_type === "special" && summary.unit_names?.length) {
    metaStack.splice(3, 0, metaLine("یگان‌ها", summary.unit_names.join("، ")));
  }
  if (summary.topics?.length) {
    metaStack.splice(3, 0, metaLine("موضوعات", summary.topics.join("، ")));
  }
  const clsLabel = classificationLabels(summary);
  if (clsLabel) {
    metaStack.push(metaLine("دامنه انتشار", clsLabel));
  }

  const bodyPlain = stripHtml(summary.summary_body || "");

  const content = [
    pdfText(rtlPdfPersian("خلاصه مدیریتی گزارشات میدانی"), { style: "title", alignment: "center" }),
    { stack: metaStack, margin: [0, 0, 0, 12] },
    pdfText(rtlPdfPersian("خلاصه متن"), { style: "h2", alignment: "justify" }),
    summaryBodyToPdfStack(bodyPlain),
  ];

  if (includeReports && refs.length) {
    const refTableBody = [
      REF_HEADERS_LTR.map((h) => rtlCell(h, { bold: true, alignment: "justify" })),
      ...refs.map((row, idx) => [
        rtlCell(cleanReportSnippet(row), { fontSize: 8, alignment: "justify" }),
        rtlCell(stateLabelFa(row.state), { alignment: "justify" }),
        rtlCell((row.title || "").slice(0, 80), { alignment: "justify" }),
        rtlCell((row.chat_title || "").slice(0, 80), { alignment: "justify" }),
        rtlCell(row.UnitName || row.UnitShortName || "—", { alignment: "justify" }),
        rtlCell({
          text: ltrPdfDateFragment(jalaliYmdPlain(row.date)),
          alignment: "justify",
          direction: "rtl",
          font: "Vazir",
        }),
        rtlCell({
          text: ltrPdfDateFragment(toPersianDigits(idx + 1)),
          alignment: "justify",
          direction: "rtl",
          font: "Vazir",
        }),
      ]),
    ];
    content.push(
      pdfText(rtlPdfPersian("فهرست گزارش‌های مرجع"), { style: "h2", pageBreak: "before", alignment: "justify" }),
      {
        table: {
          widths: REF_WIDTHS_LTR,
          body: refTableBody,
        },
        layout: "lightHorizontalLines",
        margin: [0, 8, 0, 0],
      },
    );
  }

  const docDefinition = {
    pageSize: "A4",
    pageMargins: [40, 45, 40, 55],
    defaultStyle: { font: "Vazir", fontSize: 10, alignment: "justify", direction: "rtl" },
    styles: {
      title: { fontSize: 16, bold: true, alignment: "center", margin: [0, 0, 0, 12] },
      h2: { fontSize: 12, bold: true, alignment: "justify", margin: [0, 10, 0, 6] },
    },
    content,
    footer: (currentPage, pageCount) => ({
      alignment: "center",
      fontSize: 9,
      color: "#64748b",
      margin: [0, 8, 0, 0],
      direction: "rtl",
      text: rtlPdfPersian(
        `صفحه ${ltrPdfDateFragment(toPersianDigits(currentPage))} از ${ltrPdfDateFragment(toPersianDigits(pageCount))}`,
      ),
    }),
  };

  return pdfMake.createPdf(docDefinition).getBuffer();
}
