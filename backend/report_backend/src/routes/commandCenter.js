import { Router } from "express";
import auth from "../middleware/auth.js";
import requireRole, { hasAnyRole } from "../middleware/requireRole.js";
import {
  listLiveNewsFeed,
  listAnnotationsForNews,
  listAnnotationsForItem,
  createAnnotation,
  createAnnotationForItem,
  ANNOTATION_TYPES,
} from "../services/strategyAnnotationService.js";
import {
  getCommandKpiOverview,
  getCommandKpiWidget,
  getCommandDashboardOverview,
  getCommandDashboardTrends,
  getCommandDashboardLivePulse,
  getUnitDrilldown,
  getUserDrilldown,
  resolveDashboardRange,
} from "../services/commandKpiService.js";
import {
  listPrompts,
  getPromptByKey,
  upsertPrompt,
  createPrompt,
  createStrategyPrompt,
  deletePrompt,
  countPromptsByPrefix,
  validateStrategyPromptPayload,
  isSystemStrategyPrompt,
} from "../services/promptRegistry.js";
import {
  STRATEGY_PROMPT_LIMITS,
  STRATEGY_PROMPT_PREFIX,
} from "../constants/promptFieldLimits.js";
import { previewStrategySources } from "../services/strategySourceAssembleService.js";
import {
  listStrategyOutputs,
  getStrategyOutput,
  getStrategyOutputNormalized,
  createStrategyOutput,
  updateStrategyOutput,
  approveStrategyOutput,
  publishStrategyOutput,
  generateSoftWarAnnexDraft,
  generateStrategyOutputDraft,
  listCommandLibrary,
  getCommandLibraryItem,
  OUTPUT_TYPES,
} from "../services/strategyOutputService.js";
import {
  getDashboardLayout,
  saveDashboardLayout,
  logDashboardView,
  listDashboardViews,
  listAlertAcks,
  ackAlert,
} from "../services/commandDashboardPrefsService.js";
import { buildCommandDashboardPdf } from "../services/commandDashboardPdfService.js";
import { buildAiRunHttpError } from "../utils/aiErrorDiagnostics.js";

const router = Router();

const VIEW_ROLES = ["strategy_viewer", "strategy_commander", "strategy_analysis_manager"];
/** حاشیه‌نویسی تالار زنده — فقط فرمانده */
const ANNOTATE_ROLES = ["strategy_commander"];
/** تولید/ویرایش/تأیید/انتشار خروجی و پرامپت‌های راهبردی */
const MANAGE_ROLES = ["strategy_analysis_manager"];

function requireCommandView(req, res, next) {
  return requireRole(...VIEW_ROLES)(req, res, next);
}

function requireCommander(req, res, next) {
  return requireRole(...ANNOTATE_ROLES)(req, res, next);
}

function requireStrategyManage(req, res, next) {
  return requireRole(...MANAGE_ROLES)(req, res, next);
}

function canManageStrategyOutputs(user) {
  return hasAnyRole(user, MANAGE_ROLES);
}

function assertStrategyPromptKey(key) {
  const k = String(key || "").trim();
  if (!k.startsWith(STRATEGY_PROMPT_PREFIX)) {
    const err = new Error("فقط پرامپت‌های با پیشوند strategy. قابل مدیریت در مرکز فرماندهی هستند");
    err.status = 403;
    throw err;
  }
  return k;
}

