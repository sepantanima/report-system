import { Router } from "express";
import auth from "../middleware/auth.js";
import requireRole from "../middleware/requireRole.js";
import {
  listChannelConfigs,
  getChannelConfigById,
  insertChannelConfig,
  updateChannelConfig,
  deleteChannelConfig,
} from "../services/messengerChannelConfigService.js";
import { validateMessengerChannelBody } from "../constants/messengerFieldLimits.js";
import { assertProviderSlugAllowed } from "../services/messengerProviderTemplateService.js";
import { testChannelConfig } from "../services/messengerSend.js";

const router = Router();

router.get("/", auth, requireRole("admin"), async (req, res) => {
  try {
    const rows = await listChannelConfigs({
      usage_key: req.query.usage_key,
      provider_type: req.query.provider_type,
      is_enabled: req.query.is_enabled,
    });
    res.json(rows);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.get("/:id", auth, requireRole("admin"), async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    const row = await getChannelConfigById(id);
    if (!row) return res.status(404).json({ error: "یافت نشد" });
    res.json(row);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.post("/", auth, requireRole("admin"), async (req, res) => {
  try {
    const err = validateMessengerChannelBody(req.body, false);
    if (err) return res.status(400).json({ error: err });
    const pe = await assertProviderSlugAllowed(req.body.provider_type);
    if (pe) return res.status(400).json({ error: pe });
    const id = await insertChannelConfig(req.body, req.user?.id);
    res.status(201).json({ success: true, id });
  } catch (e) {
    if (e.code === "23505") return res.status(400).json({ error: "رکورد تکراری است" });
    res.status(500).json({ error: e.message });
  }
});

router.put("/:id", auth, requireRole("admin"), async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    const err = validateMessengerChannelBody(req.body, true);
    if (err) return res.status(400).json({ error: err });
    if (req.body.provider_type != null && String(req.body.provider_type).trim()) {
      const pe = await assertProviderSlugAllowed(req.body.provider_type);
      if (pe) return res.status(400).json({ error: pe });
    }
    const n = await updateChannelConfig(id, req.body, req.user?.id);
    if (!n) return res.status(404).json({ error: "یافت نشد" });
    res.json({ success: true });
  } catch (e) {
    if (e.code === "23505") return res.status(400).json({ error: "رکورد تکراری است" });
    res.status(500).json({ error: e.message });
  }
});

router.delete("/:id", auth, requireRole("admin"), async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    const n = await deleteChannelConfig(id);
    if (!n) return res.status(404).json({ error: "یافت نشد" });
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.post("/:id/test", auth, requireRole("admin"), async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    const row = await getChannelConfigById(id, { raw: true });
    if (!row) return res.status(404).json({ error: "یافت نشد" });
    const result = await testChannelConfig(id);
    res.json({ ok: true, message_id: result.messageId });
  } catch (e) {
    res.status(400).json({ ok: false, error: e.message });
  }
});

export default router;
