import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  Table,
  TableRow,
  TableCell,
  WidthType,
  AlignmentType,
  PageBreak,
} from "docx";
import moment from "jalali-moment";
import { stripHtml } from "../constants/analysisFieldLimits.js";

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

function classificationLabels(summary) {
  if (summary.classifications?.length) {
    return summary.classifications.map((c) => CLASS_FA[c] || String(c)).filter(Boolean).join("، ");
  }
  if (summary.classification != null) {
    return CLASS_FA[summary.classification] || String(summary.classification);
  }
  return null;
}

const EVENT_STATE_FA = {
  pending: "در انتظار",
  verified: "تاییدشده",
  rejected: "برگشتی",
};

function stateLabelFa(state) {
  if (state == null || state === "") return "—";
  const k = String(state).toLowerCase().trim();
  return EVENT_STATE_FA[k] || String(state);
}

function cleanReportSnippet(row) {
  const raw = row.cleaned_text || row.raw_text || "";
  return String(raw).replace(/\s+/g, " ").trim().slice(0, 900);
}

function toPersianDigits(val) {
  return String(val ?? "").replace(/[0-9]/g, (d) => "۰۱۲۳۴۵۶۷۸۹"[d]);
}

/** تاریخ شمسی ذخیره‌شده YYYY-MM-DD → رشتهٔ ۱۴۰۴/۰۹/۲۳ (بدون کاراکتر کنترل bidi برای Word) */
function jalaliStoredPlain(ymd) {
  if (!ymd) return "—";
  const s = String(ymd).replace(/-/g, "/").trim();
  const p = s.split("/").filter(Boolean);
  if (p.length !== 3) return toPersianDigits(s);
  const [y, m, d] = p;
  return `${toPersianDigits(y)}/${toPersianDigits(String(m).padStart(2, "0"))}/${toPersianDigits(String(d).padStart(2, "0"))}`;
}

function jalaliCreatedPlain(iso) {
  if (!iso) return "—";
  try {
    const s = moment(iso).locale("fa").format("jYYYY/jMM/jDD");
    const p = s.split("/").filter(Boolean);
    if (p.length !== 3) return toPersianDigits(s);
    const [y, m, d] = p;
    return `${toPersianDigits(y)}/${toPersianDigits(String(m).padStart(2, "0"))}/${toPersianDigits(String(d).padStart(2, "0"))}`;
  } catch {
    return "—";
  }
}

/** جهت نمایش صحیح سال/ماه/روز و ارقام در Word داخل پاراگراف RTL */
const LRE = "\u202A";
const PDFC = "\u202C";
function ltrEmb(s) {
  if (s == null || s === "" || s === "—") return "—";
  return LRE + String(s) + PDFC;
}

function rtlParagraph(children, opts = {}) {
  return new Paragraph({
    bidirectional: true,
    alignment: opts.alignment ?? AlignmentType.JUSTIFIED,
    children,
    ...opts,
  });
}

/** جدول دو ستونه: مقدار (چپ) | برچسب (راست) — هر دو راست‌چین */
function metaTableRow(label, valueRuns) {
  return new TableRow({
    children: [
      new TableCell({
        width: { size: 72, type: WidthType.PERCENTAGE },
        children: [
          new Paragraph({
            bidirectional: true,
            alignment: AlignmentType.JUSTIFIED,
            children: valueRuns,
          }),
        ],
      }),
      new TableCell({
        width: { size: 28, type: WidthType.PERCENTAGE },
        children: [
          rtlParagraph([new TextRun({ text: `${label}`, bold: true, rightToLeft: true })], {
            alignment: AlignmentType.JUSTIFIED,
          }),
        ],
      }),
    ],
  });
}

function pLineRuns(label, valueText) {
  return metaTableRow(label, [new TextRun({ text: String(valueText ?? "—"), rightToLeft: true })]);
}

function cell(text, bold = false, alignment = AlignmentType.JUSTIFIED) {
  return new TableCell({
    children: [
      new Paragraph({
        bidirectional: true,
        alignment,
        children: [new TextRun({ text: String(text ?? ""), bold, rightToLeft: true })],
      }),
    ],
  });
}

/** چپ→راست: متن … ردیف */
const REF_HEADERS_LTR = ["متن", "وضعیت", "عنوان", "موضوع", "یگان", "تاریخ", "ردیف"];

