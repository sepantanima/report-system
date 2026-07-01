import { Router } from "express";
import auth from "../middleware/auth.js";
import requireRole from "../middleware/requireRole.js";
import {
  getMessageSettings,
  updateMessageSettings,
} from "../services/messageSettingsService.js";

const router = Router();
const managers = requireRole("admin", "Field_admin", "news_chief");

router.get("/settings", auth, managers, async (req, res) => {
  try {
    res.json(await getMessageSettings());
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.put("/settings", auth, managers, async (req, res) => {
  try {
    res.json(await updateMessageSettings(req.body, req.user?.id));
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

export default router;
