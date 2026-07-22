import pool from "../db.js";
import {
  generateTopicCode,
  generateBriefCode,
  logStatusChange,
  logActivity,
  validateBriefPayload,
  stripHtml,
  plainTextLength,
  BRIEF_FIELD_LIMITS,
  toGregorianDate,
} from "../utils/analysisHelpers.js";
import {
  notifyAnalysisManagers,
  notifyUserSafe,
  ANALYSIS_NOTIFY,
} from "./analysisNotificationService.js";
import { publishBriefToChannels } from "./analysisBriefMessenger.js";
import { cleanBriefSubmissionContent } from "./briefContentCleaner.js";

const MANAGER_ROLES = ["admin", "analysis_manager", "Field_admin"];
const BRIEF_DAILY_LIMIT = 5;
const VALID_BRIEF_STATUSES = [
  "Submitted",
  "ManagerApproved",
  "EditorApproved",
  "Published",
  "Acknowledged",
  "Promoted",
  "Archived",
  "Rejected",
];
const BRIEF_BANK_STATUSES = ["ManagerApproved", "EditorApproved", "Published"];
const MANAGER_EDITABLE_CONTENT_STATUSES = [
  "Submitted",
  "ManagerApproved",
  "Acknowledged",
  "EditorApproved",
  "Published",
];
const VALID_QUALITY_TAGS = ["promising", "useful", "archive", null, ""];

const BRIEF_SELECT = `
  SELECT b.*,
         u.name AS author_name, u.username AS author_username,
         un."UnitShortName" AS unit_name,
         m.name AS manager_name,
         e.name AS editor_name
  FROM tbl_analysis_brief_submissions b
  LEFT JOIN tbl_users u ON b.author_id = u.id
  LEFT JOIN tbl_units un ON u.unit_cd = un."UnitCode"
  LEFT JOIN tbl_users m ON b.manager_id = m.id
  LEFT JOIN tbl_users e ON b.editor_id = e.id
`;

export async function countBriefSubmissionsToday(authorId, client = pool) {
  const r = await client.query(
    `SELECT COUNT(*)::int AS cnt FROM tbl_analysis_brief_submissions
     WHERE author_id = $1 AND created_at >= CURRENT_DATE`,
    [authorId],
  );
  return r.rows[0]?.cnt || 0;
}

export async function createBriefSubmission(body, user) {
  const err = validateBriefPayload(body);
  if (err) throw new Error(err);

  const todayCount = await countBriefSubmissionsToday(user.id);
  if (todayCount >= BRIEF_DAILY_LIMIT) {
    throw new Error(`حداکثر ${BRIEF_DAILY_LIMIT} ثبت تحلیل در روز مجاز است`);
  }

  const entryMode = body.entry_mode === "external"
    ? "external"
    : body.entry_mode === "topic_proposal"
      ? "topic_proposal"
      : "self";
  let attributionText = String(body.attribution_text || "").trim();
  if (entryMode === "self" || entryMode === "topic_proposal") {
    attributionText = String(user.name || user.username || "").trim();
  } else if (!attributionText) {
    throw new Error("منبع/نویسنده الزامی است");
  }

  const compositionDate = body.composition_date
    ? toGregorianDate(body.composition_date)
    : new Date().toISOString().slice(0, 10);

  const cleanedContent = await cleanBriefSubmissionContent(body.content);
  if (!plainTextLength(cleanedContent)) {
    throw new Error("متن تحلیل پس از پاکسازی خالی شد");
  }

  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const code = await generateBriefCode(client);
    const contextId = body.context_id ? parseInt(body.context_id, 10) : null;
    const ins = await client.query(
      `INSERT INTO tbl_analysis_brief_submissions
       (submission_code, title, content, context_type, context_id, tags, author_id, status,
        entry_mode, attribution_text, composition_date, importance_reason)
       VALUES ($1,$2,$3,$4,$5,$6,$7,'Submitted',$8,$9,$10,$11) RETURNING *`,
      [
        code,
        body.title.trim(),
        cleanedContent,
        entryMode === "topic_proposal" ? "general" : (body.context_type || "general"),
        entryMode === "topic_proposal" ? null : (Number.isFinite(contextId) ? contextId : null),
        entryMode === "topic_proposal" ? null : (body.tags || null),
        user.id,
        entryMode,
        attributionText.slice(0, 500),
        entryMode === "topic_proposal" ? null : compositionDate,
        entryMode === "topic_proposal" ? (String(body.importance_reason || "").trim() || null) : null,
      ],
    );
    const row = ins.rows[0];
    await logActivity(client, {
      userId: user.id,
      action: "create",
      entityType: "brief_submission",
      entityId: row.id,
      details: { title: row.title, code },
    });
    await client.query("COMMIT");

    notifyAnalysisManagers(
      user,
      entryMode === "topic_proposal" ? "پیشنهاد موضوع" : "تحلیل ثبت‌شده",
      entryMode === "topic_proposal"
        ? ANALYSIS_NOTIFY.topicProposalSubmitted(code, row.title)
        : ANALYSIS_NOTIFY.briefSubmitted(code, row.title),
    );

    const detail = await getBriefSubmission(row.id, user);
    return detail;
  } catch (e) {
    await client.query("ROLLBACK");
    throw e;
  } finally {
    client.release();
  }
}

