import pool from "../db.js";
import fs from "fs";
import path from "path";
import { sendMessengerText } from "./messengerSend.js";
import { insertMessengerSendLog } from "./messengerSendLogService.js";
import { getChannelConfigById } from "./messengerChannelConfigService.js";
import { MESSENGER_USAGE_KEYS } from "../constants/messengerUsageKeys.js";
import { executeFormAiAction } from "./aiFormRunOrchestrator.js";
import {
  getPromptByKey,
  formatReferenceSlotsForPrompt,
} from "./promptRegistry.js";
import { assembleStrategySourceDigest } from "./strategySourceAssembleService.js";
import { STRATEGY_PROMPT_PREFIX } from "../constants/promptFieldLimits.js";

import {
  ensureStrategyHtml,
  strategyAiTextToHtml,
  strategyHtmlToPlain,
  strategyHtmlToBaleMarkdown,
  strategyPreviewHtml,
  STRATEGY_HTML_OUTPUT_HINT,
} from "./strategyContentFormat.js";

function agentDebugLog(location, message, data, hypothesisId = "G", runId = "post-fix") {
  // #region agent log
  try {
    const payload = {
      sessionId: "6de48a",
      runId,
      hypothesisId,
      location,
      message,
      data,
      timestamp: Date.now(),
    };
    const candidates = [
      path.resolve(process.cwd(), "../../debug-6de48a.log"),
      path.resolve(process.cwd(), "../debug-6de48a.log"),
      path.resolve(process.cwd(), "debug-6de48a.log"),
      path.resolve("c:/workspace/report-system/debug-6de48a.log"),
    ];
    for (const target of candidates) {
      try {
        fs.appendFileSync(target, `${JSON.stringify(payload)}\n`);
        break;
      } catch (_) { /* try next */ }
    }
    fetch("http://127.0.0.1:7732/ingest/84806bcd-7c67-4feb-bf71-3b9c8b6b47fb", {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Debug-Session-Id": "6de48a" },
      body: JSON.stringify(payload),
    }).catch(() => {});
  } catch (_) { /* ignore */ }
  // #endregion
}

export const OUTPUT_TYPES = {
  soft_war_annex: "پیوست جنگ نرم",
  macro_cognitive: "تحلیل کلان شناختی",
  psyops_strategic: "عملیات روانی راهبردی",
  macro_trends: "روندنگاری کلان",
  strategy_prompt: "خروجی از پرامپت راهبردی",
};

export const OUTPUT_STATUSES = ["draft", "approved", "published", "archived"];

const PUBLISH_USAGE = MESSENGER_USAGE_KEYS.STRATEGY_OUTPUT_PUBLISH;
const MESSENGER_CHUNK_MAX = 3900;

function channelHasUsage(row) {
  const keys = Array.isArray(row?.usage_keys) && row.usage_keys.length
    ? row.usage_keys
    : (row?.usage_key ? [row.usage_key] : []);
  return keys.includes(PUBLISH_USAGE) || row?.usage_key === PUBLISH_USAGE;
}

export function htmlToPlainText(htmlOrText = "") {
  return strategyHtmlToPlain(htmlOrText);
}

export function chunkMessengerText(text, max = MESSENGER_CHUNK_MAX) {
  const raw = String(text || "").trim();
  if (!raw) return [];
  if (raw.length <= max) return [raw];
  const parts = [];
  let rest = raw;
  while (rest.length > max) {
    let cut = rest.lastIndexOf("\n", max);
    if (cut < Math.floor(max * 0.45)) cut = max;
    parts.push(rest.slice(0, cut).trim());
    rest = rest.slice(cut).trim();
  }
  if (rest) parts.push(rest);
  return parts;
}

