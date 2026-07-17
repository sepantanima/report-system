import express from "express";
import pool from "../db.js";
import auth from "../middleware/auth.js";
import requireRole from "../middleware/requireRole.js";
import {
  listNewsMonitor,
  getSummaryStats,
  listCategories,
  updateNewsItem,
  updateNewsLegacy,
  listDistinctSources,
  createNewsByMonitor,
  submitNewsForReview,
  finalizeNews,
  finalizeNewsPublish,
  finalizeNewsBank,
  chiefRejectNews,
  flagDuplicate,
  unflagDuplicate,
  listDuplicatesPanel,
  getDuplicatesPanelStats,
  linkDuplicateToParent,
  clearDuplicateStatus,
  getNewsAuditLog,
  searchNewsForParent,
  findSimilarNewsForDuplicate,
  clusterLinkDuplicates,
  softDeleteNews,
  deleteDraftPermanently,
  getNewsExportText,
  bulkExportNewsText,
} from "../services/newsMonitorService.js";
import { listActiveActionsForForm } from "../services/aiFormActionService.js";
import { executeFormAiAction } from "../services/aiFormRunOrchestrator.js";
import { buildAiRunHttpError } from "../utils/aiErrorDiagnostics.js";
import { validateFormActionName, validateFormDataObject } from "../constants/aiFormActions.js";
import newsAnalyticsRoutes from "./newsAnalytics.js";
import newsReportRoutes from "./newsReportRoutes.js";
import newsSmartAnalysisRoutes from "./newsSmartAnalysisRoutes.js";
import { getNewsDailyQuotaForUser, getNewsEntryPublicSettings } from "../services/newsEntrySettingsService.js";
import { nowJalaliDate } from "../services/newsTextUtils.js";
import { isDuplicateCheckError, sendDuplicateCheckResponse } from "../utils/duplicateCheckErrors.js";
import { pgUniqueViolationMessage } from "../utils/pgErrors.js";
import {
  getEditorialEligibility,
  startEditorialRun,
  getEditorialRun,
  restoreRelevanceBulk,
} from "../services/newsEditorialService.js";

const router = express.Router();

const newsMonitor = requireRole("admin", "news_monitor", "news_editor", "news_chief");
const newsEditor = requireRole("admin", "news_editor", "news_chief");
const newsChief = requireRole("admin", "news_chief");
const newsEntry = requireRole("admin", "news_monitor");

router.use("/analytics", newsAnalyticsRoutes);
router.use("/reports", newsReportRoutes);
router.use(newsSmartAnalysisRoutes);

// --- مسیرهای legacy (بدون auth — SmartAIProcessor / n8n) ---