export async function listMyBriefSubmissions(userId, params = {}) {
  let q = `${BRIEF_SELECT} WHERE b.author_id = $1`;
  const qp = [userId];
  if (params.status) {
    qp.push(params.status);
    q += ` AND b.status = $${qp.length}`;
  }
  q += ` ORDER BY b.created_at DESC LIMIT 100`;
  const r = await pool.query(q, qp);
  return r.rows;
}

export async function listBriefSubmissionsForManager(params = {}) {
  let q = `${BRIEF_SELECT} WHERE 1=1`;
  const qp = [];
  if (params.status) {
    qp.push(params.status);
    q += ` AND b.status = $${qp.length}`;
  }
  if (params.unitCode) {
    qp.push(params.unitCode);
    q += ` AND u.unit_cd = $${qp.length}`;
  }
  if (params.search?.trim()) {
    qp.push(`%${params.search.trim()}%`);
    q += ` AND (b.title ILIKE $${qp.length} OR b.submission_code ILIKE $${qp.length} OR u.name ILIKE $${qp.length} OR b.attribution_text ILIKE $${qp.length})`;
  }
  if (params.entry_mode) {
    qp.push(params.entry_mode);
    q += ` AND b.entry_mode = $${qp.length}`;
  }
  if (params.quality_tag) {
    qp.push(params.quality_tag);
    q += ` AND b.quality_tag = $${qp.length}`;
  }
  q += ` ORDER BY b.created_at DESC LIMIT 200`;
  const r = await pool.query(q, qp);
  return r.rows;
}

export async function listBriefBank(params = {}) {
  let q = `${BRIEF_SELECT} WHERE b.status = ANY($1)`;
  const qp = [BRIEF_BANK_STATUSES];
  if (params.status && BRIEF_BANK_STATUSES.includes(params.status)) {
    qp[0] = [params.status];
  }
  if (params.unitCode) {
    qp.push(params.unitCode);
    q += ` AND u.unit_cd = $${qp.length}`;
  }
  if (params.search?.trim()) {
    qp.push(`%${params.search.trim()}%`);
    q += ` AND (b.title ILIKE $${qp.length} OR b.submission_code ILIKE $${qp.length} OR b.attribution_text ILIKE $${qp.length} OR u.name ILIKE $${qp.length})`;
  }
  if (params.publish_status) {
    qp.push(params.publish_status);
    q += ` AND b.publish_status = $${qp.length}`;
  }
  q += ` ORDER BY COALESCE(b.manager_approved_at, b.created_at) DESC LIMIT 200`;
  const r = await pool.query(q, qp);
  return r.rows;
}