function normalizeContentFields(body = {}, existing = null) {
  let contentHtml = body.content_html != null
    ? String(body.content_html)
    : (existing?.content_html || "");
  let contentText = body.content_text != null
    ? String(body.content_text)
    : (existing?.content_text || "");

  const beforeProbe = {
    hasSpan: /<span[\s>]/i.test(contentHtml),
    hasFont: /<font[\s>]/i.test(contentHtml),
    hasStyleAttr: /\sstyle\s*=/i.test(contentHtml),
    hasColor: /color\s*[:=]/i.test(contentHtml),
    len: contentHtml.length,
  };

  if (body.content_html != null && body.content_text == null) {
    contentHtml = ensureStrategyHtml(contentHtml);
    contentText = htmlToPlainText(contentHtml);
  } else if (body.content_text != null && body.content_html == null) {
    contentHtml = strategyAiTextToHtml(contentText);
    contentText = htmlToPlainText(contentHtml) || String(contentText || "").trim();
  } else if (body.content_html != null && body.content_text != null) {
    contentHtml = ensureStrategyHtml(contentHtml);
    if (!String(contentText || "").trim()) contentText = htmlToPlainText(contentHtml);
  } else if (!contentHtml && contentText) {
    contentHtml = strategyAiTextToHtml(contentText);
    contentText = htmlToPlainText(contentHtml) || contentText;
  } else if (contentHtml) {
    contentHtml = ensureStrategyHtml(contentHtml);
    if (!contentText) contentText = htmlToPlainText(contentHtml);
  }

  // #region agent log
  agentDebugLog(
    "strategyOutputService.js:normalizeContentFields",
    "backend normalize style retention",
    {
      before: beforeProbe,
      after: {
        hasSpan: /<span[\s>]/i.test(contentHtml),
        hasFont: /<font[\s>]/i.test(contentHtml),
        hasStyleAttr: /\sstyle\s*=/i.test(contentHtml),
        hasColor: /color\s*[:=]/i.test(contentHtml),
        hasFontSize: /font-size/i.test(contentHtml),
        len: contentHtml.length,
        snippet: String(contentHtml).slice(0, 280),
      },
    },
    "H",
  );
  // #endregion

  return { contentHtml, contentText };
}

