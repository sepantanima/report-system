import * as XLSX from "xlsx";

function mapRows(data, columnMap) {
  if (!columnMap) return data;
  return data.map((row) => {
    const out = {};
    Object.entries(columnMap).forEach(([key, label]) => {
      out[label] = row[key] ?? "";
    });
    return out;
  });
}

function sheetFromRows(rows, columnMap, sheetName) {
  const mapped = mapRows(rows, columnMap);
  const worksheet = XLSX.utils.json_to_sheet(mapped);
  worksheet["!dir"] = "rtl";
  worksheet["!cols"] = Object.keys(mapped[0] || {}).map(() => ({ wch: 28 }));
  return { worksheet, name: sheetName };
}

/**
 * @param {Array<object>} data
 * @param {string} fileName - with or without .xlsx
 * @param {{ columnMap?: Record<string,string>, sheetName?: string, titleRow?: string }} options
 */
export const exportToExcel = (data, fileName = "report", options = {}) => {
  if (!data || data.length === 0) {
    console.error("No data to export");
    return;
  }

  const { columnMap, sheetName = "گزارش", titleRow } = typeof options === "object" && options !== null ? options : {};
  const { worksheet } = sheetFromRows(data, columnMap, sheetName);

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);

  if (titleRow) {
    const titleSheet = XLSX.utils.aoa_to_sheet([[titleRow]]);
    titleSheet["!dir"] = "rtl";
    XLSX.utils.book_append_sheet(workbook, titleSheet, "عنوان");
  }

  let safeName = String(fileName || "report");
  if (!safeName.toLowerCase().endsWith(".xlsx")) safeName = `${safeName}.xlsx`;

  XLSX.writeFile(workbook, safeName);
};

/**
 * @param {Array<{ name: string, rows: object[], columnMap?: Record<string,string> }>} sheets
 * @param {string} fileName
 * @param {{ titleRow?: string }} options
 */
export const exportWorkbook = (sheets, fileName = "report", options = {}) => {
  const valid = (sheets || []).filter((s) => s?.rows?.length);
  if (!valid.length) {
    console.error("No sheets to export");
    return;
  }

  const workbook = XLSX.utils.book_new();
  valid.forEach((s) => {
    const { worksheet, name } = sheetFromRows(s.rows, s.columnMap, s.name);
    XLSX.utils.book_append_sheet(workbook, worksheet, String(name || "Sheet").slice(0, 31));
  });

  if (options.titleRow) {
    const titleSheet = XLSX.utils.aoa_to_sheet([[options.titleRow]]);
    titleSheet["!dir"] = "rtl";
    XLSX.utils.book_append_sheet(workbook, titleSheet, "عنوان");
  }

  let safeName = String(fileName || "report");
  if (!safeName.toLowerCase().endsWith(".xlsx")) safeName = `${safeName}.xlsx`;

  XLSX.writeFile(workbook, safeName);
};