export async function getBriefSubmission(id, user, { isManager = false } = {}) {
  const r = await pool.query(`${BRIEF_SELECT} WHERE b.id = $1`, [id]);
  const row = r.rows[0];
  if (!row) return null;
  if (!isManager && row.author_id !== user.id) return null;
  return row;
}

export async function updateBriefStatus(id, body, managerUser) {
  const { status, manager_note, quality_tag, reject_reason, show_in_command } = body;
  if (!VALID_BRIEF_STATUSES.includes(status)) throw new Error("وضعیت نامعتبر");

  if (status === "Rejected" && !String(reject_reason || "").trim()) {
    throw new Error("دلیل رد الزامی است");
  }

  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const old = await client.query("SELECT * FROM tbl_analysis_brief_submissions WHERE id = $1", [id]);
    if (!old.rows[0]) throw new Error("NOT_FOUND");
    const prev = old.rows[0];

    if (quality_tag !== undefined && quality_tag !== null && !VALID_QUALITY_TAGS.includes(quality_tag)) {
      throw new Error("برچسب کیفیت نامعتبر");
    }

    const rejectReasonVal = status === "Rejected" ? String(reject_reason || "").trim() : null;

    const r = await client.query(
      `UPDATE tbl_analysis_brief_submissions
       SET status = $1::varchar,
           manager_id = $2::integer,
           manager_note = COALESCE($3::text, manager_note),
           reject_reason = COALESCE($4::text, reject_reason),
           quality_tag = COALESCE($5::varchar, quality_tag),
           manager_approved_at = CASE WHEN $1::varchar = 'ManagerApproved' THEN CURRENT_TIMESTAMP ELSE manager_approved_at END,
           show_in_command = CASE
             WHEN $1::varchar = 'ManagerApproved' THEN COALESCE($6::boolean, false)
             ELSE show_in_command
           END,
           command_visible_at = CASE
             WHEN $1::varchar = 'ManagerApproved' AND COALESCE($6::boolean, false) THEN CURRENT_TIMESTAMP
             WHEN $1::varchar = 'ManagerApproved' THEN NULL
             ELSE command_visible_at
           END,
           command_visible_by = CASE
             WHEN $1::varchar = 'ManagerApproved' AND COALESCE($6::boolean, false) THEN $2::integer
             WHEN $1::varchar = 'ManagerApproved' THEN NULL
             ELSE command_visible_by
           END,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $7::integer RETURNING *`,
      [
        status,
        managerUser.id,
        manager_note || null,
        rejectReasonVal,
        quality_tag ?? prev.quality_tag,
        show_in_command == null ? null : show_in_command === true,
        id,
      ],
    );
    await logActivity(client, {
      userId: managerUser.id,
      action: "status_change",
      entityType: "brief_submission",
      entityId: id,
      details: {
        status,
        quality_tag,
        reject_reason: rejectReasonVal,
        show_in_command: status === "ManagerApproved" ? show_in_command === true : undefined,
      },
    });
    await client.query("COMMIT");

    const row = r.rows[0];
    const code = row.submission_code;
    if (status === "ManagerApproved") {
      notifyUserSafe(managerUser, row.author_id, "بانک تحلیل", ANALYSIS_NOTIFY.briefManagerApproved(code));
    } else if (status === "Acknowledged") {
      notifyUserSafe(managerUser, row.author_id, "تحلیل ثبت‌شده", ANALYSIS_NOTIFY.briefAcknowledged(code));
    } else if (status === "Rejected") {
      notifyUserSafe(managerUser, row.author_id, "تحلیل ثبت‌شده", ANALYSIS_NOTIFY.briefRejected(code));
    }

    return getBriefSubmission(id, managerUser, { isManager: true });
  } catch (e) {
    await client.query("ROLLBACK");
    throw e;
  } finally {
    client.release();
  }
}

