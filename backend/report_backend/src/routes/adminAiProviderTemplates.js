import { Router } from "express";
import auth from "../middleware/auth.js";
import requireRole from "../middleware/requireRole.js";
import {
  listProviderTemplates,
  getProviderTemplateById,
  insertProviderTemplate,
  updateProviderTemplate,
  deleteProviderTemplate,
} from "../services/aiProviderTemplateService.js";

const router = Router();

router.get("/", auth, requireRole("admin"), async (req, res) => {
  try {
    const include = String(req.query.include_disabled || "") === "1";
    const rows = await listProviderTemplates({ includeDisabled: include });
    res.json(rows);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.get("/:id", auth, requireRole("admin"), async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (!Number.isFinite(id)) return res.status(400).json({ error: "شناسه نامعتبر" });
    const row = await getProviderTemplateById(id);
    if (!row) return res.status(404).json({ error: "یافت نشد" });
    res.json(row);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.post("/", auth, requireRole("admin"), async (req, res) => {
  try {
    const id = await insertProviderTemplate(req.body);
    res.status(201).json({ success: true, id });
  } catch (e) {
    if (e.code === "23505") return res.status(400).json({ error: "این slug تکراری است" });
    res.status(400).json({ error: e.message });
  }
});

router.put("/:id", auth, requireRole("admin"), async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (!Number.isFinite(id)) return res.status(400).json({ error: "شناسه نامعتبر" });
    const n = await updateProviderTemplate(id, req.body);
    if (!n) return res.status(404).json({ error: "یافت نشد" });
    res.json({ success: true });
  } catch (e) {
    if (e.code === "23505") return res.status(400).json({ error: "slug تکراری است" });
    res.status(400).json({ error: e.message });
  }
});

router.delete("/:id", auth, requireRole("admin"), async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (!Number.isFinite(id)) return res.status(400).json({ error: "شناسه نامعتبر" });
    const n = await deleteProviderTemplate(id);
    if (!n) return res.status(404).json({ error: "یافت نشد" });
    res.json({ success: true });
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

export default router;
