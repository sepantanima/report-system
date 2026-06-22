import express from "express";
import auth from "../middleware/auth.js";
import requireRole from "../middleware/requireRole.js";
import {
  resolveAnalyticsScope,
  assertAnalyticsAccess,
  getAnalyticsFiltersMeta,
  getAnalyticsOverview,
  getAnalyticsDistribution,
  getAnalyticsTimeline,
  getUnitParticipation,
  getMonitorRankings,
  getEditorRankings,
  getChiefRankings,
  getUnitRankings,
  getWidgetData,
} from "../services/newsAnalyticsService.js";
import { exportAnalyticsWidget, WIDGET_TITLES } from "../services/newsAnalyticsExport.js";

const router = express.Router();

const analyticsRoles = requireRole("admin", "news_monitor", "news_editor", "news_chief");

function scopeFromReq(req) {
  const scope = resolveAnalyticsScope(req.user || {});
  assertAnalyticsAccess(scope);
  return scope;
}

router.get("/filters/meta", auth, analyticsRoles, async (req, res) => {
  try {
    scopeFromReq(req);
    const meta = await getAnalyticsFiltersMeta();
    res.json(meta);
  } catch (err) {
    res.status(err.message.includes("مجاز") ? 403 : 500).json({ error: err.message });
  }
});

router.get("/overview", auth, analyticsRoles, async (req, res) => {
  try {
    const scope = scopeFromReq(req);
    const data = await getAnalyticsOverview(req.query, scope);
    res.json({ ...data, scope: { level: scope.level, userId: scope.userId } });
  } catch (err) {
    res.status(err.message.includes("مجاز") ? 403 : 500).json({ error: err.message });
  }
});

router.get("/distribution", auth, analyticsRoles, async (req, res) => {
  try {
    const scope = scopeFromReq(req);
    const dimension = req.query.dimension || "category";
    const data = await getAnalyticsDistribution(req.query, scope, dimension);
    res.json(data);
  } catch (err) {
    res.status(err.message.includes("مجاز") ? 403 : 500).json({ error: err.message });
  }
});

router.get("/timeline", auth, analyticsRoles, async (req, res) => {
  try {
    const scope = scopeFromReq(req);
    const data = await getAnalyticsTimeline(req.query, scope, req.query.granularity || "day");
    res.json(data);
  } catch (err) {
    res.status(err.message.includes("مجاز") ? 403 : 500).json({ error: err.message });
  }
});

router.get("/units/participation", auth, analyticsRoles, async (req, res) => {
  try {
    const scope = scopeFromReq(req);
    const data = await getUnitParticipation(req.query, scope);
    res.json(data);
  } catch (err) {
    res.status(err.message.includes("مجاز") ? 403 : 500).json({ error: err.message });
  }
});

router.get("/rankings/monitors", auth, analyticsRoles, async (req, res) => {
  try {
    const scope = scopeFromReq(req);
    const data = await getMonitorRankings(req.query, scope);
    res.json(data);
  } catch (err) {
    res.status(err.message.includes("مجاز") ? 403 : 500).json({ error: err.message });
  }
});

router.get("/rankings/editors", auth, analyticsRoles, async (req, res) => {
  try {
    const scope = scopeFromReq(req);
    const data = await getEditorRankings(req.query, scope);
    res.json(data);
  } catch (err) {
    res.status(err.message.includes("مجاز") ? 403 : 500).json({ error: err.message });
  }
});

router.get("/rankings/chiefs", auth, analyticsRoles, async (req, res) => {
  try {
    const scope = scopeFromReq(req);
    const data = await getChiefRankings(req.query, scope);
    res.json(data);
  } catch (err) {
    res.status(err.message.includes("مجاز") ? 403 : 500).json({ error: err.message });
  }
});

router.get("/rankings/units", auth, analyticsRoles, async (req, res) => {
  try {
    const scope = scopeFromReq(req);
    const data = await getUnitRankings(req.query, scope);
    res.json(data);
  } catch (err) {
    res.status(err.message.includes("مجاز") ? 403 : 500).json({ error: err.message });
  }
});

router.get("/widget/:widgetId", auth, analyticsRoles, async (req, res) => {
  try {
    const scope = scopeFromReq(req);
    const data = await getWidgetData(req.params.widgetId, req.query, scope);
    res.json(data);
  } catch (err) {
    res.status(err.message.includes("مجاز") ? 400 : 500).json({ error: err.message });
  }
});

router.get("/export/:widgetId", auth, analyticsRoles, async (req, res) => {
  try {
    const scope = scopeFromReq(req);
    const format = String(req.query.format || "csv").toLowerCase();
    const { buffer, mime, ext } = await exportAnalyticsWidget(req.params.widgetId, format, req.query, scope);
    const title = WIDGET_TITLES[req.params.widgetId] || req.params.widgetId;
    res.setHeader("Content-Type", mime);
    res.setHeader("Content-Disposition", `attachment; filename="news-analytics-${req.params.widgetId}.${ext}"; filename*=UTF-8''${encodeURIComponent(title)}.${ext}`);
    res.send(buffer);
  } catch (err) {
    res.status(err.message.includes("مجاز") ? 403 : 500).json({ error: err.message });
  }
});

export default router;