export async function generateFieldManagementSummaryDocx({ summary, refs = [], includeReports = true }) {
  const metaRows = [
    metaTableRow("عنوان", [new TextRun({ text: summary.title || "—", rightToLeft: true })]),
    metaTableRow("نوع خلاصه (دامنه)", [
      new TextRun({ text: TYPE_FA[summary.summary_type] || summary.summary_type || "—", rightToLeft: true }),
    ]),
    metaTableRow("نوع گزارش (بازه)", [
      new TextRun({ text: KIND_FA[summary.period_kind] || summary.period_kind || "—", rightToLeft: true }),
    ]),
    metaTableRow("بازه گزارش", [
      new TextRun({ text: "از ", rightToLeft: true }),
      new TextRun({ text: ltrEmb(jalaliStoredPlain(summary.period_start)), rightToLeft: true }),
      new TextRun({ text: " تا ", rightToLeft: true }),
      new TextRun({ text: ltrEmb(jalaliStoredPlain(summary.period_end)), rightToLeft: true }),
    ]),
    metaTableRow("تعداد گزارشات بررسی‌شده", [
      new TextRun({ text: ltrEmb(toPersianDigits(summary.report_count ?? refs.length)), rightToLeft: true }),
    ]),
    metaTableRow("تاریخ ایجاد", [new TextRun({ text: ltrEmb(jalaliCreatedPlain(summary.created_at)), rightToLeft: true })]),
  ];

  if (summary.topics?.length) {
    metaRows.splice(3, 0, pLineRuns("موضوعات", summary.topics.join("، ")));
  }
  if (summary.summary_type === "provincial" && summary.provinces?.length) {
    metaRows.splice(3, 0, pLineRuns("استان‌ها", summary.provinces.join("، ")));
  }
  if (summary.summary_type === "general") {
    metaRows.splice(3, 0, pLineRuns("دامنه", "عمومی (کل کشور)"));
  }
  if (summary.summary_type === "special" && summary.unit_names?.length) {
    metaRows.splice(3, 0, pLineRuns("یگان‌ها", summary.unit_names.join("، ")));
  }
  const clsLabel = classificationLabels(summary);
  if (clsLabel) {
    metaRows.push(pLineRuns("دامنه انتشار", clsLabel));
  }

  const children = [
    rtlParagraph(
      [new TextRun({ text: "خلاصه مدیریتی گزارشات میدانی", bold: true, size: 32, rightToLeft: true })],
      { alignment: AlignmentType.CENTER, spacing: { after: 200 } },
    ),
    new Table({
      visuallyRightToLeft: false,
      width: { size: 100, type: WidthType.PERCENTAGE },
      rows: metaRows,
    }),
    rtlParagraph([new TextRun({ text: "" })]),
    rtlParagraph([new TextRun({ text: "خلاصه متن", bold: true, rightToLeft: true })], {
      alignment: AlignmentType.JUSTIFIED,
    }),
  ];

  const bodyPlain = stripHtml(summary.summary_body || "");
  for (const rawLine of bodyPlain.split("\n")) {
    const t = rawLine.trim();
    if (!t) {
      children.push(rtlParagraph([new TextRun({ text: " ", rightToLeft: true })], { spacing: { after: 100 } }));
      continue;
    }
    const m4 = t.match(/^\*\*\*\*(.+)\*\*\*\*$/);
    if (m4) {
      children.push(
        rtlParagraph([new TextRun({ text: m4[1].trim(), bold: true, size: 26, rightToLeft: true })], {
          spacing: { after: 140 },
        }),
      );
      continue;
    }
    const m2 = t.match(/^\*\*(.+)\*\*$/);
    if (m2) {
      children.push(
        rtlParagraph([new TextRun({ text: m2[1].trim(), bold: true, rightToLeft: true })], { spacing: { after: 120 } }),
      );
      continue;
    }
    children.push(rtlParagraph([new TextRun({ text: rawLine, rightToLeft: true })]));
  }

  if (includeReports && refs.length) {
    children.push(
      new Paragraph({
        bidirectional: true,
        alignment: AlignmentType.JUSTIFIED,
        children: [new PageBreak()],
      }),
      rtlParagraph([new TextRun({ text: "فهرست گزارش‌های مرجع", bold: true, rightToLeft: true })]),
    );

    const headerRow = new TableRow({
      children: REF_HEADERS_LTR.map((h) => cell(h, true, AlignmentType.JUSTIFIED)),
    });

    const dataRows = refs.map(
      (row, idx) =>
        new TableRow({
          children: [
            cell(cleanReportSnippet(row)),
            cell(stateLabelFa(row.state)),
            cell((row.title || "").slice(0, 200)),
            cell((row.chat_title || "").slice(0, 200)),
            cell(row.UnitName || row.UnitShortName || ""),
            cell(ltrEmb(jalaliStoredPlain(row.date))),
            cell(ltrEmb(toPersianDigits(idx + 1))),
          ],
        }),
    );

    children.push(
      new Table({
        visuallyRightToLeft: false,
        width: { size: 100, type: WidthType.PERCENTAGE },
        rows: [headerRow, ...dataRows],
      }),
    );
  }

  const doc = new Document({
    sections: [{ children }],
  });

  return Packer.toBuffer(doc);
}
