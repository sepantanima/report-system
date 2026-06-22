import { Router } from "express";
import auth from "../middleware/auth.js";
import requireRole from "../middleware/requireRole.js";
import {
  listFormActions,
  getFormActionById,
  insertFormAction,
  updateFormAction,
  deleteFormAction,
} from "../services/aiFormActionService.js";
import { validateAiFormActionBody } from "../constants/aiFormActions.js";

const router = Router();

router.get("/", auth, requireRole("admin"), async (req, res) => {
  try {
    const form_name = (req.query.form_name || "").trim() || undefined;
    const rows = await listFormActions({ form_name });
    res.json(rows);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.get("/:id", auth, requireRole("admin"), async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (!Number.isFinite(id)) return res.status(400).json({ error: "شناسه نامعتبر" });
    const row = await getFormActionById(id);
    if (!row) return res.status(404).json({ error: "یافت نشد" });
    res.json(row);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.post("/", auth, requireRole("admin"), async (req, res) => {
  try {
    const err = validateAiFormActionBody(req.body, false);
    if (err) return res.status(400).json({ error: err });
    const id = await insertFormAction(req.body, req.user?.id);
    res.status(201).json({ success: true, id });
  } catch (e) {
    if (e.code === "23505") return res.status(400).json({ error: "ترکیب form_name و action_name تکراری است" });
    res.status(500).json({ error: e.message });
  }
});

router.put("/:id", auth, requireRole("admin"), async (req, res) => {
  try {
    const err = validateAiFormActionBody(req.body, true);
    if (err) return res.status(400).json({ error: err });
    const id = parseInt(req.params.id, 10);
    if (!Number.isFinite(id)) return res.status(400).json({ error: "شناسه نامعتبر" });
    const n = await updateFormAction(id, req.body, req.user?.id);
    if (!n) return res.status(404).json({ error: "یافت نشد" });
    res.json({ success: true });
  } catch (e) {
    if (e.code === "23505") return res.status(400).json({ error: "ترکیب form_name و action_name تکراری است" });
    res.status(500).json({ error: e.message });
  }
});

router.delete("/:id", auth, requireRole("admin"), async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (!Number.isFinite(id)) return res.status(400).json({ error: "شناسه نامعتبر" });
    const n = await deleteFormAction(id);
    if (!n) return res.status(404).json({ error: "یافت نشد" });
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

export default router;