export async function approveBriefBank(id, body, managerUser) {
  return updateBriefStatus(id, { ...body, status: "ManagerApproved" }, managerUser);
}

export async function setBriefCommandVisibility(id, visible, managerUser) {
  const r = await pool.query(
    `UPDATE tbl_analysis_brief_submissions
     SET show_in_command = $2,
         command_visible_at = CASE WHEN $2 THEN CURRENT_TIMESTAMP ELSE NULL END,
         command_visible_by = CASE WHEN $2 THEN $3 ELSE NULL END,
         updated_at = CURRENT_TIMESTAMP
     WHERE id = $1
       AND status IN ('ManagerApproved', 'EditorApproved', 'Published')
     RETURNING id`,
    [id, visible === true, managerUser.id],
  );
  if (!r.rows[0]) throw new Error("NOT_FOUND_OR_NOT_IN_BANK");
  await logActivity(pool, {
    userId: managerUser.id,
    action: visible ? "show_in_command" : "hide_from_command",
    entityType: "brief_submission",
    entityId: Number(id),
    details: { show_in_command: visible === true },
  });
  return getBriefSubmission(id, managerUser, { isManager: true });
}

export async function approveBriefForPublish(id, body, editorUser) {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const old = await client.query("SELECT * FROM tbl_analysis_brief_submissions WHERE id = $1", [id]);
    if (!old.rows[0]) throw new Error("NOT_FOUND");
    if (old.rows[0].status !== "ManagerApproved") {
      throw new Error("فقط تحلیل‌های تأییدشده در بانک قابل تأیید انتشار هستند");
    }

    await client.query(
      `UPDATE tbl_analysis_brief_submissions
       SET status = 'EditorApproved',
           editor_id = $1,
           editor_note = COALESCE($2, editor_note),
           editor_approved_at = CURRENT_TIMESTAMP,
           publish_status = 'ready',
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $3`,
      [editorUser.id, body.editor_note || null, id],
    );
    await logActivity(client, {
      userId: editorUser.id,
      action: "editor_approve",
      entityType: "brief_submission",
      entityId: id,
      details: { editor_note: body.editor_note || null },
    });
    await client.query("COMMIT");

    const row = (await client.query("SELECT * FROM tbl_analysis_brief_submissions WHERE id = $1", [id])).rows[0];
    notifyUserSafe(editorUser, row.author_id, "تأیید انتشار", ANALYSIS_NOTIFY.briefEditorApproved(row.submission_code));

    return getBriefSubmission(id, editorUser, { isManager: true });
  } catch (e) {
    await client.query("ROLLBACK");
    throw e;
  } finally {
    client.release();
  }
}

export async function publishBriefSubmission(id, body, user) {
  const rawIds = Array.isArray(body?.channel_config_ids)
    ? body.channel_config_ids
    : (body?.channel_config_id != null ? [body.channel_config_id] : []);
  const channelIds = [...new Set(rawIds.map((x) => parseInt(x, 10)).filter(Number.isFinite))];
  if (!channelIds.length) throw new Error("حداقل یک کانال انتشار انتخاب کنید");

  const briefRes = await pool.query(`${BRIEF_SELECT} WHERE b.id = $1`, [id]);
  const brief = briefRes.rows[0];
  if (!brief) throw new Error("NOT_FOUND");
  if (!["EditorApproved", "Published"].includes(brief.status)) {
    throw new Error("فقط تحلیل‌های تأییدشده یا منتشرشده قابل ارسال هستند");
  }

  const wasPublished = brief.status === "Published";
  const results = await publishBriefToChannels(brief, channelIds, user.id);
  const okCount = results.filter((r) => r.ok).length;
  const failCount = results.length - okCount;
  const lastOk = [...results].reverse().find((r) => r.ok);
  const errors = results.filter((r) => !r.ok).map((r) => r.error).filter(Boolean).join("؛ ");

  const publishStatus = okCount === results.length
    ? "published"
    : (okCount > 0 ? "partial" : "failed");
  const publishError = failCount > 0 ? errors.slice(0, 500) : null;

  await pool.query(
    `UPDATE tbl_analysis_brief_submissions
     SET status = 'Published',
         publish_status = $1,
         channel_config_id = $2,
         published_at = CURRENT_TIMESTAMP,
         publish_error = $3,
         editor_id = COALESCE(editor_id, $4),
         updated_at = CURRENT_TIMESTAMP
     WHERE id = $5`,
    [publishStatus, lastOk?.channel_config_id || channelIds[0], publishError, user.id, id],
  );

  if (okCount === 0) {
    throw new Error(publishError || "انتشار در هیچ کانالی موفق نبود");
  }

  if (!wasPublished) {
    notifyUserSafe(user, brief.author_id, "انتشار تحلیل", ANALYSIS_NOTIFY.briefPublished(brief.submission_code));
  }

  const row = await getBriefSubmission(id, user, { isManager: true });
  return {
    ...row,
    publish_results: results,
    publish_summary: { ok: okCount, fail: failCount, total: results.length },
  };
}

