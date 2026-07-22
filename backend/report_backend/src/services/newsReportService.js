import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import JSZip from "jszip";
import pool from "../db.js";
import { parseUserRoles } from "../middleware/requireRole.js";
import { resolveAnalyticsScope } from "./newsAnalyticsService.js";
import { getAnalyticsDistribution, getAnalyticsTimeline, getAnalyticsOverview } from "./newsAnalyticsService.js";
import { resolveReportPeriod, periodToQueryFilters } from "./newsReportPeriod.js";
import {
  fetchNewsReportRows,
  fetchNewsReportRowsPaginated,
  countNewsReportRows,
  fetchNewsByIds,
  mergeReportWorkflowFilters,
} from "./newsReportQuery.js";
import { ensureReportRefForPeriod } from "./newsReportRefService.js";
import { renderReportContent } from "./newsReportFormat.js";
import {
  buildSlotEngineMeta,
  buildPublishDocumentCaption,
  buildDocumentCaptionFromTemplate,
  buildReportFileName,
  buildPackFileName,
  buildPackReportLabel,
} from "./newsReportMeta.js";
import { getNewsReportSettings, getNewsReportWorkflowConfig } from "./newsReportSettingsService.js";
import { publishNewsReport, publishSingleNews } from "./messengerSendOrchestrator.js";
import { buildSingleNewsMessage } from "./newsReportMessengerTemplate.js";
import { htmlToPdfBuffer } from "./newsReportPdf.js";
import {
  resolvePrintFormatKey,
  parsePackFormatKey,
  PACK_FORMAT_LABELS,
  PACK_PRIORITY_FILTERS,
  mergePackDefaults,
} from "../constants/newsReportDefaults.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const UPLOAD_DIR = path.join(__dirname, "../../uploads/news-reports");

