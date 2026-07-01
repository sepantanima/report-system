import { Router } from "express";
import auth from "../middleware/auth.js";
import requireRole from "../middleware/requireRole.js";
import {
  getFieldReportSettings,
  updateFieldReportSettings,
} from "../services/fieldReportSettingsService.js";

const router = Router();
const fieldAdminRoles = requireRole("admin", "Field_admin");

router.get("/settings", auth, fieldAdminRoles, async (req, res) => {
  try {
    res.json(await getFieldReportSettings());
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.put("/settings", auth, fieldAdminRoles, async (req, res) => {
  try {
    res.json(await updateFieldReportSettings(req.body, req.user?.id));
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

export default router;