export async function editBriefSubmissionContent(id, { content }, user) {
  if (plainTextLength(content || "") < 1) throw new Error("متن تحلیل الزامی است");

  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const oldRes = await client.query(
      "SELECT status, entry_mode FROM tbl_analysis_brief_submissions WHERE id = $1",
      [id],
    );
    const old = oldRes.rows[0];
    if (!old) throw new Error("NOT_FOUND");
    if (!MANAGER_EDITABLE_CONTENT_STATUSES.includes(old.status)) {
      throw new Error("ویرایش متن در این وضعیت مجاز نیست");
    }

    const isTopicProposal = old.entry_mode === "topic_proposal";
    const maxLen = isTopicProposal
      ? BRIEF_FIELD_LIMITS.topicProposalDescription
      : BRIEF_FIELD_LIMITS.content;
    if (plainTextLength(content) > maxLen) {
      throw new Error(`متن حداکثر ${maxLen} کاراکتر باشد`);
    }

    const useBankColumn = ["EditorApproved", "Published"].includes(old.status);
    if (useBankColumn) {
      await client.query(
        `UPDATE tbl_analysis_brief_submissions
         SET bank_content = $1, updated_at = CURRENT_TIMESTAMP
         WHERE id = $2`,
        [content, id],
      );
    } else {
      await client.query(
        `UPDATE tbl_analysis_brief_submissions
         SET content = $1, updated_at = CURRENT_TIMESTAMP
         WHERE id = $2`,
        [content, id],
      );
    }

    await logActivity(client, {
      userId: user.id,
      action: useBankColumn ? "edit_bank_content" : "edit_brief_content",
      entityType: "brief_submission",
      entityId: id,
      details: { status: old.status },
    });
    await client.query("COMMIT");
    return getBriefSubmission(id, user, { isManager: true });
  } catch (e) {
    await client.query("ROLLBACK");
    throw e;
  } finally {
    client.release();
  }
}

export async function editBriefBankContent(id, { content }, user) {
  return editBriefSubmissionContent(id, { content }, user);
}