function ensureUploadDir() {
  if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

const REPORT_KIND_LABELS = { list: "لیستی", analytical: "تحلیلی", file: "فایلی" };

function normalizeFormat(fmt, pdfSource) {
  const f = String(fmt || "txt").trim();
  if (f === "pdf") return { format: "pdf", pdf_source: pdfSource || "html_card" };
  if (["txt", "html_card", "html_table", "html"].includes(f)) return { format: f };
  return { format: "txt" };
}

function buildFileName(period, newsCount, format, pdfPaperSize, pdfSource, filenameStyle) {
  return buildReportFileName(period, newsCount, format, pdfPaperSize, pdfSource, filenameStyle);
}

function parseOutputFormatSpecs(body) {
  if (Array.isArray(body.output_formats) && body.output_formats.length) {
    return body.output_formats.map((item) => {
      if (typeof item === "string") {
        const n = normalizeFormat(item);
        return { ...n, pdf_paper_size: body.pdf_paper_size };
      }
      const n = normalizeFormat(item.format, item.pdf_source);
      return { ...n, pdf_paper_size: item.pdf_paper_size || body.pdf_paper_size };
    });
  }
  const single = normalizeFormat(body.format, body.pdf_source);
  return [{ ...single, pdf_paper_size: body.pdf_paper_size }];
}

async function prepareReportGeneration(body, user) {
  const period = resolveReportPeriod(body);
  const scope = resolveAnalyticsScope(user);
  const periodFilters = periodToQueryFilters(period);
  await ensureReportRefForPeriod(periodFilters.from_ref_key, periodFilters.to_ref_key);
  const reportKind = body.report_kind === "analytical" ? "analytical" : "list";
  const settings = await getNewsReportSettings();
  const filters = mergeReportWorkflowFilters(body.filters || {}, settings.report_default_filters);
  const selectedIds = body.selected_ids;

  let rows = [];
  let analytics = null;
  if (reportKind === "analytical") {
    analytics = await buildAnalyticalData(periodFilters, filters, scope);
  } else {
    rows = await loadReportRows(periodFilters, filters, scope, selectedIds);
  }
  const newsCount = reportKind === "analytical" ? analytics.total : rows.length;

  return {
    period,
    scope,
    periodFilters,
    reportKind,
    filters,
    settings,
    selectedIds,
    rows,
    analytics,
    newsCount,
  };
}

function buildFiltersWithPackMeta(filters, packKey, formatKey, settings) {
  const packDefaults = mergePackDefaults(settings?.pack_defaults);
  const packType = packDefaults.pack_types.find((t) => t.key === packKey);
  return {
    ...filters,
    _pack_meta: {
      pack_key: packKey,
      format_key: formatKey,
      pack_label: packType?.label || packKey,
      format_label: PACK_FORMAT_LABELS[formatKey] || formatKey,
    },
  };
}

async function writeNewsReportFile({
  body, user, formatSpec, shared, allowPublish = false,
  rowsOverride = null,
  fileNameOverride = null,
  labelOverride = null,
  newsCountOverride = null,
  formatKey = null,
  packKey = "all",
  returnBufferOnly = false,
}) {
  ensureUploadDir();
  const { format, pdf_source } = normalizeFormat(formatSpec.format, formatSpec.pdf_source);
  const pdfPaperSize = formatSpec.pdf_paper_size || shared.settings.pdf_paper_size || "A4";
  const {
    period, reportKind, filters, settings, selectedIds, analytics,
  } = shared;
  const rows = rowsOverride ?? shared.rows;
  const newsCount = newsCountOverride ?? (reportKind === "analytical" ? shared.analytics?.total : rows.length);
  const filenameStyle = settings.pack_defaults?.filename_style || "full_fa";

  const printFormatKey = resolvePrintFormatKey(format, pdfPaperSize, pdf_source);
  const printConfig = settings.print_settings?.[printFormatKey] || null;

  const slot = buildSlotEngineMeta(period, settings, { label: labelOverride || body.label });
  if (format === "pdf") slot.pdf_source = pdf_source;
  slot.print_config = printConfig || {
    paper_size: pdfPaperSize,
    margin_top: 10,
    margin_bottom: 10,
    margin_left: 10,
    margin_right: 10,
  };

  const renderFormat = format === "pdf" ? pdf_source : format;
  let content = renderReportContent(renderFormat, rows, slot, analytics, reportKind);
  let isBinary = false;

  if (format === "pdf") {
    content = await htmlToPdfBuffer(content, {
      ...settings,
      pdf_paper_size: printConfig?.paper_size || pdfPaperSize,
      print_config: slot.print_config,
    });
    isBinary = true;
  }

  const resolvedFormatKey = formatKey || (format === "pdf"
    ? (pdfPaperSize === "A5" ? (pdf_source === "html_table" ? "pdf_a5_table" : "pdf_a5_card") : "pdf_a4")
    : format);
  const fileName = fileNameOverride || buildPackFileName(period, {
    packKey,
    formatKey: resolvedFormatKey,
    newsCount,
    filenameStyle,
  });

  if (returnBufferOnly) {
    return {
      content,
      isBinary,
      fileName,
      format,
      newsCount,
      slot,
      packKey,
      formatKey: resolvedFormatKey,
    };
  }

  const ins = await pool.query(
    `INSERT INTO tbl_news_reports (created_by, report_kind, format, mode, from_ref_key, to_ref_key, filters, selected_ids, status)
     VALUES ($1,$2,$3,$4,$5,$6,$7::jsonb,$8::jsonb,'pending') RETURNING id`,
    [
      user?.id ?? null,
      reportKind,
      format,
      period.mode,
      period.from_ref_key,
      period.to_ref_key,
      JSON.stringify(buildFiltersWithPackMeta(filters, packKey, resolvedFormatKey, settings)),
      JSON.stringify(selectedIds || []),
    ],
  );
  const reportId = ins.rows[0].id;

  try {
    const filePath = path.join(UPLOAD_DIR, `${reportId}_${fileName}`);
    if (isBinary) fs.writeFileSync(filePath, content);
    else fs.writeFileSync(filePath, content, "utf8");

    let publishStatus = null;
    let publishedAt = null;
    let publishError = null;

    await pool.query(
      `UPDATE tbl_news_reports SET news_count = $1, file_name = $2, file_path = $3, status = 'ready' WHERE id = $4`,
      [newsCount, fileName, filePath, reportId],
    );

    if (allowPublish && body.publish && body.destination_id) {
      const destId = parseInt(body.destination_id, 10);
      const packDefaults = mergePackDefaults(settings?.pack_defaults);
      const packType = packDefaults.pack_types.find((t) => t.key === packKey);
      const documentCaption = buildDocumentCaptionFromTemplate({
        settings,
        slot,
        period,
        newsCount,
        formatKey: resolvedFormatKey,
        packLabel: packType?.label,
      });
      const caption = documentCaption;
      try {
        await publishNewsReport({
          channelConfigId: destId,
          userId: user?.id,
          format,
          filePath,
          fileName,
          meta: {
            messengerText: format === "txt" ? String(content).replace(/^\uFEFF/, "") : caption,
            documentCaption,
            inlineText: format === "txt" ? String(content).replace(/^\uFEFF/, "") : null,
          },
          settings,
          rows,
          slot,
        });
        publishStatus = "published";
        publishedAt = new Date();
      } catch (pubErr) {
        publishError = pubErr.message || String(pubErr);
        publishStatus = "failed";
      }
      await pool.query(
        `UPDATE tbl_news_reports SET channel_config_id = $1, publish_status = $2, published_at = $3, error_message = $4 WHERE id = $5`,
        [destId, publishStatus, publishedAt, publishError, reportId],
      );
    }

    return {
      id: reportId,
      news_count: newsCount,
      file_name: fileName,
      format,
      pdf_paper_size: format === "pdf" ? pdfPaperSize : null,
      publish_status: publishStatus,
      publish_error: publishError,
      period,
    };
  } catch (e) {
    await pool.query(
      `UPDATE tbl_news_reports SET status = 'failed', error_message = $1 WHERE id = $2`,
      [e.message, reportId],
    );
    throw e;
  }
}

async function buildAnalyticalData(periodFilters, apiFilters, scope) {
  const filters = { ...periodFilters, ...apiFilters };
  const [overview, category, priority, timeline] = await Promise.all([
    getAnalyticsOverview(filters, scope),
    getAnalyticsDistribution(filters, scope, "category"),
    getAnalyticsDistribution(filters, scope, "priority"),
    getAnalyticsTimeline(filters, scope, "day"),
  ]);
  return {
    total: overview?.total ?? 0,
    distributions: { category: category?.rows || [], priority: priority?.rows || [] },
    timeline: timeline?.series || [],
  };
}

async function loadReportRows(periodFilters, filters, scope, selectedIds) {
  const ids = Array.isArray(selectedIds) ? selectedIds.map((x) => parseInt(x, 10)).filter(Number.isFinite) : [];
  if (ids.length) {
    const all = await fetchNewsByIds(ids, scope);
    const idSet = new Set(ids);
    return all.filter((r) => idSet.has(r.id)).sort((a, b) => ids.indexOf(a.id) - ids.indexOf(b.id));
  }
  return fetchNewsReportRows(periodFilters, filters, scope);
}

function canAccessReport(row, user) {
  if (!row) return false;
  const roles = parseUserRoles(user?.role);
  if (roles.includes("admin") || roles.includes("news_chief")) return true;
  if (!row.created_by || !user?.id) return true;
  return row.created_by === user.id;
}

export function filterRowsByPack(rows, packKey) {
  const priorities = PACK_PRIORITY_FILTERS[packKey];
  if (!priorities) return rows;
  const allowed = new Set(priorities.map((p) => Number(p)));
  return rows.filter((r) => allowed.has(Number(r.priority)));
}

function normalizeFilterIntArray(v) {
  if (!Array.isArray(v)) return [];
  return v.map((x) => parseInt(x, 10)).filter((n) => Number.isFinite(n));
}

/** تقاطع اولویت‌های نوع پک با فیلتر اولویت کاربر؛ null یعنی شمارش باید ۰ باشد */
function resolvePackCountFilters(baseFilters, packKey) {
  const packPriorities = PACK_PRIORITY_FILTERS[packKey];
  if (!packPriorities) return { filters: baseFilters, zero: false };

  const userImportance = normalizeFilterIntArray(baseFilters.importance ?? baseFilters.priorities);
  const effective = userImportance.length
    ? packPriorities.filter((p) => userImportance.includes(Number(p)))
    : [...packPriorities];

  if (userImportance.length && !effective.length) {
    return { filters: baseFilters, zero: true };
  }

  const next = { ...baseFilters, importance: effective };
  delete next.priorities;
  return { filters: next, zero: false };
}

async function writeZipReport({ shared, user, body, zipBuffer, fileName, newsCount }) {
  ensureUploadDir();
  const { period, reportKind, filters, selectedIds, settings } = shared;
  const zipFilters = {
    ...filters,
    _pack_meta: {
      pack_key: "pack",
      format_key: "zip",
      pack_label: "پک ZIP",
      format_label: "ZIP",
    },
  };
  const ins = await pool.query(
    `INSERT INTO tbl_news_reports (created_by, report_kind, format, mode, from_ref_key, to_ref_key, filters, selected_ids, status)
     VALUES ($1,$2,'zip',$3,$4,$5,$6::jsonb,$7::jsonb,'pending') RETURNING id`,
    [
      user?.id ?? null,
      reportKind,
      period.mode,
      period.from_ref_key,
      period.to_ref_key,
      JSON.stringify(zipFilters),
      JSON.stringify(selectedIds || []),
    ],
  );
  const reportId = ins.rows[0].id;
  const filePath = path.join(UPLOAD_DIR, `${reportId}_${fileName}`);
  fs.writeFileSync(filePath, zipBuffer);
  await pool.query(
    `UPDATE tbl_news_reports SET news_count = $1, file_name = $2, file_path = $3, status = 'ready' WHERE id = $4`,
    [newsCount, fileName, filePath, reportId],
  );
  return { id: reportId, news_count: newsCount, file_name: fileName, format: "zip", period };
}

export async function generateNewsReportPack(body, user) {
  const shared = await prepareReportGeneration(body, user);
  const packItems = Array.isArray(body.pack_items) ? body.pack_items : [];
  if (!packItems.length) throw new Error("حداقل یک نوع پک انتخاب کنید");

  const delivery = body.delivery === "separate" ? "separate" : "zip";
  const packDefaults = mergePackDefaults(shared.settings.pack_defaults);
  const filenameStyle = packDefaults.filename_style || "full_fa";
  const packTypeMap = new Map(packDefaults.pack_types.map((t) => [t.key, t]));
  const baseLabel = String(body.label || "").replace(/\s*\([\d۰-۹]+\)\s*$/, "").trim();

  const warnings = [];
  const fileBuffers = [];
  const results = [];

  for (const item of packItems) {
    const packKey = String(item.pack_key || "").trim();
    const formatKeys = Array.isArray(item.format_keys) ? item.format_keys : [];
    if (!packKey || !formatKeys.length) continue;

    const packMeta = packTypeMap.get(packKey);
    const filtered = filterRowsByPack(shared.rows, packKey);
    if (!filtered.length) {
      warnings.push({ pack_key: packKey, message: "بدون خبر برای این نوع پک" });
      continue;
    }

    for (const fk of formatKeys) {
      const formatKey = String(fk).trim();
      if (!formatKey) continue;
      try {
        const spec = parsePackFormatKey(formatKey);
        const typeLabel = packMeta?.label || packKey;
        const formatLabel = PACK_FORMAT_LABELS[formatKey] || formatKey;
        const label = buildPackReportLabel(baseLabel, typeLabel, formatLabel);

        if (delivery === "zip") {
          const buf = await writeNewsReportFile({
            body: { ...body, label },
            user,
            formatSpec: spec,
            shared,
            rowsOverride: filtered,
            newsCountOverride: filtered.length,
            labelOverride: label,
            formatKey,
            packKey,
            returnBufferOnly: true,
          });
          fileBuffers.push(buf);
        } else {
          const r = await writeNewsReportFile({
            body: { ...body, label },
            user,
            formatSpec: spec,
            shared,
            rowsOverride: filtered,
            newsCountOverride: filtered.length,
            labelOverride: label,
            formatKey,
            packKey,
          });
          results.push({ ...r, pack_key: packKey, format_key: formatKey });
        }
      } catch (e) {
        warnings.push({ pack_key: packKey, format_key: formatKey, error: e.message || String(e) });
      }
    }
  }

  if (delivery === "zip") {
    if (!fileBuffers.length) {
      const hint = warnings.length ? warnings.map((w) => w.message || w.error).join(" · ") : "هیچ فایلی تولید نشد";
      throw new Error(hint);
    }
    const zip = new JSZip();
    for (const f of fileBuffers) {
      zip.file(f.fileName, f.content, f.isBinary ? { binary: true } : undefined);
    }
    const zipBuffer = await zip.generateAsync({ type: "nodebuffer", compression: "DEFLATE" });
    const zipName = buildPackFileName(shared.period, {
      isZip: true,
      newsCount: fileBuffers.length,
      filenameStyle,
    });
    const zipResult = await writeZipReport({
      shared,
      user,
      body,
      zipBuffer,
      fileName: zipName,
      newsCount: shared.newsCount,
    });
    return {
      delivery: "zip",
      results: [zipResult],
      files: fileBuffers.map((f) => ({ file_name: f.fileName, pack_key: f.packKey, format_key: f.formatKey, news_count: f.newsCount })),
      warnings,
      news_count: shared.newsCount,
    };
  }

  if (!results.length) {
    const hint = warnings.length ? warnings.map((w) => w.message || w.error).join(" · ") : "هیچ فایلی تولید نشد";
    throw new Error(hint);
  }
  return { delivery: "separate", results, warnings, news_count: shared.newsCount };
}

export { getNewsReportWorkflowConfig };

export async function previewNewsReportPackCounts(body, user) {
  const period = resolveReportPeriod(body);
  const scope = resolveAnalyticsScope(user);
  const periodFilters = periodToQueryFilters(period);
  await ensureReportRefForPeriod(periodFilters.from_ref_key, periodFilters.to_ref_key);
  const settings = await getNewsReportSettings();
  const filters = mergeReportWorkflowFilters(body.filters || {}, settings.report_default_filters);

  const selectedIds = Array.isArray(body.selected_ids) ? body.selected_ids : [];
  if (selectedIds.length) {
    const rows = await loadReportRows(periodFilters, filters, scope, selectedIds);
    return {
      very_important: filterRowsByPack(rows, "very_important").length,
      important: filterRowsByPack(rows, "important").length,
      valuable: filterRowsByPack(rows, "valuable").length,
      all: rows.length,
    };
  }

  const [all, veryImportant, important, valuable] = await Promise.all([
    countNewsReportRows(periodFilters, filters, scope),
    (async () => {
      const p = resolvePackCountFilters(filters, "very_important");
      if (p.zero) return 0;
      return countNewsReportRows(periodFilters, p.filters, scope);
    })(),
    (async () => {
      const p = resolvePackCountFilters(filters, "important");
      if (p.zero) return 0;
      return countNewsReportRows(periodFilters, p.filters, scope);
    })(),
    (async () => {
      const p = resolvePackCountFilters(filters, "valuable");
      if (p.zero) return 0;
      return countNewsReportRows(periodFilters, p.filters, scope);
    })(),
  ]);
  return {
    very_important: veryImportant,
    important,
    valuable,
    all,
  };
}

export async function previewNewsReportCount(body, user) {
  const period = resolveReportPeriod(body);
  const scope = resolveAnalyticsScope(user);
  const periodFilters = periodToQueryFilters(period);
  await ensureReportRefForPeriod(periodFilters.from_ref_key, periodFilters.to_ref_key);
  const settings = await getNewsReportSettings();
  const filters = mergeReportWorkflowFilters(body.filters || {}, settings.report_default_filters);
  const count = await countNewsReportRows(periodFilters, filters, scope);
  return { count, period };
}

export async function previewNewsReportRows(body, user) {
  const period = resolveReportPeriod(body);
  const scope = resolveAnalyticsScope(user);
  const periodFilters = periodToQueryFilters(period);
  const refUpdated = await ensureReportRefForPeriod(periodFilters.from_ref_key, periodFilters.to_ref_key);
  const settings = await getNewsReportSettings();
  const filters = mergeReportWorkflowFilters(body.filters || {}, settings.report_default_filters);
  const result = await fetchNewsReportRowsPaginated(periodFilters, filters, scope, {
    page: body.page,
    page_size: body.page_size,
    sort: body.sort,
  });
  return { ...result, period };
}

export async function listNewsReports(user, { page = 1, page_size = 20, q = "" } = {}) {
  const scope = resolveAnalyticsScope(user);
  const pg = Math.max(1, parseInt(page, 10) || 1);
  const ps = Math.min(100, Math.max(1, parseInt(page_size, 10) || 20));
  const offset = (pg - 1) * ps;
  const params = [];
  let where = " WHERE 1=1";
  if (scope.level === "editor" && scope.userId) {
    params.push(scope.userId);
    where += ` AND created_by = $${params.length}`;
  }
  const search = String(q || "").trim();
  if (search) {
    params.push(`%${search}%`);
    const p = params.length;
    where += ` AND (file_name ILIKE $${p} OR format ILIKE $${p} OR CAST(id AS TEXT) LIKE $${p})`;
  }
  const countR = await pool.query(`SELECT COUNT(*)::int AS n FROM tbl_news_reports${where}`, params);
  const total = countR.rows[0]?.n ?? 0;
  const listR = await pool.query(
    `SELECT id, report_kind, format, mode, news_count, file_name, status,
            publish_status, created_at, created_by
     FROM tbl_news_reports${where}
     ORDER BY created_at DESC
     LIMIT ${ps} OFFSET ${offset}`,
    params,
  );
  return { rows: listR.rows, total, page: pg, page_size: ps };
}

export async function generateNewsReport(body, user) {
  const shared = await prepareReportGeneration(body, user);
  const specs = parseOutputFormatSpecs(body);
  const spec = specs[0];
  const result = await writeNewsReportFile({
    body,
    user,
    formatSpec: spec,
    shared,
    allowPublish: true,
  });
  const formatKey = resolvePrintFormatKey(result.format, result.pdf_paper_size, spec.pdf_source);
  return {
    ...result,
    caption: buildDocumentCaptionFromTemplate({
      settings: shared.settings,
      slot: buildSlotEngineMeta(shared.period, shared.settings, { label: body.label }),
      period: shared.period,
      newsCount: result.news_count,
      formatKey,
    }),
  };
}

export async function generateNewsReportsBatch(body, user) {
  const shared = await prepareReportGeneration(body, user);
  const specs = parseOutputFormatSpecs(body);
  if (!specs.length) throw new Error("حداقل یک فرمت خروجی انتخاب کنید");

  const results = [];
  const errors = [];
  for (let i = 0; i < specs.length; i += 1) {
    try {
      const r = await writeNewsReportFile({
        body,
        user,
        formatSpec: specs[i],
        shared,
        allowPublish: i === 0 && specs.length === 1,
      });
      results.push(r);
    } catch (e) {
      errors.push({ format: specs[i].format, error: e.message || String(e) });
    }
  }
  if (!results.length && errors.length) {
    const hint = errors.some((x) => /Gotenberg|Chrome|GOTENBERG/i.test(x.error))
      ? " (تنظیم PDF: GOTENBERG_URL در .env سرور — GET /api/news/reports/pdf-engine)"
      : "";
    throw new Error(errors.map((x) => x.error).join(" · ") + hint);
  }
  return { results, errors, news_count: shared.newsCount };
}

async function fetchReportRow(id, user) {
  const r = await pool.query(`SELECT * FROM tbl_news_reports WHERE id = $1`, [id]);
  const row = r.rows[0];
  if (!row || !canAccessReport(row, user)) return null;
  return row;
}

function unlinkReportFile(row) {
  if (row?.file_path && fs.existsSync(row.file_path)) {
    try { fs.unlinkSync(row.file_path); } catch { /* ignore */ }
  }
}

export async function deleteNewsReport(id, user) {
  const reportId = parseInt(id, 10);
  if (!Number.isFinite(reportId)) throw new Error("شناسه گزارش نامعتبر است");
  const row = await fetchReportRow(reportId, user);
  if (!row) throw new Error("گزارش یافت نشد");
  unlinkReportFile(row);
  await pool.query(`DELETE FROM tbl_news_reports WHERE id = $1`, [reportId]);
  return { ok: true, id: reportId };
}

export async function deleteAllNewsReports(user) {
  const scope = resolveAnalyticsScope(user);
  const params = [];
  let where = " WHERE 1=1";
  if (scope.level === "editor" && scope.userId) {
    params.push(scope.userId);
    where += ` AND created_by = $${params.length}`;
  }
  const listR = await pool.query(`SELECT id, file_path FROM tbl_news_reports${where}`, params);
  for (const row of listR.rows) unlinkReportFile(row);
  const del = await pool.query(`DELETE FROM tbl_news_reports${where}`, params);
  return { ok: true, deleted: del.rowCount ?? listR.rows.length };
}

export async function sendSingleNewsReport(body, user) {
  const newsId = parseInt(body.news_id, 10);
  const destId = parseInt(body.destination_id, 10);
  if (!newsId || !destId) throw new Error("شناسه خبر و مقصد الزامی است");
  const scope = resolveAnalyticsScope(user);
  const rows = await fetchNewsByIds([newsId], scope);
  if (!rows.length) throw new Error("خبر یافت نشد");
  const settings = await getNewsReportSettings();
  const message = buildSingleNewsMessage(settings, rows[0]);
  await publishSingleNews({ channelConfigId: destId, userId: user?.id, message });
  return { ok: true };
}

export async function sendBatchNewsReport(body, user) {
  const destId = parseInt(body.destination_id, 10);
  const rawIds = Array.isArray(body.news_ids) ? body.news_ids : [];
  const ids = [...new Set(rawIds.map((x) => parseInt(x, 10)).filter(Number.isFinite))];
  if (!destId) throw new Error("مقصد انتشار الزامی است");
  if (!ids.length) throw new Error("حداقل یک خبر برای ارسال انتخاب کنید");

  const scope = resolveAnalyticsScope(user);
  const rows = await fetchNewsByIds(ids, scope);
  const byId = new Map(rows.map((r) => [r.id, r]));
  const ordered = ids.map((id) => byId.get(id)).filter(Boolean);
  if (!ordered.length) throw new Error("هیچ خبری برای ارسال یافت نشد");

  const settings = await getNewsReportSettings();
  const sent = [];
  const failed = [];

  for (let i = 0; i < ordered.length; i += 1) {
    const row = ordered[i];
    try {
      const message = buildSingleNewsMessage(settings, row, i + 1);
      await publishSingleNews({ channelConfigId: destId, userId: user?.id, message });
      sent.push(row.id);
    } catch (e) {
      failed.push({ id: row.id, error: e.message || String(e) });
    }
  }

  if (!sent.length && failed.length) {
    throw new Error(failed[0].error || "ارسال ناموفق بود");
  }

  return { ok: true, sent_count: sent.length, sent_ids: sent, failed };
}

export async function publishExistingNewsReport(id, body, user) {
  const reportId = parseInt(id, 10);
  const destId = parseInt(body.destination_id, 10);
  if (!Number.isFinite(reportId)) throw new Error("شناسه گزارش نامعتبر است");
  if (!destId) throw new Error("مقصد انتشار الزامی است");

  const row = await fetchReportRow(reportId, user);
  if (!row) throw new Error("گزارش یافت نشد");
  if (row.status !== "ready") throw new Error("گزارش آماده نیست");
  if (!row.file_path || !fs.existsSync(row.file_path)) throw new Error("فایل گزارش یافت نشد");

  const settings = await getNewsReportSettings();
  const caption = buildPublishDocumentCaption(row, settings);
  let messengerText = null;
  if (row.format === "txt") {
    messengerText = fs.readFileSync(row.file_path, "utf8").replace(/^\uFEFF/, "");
  }

  try {
    await publishNewsReport({
      channelConfigId: destId,
      userId: user?.id,
      format: row.format,
      filePath: row.file_path,
      fileName: row.file_name,
      meta: {
        documentCaption: caption,
        messengerText: messengerText || caption,
        inlineText: messengerText,
      },
      settings,
      rows: [],
      slot: { label: row.file_name, report_date_jalali: "", display_from: "", display_to: "" },
    });
    await pool.query(
      `UPDATE tbl_news_reports SET channel_config_id = $1, publish_status = 'published', published_at = CURRENT_TIMESTAMP, error_message = NULL WHERE id = $2`,
      [destId, reportId],
    );
    return { ok: true, id: reportId, publish_status: "published" };
  } catch (e) {
    const msg = e.message || String(e);
    await pool.query(
      `UPDATE tbl_news_reports SET channel_config_id = $1, publish_status = 'failed', error_message = $2 WHERE id = $3`,
      [destId, msg, reportId],
    );
    throw new Error(msg);
  }
}

export async function getNewsReportForDownload(id, user) {
  const r = await pool.query(`SELECT * FROM tbl_news_reports WHERE id = $1`, [id]);
  const row = r.rows[0];
  if (!row || !canAccessReport(row, user)) return null;
  if (!row.file_path || !fs.existsSync(row.file_path)) return null;
  return row;
}

export async function previewReportContent(body, user) {
  const period = resolveReportPeriod(body);
  const scope = resolveAnalyticsScope(user);
  const periodFilters = periodToQueryFilters(period);
  const settings = await getNewsReportSettings();
  const filters = mergeReportWorkflowFilters(body.filters || {}, settings.report_default_filters);
  const spec = parseOutputFormatSpecs(body)[0];
  const { format, pdf_source } = normalizeFormat(spec.format, spec.pdf_source);
  const rows = await loadReportRows(periodFilters, filters, scope, body.selected_ids);
  const slot = buildSlotEngineMeta(period, settings, { label: body.label });
  const pdfPaperSize = spec.pdf_paper_size || settings.pdf_paper_size || "A4";
  const printFormatKey = resolvePrintFormatKey(format, pdfPaperSize, pdf_source);
  slot.print_config = settings.print_settings?.[printFormatKey] || null;
  const renderFormat = format === "pdf" ? pdf_source : format;
  const content = renderReportContent(renderFormat, rows, slot, null, "list");
  return {
    content,
    news_count: rows.length,
    caption: buildDocumentCaptionFromTemplate({
      settings,
      slot,
      period,
      newsCount: rows.length,
      formatKey: printFormatKey,
    }),
  };
}
