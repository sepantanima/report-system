import { Router } from "express";
import auth from "../middleware/auth.js";
import requireRole from "../middleware/requireRole.js";
import pool from "../db.js";
import {
  createAccountForUser,
  deleteAccount,
  getUnmappedSenders,
  linkSenderToUser,
  listAccountsForUser,
  markSenderAsNewsSource,
  updateAccount,
} from "../services/userMessengerAccountService.js";

const router = Router();
const adminRoles = requireRole("admin", "news_chief", "Field_admin");

router.get("/users/:userId/messenger-accounts", auth, adminRoles, async (req, res) => {
  try {
    const userId = parseInt(req.params.userId, 10);
    if (!Number.isFinite(userId)) {
      return res.status(400).json({ error: "شناسه کاربر نامعتبر است." });
    }
    res.json(await listAccountsForUser(userId));
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.post("/users/:userId/messenger-accounts", auth, adminRoles, async (req, res) => {
  try {
    const userId = parseInt(req.params.userId, 10);
    if (!Number.isFinite(userId)) {
      return res.status(400).json({ error: "شناسه کاربر نامعتبر است." });
    }
    const row = await createAccountForUser(userId, req.body, { verified: true });
    res.status(201).json(row);
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

router.put("/messenger-accounts/:id", auth, adminRoles, async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (!Number.isFinite(id)) {
      return res.status(400).json({ error: "شناسه اکانت نامعتبر است." });
    }
    res.json(await updateAccount(id, req.body, { admin: true }));
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

router.delete("/messenger-accounts/:id", auth, adminRoles, async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (!Number.isFinite(id)) {
      return res.status(400).json({ error: "شناسه اکانت نامعتبر است." });
    }
    res.json(await deleteAccount(id));
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

router.get("/messenger-accounts/unmapped-senders", auth, adminRoles, async (req, res) => {
  try {
    res.json(await getUnmappedSenders({ limit: req.query.limit }));
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.post("/messenger-accounts/link", auth, adminRoles, async (req, res) => {
  try {
    const { sender, platform, user_id: userId, external_username, display_name, external_id } = req.body ?? {};
    const account = await linkSenderToUser({
      sender,
      platform,
      userId: parseInt(userId, 10),
      externalUsername: external_username,
      displayName: display_name,
      externalId: external_id,
      verified: true,
    });
    res.status(201).json({ account });
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

router.post("/messenger-accounts/mark-as-source", auth, adminRoles, async (req, res) => {
  try {
    const { sender, platform, source_label: sourceLabel } = req.body ?? {};
    const marker = await markSenderAsNewsSource({
      sender,
      platform,
      sourceLabel,
      markedByUserId: req.user?.id ?? req.user?.userId ?? null,
    });
    res.status(201).json({ marker });
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

router.get("/messenger-accounts/users-options", auth, adminRoles, async (_req, res) => {
  try {
    const r = await pool.query(
      `SELECT id, name, username FROM tbl_users
       WHERE active IS DISTINCT FROM false
       ORDER BY name NULLS LAST, username
       LIMIT 500`,
    );
    res.json(r.rows);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

export default router;
