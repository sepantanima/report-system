import { Router } from "express";
import auth from "../middleware/auth.js";
import requireRole from "../middleware/requireRole.js";
import fs from "fs";
import {
  previewNewsReportCount,
  previewNewsReportPackCounts,
  previewNewsReportRows,
  generateNewsReport,
  generateNewsReportsBatch,
  generateNewsReportPack,
  getNewsReportForDownload,
  listNewsReports,
  sendSingleNewsReport,
  sendBatchNewsReport,
  previewReportContent,
  deleteNewsReport,
  deleteAllNewsReports,
  publishExistingNewsReport,
  getNewsReportWorkflowConfig,
} from "../services/newsReportService.js";
import { probePdfEngine } from "../services/newsReportPdf.js";

const router = Router();
const newsReportRoles = requireRole("admin", "news_editor", "news_chief");

router.get("/workflow-config", auth, newsReportRoles, async (req, res) => {
  try {
    res.json(await getNewsReportWorkflowConfig());
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.post("/generate-pack", auth, newsReportRoles, async (req, res) => {
  try {
    res.status(201).json(await generateNewsReportPack(req.body, req.user));
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

router.post("/preview-pack-counts", auth, newsReportRoles, async (req, res) => {
  try {
    res.json(await previewNewsReportPackCounts(req.body, req.user));
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

router.post("/preview-count", auth, newsReportRoles, async (req, res) => {
  try {
    res.json(await previewNewsReportCount(req.body, req.user));
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

router.post("/preview-rows", auth, newsReportRoles, async (req, res) => {
  try {
    res.json(await previewNewsReportRows(req.body, req.user));
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

router.post("/preview-content", auth, newsReportRoles, async (req, res) => {
  try {
    res.json(await previewReportContent(req.body, req.user));
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

router.post("/generate", auth, newsReportRoles, async (req, res) => {
  try {
    const formats = Array.isArray(req.body.output_formats) ? req.body.output_formats : null;
    const result = formats && formats.length > 1
      ? await generateNewsReportsBatch(req.body, req.user)
      : await generateNewsReport(req.body, req.user);
    res.status(201).json(result);
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

router.delete("/history/clear", auth, newsReportRoles, async (req, res) => {
  try {
    res.json(await deleteAllNewsReports(req.user));
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

router.delete("/:id", auth, newsReportRoles, async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    res.json(await deleteNewsReport(id, req.user));
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

router.post("/send-single", auth, newsReportRoles, async (req, res) => {
  try {
    res.json(await sendSingleNewsReport(req.body, req.user));
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

router.post("/send-batch", auth, newsReportRoles, async (req, res) => {
  try {
    res.json(await sendBatchNewsReport(req.body, req.user));
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

router.post("/:id/publish", auth, newsReportRoles, async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    res.json(await publishExistingNewsReport(id, req.body, req.user));
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

router.get("/", auth, newsReportRoles, async (req, res) => {
  try {
    res.json(await listNewsReports(req.user, req.query));
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.get("/pdf-engine", auth, newsReportRoles, async (req, res) => {
  try {
    res.json(await probePdfEngine());
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.get("/:id/download", auth, newsReportRoles, async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    const row = await getNewsReportForDownload(id, req.user);
    if (!row) return res.status(404).json({ error: "فایل یافت نشد" });
    const mime =
      row.format === "zip" ? "application/zip"
        : row.format === "pdf" ? "application/pdf"
          : ["html", "html_card", "html_table"].includes(row.format) ? "text/html; charset=utf-8"
            : "text/plain; charset=utf-8";
    res.setHeader("Content-Type", mime);
    res.setHeader("Content-Disposition", `attachment; filename*=UTF-8''${encodeURIComponent(row.file_name || "report")}`);
    fs.createReadStream(row.file_path).pipe(res);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

export default router;
