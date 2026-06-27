import { Router } from "express";
import auth from "../middleware/auth.js";
import requireRole from "../middleware/requireRole.js";
import { listDestinationsForUser } from "../services/messengerChannelConfigService.js";

const router = Router();

const newsPublishRoles = requireRole("admin", "news_editor", "news_chief");

router.get("/destinations", auth, newsPublishRoles, async (req, res) => {
  try {
    const usage_key = String(req.query.usage_key || "news.report.publish").trim();
    const rows = await listDestinationsForUser(usage_key);
    res.json(rows);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

export default router;
