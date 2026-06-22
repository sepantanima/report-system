import { Router } from "express";
import auth from "../middleware/auth.js";
import requireRole from "../middleware/requireRole.js";
import {
  createPattern,
  deletePattern,
  getPatternById,
  listPatterns,
  testPatternClean,
  updatePattern,
} from "../services/newsCleanPatternService.js";

const router = Router();

router.get("/", auth, requireRole("admin"), async (req, res) => {
  try {
    const rows = await listPatterns();
    res.json(rows);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.post("/test", auth, requireRole("admin"), async (req, res) => {
  try {
    const text = String(req.body?.text ?? "");
    const result = await testPatternClean(text);
    res.json(result);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.post("/", auth, requireRole("admin"), async (req, res) => {
  try {
    const row = await createPattern(req.body);
    res.status(201).json({ success: true, pattern: row });
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

router.put("/:id", auth, requireRole("admin"), async (req, res) => {
  try {
    const row = await updatePattern(req.params.id, req.body);
    if (!row) return res.status(404).json({ error: "الگو یافت نشد" });
    res.json({ success: true, pattern: row });
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

router.delete("/:id", auth, requireRole("admin"), async (req, res) => {
  try {
    const row = await deletePattern(req.params.id);
    if (!row) return res.status(404).json({ error: "الگو یافت نشد" });
    res.json({ success: true });
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

router.get("/:id", auth, requireRole("admin"), async (req, res) => {
  try {
    const row = await getPatternById(req.params.id);
    if (!row) return res.status(404).json({ error: "الگو یافت نشد" });
    res.json(row);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

export default router;