// --- Live news wall (اخبار + رصد میدانی تأییدشده) ---
router.get("/live-news", auth, requireCommandView, async (req, res) => {
  try {
    const data = await listLiveNewsFeed({
      limit: req.query.limit,
      days: req.query.days,
      kind: req.query.kind,
    });
    res.json(data);
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

router.get("/live-news/annotation-types", auth, requireCommandView, (_req, res) => {
  res.json({ types: ANNOTATION_TYPES });
});

router.get("/live-news/:kind/:itemId/annotations", auth, requireCommandView, async (req, res) => {
  try {
    const items = await listAnnotationsForItem(req.params.kind, req.params.itemId);
    res.json({ items });
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

router.post("/live-news/:kind/:itemId/annotations", auth, requireCommander, async (req, res) => {
  try {
    const row = await createAnnotationForItem(req.params.kind, req.params.itemId, req.body || {}, req.user);
    res.status(201).json(row);
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

// سازگاری با مسیر قدیمی (فقط خبر)
router.get("/live-news/:newsId/annotations", auth, requireCommandView, async (req, res) => {
  try {
    const items = await listAnnotationsForNews(req.params.newsId);
    res.json({ items });
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

router.post("/live-news/:newsId/annotations", auth, requireCommander, async (req, res) => {
  try {
    const row = await createAnnotation(req.params.newsId, req.body || {}, req.user);
    res.status(201).json(row);
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

// --- Executive dashboard ---
router.get("/dashboard/overview", auth, requireCommandView, async (req, res) => {
  try {
    res.json(await getCommandDashboardOverview(req.query));
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.get("/dashboard/trends", auth, requireCommandView, async (req, res) => {
  try {
    res.json(await getCommandDashboardTrends(req.query));
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

/** پالس زنده: JSON یک‌بار یا SSE با ?sse=1 */
router.get("/dashboard/live", auth, requireCommandView, async (req, res) => {
  const wantSse = String(req.query.sse || "") === "1";
  if (!wantSse) {
    try {
      res.json(await getCommandDashboardLivePulse(req.query));
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
    return;
  }

  res.setHeader("Content-Type", "text/event-stream; charset=utf-8");
  res.setHeader("Cache-Control", "no-cache, no-transform");
  res.setHeader("Connection", "keep-alive");
  res.setHeader("X-Accel-Buffering", "no");
  if (typeof res.flushHeaders === "function") res.flushHeaders();

  let closed = false;
  const writePulse = async () => {
    if (closed) return;
    try {
      const payload = await getCommandDashboardLivePulse(req.query);
      res.write(`event: pulse\ndata: ${JSON.stringify(payload)}\n\n`);
    } catch (e) {
      res.write(`event: error\ndata: ${JSON.stringify({ error: e.message })}\n\n`);
    }
  };

  await writePulse();
  const intervalMs = Math.max(10000, Math.min(120000, Number(req.query.interval_ms) || 20000));
  const timer = setInterval(writePulse, intervalMs);
  const heartbeat = setInterval(() => {
    if (!closed) res.write(`: ping\n\n`);
  }, 15000);

  req.on("close", () => {
    closed = true;
    clearInterval(timer);
    clearInterval(heartbeat);
  });
});

router.get("/dashboard/drill/unit/:unitId", auth, requireCommandView, async (req, res) => {
  try {
    const range = resolveDashboardRange(req.query);
    res.json(await getUnitDrilldown(req.params.unitId, range));
  } catch (e) {
    res.status(e.status || 500).json({ error: e.message });
  }
});

router.get("/dashboard/drill/user/:userId", auth, requireCommandView, async (req, res) => {
  try {
    const range = resolveDashboardRange(req.query);
    res.json(await getUserDrilldown(req.params.userId, range));
  } catch (e) {
    res.status(e.status || 500).json({ error: e.message });
  }
});

router.get("/dashboard/layout", auth, requireCommandView, async (req, res) => {
  try {
    res.json(await getDashboardLayout(req.user.id));
  } catch (e) {
    res.status(e.status || 500).json({ error: e.message });
  }
});

router.put("/dashboard/layout", auth, requireCommandView, async (req, res) => {
  try {
    res.json(await saveDashboardLayout(req.user.id, req.body?.layout || req.body));
  } catch (e) {
    res.status(e.status || 500).json({ error: e.message });
  }
});

router.post("/dashboard/view-log", auth, requireCommandView, async (req, res) => {
  try {
    const row = await logDashboardView(req.user.id, req.body?.filters || {});
    res.status(201).json({ ok: true, row });
  } catch (e) {
    res.status(e.status || 500).json({ error: e.message });
  }
});

router.get("/dashboard/view-history", auth, requireCommandView, async (req, res) => {
  try {
    res.json({ items: await listDashboardViews(req.user.id, req.query.limit) });
  } catch (e) {
    res.status(e.status || 500).json({ error: e.message });
  }
});

router.get("/dashboard/alert-acks", auth, requireCommandView, async (req, res) => {
  try {
    res.json({ items: await listAlertAcks(req.user.id) });
  } catch (e) {
    res.status(e.status || 500).json({ error: e.message });
  }
});

router.post("/dashboard/alert-acks", auth, requireCommandView, async (req, res) => {
  try {
    const row = await ackAlert(req.user.id, req.body?.alert_id);
    res.status(201).json(row);
  } catch (e) {
    res.status(e.status || 500).json({ error: e.message });
  }
});

router.get("/dashboard/export/pdf", auth, requireCommandView, async (req, res) => {
  try {
    const overview = await getCommandDashboardOverview(req.query);
    const buf = await buildCommandDashboardPdf(overview);
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="command-dashboard.pdf"`,
    );
    res.send(buf);
  } catch (e) {
    res.status(e.status || 500).json({ error: e.message });
  }
});

// --- KPI (legacy widgets) ---
router.get("/kpi/overview", auth, requireCommandView, async (_req, res) => {
  try {
    res.json(await getCommandKpiOverview());
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.get("/kpi/:widgetId", auth, requireCommandView, async (req, res) => {
  try {
    res.json(await getCommandKpiWidget(req.params.widgetId));
  } catch (e) {
    res.status(e.status || 400).json({ error: e.message });
  }
});

// --- Strategy outputs ---
router.get("/outputs/meta", auth, requireCommandView, (_req, res) => {
  res.json({ types: OUTPUT_TYPES });
});

router.get("/outputs/library", auth, requireCommandView, async (req, res) => {
  try {
    res.json(await listCommandLibrary(req.query || {}));
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

router.get("/outputs/library/:kind/:id", auth, requireCommandView, async (req, res) => {
  try {
    const item = await getCommandLibraryItem(req.params.kind, req.params.id);
    if (!item) return res.status(404).json({ error: "یافت نشد" });
    res.json(item);
  } catch (e) {
    res.status(e.status || 400).json({ error: e.message });
  }
});

router.get("/outputs", auth, requireCommandView, async (req, res) => {
  try {
    const items = await listStrategyOutputs(req.query);
    if (!canManageStrategyOutputs(req.user)) {
      return res.json({
        items: items.filter((x) => x.status === "approved" || x.status === "published"),
      });
    }
    res.json({ items });
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

router.get("/outputs/:id", auth, requireCommandView, async (req, res) => {
  try {
    const row = await getStrategyOutputNormalized(req.params.id);
    if (!row) return res.status(404).json({ error: "یافت نشد" });
    const visibleToViewer = row.status === "approved" || row.status === "published";
    if (!visibleToViewer && !canManageStrategyOutputs(req.user)) {
      return res.status(403).json({ error: "دسترسی غیرمجاز" });
    }
    res.json(row);
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

router.post("/outputs", auth, requireStrategyManage, async (req, res) => {
  try {
    const row = await createStrategyOutput(req.body || {}, req.user);
    res.status(201).json(row);
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

router.patch("/outputs/:id", auth, requireStrategyManage, async (req, res) => {
  try {
    const row = await updateStrategyOutput(req.params.id, req.body || {}, req.user);
    res.json(row);
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

router.post("/outputs/:id/approve", auth, requireStrategyManage, async (req, res) => {
  try {
    const row = await approveStrategyOutput(req.params.id, req.user);
    res.json(row);
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

router.post("/outputs/:id/publish", auth, requireStrategyManage, async (req, res) => {
  try {
    const data = await publishStrategyOutput(
      req.params.id,
      { channelConfigIds: req.body?.channel_config_ids || [] },
      req.user,
    );
    res.json(data);
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

router.post("/outputs/generate/soft-war-annex", auth, requireStrategyManage, async (req, res) => {
  try {
    const data = await generateSoftWarAnnexDraft(req.body || {}, req.user);
    res.status(201).json(data);
  } catch (e) {
    const { status, body } = buildAiRunHttpError(e);
    res.status(status).json(body);
  }
});

router.post("/outputs/preview-sources", auth, requireStrategyManage, async (req, res) => {
  try {
    const data = await previewStrategySources(req.body || {});
    res.json(data);
  } catch (e) {
    res.status(e.status || 400).json({ error: e.message });
  }
});

router.post("/outputs/generate", auth, requireStrategyManage, async (req, res) => {
  try {
    const data = await generateStrategyOutputDraft(req.body || {}, req.user);
    res.status(201).json(data);
  } catch (e) {
    const { status, body } = buildAiRunHttpError(e);
    res.status(status).json(body);
  }
});

// --- Strategy prompts (scoped) ---
router.get("/prompts", auth, requireStrategyManage, async (_req, res) => {
  try {
    const items = await listPrompts(STRATEGY_PROMPT_PREFIX);
    const count = items.length;
    res.json({
      items,
      count,
      max_count: STRATEGY_PROMPT_LIMITS.maxCount,
      limits: STRATEGY_PROMPT_LIMITS,
    });
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

router.post("/prompts", auth, requireStrategyManage, async (req, res) => {
  try {
    const row = await createStrategyPrompt(req.body || {}, req.user?.id);
    res.status(201).json(row);
  } catch (e) {
    if (e.code === "DUPLICATE_PROMPT_KEY") {
      return res.status(400).json({ error: "این کلید پرامپت قبلاً ثبت شده است" });
    }
    res.status(e.status || 400).json({ error: e.message });
  }
});

router.get("/prompts/:promptKey", auth, requireStrategyManage, async (req, res) => {
  try {
    const key = assertStrategyPromptKey(req.params.promptKey);
    const row = await getPromptByKey(key);
    if (!row) return res.status(404).json({ error: "پرامپت یافت نشد" });
    res.json({ ...row, is_system: isSystemStrategyPrompt(key) });
  } catch (e) {
    res.status(e.status || 400).json({ error: e.message });
  }
});

router.put("/prompts/:promptKey", auth, requireStrategyManage, async (req, res) => {
  try {
    const key = assertStrategyPromptKey(req.params.promptKey);
    const payloadErr = validateStrategyPromptPayload(req.body || {}, { isCreate: false });
    if (payloadErr) return res.status(400).json({ error: payloadErr });

    const existing = await getPromptByKey(key);
    const payload = {
      title_fa: req.body?.title_fa,
      description_fa: req.body?.description_fa,
      body: req.body?.body,
      reference_slots: req.body?.reference_slots,
    };
    if (!existing) {
      const count = await countPromptsByPrefix(STRATEGY_PROMPT_PREFIX);
      if (count >= STRATEGY_PROMPT_LIMITS.maxCount) {
        return res.status(400).json({
          error: `حداکثر ${STRATEGY_PROMPT_LIMITS.maxCount} پرامپت راهبردی مجاز است`,
        });
      }
      await createPrompt(key, payload, req.user?.id);
    } else {
      await upsertPrompt(key, payload, req.user?.id);
    }
    res.json({ ...(await getPromptByKey(key)), is_system: isSystemStrategyPrompt(key) });
  } catch (e) {
    res.status(e.status || 400).json({ error: e.message });
  }
});

router.delete("/prompts/:promptKey", auth, requireStrategyManage, async (req, res) => {
  try {
    const key = assertStrategyPromptKey(req.params.promptKey);
    const deleted = await deletePrompt(key);
    if (!deleted) return res.status(404).json({ error: "پرامپت یافت نشد" });
    res.json({ ok: true, prompt_key: key });
  } catch (e) {
    res.status(e.status || 400).json({ error: e.message });
  }
});

export default router;
