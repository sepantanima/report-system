import pdfMake from "pdfmake";
import path from "path";
import { fileURLToPath } from "url";
import moment from "jalali-moment";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const fontDir = path.join(__dirname, "../../assets/fonts");

pdfMake.setFonts({
  Vazir: {
    normal: path.join(fontDir, "Vazirmatn-Regular.ttf"),
    bold: path.join(fontDir, "Vazirmatn-Bold.ttf"),
  },
});

pdfMake.setLocalAccessPolicy((filePath) =>
  path.normalize(filePath).startsWith(path.normalize(fontDir)),
);

function fixPdfPersianText(text) {
  if (text == null || text === "") return "—";
  return String(text)
    .split("\n")
    .map((line) => line.split(" ").reverse().join(" "))
    .join("\n");
}

function jalaliNow() {
  try {
    return moment().locale("fa").format("jYYYY/jMM/jDD HH:mm");
  } catch {
    return new Date().toISOString();
  }
}

/** PDF خلاصه داشبورد مرکز فرماندهی */
export async function buildCommandDashboardPdf(overview) {
  const kpi = overview?.kpi_bar || [];
  const alerts = overview?.alerts || [];
  const health = overview?.health;
  const range = overview?.range || {};

  const kpiBody = [
    [
      { text: fixPdfPersianText("وضعیت"), style: "th" },
      { text: fixPdfPersianText("تغییر٪"), style: "th" },
      { text: fixPdfPersianText("مقدار"), style: "th" },
      { text: fixPdfPersianText("شاخص"), style: "th" },
    ],
    ...kpi.map((k) => [
      fixPdfPersianText(k.status || "—"),
      fixPdfPersianText(k.delta_pct == null ? "—" : String(k.delta_pct)),
      fixPdfPersianText(k.value == null ? "—" : String(k.value)),
      fixPdfPersianText(k.label || k.id),
    ]),
  ];

  const alertLines =
    alerts.length === 0
      ? [{ text: fixPdfPersianText("هشدار فعالی نیست"), margin: [0, 4, 0, 0] }]
      : alerts.slice(0, 15).map((a) => ({
          text: fixPdfPersianText(`[${a.priority}] ${a.title}: ${a.message}`),
          margin: [0, 2, 0, 2],
          fontSize: 9,
        }));

  const docDefinition = {
    defaultStyle: { font: "Vazir", fontSize: 10, alignment: "right" },
    content: [
      { text: fixPdfPersianText("گزارش داشبورد مرکز فرماندهی"), style: "h1" },
      {
        text: fixPdfPersianText(
          `بازه: ${range.from || "—"} تا ${range.to || "—"} | تولید: ${jalaliNow()}`,
        ),
        margin: [0, 0, 0, 12],
        fontSize: 9,
      },
      {
        text: fixPdfPersianText(
          `سلامت سامانه: ${health?.system_score ?? "—"} (${health?.system_status || "—"})`,
        ),
        margin: [0, 0, 0, 10],
        bold: true,
      },
      { text: fixPdfPersianText("شاخص‌های کلیدی"), style: "h2" },
      {
        table: { headerRows: 1, widths: ["*", 50, 50, "*"], body: kpiBody },
        layout: "lightHorizontalLines",
        margin: [0, 0, 0, 14],
      },
      { text: fixPdfPersianText("هشدارها"), style: "h2" },
      ...alertLines,
    ],
    styles: {
      h1: { fontSize: 14, bold: true, margin: [0, 0, 0, 8] },
      h2: { fontSize: 12, bold: true, margin: [0, 8, 0, 6] },
      th: { bold: true, fontSize: 9 },
    },
  };

  return pdfMake.createPdf(docDefinition).getBuffer();
}
