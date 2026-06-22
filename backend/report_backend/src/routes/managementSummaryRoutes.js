import { Router } from "express";
import auth from "../middleware/auth.js";
import requireRole from "../middleware/requireRole.js";
import {
  previewReports,
  aiDraft,
  saveSummary,
  updateSummary,
  listSummaries,
  getSummaryById,
} from "../services/managementSummaryService.js";
import { validateLength, validateManagementSummarySave } from "../constants/promptFieldLimits.js";
import { generateFieldManagementSummaryPdf } from "../services/fieldManagementSummaryPdf.js";
import { generateFieldManagementSummaryDocx } from "../services/fieldManagementSummaryDocx.js";

const router = Router();
const fieldRoles = requireRole("admin", "Field_admin");

router.post("/admin/management-summaries/preview-reports", auth, fieldRoles, async (req, res) => {
  try {
    const data = await previewReports(req.body);
    res.json(data);
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

router.post("/admin/management-summaries/ai-draft", auth, fieldRoles, async (req, res) => {
  try {
    const data = await aiDraft(req.body, req.user?.id ?? null);
    res.json(data);
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

router.post("/admin/management-summaries", auth, fieldRoles, async (req, res) => {
  try {
    if (!String(req.body.summary_body || "").trim()) {
      return res.status(400).json({ error: "متن خلاصه الزامی است" });
    }
    const err =
      validateManagementSummarySave(req.body) ||
      validateLength(req.body.title, 480, "عنوان خلاصه");
    if (err) return res.status(400).json({ error: err });
    const data = await saveSummary(req.body, req.user?.id);
    res.status(201).json(data);
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

router.get("/admin/management-summaries", auth, fieldRoles, async (req, res) => {
  try {
    const data = await listSummaries(req.query);
    res.json(data);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

/** ویرایش: فقط متن خلاصه قابل تغییر است */
router.patch("/admin/management-summaries/:id", auth, fieldRoles, async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    const { summary_body: summaryBody, title } = req.body;
    if (summaryBody === undefined && title === undefined) {
      return res.status(400).json({ error: "حداقل یکی از فیلدهای متن خلاصه یا عنوان باید ارسال شود" });
    }
    if (summaryBody !== undefined) {
      if (!String(summaryBody).trim()) {
        return res.status(400).json({ error: "متن خلاصه نمی‌تواند خالی باشد" });
      }
      const err = validateManagementSummarySave({ ...req.body, summary_body: summaryBody });
      if (err) return res.status(400).json({ error: err });
    }
    if (title !== undefined) {
      const err = validateLength(title, 480, "عنوان خلاصه");
      if (err) return res.status(400).json({ error: err });
    }
    const updated = await updateSummary(id, { summary_body: summaryBody, title });
    if (!updated) return res.status(404).json({ error: "یافت نشد" });
    res.json(updated);
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

function includeReportsFlag(req) {
  const v = String(req.query.include_reports ?? "1");
  return !(v === "0" || v === "false");
}

router.get("/admin/management-summaries/:id/export.pdf", auth, fieldRoles, async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    const data = await getSummaryById(id);
    if (!data) return res.status(404).json({ error: "یافت نشد" });
    const buf = await generateFieldManagementSummaryPdf({
      summary: data.summary,
      refs: data.refs,
      includeReports: includeReportsFlag(req),
    });
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename="mgmt-summary-${id}.pdf"`);
    res.send(Buffer.from(buf));
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.get("/admin/management-summaries/:id/export.docx", auth, fieldRoles, async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    const data = await getSummaryById(id);
    if (!data) return res.status(404).json({ error: "یافت نشد" });
    const buf = await generateFieldManagementSummaryDocx({
      summary: data.summary,
      refs: data.refs,
      includeReports: includeReportsFlag(req),
    });
    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    );
    res.setHeader("Content-Disposition", `attachment; filename="mgmt-summary-${id}.docx"`);
    res.send(Buffer.from(buf));
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.get("/admin/management-summaries/:id", auth, fieldRoles, async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    const data = await getSummaryById(id);
    if (!data) return res.status(404).json({ error: "یافت نشد" });
    res.json(data);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

export default router;
