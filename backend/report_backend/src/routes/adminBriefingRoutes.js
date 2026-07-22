import { Router } from "express";
import auth from "../middleware/auth.js";
import requirePermission, { requireSyncBriefing } from "../middleware/requirePermission.js";
import {
  previewAdminBriefing,
  generateAdminBriefingHtml,
  markBriefingDelivered,
  listBriefings,
} from "../services/adminBriefingService.js";

const router = Router();

router.use(auth);

router.get("/preview", requireSyncBriefing(), async (_req, res) => {
  try {
    res.json(await previewAdminBriefing());
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

router.get("/export", requireSyncBriefing(), async (req, res) => {
  try {
    const { html, briefingId, checksum, generatedAt } = await generateAdminBriefingHtml(req.user.id);
    if (req.query.format === "json") {
      return res.json({ briefingId, checksum, generatedAt, html });
    }
    res.setHeader("Content-Type", "text/html; charset=utf-8");
    res.setHeader("Content-Disposition", `attachment; filename="admin-briefing-${briefingId}.html"`);
    res.send(html);
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

router.post("/delivered", requireSyncBriefing(), async (req, res) => {
  try {
    await markBriefingDelivered(req.body.briefing_id);
    res.json({ success: true });
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

router.get("/history", requireSyncBriefing(), async (_req, res) => {
  try {
    res.json(await listBriefings());
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

export default router;