export async function promoteBriefToTopic(id, body, managerUser) {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const briefRes = await client.query("SELECT * FROM tbl_analysis_brief_submissions WHERE id = $1", [id]);
    const brief = briefRes.rows[0];
    if (!brief) throw new Error("NOT_FOUND");
    if (brief.promoted_topic_id) throw new Error("قبلاً به محور ارتقا یافته");

    const autoApprove = body.auto_approve === true;
    const topicCode = await generateTopicCode(client);
    const isTopicProposal = brief.entry_mode === "topic_proposal";
    const description = isTopicProposal
      ? stripHtml(brief.content).slice(0, 2500)
      : stripHtml(brief.content).slice(0, 150);
    const importanceReason = isTopicProposal ? (brief.importance_reason || null) : null;
    const topicStatus = autoApprove ? "Approved" : "Submitted";

    const topicIns = await client.query(
      `INSERT INTO tbl_analysis_topics
       (topic_code, title, description, domain, keywords, priority, importance_reason, creator_id, status)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *`,
      [
        topicCode,
        brief.title.slice(0, 80),
        description,
        isTopicProposal ? null : (brief.tags || null),
        isTopicProposal ? null : (brief.tags || null),
        "medium",
        importanceReason,
        brief.author_id,
        topicStatus,
      ],
    );
    const topic = topicIns.rows[0];

    await logStatusChange(client, {
      entityType: "topic",
      entityId: topic.id,
      oldStatus: null,
      newStatus: topicStatus,
      changedBy: managerUser.id,
      comment: `ارتقا از تحلیل کوتاه ${brief.submission_code}`,
    });

    await client.query(
      `UPDATE tbl_analysis_brief_submissions
       SET status = 'Promoted', manager_id = $1, promoted_topic_id = $2, updated_at = CURRENT_TIMESTAMP
       WHERE id = $3`,
      [managerUser.id, topic.id, id],
    );

    await logActivity(client, {
      userId: managerUser.id,
      action: "promote_topic",
      entityType: "brief_submission",
      entityId: id,
      details: { topic_id: topic.id },
    });

    await client.query("COMMIT");

    notifyUserSafe(
      managerUser,
      brief.author_id,
      "ارتقا به محور",
      ANALYSIS_NOTIFY.briefPromoted(brief.submission_code),
    );

    return { brief: await getBriefSubmission(id, managerUser, { isManager: true }), topic };
  } catch (e) {
    await client.query("ROLLBACK");
    throw e;
  } finally {
    client.release();
  }
}

export async function promoteBriefToMission(id, body, managerUser) {
  const { analyst_id, mentor_id, deadline, auto_approve_topic } = body;
  const analystId = parseInt(analyst_id, 10) || null;

  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const briefRes = await client.query("SELECT * FROM tbl_analysis_brief_submissions WHERE id = $1", [id]);
    const brief = briefRes.rows[0];
    if (!brief) throw new Error("NOT_FOUND");

    let topicId = brief.promoted_topic_id;
    let topic;

    if (!topicId) {
      const topicCode = await generateTopicCode(client);
      const description = stripHtml(brief.content).slice(0, 150);
      const topicStatus = auto_approve_topic !== false ? "Approved" : "Submitted";
      const topicIns = await client.query(
        `INSERT INTO tbl_analysis_topics
         (topic_code, title, description, domain, keywords, priority, creator_id, status)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`,
        [
          topicCode,
          brief.title.slice(0, 80),
          description,
          brief.tags || null,
          brief.tags || null,
          "medium",
          brief.author_id,
          topicStatus,
        ],
      );
      topic = topicIns.rows[0];
      topicId = topic.id;
      await logStatusChange(client, {
        entityType: "topic",
        entityId: topicId,
        oldStatus: null,
        newStatus: topicStatus,
        changedBy: managerUser.id,
        comment: `ارتقا از تحلیل کوتاه ${brief.submission_code}`,
      });
    } else {
      const t = await client.query("SELECT * FROM tbl_analysis_topics WHERE id = $1", [topicId]);
      topic = t.rows[0];
      if (!topic || topic.deleted_at) throw new Error("TOPIC_NOT_FOUND");
      if (["Closed", "Rejected", "Completed"].includes(topic.status)) {
        throw new Error("TOPIC_NOT_ASSIGNABLE");
      }
      if (!["Approved", "Assigned"].includes(topic.status)) {
        await client.query(
          "UPDATE tbl_analysis_topics SET status = 'Approved', updated_at = CURRENT_TIMESTAMP WHERE id = $1",
          [topicId],
        );
        topic.status = "Approved";
      }
    }

    const finalAnalystId = analystId || brief.author_id;
    const assignIns = await client.query(
      `INSERT INTO tbl_analysis_assignments
       (topic_id, analyst_id, mentor_id, manager_id, deadline, priority, guidelines, status)
       VALUES ($1,$2,$3,$4,$5,$6,$7,'Assigned') RETURNING *`,
      [
        topicId,
        finalAnalystId,
        mentor_id || null,
        managerUser.id,
        body.deadline || null,
        body.priority || "medium",
        body.guidelines || stripHtml(brief.content).slice(0, 150),
      ],
    );
    const assignment = assignIns.rows[0];

    await client.query(
      "UPDATE tbl_analysis_topics SET status = 'Assigned', updated_at = CURRENT_TIMESTAMP WHERE id = $1",
      [topicId],
    );
    await logStatusChange(client, {
      entityType: "assignment",
      entityId: assignment.id,
      oldStatus: null,
      newStatus: "Assigned",
      changedBy: managerUser.id,
    });

    await client.query(
      `UPDATE tbl_analysis_brief_submissions
       SET status = 'Promoted', manager_id = $1, promoted_topic_id = $2, promoted_assignment_id = $3,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $4`,
      [managerUser.id, topicId, assignment.id, id],
    );

    await logActivity(client, {
      userId: managerUser.id,
      action: "promote_mission",
      entityType: "brief_submission",
      entityId: id,
      details: { topic_id: topicId, assignment_id: assignment.id },
    });

    await client.query("COMMIT");

    notifyUserSafe(
      managerUser,
      finalAnalystId,
      "مأموریت تحلیل",
      ANALYSIS_NOTIFY.assignmentCreated(topic.title),
    );
    notifyUserSafe(
      managerUser,
      brief.author_id,
      "ارتقا به مأموریت",
      ANALYSIS_NOTIFY.briefPromoted(brief.submission_code),
    );

    return {
      brief: await getBriefSubmission(id, managerUser, { isManager: true }),
      topic,
      assignment,
    };
  } catch (e) {
    await client.query("ROLLBACK");
    throw e;
  } finally {
    client.release();
  }
}

