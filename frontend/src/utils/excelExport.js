import * as XLSX from "xlsx";

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

  const mappedData = columnMap
    ? data.map((row) => {
        const out = {};
        Object.entries(columnMap).forEach(([key, label]) => {
          out[label] = row[key] ?? "";
        });
        return out;
      })
    : data;

  const worksheet = XLSX.utils.json_to_sheet(mappedData);
  worksheet["!dir"] = "rtl";

  const columnWidths = Object.keys(mappedData[0] || {}).map(() => ({ wch: 28 }));
  worksheet["!cols"] = columnWidths;

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
