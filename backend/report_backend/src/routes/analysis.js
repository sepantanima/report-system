import express from "express";
import multer from "multer";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import pool from "../db.js";
import requireRole, { hasAnyRole, parseUserRoles } from "../middleware/requireRole.js";
import {
  generateTopicCode,
  logStatusChange,
  logActivity,
  getAssignmentAccess,
  computeWeightedScore,
  toGregorianDate,
  validateTopicPayload,
  assertDeadlineNotPast,
  validateVersionPayload,
  validateAssignmentPayload,
} from "../utils/analysisHelpers.js";
import { generateAnalysisPdf } from "../services/pdfExport.js";

const router = express.Router();
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const uploadDir = path.join(__dirname, "../../uploads/analysis");
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadDir),
  filename: (_req, file, cb) => {
    const unique = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    cb(null, `${unique}${path.extname(file.originalname)}`);
  },
});
const upload = multer({ storage, limits: { fileSize: 20 * 1024 * 1024 } });

const MANAGER_ROLES = ["admin", "analysis_manager", "Field_admin"];
const TOPIC_APPROVER_ROLES = ["admin", "analysis_manager", "topic_approver", "Field_admin"];
const REVIEWER_ROLES = ["admin", "analysis_manager", "Field_admin", "mentor"];
const ANALYST_ROLES = ["admin", "analysis_manager", "analyst"];

const CREATOR_EDIT_STATUSES = ["Draft", "Submitted", "UnderReview", "Rejected"];
const APPROVER_EDIT_STATUSES = ["Submitted", "UnderReview"];

async function withTransaction(fn) {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const result = await fn(client);
    await client.query("COMMIT");
    return result;
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
}

// ===================== TOPICS =====================