export async function suggestAnalystRole(id, body, managerUser) {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const briefRes = await client.query(
      `SELECT b.*, u.name AS author_name FROM tbl_analysis_brief_submissions b
       JOIN tbl_users u ON b.author_id = u.id WHERE b.id = $1`,
      [id],
    );
    const brief = briefRes.rows[0];
    if (!brief) throw new Error("NOT_FOUND");

    const existing = await client.query(
      `SELECT id FROM tbl_analysis_role_suggestions
       WHERE user_id = $1 AND suggested_role = 'analyst' AND status = 'pending'`,
      [brief.author_id],
    );
    if (!existing.rows[0]) {
      await client.query(
        `INSERT INTO tbl_analysis_role_suggestions
         (user_id, suggested_role, source_brief_id, suggested_by, note, status)
         VALUES ($1,'analyst',$2,$3,$4,'pending')`,
        [brief.author_id, id, managerUser.id, body.note || null],
      );
    }

    if (body.quality_tag) {
      await client.query(
        `UPDATE tbl_analysis_brief_submissions SET quality_tag = $1, manager_id = $2, updated_at = CURRENT_TIMESTAMP WHERE id = $3`,
        [body.quality_tag || "promising", managerUser.id, id],
      );
    }

    await logActivity(client, {
      userId: managerUser.id,
      action: "suggest_analyst",
      entityType: "brief_submission",
      entityId: id,
      details: { user_id: brief.author_id },
    });

    await client.query("COMMIT");

    notifyUserSafe(
      managerUser,
      brief.author_id,
      "پیشنهاد نقش",
      `مدیر تحلیل شما را برای نقش تحلیل‌گر پیشنهاد داده است.`,
    );

    return getBriefSubmission(id, managerUser, { isManager: true });
  } catch (e) {
    await client.query("ROLLBACK");
    throw e;
  } finally {
    client.release();
  }
}

