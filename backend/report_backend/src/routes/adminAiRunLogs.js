import { Router } from "express";
import auth from "../middleware/auth.js";
import requireRole from "../middleware/requireRole.js";
import { listAiRunLogs, getAiRunLogById } from "../services/aiRunLogService.js";

const router = Router();

router.get("/", auth, requireRole("admin"), async (req, res) => {
  try {
    const rows = await listAiRunLogs({
      form_name: req.query.form_name,
      action_name: req.query.action_name,
      status: req.query.status,
      usage_key: req.query.usage_key,
      ai_config_id: req.query.ai_config_id,
      from: req.query.from,
      to: req.query.to,
      limit: req.query.limit,
      offset: req.query.offset,
    });
    res.json(rows);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.get("/:id", auth, requireRole("admin"), async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (!Number.isFinite(id)) return res.status(400).json({ error: "شناسه نامعتبر" });
    const row = await getAiRunLogById(id);
    if (!row) return res.status(404).json({ error: "یافت نشد" });
    res.json(row);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

export default router;
