import { Router } from "express";
import auth from "../middleware/auth.js";
import requireRole from "../middleware/requireRole.js";
import {
  listAiConfigs,
  getAiConfigById,
  insertAiConfig,
  updateAiConfig,
  deleteAiConfig,
  getRawConfigForTest,
} from "../services/aiApiConfigService.js";
import { validateAiApiConfigBody } from "../constants/promptFieldLimits.js";
import { invokeLlmSingleRow } from "../services/llmInvoke.js";
import { fetchConfigCredit } from "../services/aiProviderCreditService.js";
import { assertProviderSlugAllowed } from "../services/aiProviderTemplateService.js";

const router = Router();

router.get("/", auth, requireRole("admin"), async (req, res) => {
  try {
    const rows = await listAiConfigs({
      usage_key: req.query.usage_key,
      provider_type: req.query.provider_type,
    });
    res.json(rows);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.get("/:id/credit", auth, requireRole("admin"), async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (!Number.isFinite(id)) return res.status(400).json({ error: "شناسه نامعتبر" });
    const data = await fetchConfigCredit(id);
    res.json(data);
  } catch (e) {
    res.status(400).json({ ok: false, error: e.message });
  }
});

router.get("/:id", auth, requireRole("admin"), async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    const row = await getAiConfigById(id);
    if (!row) return res.status(404).json({ error: "یافت نشد" });
    res.json(row);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.post("/", auth, requireRole("admin"), async (req, res) => {
  try {
    const err = validateAiApiConfigBody(req.body, false);
    if (err) return res.status(400).json({ error: err });
    const pe = await assertProviderSlugAllowed(req.body.provider_type);
    if (pe) return res.status(400).json({ error: pe });
    const id = await insertAiConfig(req.body, req.user?.id);
    res.status(201).json({ success: true, id });
  } catch (e) {
    if (e.code === "23505") return res.status(400).json({ error: "ترتیب یا کاربرد تکراری است" });
    res.status(500).json({ error: e.message });
  }
});

router.put("/:id", auth, requireRole("admin"), async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    const err = validateAiApiConfigBody(req.body, true);
    if (err) return res.status(400).json({ error: err });
    if (req.body.provider_type != null && String(req.body.provider_type).trim()) {
      const pe = await assertProviderSlugAllowed(req.body.provider_type);
      if (pe) return res.status(400).json({ error: pe });
    }
    const n = await updateAiConfig(id, req.body, req.user?.id);
    if (!n) return res.status(404).json({ error: "یافت نشد" });
    res.json({ success: true });
  } catch (e) {
    if (e.code === "23505") return res.status(400).json({ error: "ترتیب یا کاربرد تکراری است" });
    res.status(500).json({ error: e.message });
  }
});

router.delete("/:id", auth, requireRole("admin"), async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    const n = await deleteAiConfig(id);
    if (!n) return res.status(404).json({ error: "یافت نشد" });
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.post("/:id/test", auth, requireRole("admin"), async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    const row = await getRawConfigForTest(id);
    if (!row) return res.status(404).json({ error: "یافت نشد" });
    const { text } = await invokeLlmSingleRow(row, "فقط کلمه «آزمایش» را یک بار پاسخ بده.");
    res.json({ ok: true, sample: String(text).slice(0, 200) });
  } catch (e) {
    res.status(400).json({ ok: false, error: e.message });
  }
});

export default router;