export async function getContributorStats() {
  const r = await pool.query(`
    SELECT u.id, u.name, u.username, un."UnitShortName" AS unit_name,
           COUNT(b.id)::int AS submission_count,
           COUNT(b.id) FILTER (WHERE b.status = 'Promoted')::int AS promoted_count,
           COUNT(b.id) FILTER (WHERE b.quality_tag = 'promising')::int AS promising_count,
           MAX(b.created_at) AS last_submission_at,
           EXISTS (
             SELECT 1 FROM tbl_analysis_role_suggestions rs
             WHERE rs.user_id = u.id AND rs.suggested_role = 'analyst' AND rs.status = 'pending'
           ) AS analyst_suggested
    FROM tbl_analysis_brief_submissions b
    JOIN tbl_users u ON b.author_id = u.id
    LEFT JOIN tbl_units un ON u.unit_cd = un."UnitCode"
    GROUP BY u.id, u.name, u.username, un."UnitShortName"
    ORDER BY submission_count DESC, promoted_count DESC
    LIMIT 50
  `);
  return r.rows.map((row, i) => ({ ...row, rank: i + 1 }));
}

export async function resolveAnalystRoleSuggestions(userId, status = "accepted") {
  if (!userId) return;
  await pool.query(
    `UPDATE tbl_analysis_role_suggestions
     SET status = $2, updated_at = CURRENT_TIMESTAMP
     WHERE user_id = $1 AND suggested_role = 'analyst' AND status = 'pending'`,
    [userId, status],
  );
}

export async function getBriefStatsForUsers(userIds = []) {
  if (!userIds.length) return {};
  const r = await pool.query(
    `SELECT author_id,
            COUNT(*)::int AS submission_count,
            EXISTS (
              SELECT 1 FROM tbl_analysis_role_suggestions rs
              WHERE rs.user_id = b.author_id AND rs.suggested_role = 'analyst' AND rs.status = 'pending'
            )
            AND NOT EXISTS (
              SELECT 1 FROM tbl_user_role_assignments ura
              JOIN tbl_role_templates rt ON rt.id = ura.role_template_id
              WHERE ura.user_id = b.author_id AND ura.active = TRUE AND rt.code = 'analyst'
            ) AS analyst_suggested
     FROM tbl_analysis_brief_submissions b
     WHERE author_id = ANY($1)
     GROUP BY author_id`,
    [userIds],
  );
  const map = {};
  for (const row of r.rows) {
    map[row.author_id] = {
      submission_count: row.submission_count,
      analyst_suggested: row.analyst_suggested,
    };
  }
  return map;
}

export async function countPendingAnalystRoleSuggestions() {
  const r = await pool.query(
    `SELECT COUNT(DISTINCT rs.user_id)::int AS count
     FROM tbl_analysis_role_suggestions rs
     WHERE rs.suggested_role = 'analyst' AND rs.status = 'pending'
       AND NOT EXISTS (
         SELECT 1 FROM tbl_user_role_assignments ura
         JOIN tbl_role_templates rt ON rt.id = ura.role_template_id
         WHERE ura.user_id = rs.user_id AND ura.active = TRUE AND rt.code = 'analyst'
       )`,
  );
  return r.rows[0]?.count || 0;
}

export async function listPendingRoleSuggestions() {
  const r = await pool.query(
    `SELECT rs.*, u.name AS user_name, u.username, s.name AS suggested_by_name,
            b.submission_code, b.title AS brief_title
     FROM tbl_analysis_role_suggestions rs
     JOIN tbl_users u ON rs.user_id = u.id
     JOIN tbl_users s ON rs.suggested_by = s.id
     LEFT JOIN tbl_analysis_brief_submissions b ON rs.source_brief_id = b.id
     WHERE rs.status = 'pending'
     ORDER BY rs.created_at DESC`,
  );
  return r.rows;
}

export { MANAGER_ROLES as BRIEF_MANAGER_ROLES, MANAGER_ROLES as BRIEF_EDITOR_ROLES };
