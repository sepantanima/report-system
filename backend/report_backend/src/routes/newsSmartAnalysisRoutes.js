import { Router } from "express";
import auth from "../middleware/auth.js";
import requireRole from "../middleware/requireRole.js";
import { listActiveActionsForForm } from "../services/aiFormActionService.js";
import { validateFormActionName, validateFormDataObject } from "../constants/aiFormActions.js";
import { NEWS_SMART_ANALYSIS_FORM } from "../constants/newsSmartAnalysisMeta.js";
import {
  runSmartAnalysisAiWithFallback,
  saveSmartAnalysis,
  getSmartAnalysis,
  listSmartAnalyses,
  deleteSmartAnalysis,
  exportSmartAnalysisPdf,
  exportSmartAnalysisDocx,
  exportSmartAnalysisTxt,
  publishSmartAnalysis,
} from "../services/newsSmartAnalysisService.js";
import {
  createAnalysisPack,
  getPackById,
  listPacks,
  upsertPackAnalysis,
  getPackFrozenNews,
  deletePack,
} from "../services/newsSmartAnalysisPackService.js";

const router = Router();
const smartAnalysisRoles = requireRole("admin", "news_editor", "news_chief");

router.get("/smart-analysis/ai/form-actions", auth, smartAnalysisRoles, async (req, res) => {
  try {
    const form_name = String(req.query.form_name || NEWS_SMART_ANALYSIS_FORM).trim();
    if (!validateFormActionName(form_name)) {
      return res.status(400).json({ error: "form_name نامعتبر است" });
    }
    const rows = await listActiveActionsForForm(form_name);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post("/smart-analysis/ai/run", auth, smartAnalysisRoles, async (req, res) => {
  try {
    const { form_name, action_name, form_data } = req.body || {};
    const fn = String(form_name || NEWS_SMART_ANALYSIS_FORM).trim();
    const an = String(action_name || "").trim();
    if (!validateFormActionName(fn)) {
      return res.status(400).json({ error: "form_name نامعتبر است" });
    }
    if (!validateFormActionName(an)) {
      return res.status(400).json({ error: "action_name نامعتبر است" });
    }
    const fe = validateFormDataObject(form_data);
    if (fe) return res.status(400).json({ error: fe });

    const packId = form_data?.pack_id != null ? parseInt(form_data.pack_id, 10) : null;
    if (!Number.isFinite(packId) && !form_data?.query_payload) {
      return res.status(400).json({ error: "pack_id یا query_payload الزامی است" });
    }

    const data = await runSmartAnalysisAiWithFallback({
      actionName: an,
      formData: form_data,
      userId: req.user?.id ?? null,
      userRole: req.user?.role,
    });

    res.json(data);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.post("/smart-analysis/packs", auth, smartAnalysisRoles, async (req, res) => {
  try {
    const { query_payload, selected_ids, title } = req.body || {};
    if (!query_payload || typeof query_payload !== "object") {
      return res.status(400).json({ error: "query_payload الزامی است" });
    }
    const pack = await createAnalysisPack({
      queryPayload: query_payload,
      selectedIds: Array.isArray(selected_ids) ? selected_ids : [],
      title,
      userId: req.user?.id ?? null,
      userRole: req.user?.role,
    });
    res.status(201).json(pack);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.get("/smart-analysis/packs", auth, smartAnalysisRoles, async (req, res) => {
  try {
    res.json(await listPacks(req.query));
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.get("/smart-analysis/packs/:id", auth, smartAnalysisRoles, async (req, res) => {
  try {
    const pack = await getPackById(parseInt(req.params.id, 10));
    if (!pack) return res.status(404).json({ error: "پک یافت نشد" });
    res.json(pack);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.get("/smart-analysis/packs/:id/news", auth, smartAnalysisRoles, async (req, res) => {
  try {
    const data = await getPackFrozenNews(parseInt(req.params.id, 10), {
      userId: req.user?.id ?? null,
      role: req.user?.role,
    });
    res.json(data);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.put("/smart-analysis/packs/:id/analyses/:type", auth, smartAnalysisRoles, async (req, res) => {
  try {
    const row = await upsertPackAnalysis(
      parseInt(req.params.id, 10),
      req.params.type,
      req.body || {},
      req.user?.id ?? null,
    );
    res.json(row);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.delete("/smart-analysis/packs/:id", auth, smartAnalysisRoles, async (req, res) => {
  try {
    res.json(await deletePack(parseInt(req.params.id, 10)));
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.post("/smart-analyses", auth, smartAnalysisRoles, async (req, res) => {
  try {
    const row = await saveSmartAnalysis(req.body, req.user?.id ?? null);
    res.status(req.body?.id ? 200 : 201).json(row);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.get("/smart-analyses", auth, smartAnalysisRoles, async (req, res) => {
  try {
    res.json(await listSmartAnalyses(req.query));
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.get("/smart-analyses/:id", auth, smartAnalysisRoles, async (req, res) => {
  try {
    const row = await getSmartAnalysis(parseInt(req.params.id, 10));
    if (!row) return res.status(404).json({ error: "تحلیل یافت نشد" });
    res.json(row);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.delete("/smart-analyses/:id", auth, smartAnalysisRoles, async (req, res) => {
  try {
    res.json(await deleteSmartAnalysis(parseInt(req.params.id, 10)));
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.get("/smart-analyses/:id/export.pdf", auth, smartAnalysisRoles, async (req, res) => {
  try {
    const { buffer, fileName, mime } = await exportSmartAnalysisPdf(parseInt(req.params.id, 10));
    res.setHeader("Content-Type", mime);
    res.setHeader("Content-Disposition", `attachment; filename="${fileName}"`);
    res.send(buffer);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.get("/smart-analyses/:id/export.docx", auth, smartAnalysisRoles, async (req, res) => {
  try {
    const { buffer, fileName, mime } = await exportSmartAnalysisDocx(parseInt(req.params.id, 10));
    res.setHeader("Content-Type", mime);
    res.setHeader("Content-Disposition", `attachment; filename="${fileName}"`);
    res.send(buffer);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.get("/smart-analyses/:id/export.txt", auth, smartAnalysisRoles, async (req, res) => {
  try {
    const { text, fileName, mime, truncated, charCount, maxChars } =
      await exportSmartAnalysisTxt(parseInt(req.params.id, 10));
    res.setHeader("Content-Type", mime);
    res.setHeader("Content-Disposition", `attachment; filename="${fileName}"`);
    if (truncated) {
      res.setHeader("X-Messenger-Truncated", "1");
      res.setHeader("X-Messenger-Char-Count", String(charCount));
      res.setHeader("X-Messenger-Max-Chars", String(maxChars));
    }
    res.send(`\uFEFF${text}`);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.post("/smart-analyses/:id/publish", auth, smartAnalysisRoles, async (req, res) => {
  try {
    const result = await publishSmartAnalysis(parseInt(req.params.id, 10), {
      channelConfigId: req.body?.destination_id ?? req.body?.channel_config_id,
      userId: req.user?.id ?? null,
    });
    res.json(result);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

export default router;
