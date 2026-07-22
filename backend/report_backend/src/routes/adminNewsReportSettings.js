import { Router } from "express";
import auth from "../middleware/auth.js";
import requireRole from "../middleware/requireRole.js";
import {
  getNewsReportSettings,
  updateNewsReportSettings,
  listNewsReportTemplates,
  getNewsReportTemplateById,
  insertNewsReportTemplate,
  updateNewsReportTemplate,
  deleteNewsReportTemplate,
  getReportSettingsDefaults,
} from "../services/newsReportSettingsService.js";

const router = Router();
const adminRoles = requireRole("admin", "news_chief");

router.get("/settings", auth, adminRoles, async (req, res) => {
  try {
    res.json(await getNewsReportSettings());
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.put("/settings", auth, adminRoles, async (req, res) => {
  try {
    res.json(await updateNewsReportSettings(req.body, req.user?.id));
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

router.get("/defaults", auth, adminRoles, async (req, res) => {
  try {
    res.json(getReportSettingsDefaults());
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.get("/templates", auth, adminRoles, async (req, res) => {
  try {
    res.json(await listNewsReportTemplates(req.query.type));
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.get("/templates/:id", auth, adminRoles, async (req, res) => {
  try {
    const row = await getNewsReportTemplateById(parseInt(req.params.id, 10));
    if (!row) return res.status(404).json({ error: "یافت نشد" });
    res.json(row);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.post("/templates", auth, adminRoles, async (req, res) => {
  try {
    const id = await insertNewsReportTemplate(req.body);
    res.status(201).json({ success: true, id });
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

router.put("/templates/:id", auth, adminRoles, async (req, res) => {
  try {
    await updateNewsReportTemplate(parseInt(req.params.id, 10), req.body);
    res.json({ success: true });
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

router.delete("/templates/:id", auth, adminRoles, async (req, res) => {
  try {
    await deleteNewsReportTemplate(parseInt(req.params.id, 10));
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

export default router;
