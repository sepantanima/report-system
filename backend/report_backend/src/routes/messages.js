import { Router } from "express";
import auth from "../middleware/auth.js";
import requireRole, { hasAnyRole } from "../middleware/requireRole.js";
import {
  createDirectMessage,
  createAnnouncement,
  createEntityMessage,
  listInbox,
  getUnreadCount,
  listActiveBanners,
  markMessageRead,
  dismissBanner,
  getReadStatus,
  getSentMessageDetail,
  listEntityMessages,
  previewAudience,
  listSentByUser,
  searchUsersForMessaging,
  searchUnitsForMessaging,
  softDeleteInboxMessage,
  softDeleteSentMessage,
  permanentDeleteMessage,
  listAllMessagesAdmin,
  listBroadcastsAdmin,
  listDirectConversationPairs,
  getDirectConversationThread,
  getAdminMessageDetail,
  bulkSoftDeleteInbox,
  bulkSoftDeleteSent,
  bulkPermanentDelete,
  updateMessage,
} from "../services/messageService.js";

const router = Router();
const managers = requireRole("admin", "Field_admin", "news_chief");
const systemAdmin = requireRole("admin");

router.get("/inbox", auth, async (req, res) => {
  try {
    const includeDeleted = req.query.include_deleted === "true" && hasAnyRole(req.user, ["admin"]);
    res.json(await listInbox(req.user.id, { ...req.query, include_deleted: includeDeleted }));
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.get("/inbox/unread-count", auth, async (req, res) => {
  try {
    res.json({ count: await getUnreadCount(req.user.id) });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.get("/banners/active", auth, async (req, res) => {
  try {
    res.json(await listActiveBanners(req.user.id));
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.get("/sent", auth, async (req, res) => {
  try {
    const includeDeleted = req.query.include_deleted === "true" && hasAnyRole(req.user, ["admin"]);
    res.json(await listSentByUser(req.user.id, req.query.limit, { include_deleted: includeDeleted }));
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.get("/admin/all", auth, systemAdmin, async (req, res) => {
  try {
    res.json(await listAllMessagesAdmin({
      include_deleted: req.query.include_deleted !== "false",
      limit: req.query.limit,
      offset: req.query.offset,
      kind: req.query.kind || undefined,
      priority: req.query.priority || undefined,
    }));
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.get("/admin/broadcasts", auth, systemAdmin, async (req, res) => {
  try {
    res.json(await listBroadcastsAdmin({ limit: req.query.limit }));
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.get("/admin/conversations", auth, systemAdmin, async (req, res) => {
  try {
    res.json(await listDirectConversationPairs({ limit: req.query.limit }));
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.get("/admin/conversations/:userA/:userB", auth, systemAdmin, async (req, res) => {
  try {
    res.json(await getDirectConversationThread(req.params.userA, req.params.userB));
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

router.get("/admin/messages/:id", auth, systemAdmin, async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    res.json(await getAdminMessageDetail(id));
  } catch (e) {
    res.status(404).json({ error: e.message });
  }
});

router.get("/units/search", auth, async (req, res) => {
  try {
    res.json(await searchUnitsForMessaging(req.query.q, req.query.limit));
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

router.get("/users/search", auth, async (req, res) => {
  try {
    res.json(await searchUsersForMessaging(req.query.q, req.query.limit));
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

router.post("/direct", auth, async (req, res) => {
  try {
    const row = await createDirectMessage(req.body, req.user);
    res.status(201).json(row);
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

router.post("/announcements", auth, managers, async (req, res) => {
  try {
    const row = await createAnnouncement(req.body, req.user);
    res.status(201).json(row);
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

router.post("/entity", auth, managers, async (req, res) => {
  try {
    const row = await createEntityMessage(req.body, req.user);
    res.status(201).json(row);
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

router.post("/preview-audience", auth, managers, async (req, res) => {
  try {
    res.json(await previewAudience(req.body.targets || []));
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

router.get("/entity/:type/:id", auth, async (req, res) => {
  try {
    res.json(await listEntityMessages(req.params.type, req.params.id, req.user));
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.get("/sent/:id", auth, async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    res.json(await getSentMessageDetail(id, req.user));
  } catch (e) {
    res.status(e.message === "دسترسی غیرمجاز" ? 403 : 404).json({ error: e.message });
  }
});

router.get("/:id/read-status", auth, async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    res.json(await getReadStatus(id, req.user));
  } catch (e) {
    res.status(e.message === "دسترسی غیرمجاز" ? 403 : 400).json({ error: e.message });
  }
});

router.patch("/:id/read", auth, async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    res.json(await markMessageRead(id, req.user.id));
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

router.patch("/:id/dismiss-banner", auth, async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    res.json(await dismissBanner(id, req.user.id));
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

router.delete("/:id/inbox", auth, async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    res.json(await softDeleteInboxMessage(id, req.user.id));
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

router.delete("/:id/sent", auth, async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    res.json(await softDeleteSentMessage(id, req.user.id));
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

router.delete("/:id", auth, systemAdmin, async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    res.json(await permanentDeleteMessage(id, req.user));
  } catch (e) {
    const code = e.message.includes("مدیر کل") ? 403 : 400;
    res.status(code).json({ error: e.message });
  }
});

router.post("/bulk-delete", auth, async (req, res) => {
  try {
    const { ids, scope } = req.body || {};
    if (scope === "inbox") res.json(await bulkSoftDeleteInbox(ids, req.user.id));
    else if (scope === "sent") res.json(await bulkSoftDeleteSent(ids, req.user.id));
    else if (scope === "permanent") res.json(await bulkPermanentDelete(ids, req.user));
    else res.status(400).json({ error: "scope نامعتبر است" });
  } catch (e) {
    const code = e.message.includes("مدیر کل") ? 403 : 400;
    res.status(code).json({ error: e.message });
  }
});

router.patch("/:id", auth, async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    res.json(await updateMessage(id, req.body, req.user));
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

export default router;
