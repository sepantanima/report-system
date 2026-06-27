import { Router } from "express";
import auth from "../middleware/auth.js";
import requireRole from "../middleware/requireRole.js";
import { listProviderTemplates } from "../services/messengerProviderTemplateService.js";

const router = Router();

router.get("/", auth, requireRole("admin"), async (req, res) => {
  try {
    const includeDisabled = req.query.include_disabled === "1" || req.query.include_disabled === "true";
    const rows = await listProviderTemplates({ include_disabled: includeDisabled });
    res.json(rows);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

export default router;
