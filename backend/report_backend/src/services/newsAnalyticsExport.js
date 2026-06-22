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
} from "docx";
import { getWidgetData } from "./newsAnalyticsService.js";

const WIDGET_TITLES = {
  overview: "آمار کلی اخبار",
  "distribution-bar": "نوار آماری اخبار",
  "category-distribution": "توزیع دسته‌بندی اخبار",
  "priority-distribution": "توزیع اولویت اخبار",
  "quality-distribution": "توزیع کیفیت اخبار",
  "source-analysis": "تحلیل منابع خبری",
  timeline: "روند زمانی انتشار اخبار",
  "units-participation": "مشارکت واحدها",
  "rankings-monitors": "رتبه‌بندی پایشگران",
  "rankings-editors": "رتبه‌بندی دبیران",
  "rankings-chiefs": "رتبه‌بندی سردبیران",
  "rankings-units": "رتبه‌بندی واحدها",
};

function toPersianDigits(val) {
  return String(val ?? "").replace(/[0-9]/g, (d) => "۰۱۲۳۴۵۶۷۸۹"[d]);
}

function dateRangeLabel(filters) {
  const s = filters.start_date || filters.from_ref_key || "—";
  const e = filters.end_date || filters.to_ref_key || "—";
  return `${toPersianDigits(s)} تا ${toPersianDigits(e)}`;
}

function tableFromRows(rows, columns) {
  if (!rows?.length) {
    return new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      rows: [
        new TableRow({
          children: [new TableCell({ children: [new Paragraph("داده‌ای یافت نشد")] })],
        }),
      ],
    });
  }
  const header = new TableRow({
    children: columns.map((c) => new TableCell({
      children: [new Paragraph({ children: [new TextRun({ text: c.label, bold: true })] })],
    })),
  });
  const body = rows.slice(0, 500).map((row) => new TableRow({
    children: columns.map((c) => new TableCell({
      children: [new Paragraph(String(row[c.key] ?? "—"))],
    })),
  }));
  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: [header, ...body],
  });
}

function extractTable(widgetId, data) {
  switch (widgetId) {
    case "overview":
      return {
        columns: [
          { key: "name", label: "وضعیت" },
          { key: "value", label: "تعداد" },
          { key: "percent", label: "درصد" },
        ],
        rows: (data.pie || []).map((x) => ({
          name: x.name,
          value: x.value,
          percent: x.percent,
        })),
      };
    case "timeline":
      return {
        columns: [{ key: "name", label: "تاریخ" }, { key: "value", label: "تعداد" }],
        rows: data.series || [],
      };
    case "rankings-monitors":
      return {
        columns: [
          { key: "rank", label: "رتبه" },
          { key: "name", label: "نام" },
          { key: "unit_name", label: "واحد" },
          { key: "news_count", label: "تعداد خبر" },
          { key: "score", label: "امتیاز" },
        ],
        rows: data.rows || [],
      };
    case "rankings-editors":
      return {
        columns: [
          { key: "rank", label: "رتبه" },
          { key: "name", label: "نام" },
          { key: "unit_name", label: "واحد" },
          { key: "reviewed_count", label: "بررسی‌شده" },
          { key: "approved_count", label: "تأییدشده" },
          { key: "score", label: "امتیاز" },
        ],
        rows: data.rows || [],
      };
    case "rankings-chiefs":
      return {
        columns: [
          { key: "rank", label: "رتبه" },
          { key: "name", label: "نام" },
          { key: "unit_name", label: "واحد" },
          { key: "published_count", label: "منتشرشده" },
          { key: "score", label: "امتیاز" },
        ],
        rows: data.rows || [],
      };
    case "rankings-units":
      return {
        columns: [
          { key: "rank", label: "رتبه" },
          { key: "unit_name", label: "واحد" },
          { key: "news_count", label: "اخبار" },
          { key: "score", label: "امتیاز" },
        ],
        rows: data.rows || [],
      };
    case "units-participation":
      return {
        columns: [
          { key: "rank", label: "رتبه" },
          { key: "unit_name", label: "واحد" },
          { key: "news_count", label: "اخبار" },
          { key: "share_percent", label: "سهم %" },
        ],
        rows: data.rows || [],
      };
    default:
      return {
        columns: [
          { key: "name", label: "عنوان" },
          { key: "value", label: "تعداد" },
          { key: "percent", label: "درصد" },
        ],
        rows: data.rows || [],
      };
  }
}

export async function buildAnalyticsDocx(widgetId, filters, scope, dataIn = null) {
  const data = dataIn || await getWidgetData(widgetId, filters, scope);
  const title = WIDGET_TITLES[widgetId] || widgetId;
  const { columns, rows } = extractTable(widgetId, data);

  const doc = new Document({
    sections: [{
      properties: {},
      children: [
        new Paragraph({
          alignment: AlignmentType.CENTER,
          children: [new TextRun({ text: title, bold: true, size: 32 })],
        }),
        new Paragraph({
          alignment: AlignmentType.CENTER,
          children: [new TextRun({ text: `بازه: ${dateRangeLabel(filters)}`, size: 24 })],
        }),
        new Paragraph({ text: "" }),
        tableFromRows(rows, columns),
      ],
    }],
  });

  return Packer.toBuffer(doc);
}

export function buildAnalyticsCsv(widgetId, filters, scope, data) {
  const { columns, rows } = extractTable(widgetId, data);
  const escape = (v) => {
    const s = String(v ?? "");
    if (s.includes(",") || s.includes('"') || s.includes("\n")) {
      return `"${s.replace(/"/g, '""')}"`;
    }
    return s;
  };
  const lines = [
    columns.map((c) => escape(c.label)).join(","),
    ...rows.slice(0, 500).map((row) => columns.map((c) => escape(row[c.key])).join(",")),
  ];
  return `\uFEFF${lines.join("\n")}`;
}

export async function exportAnalyticsWidget(widgetId, format, filters, scope) {
  const data = await getWidgetData(widgetId, filters, scope);
  if (format === "docx") {
    const buf = await buildAnalyticsDocx(widgetId, filters, scope, data);
    return { buffer: buf, mime: "application/vnd.openxmlformats-officedocument.wordprocessingml.document", ext: "docx" };
  }
  const csv = buildAnalyticsCsv(widgetId, filters, scope, data);
  return { buffer: Buffer.from(csv, "utf8"), mime: "text/csv;charset=utf-8", ext: "csv" };
}

export { WIDGET_TITLES };