router.get("/topics", async (req, res) => {
  const { stateName, unitCode, creatorId, startDate, endDate, status, priority, search, includeInactive } = req.query;
  let queryText = `
    SELECT t.*,
           u.username as creator_username,
           u.name as creator_name,
           un."UnitShortName" as unit_name,
           un."StateName" as state_name,
           (SELECT COUNT(*)::int FROM tbl_analysis_assignments a WHERE a.topic_id = t.id) as assignment_count,
           (SELECT COUNT(*)::int FROM tbl_analysis_assignments a WHERE a.topic_id = t.id) as assignment_total,
           (SELECT COUNT(*)::int FROM tbl_analysis_assignments a WHERE a.topic_id = t.id AND a.status IN ('Assigned','InProgress','Submitted','UnderReview','NeedsRevision')) as assignment_active,
           (SELECT COUNT(*)::int FROM tbl_analysis_assignments a WHERE a.topic_id = t.id AND a.status = 'FinalApproved') as assignment_done,
           (SELECT COUNT(*)::int FROM tbl_analysis_assignments a WHERE a.topic_id = t.id AND a.status IN ('Cancelled','Archived')) as assignment_cancelled,
           (SELECT h.comment FROM tbl_analysis_status_history h
            WHERE h.entity_type = 'topic' AND h.entity_id = t.id AND h.new_status = 'UnderReview'
            ORDER BY h.created_at DESC LIMIT 1) as last_return_comment,
           (SELECT h.comment FROM tbl_analysis_status_history h
            WHERE h.entity_type = 'topic' AND h.entity_id = t.id AND h.new_status = 'Rejected'
            ORDER BY h.created_at DESC LIMIT 1) as last_reject_comment
    FROM tbl_analysis_topics t
    LEFT JOIN tbl_users u ON t.creator_id = u.id
    LEFT JOIN tbl_units un ON u.unit_cd = un."UnitCode"
    WHERE t.deleted_at IS NULL
  `;
  const queryParams = [];
  let paramCount = 1;

  const roles = parseUserRoles(req.user?.role);
  if (roles.includes("topic_proposer") && !hasAnyRole(req.user, MANAGER_ROLES) && !hasAnyRole(req.user, TOPIC_APPROVER_ROLES)) {
    queryText += ` AND t.creator_id = $${paramCount}`;
    queryParams.push(req.user.id);
    paramCount++;
  }

  if (stateName) {
    queryText += ` AND un."StateName" = $${paramCount}`;
    queryParams.push(stateName);
    paramCount++;
  }
  if (unitCode) {
    queryText += ` AND u.unit_cd = $${paramCount}`;
    queryParams.push(unitCode);
    paramCount++;
  }
  if (creatorId) {
    queryText += ` AND t.creator_id = $${paramCount}`;
    queryParams.push(creatorId);
    paramCount++;
  }
  if (includeInactive !== "true" && !status) {
    queryText += ` AND t.status NOT IN ('Closed','Rejected')`;
  }
  if (status) {
    queryText += ` AND t.status = $${paramCount}`;
    queryParams.push(status);
    paramCount++;
  }
  if (priority) {
    queryText += ` AND t.priority = $${paramCount}`;
    queryParams.push(priority);
    paramCount++;
  }
  const rangeStart = toGregorianDate(startDate);
  const rangeEnd = toGregorianDate(endDate);
  if (rangeStart && rangeEnd) {
    queryText += ` AND t.created_at::date BETWEEN $${paramCount} AND $${paramCount + 1}`;
    queryParams.push(rangeStart, rangeEnd);
    paramCount += 2;
  }
  if (search) {
    queryText += ` AND (t.title ILIKE $${paramCount} OR t.description ILIKE $${paramCount} OR t.keywords ILIKE $${paramCount} OR t.topic_code ILIKE $${paramCount})`;
    queryParams.push(`%${search}%`);
    paramCount++;
  }

  queryText += ` ORDER BY t.created_at DESC`;

  try {
    const result = await pool.query(queryText, queryParams);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get("/topics/summary/stats", async (req, res) => {
  const { startDate, endDate, creatorId } = req.query;
  let q = `
    SELECT
      COUNT(*)::int as total,
      COUNT(*) FILTER (WHERE status = 'Submitted')::int as submitted,
      COUNT(*) FILTER (WHERE status = 'UnderReview')::int as under_review,
      COUNT(*) FILTER (WHERE status = 'Approved')::int as approved,
      COUNT(*) FILTER (WHERE status = 'Assigned')::int as assigned,
      COUNT(*) FILTER (WHERE status = 'Rejected')::int as rejected,
      COUNT(*) FILTER (WHERE suggested_deadline IS NOT NULL AND suggested_deadline < CURRENT_DATE AND status NOT IN ('Closed','Rejected'))::int as overdue
    FROM tbl_analysis_topics t
    WHERE t.deleted_at IS NULL
  `;
  const params = [];
  let i = 1;
  const roles = parseUserRoles(req.user?.role);
  if (roles.includes("topic_proposer") && !hasAnyRole(req.user, MANAGER_ROLES) && !hasAnyRole(req.user, TOPIC_APPROVER_ROLES)) {
    q += ` AND t.creator_id = $${i}`;
    params.push(req.user.id);
    i++;
  } else if (creatorId) {
    q += ` AND t.creator_id = $${i}`;
    params.push(creatorId);
    i++;
  }
  const rangeStart = toGregorianDate(startDate);
  const rangeEnd = toGregorianDate(endDate);
  if (rangeStart && rangeEnd) {
    q += ` AND t.created_at::date BETWEEN $${i} AND $${i + 1}`;
    params.push(rangeStart, rangeEnd);
  }
  try {
    const result = await pool.query(q, params);
    res.json(result.rows[0] || {});
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get("/assignments/summary/stats", requireRole(...MANAGER_ROLES), async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT
        COUNT(*)::int as total,
        COUNT(*) FILTER (WHERE status IN ('Assigned','InProgress'))::int as active,
        COUNT(*) FILTER (WHERE status = 'Submitted' OR status = 'UnderReview')::int as pending_review,
        COUNT(*) FILTER (WHERE status = 'NeedsRevision')::int as needs_revision,
        COUNT(*) FILTER (WHERE status = 'FinalApproved')::int as completed,
        COUNT(*) FILTER (WHERE deadline < CURRENT_DATE AND status NOT IN ('FinalApproved','Archived'))::int as delayed
      FROM tbl_analysis_assignments
    `);
    res.json(result.rows[0] || {});
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get("/topics/:id", async (req, res) => {
  try {
    const topicRes = await pool.query(
      `SELECT t.*, u.name as creator_name FROM tbl_analysis_topics t
       LEFT JOIN tbl_users u ON t.creator_id = u.id
       WHERE t.id = $1 AND t.deleted_at IS NULL`,
      [req.params.id]
    );
    if (!topicRes.rows[0]) return res.status(404).json({ error: "موضوع یافت نشد" });

    const history = await pool.query(
      `SELECT h.*, u.name as changed_by_name FROM tbl_analysis_status_history h
       LEFT JOIN tbl_users u ON h.changed_by = u.id
       WHERE h.entity_type = 'topic' AND h.entity_id = $1 ORDER BY h.created_at DESC`,
      [req.params.id]
    );
    const policies = await pool.query(
      `SELECT p.* FROM tbl_analysis_policies p
       JOIN tbl_analysis_topic_policies tp ON tp.policy_id = p.id
       WHERE tp.topic_id = $1 AND p.is_active = true`,
      [req.params.id]
    );

    res.json({ ...topicRes.rows[0], history: history.rows, policies: policies.rows });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post("/topics", requireRole("admin", "analysis_manager", "Field_admin", "topic_proposer"), async (req, res) => {
  const { title, description, domain, keywords, priority, importance_reason, suggested_deadline } = req.body;
  if (!title?.trim()) return res.status(400).json({ error: "محور الزامی است" });
  const fieldErr = validateTopicPayload(req.body);
  if (fieldErr) return res.status(400).json({ error: fieldErr });
  const deadlineGregorian = toGregorianDate(suggested_deadline);
  if (suggested_deadline && !deadlineGregorian) {
    return res.status(400).json({ error: "فرمت تاریخ مهلت نامعتبر است" });
  }
  const deadlineErr = assertDeadlineNotPast(deadlineGregorian);
  if (deadlineErr) return res.status(400).json({ error: deadlineErr });

  try {
    const row = await withTransaction(async (client) => {
      const topicCode = await generateTopicCode(client);
      const result = await client.query(
        `INSERT INTO tbl_analysis_topics
         (topic_code, title, description, domain, keywords, priority, importance_reason, suggested_deadline, creator_id, status)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,'Submitted') RETURNING *`,
        [topicCode, title, description, domain, keywords, priority || "medium", importance_reason, deadlineGregorian, req.user.id]
      );
      await logStatusChange(client, {
        entityType: "topic", entityId: result.rows[0].id, oldStatus: null, newStatus: "Submitted",
        changedBy: req.user.id, comment: "ثبت موضوع جدید",
      });
      await logActivity(client, { userId: req.user.id, action: "create", entityType: "topic", entityId: result.rows[0].id, details: { title } });
      return result.rows[0];
    });
    res.status(201).json(row);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.patch("/topics/:id", requireRole("admin", "analysis_manager", "Field_admin", "topic_proposer"), async (req, res) => {
  const { title, description, domain, keywords, priority, importance_reason, suggested_deadline } = req.body;
  const fieldErr = validateTopicPayload(req.body);
  if (fieldErr) return res.status(400).json({ error: fieldErr });
  const deadlineGregorian = suggested_deadline !== undefined ? toGregorianDate(suggested_deadline) : undefined;
  if (suggested_deadline && !deadlineGregorian) {
    return res.status(400).json({ error: "فرمت تاریخ مهلت نامعتبر است" });
  }
  const deadlineErr = assertDeadlineNotPast(deadlineGregorian);
  if (deadlineErr) return res.status(400).json({ error: deadlineErr });
  try {
    const existing = await pool.query("SELECT * FROM tbl_analysis_topics WHERE id = $1 AND deleted_at IS NULL", [req.params.id]);
    if (!existing.rows[0]) return res.status(404).json({ error: "موضوع یافت نشد" });
    const t = existing.rows[0];
    const isCreator = t.creator_id === req.user.id;
    const canEditAsCreator = isCreator && CREATOR_EDIT_STATUSES.includes(t.status);
    const canEditAsApprover = hasAnyRole(req.user, TOPIC_APPROVER_ROLES) && APPROVER_EDIT_STATUSES.includes(t.status);
    const canEditAsManager = hasAnyRole(req.user, MANAGER_ROLES);
    if (!canEditAsCreator && !canEditAsApprover && !canEditAsManager) {
      return res.status(400).json({ error: "ویرایش در این وضعیت مجاز نیست" });
    }

    const result = await pool.query(
      `UPDATE tbl_analysis_topics SET title=COALESCE($1,title), description=COALESCE($2,description),
       domain=COALESCE($3,domain), keywords=COALESCE($4,keywords), priority=COALESCE($5,priority),
       importance_reason=COALESCE($6,importance_reason), suggested_deadline=COALESCE($7,suggested_deadline),
       updated_at=CURRENT_TIMESTAMP WHERE id=$8 RETURNING *`,
      [title, description, domain, keywords, priority, importance_reason, deadlineGregorian, req.params.id]
    );
    await logActivity(pool, { userId: req.user.id, action: "edit", entityType: "topic", entityId: req.params.id });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.patch("/topics/:id/status", requireRole(...MANAGER_ROLES), async (req, res) => {
  const { status, comment } = req.body;
  try {
    await withTransaction(async (client) => {
      const oldRes = await client.query("SELECT status FROM tbl_analysis_topics WHERE id = $1", [req.params.id]);
      if (!oldRes.rows[0]) throw new Error("NOT_FOUND");
      await client.query("UPDATE tbl_analysis_topics SET status=$1, updated_at=CURRENT_TIMESTAMP WHERE id=$2", [status, req.params.id]);
      await logStatusChange(client, {
        entityType: "topic", entityId: req.params.id, oldStatus: oldRes.rows[0].status,
        newStatus: status, changedBy: req.user.id, comment,
      });
      await logActivity(client, { userId: req.user.id, action: "status_change", entityType: "topic", entityId: req.params.id, details: { status } });
    });
    res.json({ message: "وضعیت به‌روزرسانی شد" });
  } catch (err) {
    if (err.message === "NOT_FOUND") return res.status(404).json({ error: "موضوع یافت نشد" });
    res.status(500).json({ error: err.message });
  }
});

router.post("/topics/:id/review", requireRole(...TOPIC_APPROVER_ROLES), async (req, res) => {
  const { decision, comment } = req.body;
  const statusMap = {
    approve: "Approved", reject: "Rejected", needs_info: "UnderReview", close: "Closed",
  };
  const newStatus = statusMap[decision];
  if (!newStatus) return res.status(400).json({ error: "تصمیم نامعتبر" });

  try {
    await withTransaction(async (client) => {
      const oldRes = await client.query("SELECT status FROM tbl_analysis_topics WHERE id = $1", [req.params.id]);
      await client.query("UPDATE tbl_analysis_topics SET status=$1, updated_at=CURRENT_TIMESTAMP WHERE id=$2", [newStatus, req.params.id]);
      await logStatusChange(client, {
        entityType: "topic", entityId: req.params.id, oldStatus: oldRes.rows[0]?.status,
        newStatus, changedBy: req.user.id, comment,
      });
      await logActivity(client, { userId: req.user.id, action: decision, entityType: "topic", entityId: req.params.id });
    });
    res.json({ message: "نتیجه بررسی ثبت شد", status: newStatus });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post("/topics/:id/resubmit", requireRole("admin", "analysis_manager", "Field_admin", "topic_proposer"), async (req, res) => {
  try {
    const existing = await pool.query("SELECT * FROM tbl_analysis_topics WHERE id=$1 AND deleted_at IS NULL", [req.params.id]);
    if (!existing.rows[0]) return res.status(404).json({ error: "موضوع یافت نشد" });
    const t = existing.rows[0];
    if (t.creator_id !== req.user.id && !hasAnyRole(req.user, MANAGER_ROLES)) {
      return res.status(403).json({ error: "دسترسی غیرمجاز" });
    }
    if (!["Rejected", "UnderReview"].includes(t.status)) {
      return res.status(400).json({ error: "فقط موضوعات رد شده یا برگشت‌خورده قابل ارسال مجدد هستند" });
    }
    await withTransaction(async (client) => {
      await client.query("UPDATE tbl_analysis_topics SET status='Submitted', updated_at=CURRENT_TIMESTAMP WHERE id=$1", [req.params.id]);
      await logStatusChange(client, {
        entityType: "topic", entityId: req.params.id, oldStatus: t.status, newStatus: "Submitted",
        changedBy: req.user.id, comment: req.body?.comment || "ارسال مجدد توسط پیشنهاددهنده",
      });
      await logActivity(client, { userId: req.user.id, action: "resubmit", entityType: "topic", entityId: req.params.id });
    });
    res.json({ message: "موضوع مجدداً ارسال شد", status: "Submitted" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post("/topics/:id/archive", async (req, res) => {
  try {
    const existing = await pool.query("SELECT * FROM tbl_analysis_topics WHERE id=$1 AND deleted_at IS NULL", [req.params.id]);
    if (!existing.rows[0]) return res.status(404).json({ error: "موضوع یافت نشد" });
    const t = existing.rows[0];
    const isCreator = t.creator_id === req.user.id;
    const canArchive = hasAnyRole(req.user, [...MANAGER_ROLES, ...TOPIC_APPROVER_ROLES])
      || (isCreator && ["Draft", "Rejected", "Submitted"].includes(t.status));
    if (!canArchive) return res.status(403).json({ error: "دسترسی غیرمجاز" });
    await withTransaction(async (client) => {
      await client.query("UPDATE tbl_analysis_topics SET deleted_at=CURRENT_TIMESTAMP, status='Closed', updated_at=CURRENT_TIMESTAMP WHERE id=$1", [req.params.id]);
      await logStatusChange(client, {
        entityType: "topic", entityId: req.params.id, oldStatus: t.status, newStatus: "Closed",
        changedBy: req.user.id, comment: req.body?.comment || "بایگانی",
      });
      await logActivity(client, { userId: req.user.id, action: "archive", entityType: "topic", entityId: req.params.id });
    });
    res.json({ message: "موضوع بایگانی شد" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete("/topics/:id", async (req, res) => {
  try {
    const existing = await pool.query("SELECT * FROM tbl_analysis_topics WHERE id=$1 AND deleted_at IS NULL", [req.params.id]);
    if (!existing.rows[0]) return res.status(404).json({ error: "موضوع یافت نشد" });
    const t = existing.rows[0];
    const isCreator = t.creator_id === req.user.id;
    const canArchive = hasAnyRole(req.user, [...MANAGER_ROLES, ...TOPIC_APPROVER_ROLES])
      || (isCreator && ["Draft", "Rejected", "Submitted"].includes(t.status));
    if (!canArchive) return res.status(403).json({ error: "دسترسی غیرمجاز" });
    await withTransaction(async (client) => {
      await client.query("UPDATE tbl_analysis_topics SET deleted_at=CURRENT_TIMESTAMP, status='Closed', updated_at=CURRENT_TIMESTAMP WHERE id=$1", [req.params.id]);
      await logStatusChange(client, {
        entityType: "topic", entityId: req.params.id, oldStatus: t.status, newStatus: "Closed",
        changedBy: req.user.id, comment: "بایگانی",
      });
      await logActivity(client, { userId: req.user.id, action: "archive", entityType: "topic", entityId: req.params.id });
    });
    res.json({ message: "موضوع بایگانی شد" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get("/topics/:id/assignments", requireRole(...MANAGER_ROLES), async (req, res) => {
  const { includeInactive } = req.query;
  try {
    let q = `
      SELECT a.*, u_analyst.name as analyst_realname, u_mentor.name as mentor_name,
             an.id as analysis_id, an.status as analysis_status
      FROM tbl_analysis_assignments a
      LEFT JOIN tbl_users u_analyst ON a.analyst_id = u_analyst.id
      LEFT JOIN tbl_users u_mentor ON a.mentor_id = u_mentor.id
      LEFT JOIN tbl_analysis_analyses an ON an.assignment_id = a.id
      WHERE a.topic_id = $1`;
    if (includeInactive !== "true") {
      q += ` AND a.status NOT IN ('Cancelled','Archived')`;
    }
    q += ` ORDER BY a.created_at DESC`;
    const result = await pool.query(q, [req.params.id]);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ===================== POLICIES =====================

router.get("/policies", async (req, res) => {
  try {
    const result = await pool.query("SELECT * FROM tbl_analysis_policies ORDER BY created_at DESC");
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post("/policies", requireRole(...MANAGER_ROLES), async (req, res) => {
  const { title, content, scope } = req.body;
  try {
    const result = await pool.query(
      `INSERT INTO tbl_analysis_policies (title, content, scope, created_by) VALUES ($1,$2,$3,$4) RETURNING *`,
      [title, content, scope || "general", req.user.id]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.patch("/policies/:id/active", requireRole(...MANAGER_ROLES), async (req, res) => {
  const { is_active } = req.body;
  try {
    const result = await pool.query(
      "UPDATE tbl_analysis_policies SET is_active=$1, updated_at=CURRENT_TIMESTAMP WHERE id=$2 RETURNING *",
      [is_active, req.params.id]
    );
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ===================== ASSIGNMENTS =====================

router.get("/assignments", async (req, res) => {
  const { analystId, managerId, mentorId, stateName, unitCode, status, includeInactive, forReview } = req.query;
  let queryText = `
    SELECT a.*, t.title as topic_title, t.topic_code, t.description as topic_desc,
           u_mentor.name as mentor_name, u_analyst.name as analyst_realname,
           u_manager.name as manager_name,
           un."UnitShortName" as analyst_unit_name, un."StateName" as analyst_state_name,
           an.id as analysis_id, an.status as analysis_status
    FROM tbl_analysis_assignments a
    JOIN tbl_analysis_topics t ON a.topic_id = t.id AND t.deleted_at IS NULL
    LEFT JOIN tbl_users u_mentor ON a.mentor_id = u_mentor.id
    LEFT JOIN tbl_users u_analyst ON a.analyst_id = u_analyst.id
    LEFT JOIN tbl_users u_manager ON a.manager_id = u_manager.id
    LEFT JOIN tbl_units un ON u_analyst.unit_cd = un."UnitCode"
    LEFT JOIN tbl_analysis_analyses an ON an.assignment_id = a.id
    WHERE 1=1
  `;
  const queryParams = [];
  let paramCount = 1;

  const roles = parseUserRoles(req.user?.role);
  if (roles.includes("analyst") && !hasAnyRole(req.user, MANAGER_ROLES)) {
    queryText += ` AND a.analyst_id = $${paramCount}`;
    queryParams.push(req.user.id);
    paramCount++;
  } else if (roles.includes("mentor") && !hasAnyRole(req.user, MANAGER_ROLES)) {
    queryText += ` AND a.mentor_id = $${paramCount}`;
    queryParams.push(req.user.id);
    paramCount++;
  }

  if (analystId) { queryText += ` AND a.analyst_id = $${paramCount}`; queryParams.push(analystId); paramCount++; }
  if (managerId) { queryText += ` AND a.manager_id = $${paramCount}`; queryParams.push(managerId); paramCount++; }
  if (mentorId) { queryText += ` AND a.mentor_id = $${paramCount}`; queryParams.push(mentorId); paramCount++; }
  if (stateName) { queryText += ` AND un."StateName" = $${paramCount}`; queryParams.push(stateName); paramCount++; }
  if (unitCode) { queryText += ` AND u_analyst.unit_cd = $${paramCount}`; queryParams.push(unitCode); paramCount++; }
  if (status) { queryText += ` AND a.status = $${paramCount}`; queryParams.push(status); paramCount++; }
  if (includeInactive !== "true" && !status) {
    queryText += ` AND a.status NOT IN ('Cancelled','Archived')`;
  }
  if (forReview === "true") {
    queryText += ` AND a.status IN ('Submitted','UnderReview','NeedsRevision')`;
    if (roles.includes("mentor") && !hasAnyRole(req.user, MANAGER_ROLES)) {
      queryText += ` AND a.mentor_id = $${paramCount}`;
      queryParams.push(req.user.id);
      paramCount++;
    }
  }

  queryText += ` ORDER BY a.created_at DESC`;

  try {
    const result = await pool.query(queryText, queryParams);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get("/assignments/:id", async (req, res) => {
  try {
    const canAccess = await getAssignmentAccess(pool, req.params.id, req.user.id, req.user.role);
    if (!canAccess && !hasAnyRole(req.user, MANAGER_ROLES)) {
      return res.status(403).json({ error: "دسترسی غیرمجاز" });
    }
    const result = await pool.query(
      `SELECT a.*, t.title as topic_title, t.topic_code, t.description as topic_desc, t.domain,
              t.suggested_deadline as topic_suggested_deadline,
              u_analyst.name as analyst_name, u_analyst.name as analyst_realname,
              u_mentor.name as mentor_name, u_manager.name as manager_name,
              an.id as analysis_id, an.status as analysis_status
       FROM tbl_analysis_assignments a
       JOIN tbl_analysis_topics t ON a.topic_id = t.id
       LEFT JOIN tbl_users u_analyst ON a.analyst_id = u_analyst.id
       LEFT JOIN tbl_users u_mentor ON a.mentor_id = u_mentor.id
       LEFT JOIN tbl_users u_manager ON a.manager_id = u_manager.id
       LEFT JOIN tbl_analysis_analyses an ON an.assignment_id = a.id
       WHERE a.id = $1`,
      [req.params.id]
    );
    if (!result.rows[0]) return res.status(404).json({ error: "مأموریت یافت نشد" });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post("/assignments", requireRole(...MANAGER_ROLES), async (req, res) => {
  const { topic_id, analyst_id, mentor_id, deadline, priority, guidelines } = req.body;
  if (!topic_id || !analyst_id) return res.status(400).json({ error: "موضوع و تحلیل‌گر الزامی است" });
  const fieldErr = validateAssignmentPayload(req.body);
  if (fieldErr) return res.status(400).json({ error: fieldErr });
  const deadlineGregorian = toGregorianDate(deadline);
  if (deadline && !deadlineGregorian) {
    return res.status(400).json({ error: "فرمت تاریخ مهلت نامعتبر است" });
  }

  try {
    const row = await withTransaction(async (client) => {
      const topicRes = await client.query("SELECT status FROM tbl_analysis_topics WHERE id=$1 AND deleted_at IS NULL", [topic_id]);
      if (!topicRes.rows[0]) throw new Error("TOPIC_NOT_FOUND");
      if (!["Approved", "Assigned"].includes(topicRes.rows[0].status)) {
        throw new Error("TOPIC_NOT_APPROVED");
      }

      const assignResult = await client.query(
        `INSERT INTO tbl_analysis_assignments (topic_id, analyst_id, mentor_id, manager_id, deadline, priority, guidelines, status)
         VALUES ($1,$2,$3,$4,$5,$6,$7,'Assigned') RETURNING *`,
        [topic_id, analyst_id, mentor_id || null, req.user.id, deadlineGregorian, priority || "medium", guidelines]
      );
      await client.query("UPDATE tbl_analysis_topics SET status='Assigned', updated_at=CURRENT_TIMESTAMP WHERE id=$1", [topic_id]);
      await logStatusChange(client, {
        entityType: "assignment", entityId: assignResult.rows[0].id, oldStatus: null,
        newStatus: "Assigned", changedBy: req.user.id,
      });
      await logActivity(client, { userId: req.user.id, action: "create", entityType: "assignment", entityId: assignResult.rows[0].id });
      return assignResult.rows[0];
    });
    res.status(201).json(row);
  } catch (err) {
    if (err.message === "TOPIC_NOT_FOUND") return res.status(404).json({ error: "موضوع یافت نشد" });
    if (err.message === "TOPIC_NOT_APPROVED") return res.status(400).json({ error: "فقط محورهای تصویب‌شده قابل ارجاع هستند" });
    res.status(500).json({ error: err.message });
  }
});

router.patch("/assignments/:id", requireRole(...MANAGER_ROLES), async (req, res) => {
  const { deadline, priority, guidelines, mentor_id } = req.body;
  const fieldErr = validateAssignmentPayload(req.body);
  if (fieldErr) return res.status(400).json({ error: fieldErr });
  const deadlineGregorian = deadline !== undefined ? toGregorianDate(deadline) : undefined;
  if (deadline && !deadlineGregorian) {
    return res.status(400).json({ error: "فرمت تاریخ مهلت نامعتبر است" });
  }
  try {
    const existing = await pool.query("SELECT * FROM tbl_analysis_assignments WHERE id=$1", [req.params.id]);
    if (!existing.rows[0]) return res.status(404).json({ error: "مأموریت یافت نشد" });
    const result = await pool.query(
      `UPDATE tbl_analysis_assignments SET
         deadline = COALESCE($1, deadline),
         priority = COALESCE($2, priority),
         guidelines = COALESCE($3, guidelines),
         mentor_id = COALESCE($4, mentor_id),
         updated_at = CURRENT_TIMESTAMP
       WHERE id = $5 RETURNING *`,
      [deadlineGregorian, priority, guidelines, mentor_id, req.params.id]
    );
    await logActivity(pool, { userId: req.user.id, action: "update", entityType: "assignment", entityId: req.params.id });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post("/assignments/:id/cancel", requireRole(...MANAGER_ROLES), async (req, res) => {
  try {
    const existing = await pool.query("SELECT * FROM tbl_analysis_assignments WHERE id=$1", [req.params.id]);
    if (!existing.rows[0]) return res.status(404).json({ error: "مأموریت یافت نشد" });
    if (existing.rows[0].status !== "Assigned") {
      return res.status(400).json({ error: "فقط مأموریت‌های ارجاع‌شده (قبل از شروع تحلیل) قابل لغو هستند" });
    }
    await withTransaction(async (client) => {
      await client.query("UPDATE tbl_analysis_assignments SET status='Cancelled', updated_at=CURRENT_TIMESTAMP WHERE id=$1", [req.params.id]);
      await logStatusChange(client, {
        entityType: "assignment", entityId: req.params.id, oldStatus: "Assigned", newStatus: "Cancelled",
        changedBy: req.user.id, comment: req.body?.comment || "لغو ارجاع",
      });
      await logActivity(client, { userId: req.user.id, action: "cancel", entityType: "assignment", entityId: req.params.id });
      const activeCount = await client.query(
        "SELECT COUNT(*)::int as c FROM tbl_analysis_assignments WHERE topic_id=$1 AND status NOT IN ('Cancelled','Archived')",
        [existing.rows[0].topic_id]
      );
      if (activeCount.rows[0].c === 0) {
        await client.query("UPDATE tbl_analysis_topics SET status='Approved', updated_at=CURRENT_TIMESTAMP WHERE id=$1", [existing.rows[0].topic_id]);
      }
    });
    res.json({ message: "ارجاع لغو شد" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.patch("/assignments/:id/status", requireRole(...MANAGER_ROLES), async (req, res) => {
  const { status, comment } = req.body;
  try {
    await withTransaction(async (client) => {
      const oldRes = await client.query("SELECT status FROM tbl_analysis_assignments WHERE id=$1", [req.params.id]);
      await client.query("UPDATE tbl_analysis_assignments SET status=$1, updated_at=CURRENT_TIMESTAMP WHERE id=$2", [status, req.params.id]);
      await logStatusChange(client, {
        entityType: "assignment", entityId: req.params.id, oldStatus: oldRes.rows[0]?.status,
        newStatus: status, changedBy: req.user.id, comment,
      });
    });
    res.json({ message: "وضعیت مأموریت به‌روزرسانی شد" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ===================== ANALYSES & VERSIONS =====================

router.post("/assignments/:id/analysis", requireRole(...ANALYST_ROLES), async (req, res) => {
  try {
    const assignRes = await pool.query("SELECT * FROM tbl_analysis_assignments WHERE id=$1", [req.params.id]);
    if (!assignRes.rows[0]) return res.status(404).json({ error: "مأموریت یافت نشد" });
    const a = assignRes.rows[0];
    if (a.analyst_id !== req.user.id && !hasAnyRole(req.user, MANAGER_ROLES)) {
      return res.status(403).json({ error: "دسترسی غیرمجاز" });
    }

    const existing = await pool.query("SELECT id FROM tbl_analysis_analyses WHERE assignment_id=$1", [req.params.id]);
    if (existing.rows[0]) return res.json(existing.rows[0]);

    const row = await withTransaction(async (client) => {
      const analysisRes = await client.query(
        `INSERT INTO tbl_analysis_analyses (assignment_id, analyst_id, status) VALUES ($1,$2,'Draft') RETURNING *`,
        [req.params.id, a.analyst_id]
      );
      const analysis = analysisRes.rows[0];
      await client.query(
        `INSERT INTO tbl_analysis_versions (analysis_id, version_number, title, content, status, created_by)
         VALUES ($1, 1, '', '', 'Draft', $2)`,
        [analysis.id, req.user.id]
      );
      await client.query("UPDATE tbl_analysis_assignments SET status='InProgress', updated_at=CURRENT_TIMESTAMP WHERE id=$1", [req.params.id]);
      await logActivity(client, { userId: req.user.id, action: "create", entityType: "analysis", entityId: analysis.id });
      return analysis;
    });
    res.status(201).json(row);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get("/analyses/:id", async (req, res) => {
  try {
    const analysisRes = await pool.query(
      `SELECT an.*, a.topic_id, a.deadline, a.guidelines, a.status as assignment_status,
              u.name as analyst_name, t.title as topic_title, t.topic_code
       FROM tbl_analysis_analyses an
       JOIN tbl_analysis_assignments a ON an.assignment_id = a.id
       JOIN tbl_analysis_topics t ON a.topic_id = t.id
       LEFT JOIN tbl_users u ON an.analyst_id = u.id
       WHERE an.id = $1`,
      [req.params.id]
    );
    if (!analysisRes.rows[0]) return res.status(404).json({ error: "تحلیل یافت نشد" });

    const versions = await pool.query(
      `SELECT * FROM tbl_analysis_versions WHERE analysis_id=$1 ORDER BY version_number DESC`,
      [req.params.id]
    );
    res.json({ ...analysisRes.rows[0], versions: versions.rows });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get("/assignments/:id/analysis", async (req, res) => {
  try {
    const canAccess = await getAssignmentAccess(pool, req.params.id, req.user.id, req.user.role);
    if (!canAccess && !hasAnyRole(req.user, MANAGER_ROLES)) {
      return res.status(403).json({ error: "دسترسی غیرمجاز" });
    }
    const result = await pool.query(
      `SELECT an.* FROM tbl_analysis_analyses an WHERE an.assignment_id=$1`,
      [req.params.id]
    );
    if (!result.rows[0]) {
      return res.json({ id: null, exists: false, versions: [] });
    }
    const full = await pool.query(
      `SELECT * FROM tbl_analysis_versions WHERE analysis_id=$1 ORDER BY version_number DESC`,
      [result.rows[0].id]
    );
    res.json({ ...result.rows[0], exists: true, versions: full.rows });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get("/versions/:id", async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT v.*, an.analyst_id, an.assignment_id, t.title as topic_title
       FROM tbl_analysis_versions v
       JOIN tbl_analysis_analyses an ON v.analysis_id = an.id
       JOIN tbl_analysis_assignments a ON an.assignment_id = a.id
       JOIN tbl_analysis_topics t ON a.topic_id = t.id
       WHERE v.id = $1`,
      [req.params.id]
    );
    if (!result.rows[0]) return res.status(404).json({ error: "نسخه یافت نشد" });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put("/versions/:id", requireRole(...ANALYST_ROLES), async (req, res) => {
  const { title, content, change_note } = req.body;
  const fieldErr = validateVersionPayload(req.body);
  if (fieldErr) return res.status(400).json({ error: fieldErr });
  try {
    const versionRes = await pool.query(
      `SELECT v.*, an.analyst_id FROM tbl_analysis_versions v
       JOIN tbl_analysis_analyses an ON v.analysis_id = an.id WHERE v.id=$1`,
      [req.params.id]
    );
    const v = versionRes.rows[0];
    if (!v) return res.status(404).json({ error: "نسخه یافت نشد" });
    if (v.is_locked) return res.status(400).json({ error: "نسخه قفل شده و قابل ویرایش نیست" });
    if (v.analyst_id !== req.user.id) {
      return res.status(403).json({ error: "فقط تحلیل‌گر می‌تواند متن تحلیل را ویرایش کند" });
    }
    if (!["Draft", "ReturnedForRevision"].includes(v.status)) {
      return res.status(400).json({ error: "فقط پیش‌نویس یا نسخه برگشت‌خورده قابل ویرایش است" });
    }

    const result = await pool.query(
      `UPDATE tbl_analysis_versions SET title=COALESCE($1,title), content=COALESCE($2,content),
       change_note=COALESCE($3,change_note), status='Draft', updated_at=CURRENT_TIMESTAMP
       WHERE id=$4 RETURNING *`,
      [title, content, change_note, req.params.id]
    );
    await logActivity(pool, { userId: req.user.id, action: "edit", entityType: "version", entityId: req.params.id });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post("/versions/:id/submit", requireRole(...ANALYST_ROLES), async (req, res) => {
  const { title, content, change_note } = req.body;
  const fieldErr = validateVersionPayload({ title, content, change_note: change_note });
  if (fieldErr) return res.status(400).json({ error: fieldErr });
  try {
    const row = await withTransaction(async (client) => {
      const versionRes = await client.query(
        `SELECT v.*, an.analyst_id, an.id as analysis_id, an.assignment_id
         FROM tbl_analysis_versions v JOIN tbl_analysis_analyses an ON v.analysis_id = an.id WHERE v.id=$1`,
        [req.params.id]
      );
      const v = versionRes.rows[0];
      if (!v) throw new Error("NOT_FOUND");
      if (v.analyst_id !== req.user.id && !hasAnyRole(req.user, MANAGER_ROLES)) throw new Error("FORBIDDEN");
      if (v.is_locked && !["ReturnedForRevision", "Draft"].includes(v.status)) throw new Error("LOCKED");

      let targetVersion;
      if (v.status === "Draft" || v.status === "ReturnedForRevision") {
        const upd = await client.query(
          `UPDATE tbl_analysis_versions SET title=$1, content=$2, change_note=$3, status='Submitted',
           is_locked=true, submitted_at=CURRENT_TIMESTAMP, updated_at=CURRENT_TIMESTAMP WHERE id=$4 RETURNING *`,
          [title || v.title, content ?? v.content, change_note, req.params.id]
        );
        targetVersion = upd.rows[0];
      } else {
        const maxRes = await client.query(
          "SELECT COALESCE(MAX(version_number),0)+1 as next_num FROM tbl_analysis_versions WHERE analysis_id=$1",
          [v.analysis_id]
        );
        const ins = await client.query(
          `INSERT INTO tbl_analysis_versions (analysis_id, version_number, title, content, change_note, status, is_locked, submitted_at, created_by)
           VALUES ($1,$2,$3,$4,$5,'Submitted',true,CURRENT_TIMESTAMP,$6) RETURNING *`,
          [v.analysis_id, maxRes.rows[0].next_num, title || v.title, content ?? v.content, change_note, req.user.id]
        );
        targetVersion = ins.rows[0];
      }

      await client.query("UPDATE tbl_analysis_assignments SET status='Submitted', updated_at=CURRENT_TIMESTAMP WHERE id=$1", [v.assignment_id]);
      await logStatusChange(client, {
        entityType: "version", entityId: targetVersion.id, oldStatus: v.status,
        newStatus: "Submitted", changedBy: req.user.id,
      });
      await logActivity(client, { userId: req.user.id, action: "submit", entityType: "version", entityId: targetVersion.id });
      return targetVersion;
    });
    res.json(row);
  } catch (err) {
    if (err.message === "NOT_FOUND") return res.status(404).json({ error: "نسخه یافت نشد" });
    if (err.message === "FORBIDDEN") return res.status(403).json({ error: "دسترسی غیرمجاز" });
    if (err.message === "LOCKED") return res.status(400).json({ error: "نسخه قفل شده" });
    res.status(500).json({ error: err.message });
  }
});

router.post("/versions/:id/finalize", requireRole(...MANAGER_ROLES), async (req, res) => {
  try {
    await withTransaction(async (client) => {
      const vRes = await client.query(
        `SELECT v.*, an.id as analysis_id FROM tbl_analysis_versions v
         JOIN tbl_analysis_analyses an ON v.analysis_id = an.id WHERE v.id=$1`,
        [req.params.id]
      );
      if (!vRes.rows[0]) throw new Error("NOT_FOUND");
      await client.query("UPDATE tbl_analysis_versions SET status='Final', is_locked=true WHERE id=$1", [req.params.id]);
      await client.query("UPDATE tbl_analysis_analyses SET final_version_id=$1, status='FinalApproved' WHERE id=$2", [req.params.id, vRes.rows[0].analysis_id]);
    });
    res.json({ message: "نسخه نهایی تعیین شد" });
  } catch (err) {
    if (err.message === "NOT_FOUND") return res.status(404).json({ error: "نسخه یافت نشد" });
    res.status(500).json({ error: err.message });
  }
});

// ===================== FEEDBACKS =====================

router.get("/versions/:id/feedbacks", async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT f.*, u.name as user_name FROM tbl_analysis_feedbacks f
       LEFT JOIN tbl_users u ON f.user_id = u.id
       WHERE f.version_id = $1 ORDER BY f.created_at ASC`,
      [req.params.id]
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post("/versions/:id/feedbacks", requireRole(...REVIEWER_ROLES), async (req, res) => {
  const { content, feedback_type, request_revision } = req.body;
  if (!content?.trim()) return res.status(400).json({ error: "متن بازخورد الزامی است" });

  try {
    const row = await withTransaction(async (client) => {
      const fb = await client.query(
        `INSERT INTO tbl_analysis_feedbacks (version_id, user_id, feedback_type, content)
         VALUES ($1,$2,$3,$4) RETURNING *`,
        [req.params.id, req.user.id, feedback_type || "supplementary", content]
      );
      if (request_revision) {
        await client.query("UPDATE tbl_analysis_versions SET status='ReturnedForRevision', is_locked=false WHERE id=$1", [req.params.id]);
        const vRes = await client.query(
          `SELECT an.assignment_id FROM tbl_analysis_versions v JOIN tbl_analysis_analyses an ON v.analysis_id=an.id WHERE v.id=$1`,
          [req.params.id]
        );
        if (vRes.rows[0]) {
          await client.query("UPDATE tbl_analysis_assignments SET status='NeedsRevision' WHERE id=$1", [vRes.rows[0].assignment_id]);
        }
      }
      await logActivity(client, { userId: req.user.id, action: "feedback", entityType: "version", entityId: req.params.id });
      return fb.rows[0];
    });
    res.status(201).json(row);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post("/feedbacks", requireRole(...REVIEWER_ROLES), async (req, res) => {
  const { version_id, content, feedback_type, request_revision } = req.body;
  if (!version_id) return res.status(400).json({ error: "شناسه نسخه الزامی است" });
  if (!content?.trim()) return res.status(400).json({ error: "متن بازخورد الزامی است" });

  try {
    const row = await withTransaction(async (client) => {
      const fb = await client.query(
        `INSERT INTO tbl_analysis_feedbacks (version_id, user_id, feedback_type, content)
         VALUES ($1,$2,$3,$4) RETURNING *`,
        [version_id, req.user.id, feedback_type || "supplementary", content]
      );
      if (request_revision) {
        await client.query("UPDATE tbl_analysis_versions SET status='ReturnedForRevision', is_locked=false WHERE id=$1", [version_id]);
        const vRes = await client.query(
          `SELECT an.assignment_id FROM tbl_analysis_versions v JOIN tbl_analysis_analyses an ON v.analysis_id=an.id WHERE v.id=$1`,
          [version_id]
        );
        if (vRes.rows[0]) {
          await client.query("UPDATE tbl_analysis_assignments SET status='NeedsRevision' WHERE id=$1", [vRes.rows[0].assignment_id]);
        }
      }
      await logActivity(client, { userId: req.user.id, action: "feedback", entityType: "version", entityId: version_id });
      return fb.rows[0];
    });
    res.status(201).json(row);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post("/feedbacks/:id/reply", requireRole(...ANALYST_ROLES), async (req, res) => {
  const { content } = req.body;
  try {
    const parent = await pool.query("SELECT * FROM tbl_analysis_feedbacks WHERE id=$1", [req.params.id]);
    if (!parent.rows[0]) return res.status(404).json({ error: "بازخورد یافت نشد" });

    const result = await pool.query(
      `INSERT INTO tbl_analysis_feedbacks (version_id, user_id, parent_id, feedback_type, content)
       VALUES ($1,$2,$3,'supplementary',$4) RETURNING *`,
      [parent.rows[0].version_id, req.user.id, req.params.id, content]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.patch("/versions/:id/request-revision", requireRole(...REVIEWER_ROLES), async (req, res) => {
  const { content, feedback_type } = req.body;
  req.body = { content: content || "درخواست اصلاح", feedback_type: feedback_type || "corrective", request_revision: true };
  req.params.id = req.params.id;
  try {
    const version_id = req.params.id;
    const row = await withTransaction(async (client) => {
      const fb = await client.query(
        `INSERT INTO tbl_analysis_feedbacks (version_id, user_id, feedback_type, content)
         VALUES ($1,$2,$3,$4) RETURNING *`,
        [version_id, req.user.id, req.body.feedback_type, req.body.content]
      );
      await client.query("UPDATE tbl_analysis_versions SET status='ReturnedForRevision', is_locked=false WHERE id=$1", [version_id]);
      const vRes = await client.query(
        `SELECT an.assignment_id FROM tbl_analysis_versions v JOIN tbl_analysis_analyses an ON v.analysis_id=an.id WHERE v.id=$1`,
        [version_id]
      );
      if (vRes.rows[0]) {
        await client.query("UPDATE tbl_analysis_assignments SET status='NeedsRevision' WHERE id=$1", [vRes.rows[0].assignment_id]);
      }
      return fb.rows[0];
    });
    res.json(row);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ===================== CRITERIA & SCORES =====================

router.get("/criteria", async (req, res) => {
  try {
    const result = await pool.query("SELECT * FROM tbl_analysis_criteria WHERE is_active=true ORDER BY sort_order");
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post("/criteria", requireRole("admin", "analysis_manager"), async (req, res) => {
  const { name, name_fa, weight, max_score, sort_order } = req.body;
  try {
    const result = await pool.query(
      `INSERT INTO tbl_analysis_criteria (name, name_fa, weight, max_score, sort_order) VALUES ($1,$2,$3,$4,$5) RETURNING *`,
      [name, name_fa, weight || 1, max_score || 5, sort_order || 0]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get("/versions/:id/scores", async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT s.*, c.name, c.name_fa, c.weight, c.max_score, u.name as evaluator_name
       FROM tbl_analysis_scores s
       JOIN tbl_analysis_criteria c ON s.criteria_id = c.id
       LEFT JOIN tbl_users u ON s.evaluator_id = u.id
       WHERE s.version_id = $1`,
      [req.params.id]
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post("/versions/:id/scores", requireRole(...REVIEWER_ROLES, ...MANAGER_ROLES), async (req, res) => {
  const { scores, evaluator_comment } = req.body;
  if (!Array.isArray(scores) || !scores.length) return res.status(400).json({ error: "امتیازها الزامی است" });

  try {
    const versionRes = await pool.query(
      `SELECT v.status, an.status as analysis_status FROM tbl_analysis_versions v
       JOIN tbl_analysis_analyses an ON v.analysis_id = an.id WHERE v.id=$1`,
      [req.params.id]
    );
    if (!versionRes.rows[0]) return res.status(404).json({ error: "نسخه یافت نشد" });
    if (versionRes.rows[0].analysis_status !== "FinalApproved") {
      return res.status(400).json({ error: "امتیازدهی فقط پس از تایید نهایی مجاز است" });
    }

    const ratedScores = scores.filter((item) => Number(item.score) > 0);
    if (!ratedScores.length) {
      return res.status(400).json({ error: "حداقل یک معیار باید امتیاز ۱ تا ۵ دریافت کند" });
    }

    for (const item of scores) {
      const s = Number(item.score);
      if (Number.isNaN(s) || s < 0 || s > 5 || (s > 0 && s < 1)) {
        return res.status(400).json({ error: "امتیاز هر معیار باید ۰ (بدون امتیاز) یا بین ۱ تا ۵ باشد" });
      }
    }

    const criteriaRows = [];
    for (const item of scores) {
      const cRes = await pool.query("SELECT weight FROM tbl_analysis_criteria WHERE id=$1", [item.criteria_id]);
      criteriaRows.push({ ...item, weight: cRes.rows[0]?.weight || 1 });
    }
    const totalScore = computeWeightedScore(criteriaRows.map((s) => ({ score: s.score, weight: s.weight })));

    await withTransaction(async (client) => {
      for (const item of scores) {
        await client.query(
          `INSERT INTO tbl_analysis_scores (version_id, criteria_id, evaluator_id, score, evaluator_comment, total_score)
           VALUES ($1,$2,$3,$4,$5,$6)
           ON CONFLICT (version_id, criteria_id, evaluator_id)
           DO UPDATE SET score=$4, evaluator_comment=$5, total_score=$6`,
          [req.params.id, item.criteria_id, req.user.id, item.score, evaluator_comment, totalScore]
        );
      }
      await logActivity(client, { userId: req.user.id, action: "score", entityType: "version", entityId: req.params.id, details: { totalScore } });
    });
    res.json({ message: "امتیازها ثبت شد", total_score: totalScore });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ===================== FINAL APPROVAL & PDF =====================

router.post("/analyses/:id/approve-final", requireRole(...MANAGER_ROLES), async (req, res) => {
  const { version_id, manager_note } = req.body;
  try {
    await withTransaction(async (client) => {
      await client.query("UPDATE tbl_analysis_versions SET status='Final', is_locked=true WHERE id=$1", [version_id]);
      await client.query(
        "UPDATE tbl_analysis_analyses SET final_version_id=$1, status='FinalApproved', updated_at=CURRENT_TIMESTAMP WHERE id=$2",
        [version_id, req.params.id]
      );
      const assignRes = await client.query(
        "SELECT assignment_id FROM tbl_analysis_analyses WHERE id=$1", [req.params.id]
      );
      if (assignRes.rows[0]) {
        await client.query("UPDATE tbl_analysis_assignments SET status='FinalApproved' WHERE id=$1", [assignRes.rows[0].assignment_id]);
      }
      await logActivity(client, { userId: req.user.id, action: "approve_final", entityType: "analysis", entityId: req.params.id, details: { version_id, manager_note } });
    });
    res.json({ message: "تحلیل تایید نهایی شد" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get("/analyses/:id/export/pdf", requireRole(...MANAGER_ROLES, "analyst", "mentor"), async (req, res) => {
  try {
    const analysisRes = await pool.query(
      `SELECT an.*, u.name as analyst_name FROM tbl_analysis_analyses an
       LEFT JOIN tbl_users u ON an.analyst_id = u.id WHERE an.id=$1`,
      [req.params.id]
    );
    const analysis = analysisRes.rows[0];
    if (!analysis?.final_version_id) return res.status(400).json({ error: "نسخه نهایی تعیین نشده" });

    const versionRes = await pool.query("SELECT * FROM tbl_analysis_versions WHERE id=$1", [analysis.final_version_id]);
    const assignRes = await pool.query(
      `SELECT a.*, t.title, t.topic_code,
              u_mentor.name as mentor_name, u_manager.name as manager_name,
              un."UnitShortName" as unit_name
       FROM tbl_analysis_assignments a
       JOIN tbl_analysis_topics t ON a.topic_id=t.id
       JOIN tbl_analysis_analyses an ON an.assignment_id=a.id
       LEFT JOIN tbl_users u_mentor ON a.mentor_id = u_mentor.id
       LEFT JOIN tbl_users u_manager ON a.manager_id = u_manager.id
       LEFT JOIN tbl_users u_analyst ON a.analyst_id = u_analyst.id
       LEFT JOIN tbl_units un ON u_analyst.unit_cd = un."UnitCode"
       WHERE an.id=$1`,
      [req.params.id]
    );
    const scoresRes = await pool.query(
      `SELECT s.score, s.total_score, c.name, c.name_fa, c.max_score, u.name as evaluator_name
       FROM tbl_analysis_scores s
       JOIN tbl_analysis_criteria c ON s.criteria_id=c.id
       LEFT JOIN tbl_users u ON s.evaluator_id = u.id
       WHERE s.version_id=$1`,
      [analysis.final_version_id]
    );
    const approverRes = await pool.query(
      `SELECT u.name as approver_name, l.created_at as approved_at
       FROM tbl_analysis_activity_logs l
       JOIN tbl_users u ON l.user_id = u.id
       WHERE l.entity_type='analysis' AND l.entity_id=$1 AND l.action='approve_final'
       ORDER BY l.created_at DESC LIMIT 1`,
      [req.params.id]
    );

    const pdfBuffer = await generateAnalysisPdf({
      analysis,
      version: versionRes.rows[0],
      topic: assignRes.rows[0],
      assignment: assignRes.rows[0],
      scores: scoresRes.rows,
      meta: {
        mentor_name: assignRes.rows[0]?.mentor_name,
        manager_name: assignRes.rows[0]?.manager_name,
        unit_name: assignRes.rows[0]?.unit_name,
        approver_name: approverRes.rows[0]?.approver_name,
        approved_at: approverRes.rows[0]?.approved_at,
        evaluator_name: scoresRes.rows[0]?.evaluator_name,
      },
    });
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename=analysis-${req.params.id}.pdf`);
    res.send(pdfBuffer);
    await logActivity(pool, { userId: req.user.id, action: "download", entityType: "analysis", entityId: req.params.id });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ===================== ATTACHMENTS =====================

router.post("/attachments", upload.single("file"), async (req, res) => {
  const { entity_type, entity_id } = req.body;
  if (!req.file) return res.status(400).json({ error: "فایل الزامی است" });
  try {
    const result = await pool.query(
      `INSERT INTO tbl_analysis_attachments (entity_type, entity_id, file_name, file_path, mime_type, file_size, uploaded_by)
       VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`,
      [entity_type, entity_id, req.file.originalname, req.file.filename, req.file.mimetype, req.file.size, req.user.id]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get("/attachments", async (req, res) => {
  const { entity_type, entity_id } = req.query;
  try {
    const result = await pool.query(
      "SELECT id, entity_type, entity_id, file_name, mime_type, file_size, created_at FROM tbl_analysis_attachments WHERE entity_type=$1 AND entity_id=$2",
      [entity_type, entity_id]
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get("/attachments/:id/download", async (req, res) => {
  try {
    const result = await pool.query("SELECT * FROM tbl_analysis_attachments WHERE id=$1", [req.params.id]);
    if (!result.rows[0]) return res.status(404).json({ error: "فایل یافت نشد" });
    const filePath = path.join(uploadDir, result.rows[0].file_path);
    res.download(filePath, result.rows[0].file_name);
    await logActivity(pool, { userId: req.user.id, action: "download", entityType: "attachment", entityId: req.params.id });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ===================== REPORTS =====================

router.get("/reports/topics", requireRole(...MANAGER_ROLES), async (req, res) => {
  const { status, domain, priority, startDate, endDate } = req.query;
  let q = `SELECT status, domain, priority, COUNT(*) as count FROM tbl_analysis_topics WHERE deleted_at IS NULL`;
  const params = [];
  let i = 1;
  if (status) { q += ` AND status=$${i}`; params.push(status); i++; }
  if (domain) { q += ` AND domain=$${i}`; params.push(domain); i++; }
  if (priority) { q += ` AND priority=$${i}`; params.push(priority); i++; }
  const rangeStart = toGregorianDate(startDate);
  const rangeEnd = toGregorianDate(endDate);
  if (rangeStart && rangeEnd) { q += ` AND created_at::date BETWEEN $${i} AND $${i + 1}`; params.push(rangeStart, rangeEnd); i += 2; }
  q += ` GROUP BY status, domain, priority ORDER BY count DESC`;
  try {
    const result = await pool.query(q, params);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get("/reports/missions", requireRole(...MANAGER_ROLES), async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT a.status, a.analyst_id, u.name as analyst_name,
              COUNT(*) as count,
              COUNT(*) FILTER (WHERE a.deadline < CURRENT_DATE AND a.status NOT IN ('FinalApproved','Archived')) as delayed
       FROM tbl_analysis_assignments a
       LEFT JOIN tbl_users u ON a.analyst_id = u.id
       GROUP BY a.status, a.analyst_id, u.name`
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get("/reports/analyst-performance", requireRole(...MANAGER_ROLES), async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT u.id, u.name,
              COUNT(DISTINCT a.id) as total_missions,
              COUNT(DISTINCT an.id) FILTER (WHERE an.status='FinalApproved') as completed,
              AVG(s.total_score) as avg_score,
              COUNT(DISTINCT v.id) FILTER (WHERE v.version_number > 1) as revisions
       FROM tbl_users u
       JOIN tbl_analysis_assignments a ON a.analyst_id = u.id
       LEFT JOIN tbl_analysis_analyses an ON an.assignment_id = a.id
       LEFT JOIN tbl_analysis_versions v ON v.analysis_id = an.id
       LEFT JOIN tbl_analysis_scores s ON s.version_id = v.id
       GROUP BY u.id, u.name`
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get("/reports/delays", requireRole(...MANAGER_ROLES), async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT a.*, t.title as topic_title, u.name as analyst_name
       FROM tbl_analysis_assignments a
       JOIN tbl_analysis_topics t ON a.topic_id = t.id
       LEFT JOIN tbl_users u ON a.analyst_id = u.id
       WHERE a.deadline < CURRENT_DATE AND a.status NOT IN ('FinalApproved','Archived')
       ORDER BY a.deadline ASC`
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get("/reports/analyses", requireRole(...MANAGER_ROLES), async (req, res) => {
  const { startDate, endDate } = req.query;
  const rangeStart = toGregorianDate(startDate);
  const rangeEnd = toGregorianDate(endDate);
  let q = `
    SELECT an.id, v.title, t.title as topic_title, u.name as author, an.status,
           v.version_number, an.updated_at, MAX(s.total_score) as total_score
    FROM tbl_analysis_analyses an
    JOIN tbl_analysis_assignments a ON an.assignment_id = a.id
    JOIN tbl_analysis_topics t ON a.topic_id = t.id
    LEFT JOIN tbl_users u ON an.analyst_id = u.id
    LEFT JOIN tbl_analysis_versions v ON v.id = an.final_version_id
    LEFT JOIN tbl_analysis_scores s ON s.version_id = an.final_version_id
    WHERE 1=1`;
  const params = [];
  let i = 1;
  if (rangeStart && rangeEnd) {
    q += ` AND an.updated_at::date BETWEEN $${i} AND $${i + 1}`;
    params.push(rangeStart, rangeEnd);
    i += 2;
  }
  q += ` GROUP BY an.id, v.title, t.title, u.name, an.status, v.version_number, an.updated_at
         ORDER BY an.updated_at DESC`;
  try {
    const result = await pool.query(q, params);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get("/reports/dashboard", requireRole(...MANAGER_ROLES), async (req, res) => {
  const { startDate, endDate } = req.query;
  const rangeStart = toGregorianDate(startDate);
  const rangeEnd = toGregorianDate(endDate);
  const hasRange = rangeStart && rangeEnd;
  const dateParams = hasRange ? [rangeStart, rangeEnd] : [];

  const dateClauseA = hasRange ? " AND a.created_at::date BETWEEN $1 AND $2" : "";
  const dateClauseF = hasRange ? " AND f.created_at::date BETWEEN $1 AND $2" : "";
  const dateClauseAn = hasRange ? " AND an.updated_at::date BETWEEN $1 AND $2" : "";

  try {
    const [statusRes, summaryRes, analystRes, reviewerRes, unitRes, completedRes] = await Promise.all([
      pool.query(
        `SELECT a.status, COUNT(*)::int as count FROM tbl_analysis_assignments a WHERE 1=1${dateClauseA} GROUP BY a.status`,
        dateParams
      ),
      pool.query(
        `SELECT
          COUNT(*)::int as total,
          COUNT(*) FILTER (WHERE a.status='FinalApproved')::int as completed,
          COUNT(*) FILTER (WHERE a.status='Cancelled')::int as cancelled,
          COUNT(*) FILTER (WHERE a.status='NeedsRevision')::int as needs_revision,
          COUNT(*) FILTER (WHERE a.status IN ('Submitted','UnderReview'))::int as pending_review,
          COUNT(*) FILTER (WHERE a.deadline < CURRENT_DATE AND a.status NOT IN ('FinalApproved','Archived','Cancelled'))::int as delayed
         FROM tbl_analysis_assignments a WHERE 1=1${dateClauseA}`,
        dateParams
      ),
      pool.query(
        `SELECT u.id, u.name, un."UnitShortName" as unit_name,
                COUNT(DISTINCT a.id)::int as total_missions,
                COUNT(DISTINCT an.id) FILTER (WHERE an.status='FinalApproved')::int as completed,
                ROUND(AVG(s.total_score)::numeric, 2) as avg_score,
                COUNT(DISTINCT v.id) FILTER (WHERE v.version_number > 1 OR v.status='ReturnedForRevision')::int as revisions
         FROM tbl_users u
         JOIN tbl_analysis_assignments a ON a.analyst_id = u.id
         LEFT JOIN tbl_analysis_analyses an ON an.assignment_id = a.id
         LEFT JOIN tbl_analysis_versions v ON v.analysis_id = an.id
         LEFT JOIN tbl_analysis_scores s ON s.version_id = an.final_version_id
         LEFT JOIN tbl_units un ON u.unit_cd = un."UnitCode"
         WHERE 1=1${dateClauseA}
         GROUP BY u.id, u.name, un."UnitShortName"
         HAVING COUNT(DISTINCT a.id) > 0
         ORDER BY completed DESC, avg_score DESC NULLS LAST, total_missions DESC`,
        dateParams
      ),
      pool.query(
        `SELECT u.id, u.name,
                COUNT(DISTINCT f.id)::int as feedback_count,
                COUNT(DISTINCT f.version_id)::int as reviewed_versions
         FROM tbl_users u
         JOIN tbl_analysis_feedbacks f ON f.user_id = u.id
         WHERE 1=1${dateClauseF}
         GROUP BY u.id, u.name
         HAVING COUNT(DISTINCT f.id) > 0
         ORDER BY feedback_count DESC, reviewed_versions DESC`,
        dateParams
      ),
      pool.query(
        `SELECT un."UnitCode", un."UnitShortName" as unit_name, un."StateName" as state_name,
                COUNT(DISTINCT u.id)::int as analyst_count,
                COUNT(DISTINCT an.id) FILTER (WHERE an.status='FinalApproved')::int as completed,
                ROUND(AVG(s.total_score)::numeric, 2) as avg_score
         FROM tbl_units un
         JOIN tbl_users u ON u.unit_cd = un."UnitCode"
         JOIN tbl_analysis_assignments a ON a.analyst_id = u.id
         LEFT JOIN tbl_analysis_analyses an ON an.assignment_id = a.id
         LEFT JOIN tbl_analysis_scores s ON s.version_id = an.final_version_id
         WHERE 1=1${dateClauseA}
         GROUP BY un."UnitCode", un."UnitShortName", un."StateName"
         HAVING COUNT(DISTINCT a.id) > 0
         ORDER BY avg_score DESC NULLS LAST, completed DESC`,
        dateParams
      ),
      pool.query(
        `SELECT an.id, v.title, t.title as topic_title, u.name as analyst_name,
                an.status, an.updated_at, MAX(s.total_score) as total_score
         FROM tbl_analysis_analyses an
         JOIN tbl_analysis_assignments a ON an.assignment_id = a.id
         JOIN tbl_analysis_topics t ON a.topic_id = t.id
         LEFT JOIN tbl_users u ON an.analyst_id = u.id
         LEFT JOIN tbl_analysis_versions v ON v.id = an.final_version_id
         LEFT JOIN tbl_analysis_scores s ON s.version_id = an.final_version_id
         WHERE an.status='FinalApproved'${dateClauseAn}
         GROUP BY an.id, v.title, t.title, u.name, an.status, an.updated_at
         ORDER BY an.updated_at DESC LIMIT 100`,
        dateParams
      ),
    ]);

    const statusBreakdown = statusRes.rows.map((r, idx) => ({
      ...r,
      rank: idx + 1,
    }));
    const analystRanking = analystRes.rows.map((r, idx) => ({ ...r, rank: idx + 1 }));
    const reviewerRanking = reviewerRes.rows.map((r, idx) => ({ ...r, rank: idx + 1 }));
    const unitRanking = unitRes.rows.map((r, idx) => ({ ...r, rank: idx + 1 }));

    res.json({
      summary: summaryRes.rows[0] || {},
      statusBreakdown,
      analystRanking,
      reviewerRanking,
      unitRanking,
      completedAnalyses: completedRes.rows,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ===================== ACTIVITY & HISTORY =====================

router.get("/activity-logs", requireRole(...MANAGER_ROLES), async (req, res) => {
  const { entity_type, entity_id, limit = 50 } = req.query;
  let q = `SELECT l.*, u.name as user_name FROM tbl_analysis_activity_logs l LEFT JOIN tbl_users u ON l.user_id=u.id WHERE 1=1`;
  const params = [];
  let i = 1;
  if (entity_type) { q += ` AND l.entity_type=$${i}`; params.push(entity_type); i++; }
  if (entity_id) { q += ` AND l.entity_id=$${i}`; params.push(entity_id); i++; }
  q += ` ORDER BY l.created_at DESC LIMIT $${i}`;
  params.push(limit);
  try {
    const result = await pool.query(q, params);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get("/status-history/:entityType/:entityId", async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT h.*, u.name as changed_by_name FROM tbl_analysis_status_history h
       LEFT JOIN tbl_users u ON h.changed_by = u.id
       WHERE h.entity_type=$1 AND h.entity_id=$2 ORDER BY h.created_at DESC`,
      [req.params.entityType, req.params.entityId]
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get("/users/analysts", requireRole(...MANAGER_ROLES), async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT id, username, name, role FROM tbl_users WHERE active=true ORDER BY name`
    );
    const users = result.rows.filter((u) => parseUserRoles(u.role).includes("analyst"));
    if (!users.length) {
      return res.json({ users: [], message: "کاربری با نقش تحلیل‌گر در سامانه یافت نشد" });
    }
    res.json(users);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get("/users/mentors", requireRole(...MANAGER_ROLES), async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT id, username, name, role FROM tbl_users WHERE active=true ORDER BY name`
    );
    const users = result.rows.filter((u) => parseUserRoles(u.role).includes("mentor"));
    if (!users.length) {
      return res.json({ users: [], message: "کاربری با نقش راهنما در سامانه یافت نشد" });
    }
    res.json(users);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