export function parseSoftWarSections(text = "") {
  const raw = String(text || "");
  const sections = { policies: "", executive_solutions: "", required_actions: "" };
  const patterns = [
    { key: "policies", re: /(?:##\s*سیاست‌ها|<h2[^>]*>\s*سیاست‌ها\s*<\/h2>)\s*([\s\S]*?)(?=(?:##\s*راهکارهای اجرایی|<h2[^>]*>\s*راهکارهای اجرایی\s*<\/h2>)|$)/i },
    { key: "executive_solutions", re: /(?:##\s*راهکارهای اجرایی|<h2[^>]*>\s*راهکارهای اجرایی\s*<\/h2>)\s*([\s\S]*?)(?=(?:##\s*اقدامات لازم|<h2[^>]*>\s*اقدامات لازم\s*<\/h2>)|$)/i },
    { key: "required_actions", re: /(?:##\s*اقدامات لازم|<h2[^>]*>\s*اقدامات لازم\s*<\/h2>)\s*([\s\S]*?)$/i },
  ];
  for (const p of patterns) {
    const m = raw.match(p.re);
    if (m) sections[p.key] = htmlToPlainText(m[1]).trim() || String(m[1] || "").trim();
  }
  if (!sections.policies && !sections.executive_solutions && !sections.required_actions) {
    sections.policies = htmlToPlainText(raw).trim() || raw.trim();
  }
  return sections;
}

export async function listStrategyOutputs(query = {}) {
  const params = [];
  let where = "WHERE 1=1";
  if (query.output_type) {
    params.push(String(query.output_type));
    where += ` AND o.output_type = $${params.length}`;
  }
  if (query.status) {
    params.push(String(query.status));
    where += ` AND o.status = $${params.length}`;
  }
  const r = await pool.query(
    `SELECT o.*, u.name AS creator_name
     FROM tbl_strategy_outputs o
     LEFT JOIN tbl_users u ON u.id = o.created_by
     ${where}
     ORDER BY o.created_at DESC
     LIMIT 200`,
    params,
  );
  return r.rows.map((row) => {
    const html = ensureStrategyHtml(row.content_html || row.content_text || "");
    return {
      ...row,
      content_html: html,
      content_text: htmlToPlainText(html) || row.content_text || "",
      preview_html: strategyPreviewHtml(html, 220),
    };
  });
}

export async function getStrategyOutput(id) {
  const oid = parseInt(id, 10);
  if (!Number.isFinite(oid)) throw new Error("شناسه نامعتبر است");
  const r = await pool.query(
    `SELECT o.*, u.name AS creator_name
     FROM tbl_strategy_outputs o
     LEFT JOIN tbl_users u ON u.id = o.created_by
     WHERE o.id = $1`,
    [oid],
  );
  const row = r.rows[0] || null;
  if (!row) return null;
  const html = ensureStrategyHtml(row.content_html || row.content_text || "");
  return {
    ...row,
    content_html: html,
    content_text: htmlToPlainText(html) || row.content_text || "",
  };
}

export async function getStrategyOutputNormalized(id) {
  const row = await getStrategyOutput(id);
  if (!row) return null;
  const html = ensureStrategyHtml(row.content_html || row.content_text || "");
  return {
    ...row,
    content_html: html,
    content_text: htmlToPlainText(html) || row.content_text || "",
  };
}

export async function createStrategyOutput(body, user) {
  const outputType = String(body?.output_type || "soft_war_annex").trim();
  if (!OUTPUT_TYPES[outputType]) throw new Error("نوع خروجی نامعتبر است");
  const title = String(body?.title || "").trim().slice(0, 400);
  if (!title) throw new Error("عنوان الزامی است");

  let contentJson = body?.content_json && typeof body.content_json === "object"
    ? body.content_json
    : {};
  const { contentHtml, contentText } = normalizeContentFields(body);

  if (outputType === "soft_war_annex" && contentText && !contentJson.policies) {
    contentJson = { ...contentJson, ...parseSoftWarSections(contentText) };
  }

  const r = await pool.query(
    `INSERT INTO tbl_strategy_outputs (
       output_type, title, period_start, period_end, status,
       content_json, content_text, content_html, source_refs, previous_output_id, created_by, prompt_key
     ) VALUES ($1,$2,$3,$4,'draft',$5,$6,$7,$8,$9,$10,$11)
     RETURNING *`,
    [
      outputType,
      title,
      body?.period_start || null,
      body?.period_end || null,
      JSON.stringify(contentJson),
      contentText,
      contentHtml || "",
      JSON.stringify(body?.source_refs || {}),
      body?.previous_output_id ? parseInt(body.previous_output_id, 10) : null,
      user?.id ?? null,
      body?.prompt_key ? String(body.prompt_key).trim().slice(0, 255) : null,
    ],
  );
  return r.rows[0];
}

export async function updateStrategyOutput(id, body, user) {
  const existing = await getStrategyOutput(id);
  if (!existing) throw new Error("خروجی یافت نشد");
  if (existing.status === "archived") throw new Error("خروجی بایگانی‌شده قابل ویرایش نیست");

  const title = body?.title != null ? String(body.title).trim().slice(0, 400) : existing.title;
  const { contentHtml, contentText } = normalizeContentFields(body, existing);
  let contentJson = body?.content_json != null ? body.content_json : existing.content_json;
  if (existing.output_type === "soft_war_annex" && (body?.content_text != null || body?.content_html != null)) {
    contentJson = { ...(typeof contentJson === "object" ? contentJson : {}), ...parseSoftWarSections(contentText) };
  }

  // وضعیت را در JS حساب می‌کنیم تا پارامتر یکسان ($2) هم در SET و هم در CASE
  // باعث «inconsistent types deduced for parameter $2» در Postgres نشود.
  let nextStatus = existing.status;
  if (existing.status === "published") {
    nextStatus = "published";
  } else if (existing.status === "approved") {
    const changed =
      String(contentText || "") !== String(existing.content_text || "")
      || String(contentHtml || "") !== String(existing.content_html || "")
      || String(title || "") !== String(existing.title || "");
    if (changed) nextStatus = "draft";
  }

  const periodStart = body?.period_start != null && body.period_start !== "" ? body.period_start : null;
  const periodEnd = body?.period_end != null && body.period_end !== "" ? body.period_end : null;
  const sourceRefs = body?.source_refs != null ? JSON.stringify(body.source_refs) : null;
  const prevId = body?.previous_output_id != null ? parseInt(body.previous_output_id, 10) : null;
  const params = [
    existing.id,
    title,
    periodStart,
    periodEnd,
    JSON.stringify(contentJson || {}),
    contentText || "",
    contentHtml || "",
    sourceRefs,
    Number.isFinite(prevId) ? prevId : null,
    nextStatus,
  ];

  // #region agent log
  fetch("http://127.0.0.1:7732/ingest/84806bcd-7c67-4feb-bf71-3b9c8b6b47fb", {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-Debug-Session-Id": "6de48a" },
    body: JSON.stringify({
      sessionId: "6de48a",
      runId: "post-fix",
      hypothesisId: "F",
      location: "strategyOutputService.js:updateStrategyOutput",
      message: "update output params before query",
      data: {
        id: existing.id,
        existingStatus: existing.status,
        nextStatus,
        paramTypes: params.map((p) => (p === null ? "null" : typeof p)),
        titleLen: String(title || "").length,
        contentHtmlLen: String(contentHtml || "").length,
        contentTextLen: String(contentText || "").length,
      },
      timestamp: Date.now(),
    }),
  }).catch(() => {});
  // #endregion

  try {
    const r = await pool.query(
      `UPDATE tbl_strategy_outputs SET
         title = $2::varchar(400),
         period_start = COALESCE($3::date, period_start),
         period_end = COALESCE($4::date, period_end),
         content_json = $5::jsonb,
         content_text = $6::text,
         content_html = $7::text,
         source_refs = COALESCE($8::jsonb, source_refs),
         previous_output_id = COALESCE($9::integer, previous_output_id),
         status = $10::varchar(40),
         updated_at = CURRENT_TIMESTAMP
       WHERE id = $1::integer
       RETURNING *`,
      params,
    );
    // #region agent log
    fetch("http://127.0.0.1:7732/ingest/84806bcd-7c67-4feb-bf71-3b9c8b6b47fb", {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Debug-Session-Id": "6de48a" },
      body: JSON.stringify({
        sessionId: "6de48a",
        runId: "post-fix",
        hypothesisId: "F",
        location: "strategyOutputService.js:updateStrategyOutput:ok",
        message: "update output succeeded",
        data: { id: existing.id, status: r.rows[0]?.status },
        timestamp: Date.now(),
      }),
    }).catch(() => {});
    // #endregion
    return r.rows[0];
  } catch (err) {
    // #region agent log
    fetch("http://127.0.0.1:7732/ingest/84806bcd-7c67-4feb-bf71-3b9c8b6b47fb", {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Debug-Session-Id": "6de48a" },
      body: JSON.stringify({
        sessionId: "6de48a",
        runId: "post-fix",
        hypothesisId: "F",
        location: "strategyOutputService.js:updateStrategyOutput:err",
        message: "update output failed",
        data: { id: existing.id, error: String(err?.message || err) },
        timestamp: Date.now(),
      }),
    }).catch(() => {});
    // #endregion
    throw err;
  }
}

export async function approveStrategyOutput(id, user) {
  const existing = await getStrategyOutput(id);
  if (!existing) throw new Error("خروجی یافت نشد");
  if (existing.status === "archived") throw new Error("خروجی بایگانی‌شده قابل تأیید نیست");
  const body = String(existing.content_html || existing.content_text || "").trim();
  if (!body) throw new Error("محتوای خالی قابل تأیید نیست");

  const r = await pool.query(
    `UPDATE tbl_strategy_outputs SET
       status = CASE WHEN status = 'published' THEN 'published' ELSE 'approved' END,
       approved_by = $2,
       approved_at = CURRENT_TIMESTAMP,
       updated_at = CURRENT_TIMESTAMP
     WHERE id = $1
     RETURNING *`,
    [existing.id, user?.id ?? null],
  );
  return r.rows[0];
}

export async function publishStrategyOutput(id, { channelConfigIds = [] } = {}, user) {
  const existing = await getStrategyOutput(id);
  if (!existing) throw new Error("خروجی یافت نشد");
  if (!["approved", "published", "draft"].includes(existing.status)) {
    throw new Error("وضعیت خروجی برای انتشار مناسب نیست");
  }
  // فرماندهی فقط موارد تأییدشده را می‌بیند؛ انتشار هم بهتر است از وضعیت تأیید باشد
  if (existing.status === "draft") {
    throw new Error("ابتدا خروجی را تأیید کنید، سپس منتشر کنید");
  }

  const ids = [...new Set((channelConfigIds || []).map((x) => parseInt(x, 10)).filter(Number.isFinite))];
  const messengerResults = [];

  if (ids.length) {
    const typeLabel = OUTPUT_TYPES[existing.output_type] || existing.output_type;
    const html = ensureStrategyHtml(existing.content_html || existing.content_text || "");
    // فقط در لحظهٔ ارسال به بله: HTML نمایشی → مارک‌داون بله
    const bodyMd = strategyHtmlToBaleMarkdown(html);
    const header = `*${typeLabel}*\n*${existing.title}*`;
    const chunks = chunkMessengerText(`${header}\n\n${bodyMd}`.trim(), MESSENGER_CHUNK_MAX);
    for (const cid of ids) {
      const ch = await getChannelConfigById(cid, { raw: true });
      if (!ch || !ch.is_enabled) throw new Error(`کانال ${cid} یافت نشد یا غیرفعال است`);
      if (!channelHasUsage(ch)) {
        throw new Error(`کانال «${ch.title_fa || cid}» برای انتشار خروجی راهبردی پیکربندی نشده است`);
      }
      const entry = {
        channel_config_id: cid,
        ok: false,
        error: null,
        messageIds: [],
        parts: chunks.length,
      };
      try {
        for (let i = 0; i < chunks.length; i += 1) {
          const partLabel = chunks.length > 1 ? `\n\n(${i + 1}/${chunks.length})` : "";
          const sendRes = await sendMessengerText(cid, `${chunks[i]}${partLabel}`, {
            parseMode: "Markdown",
          });
          entry.messageIds.push(sendRes.messageId);
          await insertMessengerSendLog({
            user_id: user?.id,
            usage_key: PUBLISH_USAGE,
            channel_config_id: cid,
            payload_kind: "text",
            status: "ok",
            platform_message_id: sendRes.messageId,
            request_meta: {
              strategy_output_id: existing.id,
              part: i + 1,
              parts: chunks.length,
              format: "bale_markdown_from_html",
            },
          });
        }
        entry.ok = true;
        entry.messageId = entry.messageIds[entry.messageIds.length - 1] || null;
      } catch (e) {
        entry.error = e.message;
        await insertMessengerSendLog({
          user_id: user?.id,
          usage_key: PUBLISH_USAGE,
          channel_config_id: cid,
          payload_kind: "text",
          status: "error",
          error_message: e.message,
          request_meta: { strategy_output_id: existing.id, parts: chunks.length },
        }).catch(() => {});
      }
      messengerResults.push(entry);
    }
  }

  const r = await pool.query(
    `UPDATE tbl_strategy_outputs SET
       status = 'published',
       published_at = CURRENT_TIMESTAMP,
       approved_by = COALESCE(approved_by, $2),
       approved_at = COALESCE(approved_at, CURRENT_TIMESTAMP),
       updated_at = CURRENT_TIMESTAMP
     WHERE id = $1
     RETURNING *`,
    [existing.id, user?.id ?? null],
  );

  return { output: r.rows[0], messenger_results: messengerResults };
}

export async function listCommandLibrary(query = {}) {
  const from = query.from ? String(query.from).slice(0, 10) : null;
  const to = query.to ? String(query.to).slice(0, 10) : null;
  const hasRange = !!(from && to);
  // انتهای روز inclusive
  const toEnd = hasRange ? `${to} 23:59:59.999` : null;
  const fromStart = hasRange ? `${from} 00:00:00` : null;

  const analysesParams = [];
  let analysesWhere = `WHERE an.status = 'FinalApproved'`;
  if (hasRange) {
    analysesParams.push(fromStart, toEnd);
    analysesWhere += ` AND COALESCE(an.updated_at, an.created_at) >= $1::timestamptz
                       AND COALESCE(an.updated_at, an.created_at) <= $2::timestamptz`;
  }

  const briefsParams = [];
  let briefsWhere = `WHERE b.show_in_command = true
         AND b.status IN ('ManagerApproved', 'EditorApproved', 'Published')`;
  if (hasRange) {
    briefsParams.push(fromStart, toEnd);
    briefsWhere += ` AND COALESCE(b.command_visible_at, b.manager_approved_at, b.created_at) >= $1::timestamptz
                     AND COALESCE(b.command_visible_at, b.manager_approved_at, b.created_at) <= $2::timestamptz`;
  }

  const strategyParams = [];
  let strategyWhere = `WHERE o.status IN ('approved', 'published')`;
  if (hasRange) {
    strategyParams.push(fromStart, toEnd);
    strategyWhere += ` AND COALESCE(o.approved_at, o.published_at, o.created_at) >= $1::timestamptz
                       AND COALESCE(o.approved_at, o.published_at, o.created_at) <= $2::timestamptz`;
  }

  const [analyses, briefs, strategy] = await Promise.all([
    pool.query(
      `SELECT an.id,
              COALESCE(v.title, t.title, 'تحلیل') AS title,
              LEFT(COALESCE(v.content, ''), 280) AS preview,
              COALESCE(v.content, '') AS content_full,
              an.status,
              COALESCE(an.updated_at, an.created_at) AS sort_at,
              a.id AS assignment_id,
              t.id AS topic_id
       FROM tbl_analysis_analyses an
       JOIN tbl_analysis_assignments a ON a.id = an.assignment_id
       LEFT JOIN tbl_analysis_topics t ON t.id = a.topic_id
       LEFT JOIN tbl_analysis_versions v ON v.id = an.final_version_id
       ${analysesWhere}
       ORDER BY COALESCE(an.updated_at, an.created_at) DESC
       LIMIT 80`,
      analysesParams,
    ),
    pool.query(
      `SELECT b.id,
              b.title,
              LEFT(COALESCE(b.bank_content, b.content, ''), 280) AS preview,
              COALESCE(b.bank_content, b.content, '') AS content_full,
              b.status,
              COALESCE(b.command_visible_at, b.manager_approved_at, b.created_at) AS sort_at,
              b.submission_code
       FROM tbl_analysis_brief_submissions b
       ${briefsWhere}
       ORDER BY COALESCE(b.command_visible_at, b.manager_approved_at, b.created_at) DESC
       LIMIT 80`,
      briefsParams,
    ),
    pool.query(
      `SELECT o.id,
              o.title,
              LEFT(COALESCE(o.content_text, ''), 280) AS preview,
              COALESCE(o.content_html, o.content_text, '') AS content_full,
              o.status,
              o.output_type,
              o.prompt_key,
              COALESCE(o.approved_at, o.published_at, o.created_at) AS sort_at
       FROM tbl_strategy_outputs o
       ${strategyWhere}
       ORDER BY COALESCE(o.approved_at, o.published_at, o.created_at) DESC
       LIMIT 80`,
      strategyParams,
    ),
  ]);

  return {
    analyses: analyses.rows.map((row) => ({
      ...row,
      preview_html: strategyPreviewHtml(row.content_full || row.preview || "", 280),
      content_full: undefined,
    })),
    briefs: briefs.rows.map((row) => ({
      ...row,
      preview_html: strategyPreviewHtml(row.content_full || row.preview || "", 280),
      content_full: undefined,
    })),
    strategy: strategy.rows.map((row) => ({
      ...row,
      preview_html: strategyPreviewHtml(row.content_full || row.preview || "", 280),
      content_full: undefined,
    })),
    range: hasRange ? { from, to } : null,
  };
}

export async function getCommandLibraryItem(kind, id) {
  const oid = parseInt(id, 10);
  if (!Number.isFinite(oid)) throw new Error("شناسه نامعتبر است");

  if (kind === "strategy") {
    const row = await getStrategyOutput(oid);
    if (!row || !["approved", "published"].includes(row.status)) return null;
    const html = ensureStrategyHtml(row.content_html || row.content_text || "");
    return {
      kind: "strategy",
      id: row.id,
      title: row.title,
      status: row.status,
      html,
      text: htmlToPlainText(html) || row.content_text || "",
      meta: {
        output_type: row.output_type,
        prompt_key: row.prompt_key,
        period_start: row.period_start,
        period_end: row.period_end,
      },
    };
  }

  if (kind === "brief") {
    const r = await pool.query(
      `SELECT b.*, u.name AS author_name
       FROM tbl_analysis_brief_submissions b
       LEFT JOIN tbl_users u ON u.id = b.author_id
       WHERE b.id = $1
         AND b.show_in_command = true
         AND b.status IN ('ManagerApproved', 'EditorApproved', 'Published')`,
      [oid],
    );
    const row = r.rows[0];
    if (!row) return null;
    const html = ensureStrategyHtml(row.bank_content || row.content || "");
    return {
      kind: "brief",
      id: row.id,
      title: row.title,
      status: row.status,
      html,
      text: htmlToPlainText(html),
      meta: {
        submission_code: row.submission_code,
        author_name: row.author_name,
      },
    };
  }

  if (kind === "analysis") {
    const r = await pool.query(
      `SELECT an.id, an.status, an.final_version_id,
              COALESCE(v.title, t.title, 'تحلیل') AS title,
              COALESCE(v.content, '') AS content,
              t.id AS topic_id,
              a.id AS assignment_id
       FROM tbl_analysis_analyses an
       JOIN tbl_analysis_assignments a ON a.id = an.assignment_id
       LEFT JOIN tbl_analysis_topics t ON t.id = a.topic_id
       LEFT JOIN tbl_analysis_versions v ON v.id = an.final_version_id
       WHERE an.id = $1 AND an.status = 'FinalApproved'`,
      [oid],
    );
    const row = r.rows[0];
    if (!row) return null;
    return {
      kind: "analysis",
      id: row.id,
      title: row.title,
      status: row.status,
      html: ensureStrategyHtml(row.content || ""),
      text: htmlToPlainText(row.content || ""),
      meta: {
        topic_id: row.topic_id,
        assignment_id: row.assignment_id,
      },
    };
  }

  throw new Error("نوع آیتم نامعتبر است");
}

export async function generateSoftWarAnnexDraft(body, user) {
  return generateStrategyOutputDraft(
    {
      ...body,
      prompt_key: body?.prompt_key || "strategy.soft_war_annex",
      sources: body?.sources || {
        news_finalized: false,
        field_verified: false,
        analyses: false,
        prior_strategy: false,
      },
      // سازگاری قدیمی: اگر فقط summary دستی آمده و بازه نیست، digest دستی بساز
      legacy_manual: true,
    },
    user,
  );
}

function resolveOutputTypeForPrompt(promptKey) {
  if (promptKey === "strategy.soft_war_annex") return "soft_war_annex";
  return "strategy_prompt";
}

/**
 * تولید پیش‌نویس خروجی راهبردی از پرامپت انتخابی + بازه/منابع + مراجع متنی.
 */
export async function generateStrategyOutputDraft(body, user) {
  const promptKey = String(body?.prompt_key || "").trim();
  if (!promptKey.startsWith(STRATEGY_PROMPT_PREFIX)) {
    throw new Error("prompt_key باید با strategy. شروع شود");
  }

  const prompt = await getPromptByKey(promptKey);
  if (!prompt) throw new Error("پرامپت راهبردی یافت نشد");

  const referenceTexts = formatReferenceSlotsForPrompt(prompt.reference_slots);
  const extraNotes = String(body?.extra_notes || "").trim();
  let priorAnnex = "";
  if (body?.previous_output_id) {
    const prev = await getStrategyOutput(body.previous_output_id);
    if (prev) priorAnnex = String(prev.content_text || "").slice(0, 8000);
  }

  let assembly = null;
  let periodLabel = String(body?.period_label || "").trim();
  let sourceSummary = String(body?.source_summary || "").trim();
  let periodStart = body?.period_start || null;
  let periodEnd = body?.period_end || null;
  let sourceRefs = body?.source_refs || {};

  const hasRange = !!(body?.from || body?.to || body?.from_jalali || body?.to_jalali || body?.period_start || body?.period_end);
  const wantsSources = body?.sources && Object.values(body.sources).some(Boolean);

  if (hasRange || wantsSources) {
    assembly = await assembleStrategySourceDigest(body);
    periodLabel = periodLabel || assembly.period.period_label;
    periodStart = assembly.period.from;
    periodEnd = assembly.period.to;
    const digest = assembly.digest || "";
    sourceSummary = [digest, sourceSummary].filter(Boolean).join("\n\n").trim();
    sourceRefs = {
      ...(typeof sourceRefs === "object" ? sourceRefs : {}),
      counts: assembly.counts,
      ids: assembly.source_refs,
      truncated: assembly.truncated,
      warnings: assembly.warnings,
    };
  }

  if (!sourceSummary && !referenceTexts && !extraNotes && !priorAnnex) {
    throw new Error("برای تولید، بازه/منابع یا خلاصه ورودی یا محتوای مرجع لازم است");
  }


  let ai;
  try {
    ai = await executeFormAiAction({
      formName: "strategy_command_outputs",
      actionName: "generate_from_strategy_prompt",
      promptKeyOverride: promptKey,
      formData: {
        period_label: periodLabel,
        source_summary: sourceSummary,
        reference_texts: referenceTexts,
        prior_annex: priorAnnex,
        extra_notes: [extraNotes, STRATEGY_HTML_OUTPUT_HINT].filter(Boolean).join("\n\n"),
      },
      userId: user?.id ?? null,
      appendPromptSuffix: STRATEGY_HTML_OUTPUT_HINT,
    });
  } catch (e) {
    throw e;
  }

  const rawAiText = String(ai?.result_text || ai?.text || ai?.draft || "").trim();
  if (!rawAiText) throw new Error("پاسخ هوش‌افزار خالی بود");

  const contentHtml = strategyAiTextToHtml(rawAiText);
  const contentText = htmlToPlainText(contentHtml) || rawAiText;

  const outputType = resolveOutputTypeForPrompt(promptKey);
  const contentJson = outputType === "soft_war_annex"
    ? parseSoftWarSections(rawAiText)
    : {};

  const title = String(
    body?.title
      || `${prompt.title_fa || promptKey} — ${periodLabel || "بدون دوره"}`,
  ).slice(0, 400);

  const created = await createStrategyOutput(
    {
      output_type: outputType,
      title,
      period_start: periodStart,
      period_end: periodEnd,
      content_text: contentText,
      content_html: contentHtml,
      content_json: contentJson,
      source_refs: sourceRefs,
      previous_output_id: body?.previous_output_id || null,
      prompt_key: promptKey,
    },
    user,
  );

  return {
    output: created,
    ai,
    assembly: assembly
      ? {
          counts: assembly.counts,
          source_refs: assembly.source_refs,
          truncated: assembly.truncated,
          warnings: assembly.warnings,
          period: assembly.period,
        }
      : null,
  };
}
