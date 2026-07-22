import express from "express";
import requireRole, { hasAnyRole } from "../middleware/requireRole.js";
import { cleanBriefSubmissionContent } from "../services/briefContentCleaner.js";
import {
  createBriefSubmission,
  listMyBriefSubmissions,
  listBriefSubmissionsForManager,
  listBriefBank,
  getBriefSubmission,
  updateBriefStatus,
  approveBriefBank,
  setBriefCommandVisibility,
  approveBriefForPublish,
  publishBriefSubmission,
  editBriefBankContent,
  editBriefSubmissionContent,
  promoteBriefToTopic,
  promoteBriefToMission,
  suggestAnalystRole,
  getContributorStats,
  listPendingRoleSuggestions,
  BRIEF_MANAGER_ROLES,
  BRIEF_EDITOR_ROLES,
} from "../services/analysisBriefSubmissionService.js";

const router = express.Router();

function isManager(user) {
  return hasAnyRole(user, BRIEF_MANAGER_ROLES);
}

router.post("/", async (req, res) => {
  try {
    const row = await createBriefSubmission(req.body, req.user);
    res.status(201).json(row);
  } catch (err) {
    const code = err.message === "NOT_FOUND" ? 404 : 400;
    res.status(code).json({ error: err.message });
  }
});

router.post("/clean-content", async (req, res) => {
  try {
    const raw = String(req.body?.content ?? "").trim();
    if (!raw) return res.status(400).json({ error: "متن برای پاکسازی الزامی است" });

    const content = await cleanBriefSubmissionContent(raw);
    if (!String(content ?? "").replace(/<[^>]*>/g, "").trim()) {
      return res.status(400).json({ error: "متن پس از پاکسازی خالی شد" });
    }

    res.json({ content });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get("/mine", async (req, res) => {
  try {
    const rows = await listMyBriefSubmissions(req.user.id, req.query);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get("/contributors/stats", requireRole(...BRIEF_MANAGER_ROLES), async (_req, res) => {
  try {
    const rows = await getContributorStats();
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get("/role-suggestions/pending", requireRole(...BRIEF_MANAGER_ROLES), async (_req, res) => {
  try {
    const rows = await listPendingRoleSuggestions();
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get("/bank", requireRole(...BRIEF_MANAGER_ROLES), async (req, res) => {
  try {
    const rows = await listBriefBank(req.query);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get("/", requireRole(...BRIEF_MANAGER_ROLES), async (req, res) => {
  try {
    const rows = await listBriefSubmissionsForManager(req.query);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get("/:id", async (req, res) => {
  try {
    const row = await getBriefSubmission(req.params.id, req.user, { isManager: isManager(req.user) });
    if (!row) return res.status(404).json({ error: "یافت نشد" });
    res.json(row);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.patch("/:id/status", requireRole(...BRIEF_MANAGER_ROLES), async (req, res) => {
  try {
    const row = await updateBriefStatus(req.params.id, req.body, req.user);
    res.json(row);
  } catch (err) {
    if (err.message === "NOT_FOUND") return res.status(404).json({ error: "یافت نشد" });
    res.status(400).json({ error: err.message });
  }
});

router.post("/:id/approve-bank", requireRole(...BRIEF_MANAGER_ROLES), async (req, res) => {
  try {
    const row = await approveBriefBank(req.params.id, req.body, req.user);
    res.json(row);
  } catch (err) {
    if (err.message === "NOT_FOUND") return res.status(404).json({ error: "یافت نشد" });
    res.status(400).json({ error: err.message });
  }
});

router.patch("/:id/command-visibility", requireRole(...BRIEF_MANAGER_ROLES), async (req, res) => {
  try {
    const row = await setBriefCommandVisibility(
      req.params.id,
      req.body?.show_in_command === true,
      req.user,
    );
    res.json(row);
  } catch (err) {
    if (err.message === "NOT_FOUND_OR_NOT_IN_BANK") {
      return res.status(400).json({ error: "فقط تحلیل‌های ذخیره‌شده در بانک قابل نمایش در اتاق فرمان هستند" });
    }
    res.status(400).json({ error: err.message });
  }
});

router.post("/:id/editor-approve", requireRole(...BRIEF_EDITOR_ROLES), async (req, res) => {
  try {
    const row = await approveBriefForPublish(req.params.id, req.body, req.user);
    res.json(row);
  } catch (err) {
    if (err.message === "NOT_FOUND") return res.status(404).json({ error: "یافت نشد" });
    res.status(400).json({ error: err.message });
  }
});

router.post("/:id/publish", requireRole(...BRIEF_EDITOR_ROLES), async (req, res) => {
  try {
    const row = await publishBriefSubmission(req.params.id, req.body, req.user);
    res.json(row);
  } catch (err) {
    if (err.message === "NOT_FOUND") return res.status(404).json({ error: "یافت نشد" });
    res.status(400).json({ error: err.message });
  }
});

router.patch("/:id/content", requireRole(...BRIEF_MANAGER_ROLES), async (req, res) => {
  try {
    const row = await editBriefSubmissionContent(req.params.id, req.body, req.user);
    res.json(row);
  } catch (err) {
    if (err.message === "NOT_FOUND") return res.status(404).json({ error: "یافت نشد" });
    res.status(400).json({ error: err.message });
  }
});

router.patch("/:id/bank-content", requireRole(...BRIEF_EDITOR_ROLES), async (req, res) => {
  try {
    const row = await editBriefBankContent(req.params.id, req.body, req.user);
    res.json(row);
  } catch (err) {
    if (err.message === "NOT_FOUND") return res.status(404).json({ error: "یافت نشد" });
    res.status(400).json({ error: err.message });
  }
});

router.post("/:id/promote-topic", requireRole(...BRIEF_MANAGER_ROLES), async (req, res) => {
  try {
    const result = await promoteBriefToTopic(req.params.id, req.body, req.user);
    res.json(result);
  } catch (err) {
    if (err.message === "NOT_FOUND") return res.status(404).json({ error: "یافت نشد" });
    res.status(400).json({ error: err.message });
  }
});

router.post("/:id/promote-mission", requireRole(...BRIEF_MANAGER_ROLES), async (req, res) => {
  try {
    const result = await promoteBriefToMission(req.params.id, req.body, req.user);
    res.json(result);
  } catch (err) {
    if (err.message === "NOT_FOUND") return res.status(404).json({ error: "یافت نشد" });
    if (err.message === "TOPIC_NOT_ASSIGNABLE") {
      return res.status(400).json({ error: "محورهای بایگانی، حذف‌شده، رد‌شده یا لغو‌شده قابل ارجاع نیستند" });
    }
    res.status(400).json({ error: err.message });
  }
});

router.post("/:id/suggest-analyst", requireRole(...BRIEF_MANAGER_ROLES), async (req, res) => {
  try {
    const row = await suggestAnalystRole(req.params.id, req.body, req.user);
    res.json(row);
  } catch (err) {
    if (err.message === "NOT_FOUND") return res.status(404).json({ error: "یافت نشد" });
    res.status(400).json({ error: err.message });
  }
});

export default router;