router.get("/", async (req, res) => {
  const { date, source, approval_filter } = req.query;
  try {
    let query = `SELECT * FROM tbl_news WHERE 1=1`;
    const params = [];

    if (date) {
      params.push(date);
      query += ` AND source_date_jalali = $${params.length}`;
    }
    if (source && source !== "all") {
      params.push(source);
      query += ` AND source = $${params.length}`;
    }
    if (approval_filter && approval_filter !== "all") {
      let val = 0;
      if (approval_filter === "approved") val = 1;
      if (approval_filter === "rejected") val = 2;
      params.push(val);
      query += ` AND is_approved = $${params.length}`;
    }

    query += ` ORDER BY source_time_hm DESC`;
    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get("/sources", async (req, res) => {
  try {
    const sources = await listDistinctSources();
    res.json(sources);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get("/export-text/:id", async (req, res) => {
  try {
    const format = req.query.format || "telegram";
    const data = await getNewsExportText(req.params.id, format);
    if (!data) return res.status(404).json({ error: "خبر یافت نشد" });
    res.json(data);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.put("/:id", async (req, res) => {
  const { id } = req.params;
  try {
    const row = await updateNewsLegacy(id, req.body, req.user?.id ?? null);
    if (!row) return res.status(404).json({ error: "خبر یافت نشد" });
    res.json({ message: "تغییرات ذخیره شد", item: row });
  } catch (err) {
    console.error("PUT Error:", err);
    res.status(500).json({ error: err.message });
  }
});

// --- مدیریت اخبار v2 (با auth) ---

router.get("/monitor", auth, newsMonitor, async (req, res) => {
  try {
    const result = await listNewsMonitor(req.query, req.user?.id ?? null);
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get("/monitor/daily-quota", auth, newsEntry, async (req, res) => {
  try {
    const date = req.query.date || nowJalaliDate();
    res.json(await getNewsDailyQuotaForUser(req.user, date));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get("/monitor/my-drafts", auth, newsEntry, async (req, res) => {
  try {
    const { items } = await listNewsMonitor({ ...req.query, my_drafts: "1" }, req.user?.id ?? null);
    res.json(items);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get("/monitor/my-submissions", auth, newsEntry, async (req, res) => {
  try {
    const { items } = await listNewsMonitor({ ...req.query, my_submissions: "1" }, req.user?.id ?? null);
    res.json(items);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get("/monitor/entry-settings", auth, newsMonitor, async (req, res) => {
  try {
    res.json(await getNewsEntryPublicSettings());
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

async function handleDraftDelete(req, res) {
  try {
    const result = await deleteDraftPermanently(req.params.id, req.user?.id ?? null, req.user?.role);
    if (!result) return res.status(404).json({ error: "پیش‌نویس یافت نشد" });
    res.json(result);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
}

router.delete("/monitor/my-drafts/:id", auth, newsEntry, handleDraftDelete);
router.post("/monitor/my-drafts/:id/delete", auth, newsEntry, handleDraftDelete);

router.delete("/monitor/:id", auth, newsEditor, async (req, res) => {
  try {
    const result = await softDeleteNews(req.params.id, req.user?.id ?? null, req.user?.role);
    if (!result) return res.status(404).json({ error: "خبر یافت نشد" });
    res.json(result);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.get("/summary-stats", auth, newsMonitor, async (req, res) => {
  try {
    const stats = await getSummaryStats(req.query);
    res.json(stats);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get("/categories", auth, newsMonitor, async (req, res) => {
  try {
    const rows = await listCategories();
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get("/monitor/duplicates", auth, newsEditor, async (req, res) => {
  try {
    const rows = await listDuplicatesPanel(req.query);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get("/monitor/duplicates/stats", auth, newsEditor, async (req, res) => {
  try {
    const stats = await getDuplicatesPanelStats();
    res.json(stats);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get("/monitor/parent-search", auth, newsEditor, async (req, res) => {
  try {
    const rows = await searchNewsForParent(req.query.q);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post("/monitor/duplicates/cluster-link", auth, newsEditor, async (req, res) => {
  try {
    const result = await clusterLinkDuplicates(req.body?.news_ids, req.user?.id ?? null);
    res.json(result);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.post("/monitor/duplicates/:id/similar", auth, newsEditor, async (req, res) => {
  try {
    const result = await findSimilarNewsForDuplicate(req.params.id, {
      range: req.body?.range,
      min_percent: req.body?.min_percent,
    });
    res.json(result);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.get("/monitor/:id/audit", auth, newsEditor, async (req, res) => {
  try {
    const rows = await getNewsAuditLog(req.params.id);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post("/monitor/create", auth, newsEntry, async (req, res) => {
  try {
    const row = await createNewsByMonitor(req.body, req.user ?? null);
    res.status(201).json(row);
  } catch (err) {
    if (isDuplicateCheckError(err)) return sendDuplicateCheckResponse(res, err);
    res.status(400).json({ error: err.message });
  }
});

router.post("/monitor/:id/submit", auth, newsEntry, async (req, res) => {
  try {
    const row = await submitNewsForReview(req.params.id, req.user ?? null, req.body ?? {});
    if (!row) return res.status(404).json({ error: "خبر یافت نشد" });
    res.json(row);
  } catch (err) {
    if (isDuplicateCheckError(err)) return sendDuplicateCheckResponse(res, err);
    res.status(400).json({ error: err.message });
  }
});

router.post("/monitor/:id/finalize", auth, newsChief, async (req, res) => {
  try {
    const row = await finalizeNews(req.params.id, req.user?.id ?? null);
    if (!row) return res.status(404).json({ error: "خبر یافت نشد" });
    res.json(row);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.post("/monitor/:id/finalize-publish", auth, newsChief, async (req, res) => {
  try {
    const row = await finalizeNewsPublish(req.params.id, req.user?.id ?? null);
    if (!row) return res.status(404).json({ error: "خبر یافت نشد" });
    res.json(row);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.post("/monitor/:id/finalize-bank", auth, newsChief, async (req, res) => {
  try {
    const row = await finalizeNewsBank(req.params.id, req.user?.id ?? null);
    if (!row) return res.status(404).json({ error: "خبر یافت نشد" });
    res.json(row);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.post("/monitor/:id/chief-reject", auth, newsChief, async (req, res) => {
  try {
    const note = req.body?.note ?? req.body?.status_note ?? "";
    const row = await chiefRejectNews(req.params.id, req.user?.id ?? null, note);
    if (!row) return res.status(404).json({ error: "خبر یافت نشد" });
    res.json(row);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.post("/monitor/:id/flag-duplicate", auth, newsEditor, async (req, res) => {
  try {
    const row = await flagDuplicate(req.params.id, req.user?.id ?? null);
    if (!row) return res.status(404).json({ error: "خبر یافت نشد" });
    res.json(row);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.post("/monitor/:id/unflag-duplicate", auth, newsEditor, async (req, res) => {
  try {
    const row = await unflagDuplicate(req.params.id, req.user?.id ?? null);
    if (!row) return res.status(404).json({ error: "خبر یافت نشد" });
    res.json(row);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.patch("/monitor/duplicates/:id/link", auth, newsEditor, async (req, res) => {
  try {
    const parentId = req.body.parent_id;
    const row = await linkDuplicateToParent(req.params.id, parentId, req.user?.id ?? null);
    res.json(row);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.post("/monitor/duplicates/:id/clear", auth, newsEditor, async (req, res) => {
  try {
    const row = await clearDuplicateStatus(req.params.id, req.user?.id ?? null);
    if (!row) return res.status(404).json({ error: "خبر یافت نشد" });
    res.json(row);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.get("/monitor/ai/form-actions", auth, newsEditor, async (req, res) => {
  try {
    const form_name = String(req.query.form_name || "news_monitor_manage").trim();
    if (!validateFormActionName(form_name)) {
      return res.status(400).json({ error: "form_name نامعتبر است" });
    }
    const rows = await listActiveActionsForForm(form_name);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get("/monitor/export-text/:id", auth, newsMonitor, async (req, res) => {
  try {
    const format = req.query.format || "telegram";
    const data = await getNewsExportText(req.params.id, format);
    if (!data) return res.status(404).json({ error: "خبر یافت نشد" });
    res.json(data);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.get("/monitor/bulk-export", auth, newsMonitor, async (req, res) => {
  try {
    const format = req.query.format || "telegram";
    const { format: _fmt, ...filters } = req.query;
    const rows = await bulkExportNewsText(filters, format, req.user?.id ?? null);
    res.json(rows);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.post("/monitor/ai/run", auth, newsEditor, async (req, res) => {
  try {
    const { form_name, action_name, form_data } = req.body || {};
    const fn = String(form_name || "news_monitor_manage").trim();
    const an = String(action_name || "summarize_text").trim();
    if (!validateFormActionName(fn)) {
      return res.status(400).json({ error: "form_name نامعتبر است" });
    }
    if (!validateFormActionName(an)) {
      return res.status(400).json({ error: "action_name نامعتبر است" });
    }
    const fe = validateFormDataObject(form_data);
    if (fe) return res.status(400).json({ error: fe });
    const data = await executeFormAiAction({
      formName: fn,
      actionName: an,
      formData: form_data,
      userId: req.user?.id ?? null,
    });
    res.json(data);
  } catch (err) {
    const { status, body } = buildAiRunHttpError(err);
    res.status(status).json(body);
  }
});

router.get("/monitor/editorial/eligibility", auth, newsEditor, async (req, res) => {
  try {
    const data = await getEditorialEligibility(req.query);
    res.json(data);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.post("/monitor/editorial/run", auth, newsEditor, async (req, res) => {
  try {
    const query = { ...(req.query || {}), ...(req.body || {}) };
    const run = await startEditorialRun(query, req.user?.id ?? null);
    res.json(run);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.get("/monitor/editorial/runs/:id", auth, newsEditor, async (req, res) => {
  try {
    const run = await getEditorialRun(req.params.id);
    if (!run) return res.status(404).json({ error: "اجرای پالایش یافت نشد" });
    res.json(run);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.post("/monitor/editorial/restore-relevance", auth, newsEditor, async (req, res) => {
  try {
    const ids = req.body?.news_ids;
    const result = await restoreRelevanceBulk(ids, req.user?.id ?? null);
    res.json(result);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.patch("/:id", auth, newsMonitor, async (req, res) => {
  const { id } = req.params;
  try {
    const row = await updateNewsItem(id, req.body, req.user?.id ?? null, req.user?.role);
    if (!row) return res.status(404).json({ error: "خبر یافت نشد" });
    res.json(row);
  } catch (err) {
    if (isDuplicateCheckError(err)) return sendDuplicateCheckResponse(res, err);
    const pgMsg = pgUniqueViolationMessage(err);
    res.status(400).json({ error: pgMsg || err.message });
  }
});

export default router;
