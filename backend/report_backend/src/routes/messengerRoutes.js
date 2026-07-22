import { Router } from "express";
import auth from "../middleware/auth.js";
import { hasAnyRole } from "../middleware/requireRole.js";
import { listDestinationsForUser } from "../services/messengerChannelConfigService.js";
import { MESSENGER_USAGE_KEYS } from "../constants/messengerUsageKeys.js";

const router = Router();

const NEWS_PUBLISH_ROLES = ["admin", "news_editor", "news_chief"];
const ALERT_PUBLISH_ROLES = ["admin", "Field_admin", "news_chief"];
const ANALYSIS_SUBMISSION_PUBLISH_ROLES = ["admin", "analysis_manager", "Field_admin"];

router.get("/destinations", auth, async (req, res) => {
  try {
    const usage_key = String(req.query.usage_key || MESSENGER_USAGE_KEYS.NEWS_REPORT_PUBLISH).trim();
    let allowed = NEWS_PUBLISH_ROLES;
    if (usage_key === MESSENGER_USAGE_KEYS.NEWS_ALERT_BROADCAST) {
      allowed = ALERT_PUBLISH_ROLES;
    } else if (usage_key === MESSENGER_USAGE_KEYS.ANALYSIS_SUBMISSION_PUBLISH) {
      allowed = ANALYSIS_SUBMISSION_PUBLISH_ROLES;
    }
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
