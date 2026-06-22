import { Router } from "express";
import auth from "../middleware/auth.js";
import requireRole from "../middleware/requireRole.js";
import { REGISTERED_FORM_ACTION_KEYS, isRegisteredFormAction } from "../constants/aiFormRegistry.js";
import { validateFormActionName } from "../constants/aiFormActions.js";
import { createPrompt, getPromptByKey, listPrompts, upsertPrompt } from "../services/promptRegistry.js";
import { getPromptVariableMetaForAction } from "../services/promptVariableCatalog.js";
import { validatePromptCreate, validatePromptUpsert } from "../constants/promptFieldLimits.js";

const router = Router();

router.get("/", auth, requireRole("admin"), async (req, res) => {
  try {
    const prefix = (req.query.prefix || "").trim();
    const rows = await listPrompts(prefix);
    res.json(rows);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.post("/", auth, requireRole("admin"), async (req, res) => {
  try {
    const err = validatePromptCreate(req.body);
    if (err) return res.status(400).json({ error: err });
    const key = String(req.body.prompt_key || "").trim();
    const title_fa = req.body.title_fa ?? "";
    const description_fa = req.body.description_fa ?? "";
    const body = req.body.body ?? "";
    try {
      await createPrompt(key, { title_fa, description_fa, body }, req.user?.id);
    } catch (e) {
      if (e?.code === "DUPLICATE_PROMPT_KEY") {
        return res.status(409).json({ error: "این کلید پرامپت از قبل وجود دارد" });
      }
      throw e;
    }
    const row = await getPromptByKey(key);
    res.status(201).json({ success: true, prompt: row });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.get("/meta/form-actions", auth, requireRole("admin"), (req, res) => {
  res.json(REGISTERED_FORM_ACTION_KEYS);
});

router.get("/meta/variables", auth, requireRole("admin"), (req, res) => {
  try {
    const fn = String(req.query.form_name || "").trim();
    const an = String(req.query.action_name || "").trim();
    if (!validateFormActionName(fn) || !validateFormActionName(an)) {
      return res.status(400).json({ error: "form_name و action_name الزامی و معتبر باشند" });
    }
    if (!isRegisteredFormAction(fn, an)) {
      return res.status(400).json({ error: "این ترکیب فرم/اکشن در رجیستری ثبت نشده است" });
    }
    const meta = getPromptVariableMetaForAction(fn, an);
    res.json({ form_name: fn, action_name: an, ...meta });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.get("/:promptKey", auth, requireRole("admin"), async (req, res) => {
  try {
    const key = decodeURIComponent(req.params.promptKey);
    const row = await getPromptByKey(key);
    if (!row) return res.status(404).json({ error: "پرامپت یافت نشد" });
    res.json(row);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.put("/:promptKey", auth, requireRole("admin"), async (req, res) => {
  try {
    const key = decodeURIComponent(req.params.promptKey);
    const err = validatePromptUpsert(req.body);
    if (err) return res.status(400).json({ error: err });
    const { title_fa, description_fa, body } = req.body;
    await upsertPrompt(key, { title_fa, description_fa, body }, req.user?.id);
    const row = await getPromptByKey(key);
    res.json({ success: true, prompt: row });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

export default router;
