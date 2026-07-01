import { Router } from "express";
import auth from "../middleware/auth.js";
import requireRole from "../middleware/requireRole.js";
import {
  getNewsEntrySettings,
  updateNewsEntrySettings,
} from "../services/newsEntrySettingsService.js";

const router = Router();
const newsChiefRoles = requireRole("admin", "news_chief");

router.get("/settings", auth, newsChiefRoles, async (req, res) => {
  try {
    res.json(await getNewsEntrySettings());
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.put("/settings", auth, newsChiefRoles, async (req, res) => {
  try {
    res.json(await updateNewsEntrySettings(req.body, req.user?.id));
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

export default router;
