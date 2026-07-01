import { Router } from "express";
import auth from "../middleware/auth.js";
import { hasAnyRole } from "../middleware/requireRole.js";
import { listDestinationsForUser } from "../services/messengerChannelConfigService.js";
import { MESSENGER_USAGE_KEYS } from "../constants/messengerUsageKeys.js";

const router = Router();

const NEWS_PUBLISH_ROLES = ["admin", "news_editor", "news_chief"];
const ALERT_PUBLISH_ROLES = ["admin", "Field_admin", "news_chief"];

router.get("/destinations", auth, async (req, res) => {
  try {
    const usage_key = String(req.query.usage_key || MESSENGER_USAGE_KEYS.NEWS_REPORT_PUBLISH).trim();
    const allowed = usage_key === MESSENGER_USAGE_KEYS.NEWS_ALERT_BROADCAST
      ? ALERT_PUBLISH_ROLES
      : NEWS_PUBLISH_ROLES;
    if (!hasAnyRole(req.user, allowed)) {
      return res.status(403).json({ error: "دسترسی غیرمجاز" });
    }
    const rows = await listDestinationsForUser(usage_key);
    res.json(rows);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

export default router;
