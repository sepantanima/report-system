import pool from "../db.js";
import { sendMessengerText } from "./messengerSend.js";
import { insertMessengerSendLog } from "./messengerSendLogService.js";
import { getChannelConfigById } from "./messengerChannelConfigService.js";
import { MESSENGER_USAGE_KEYS } from "../constants/messengerUsageKeys.js";
import { executeFormAiAction } from "./aiFormRunOrchestrator.js";

export const OUTPUT_TYPES = {
  soft_war_annex: "پیوست جنگ نرم",
  macro_cognitive: "تحلیل کلان شناختی",
  psyops_strategic: "عملیات روانی راهبردی",
  macro_trends: "روندنگاری کلان",
};

export const OUTPUT_STATUSES = ["draft", "published", "archived"];

const PUBLISH_USAGE = MESSENGER_USAGE_KEYS.STRATEGY_OUTPUT_PUBLISH;

function channelHasUsage(row) {
  const keys = Array.isArray(row?.usage_keys) && row.usage_keys.length
    ? row.usage_keys
    : (row?.usage_key ? [row.usage_key] : []);
  return keys.includes(PUBLISH_USAGE) || row?.usage_key === PUBLISH_USAGE;
}

export function parseSoftWarSections(text = "") {
  const raw = String(text || "");
  const sections = { policies: "", executive_solutions: "", required_actions: "" };
  const patterns = [
    { key: "policies", re: /##\s*سیاست‌ها\s*([\s\S]*?)(?=##\s*راهکارهای اجرایی|$)/ },
    { key: "executive_solutions", re: /##\s*راهکارهای اجرایی\s*([\s\S]*?)(?=##\s*اقدامات لازم|$)/ },
    { key: "required_actions", re: /##\s*اقدامات لازم\s*([\s\S]*?)$/ },
  ];
  for (const p of patterns) {
    const m = raw.match(p.re);
    if (m) sections[p.key] = m[1].trim();
  }
  if (!sections.policies && !sections.executive_solutions && !sections.required_actions) {
    sections.policies = raw.trim();
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
  return r.rows;
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
  return r.rows[0] || null;
}

export async function createStrategyOutput(body, user) {
  const outputType = String(body?.output_type || "soft_war_annex").trim();
  if (!OUTPUT_TYPES[outputType]) throw new Error("نوع خروجی نامعتبر است");
  const title = String(body?.title || "").trim().slice(0, 400);
  if (!title) throw new Error("عنوان الزامی است");

  let contentJson = body?.content_json && typeof body.content_json === "object"
    ? body.content_json
    : {};
  let contentText = String(body?.content_text || "").trim();

  if (outputType === "soft_war_annex" && contentText && !contentJson.policies) {
    contentJson = { ...contentJson, ...parseSoftWarSections(contentText) };
  }

  const r = await pool.query(
    `INSERT INTO tbl_strategy_outputs (
       output_type, title, period_start, period_end, status,
       content_json, content_text, source_refs, previous_output_id, created_by
     ) VALUES ($1,$2,$3,$4,'draft',$5,$6,$7,$8,$9)
     RETURNING *`,
    [
      outputType,
      title,
      body?.period_start || null,
      body?.period_end || null,
      JSON.stringify(contentJson),
      contentText,
      JSON.stringify(body?.source_refs || {}),
      body?.previous_output_id ? parseInt(body.previous_output_id, 10) : null,
      user?.id ?? null,
    ],
  );
  return r.rows[0];
}

export async function updateStrategyOutput(id, body, user) {
  const existing = await getStrategyOutput(id);
  if (!existing) throw new Error("خروجی یافت نشد");
  if (existing.status === "archived") throw new Error("خروجی بایگانی‌شده قابل ویرایش نیست");

  const title = body?.title != null ? String(body.title).trim().slice(0, 400) : existing.title;
  let contentText = body?.content_text != null ? String(body.content_text) : existing.content_text;
  let contentJson = body?.content_json != null ? body.content_json : existing.content_json;
  if (existing.output_type === "soft_war_annex" && body?.content_text != null) {
    contentJson = { ...(typeof contentJson === "object" ? contentJson : {}), ...parseSoftWarSections(contentText) };
  }

  const r = await pool.query(
    `UPDATE tbl_strategy_outputs SET
       title = $2,
       period_start = COALESCE($3, period_start),
       period_end = COALESCE($4, period_end),
       content_json = $5,
       content_text = $6,
       source_refs = COALESCE($7, source_refs),
       previous_output_id = COALESCE($8, previous_output_id),
       updated_at = CURRENT_TIMESTAMP
     WHERE id = $1
     RETURNING *`,
    [
      existing.id,
      title,
      body?.period_start ?? null,
      body?.period_end ?? null,
      JSON.stringify(contentJson || {}),
      contentText || "",
      body?.source_refs != null ? JSON.stringify(body.source_refs) : null,
      body?.previous_output_id != null ? parseInt(body.previous_output_id, 10) : null,
    ],
  );
  return r.rows[0];
}

export async function publishStrategyOutput(id, { channelConfigIds = [] } = {}, user) {
  const existing = await getStrategyOutput(id);
  if (!existing) throw new Error("خروجی یافت نشد");

  const ids = [...new Set((channelConfigIds || []).map((x) => parseInt(x, 10)).filter(Number.isFinite))];
  const messengerResults = [];

  if (ids.length) {
    const typeLabel = OUTPUT_TYPES[existing.output_type] || existing.output_type;
    const text = `【${typeLabel}】\n${existing.title}\n\n${String(existing.content_text || "").slice(0, 3500)}`.slice(0, 4096);
    for (const cid of ids) {
      const ch = await getChannelConfigById(cid, { raw: true });
      if (!ch || !ch.is_enabled) throw new Error(`کانال ${cid} یافت نشد یا غیرفعال است`);
      if (!channelHasUsage(ch)) {
        throw new Error(`کانال «${ch.title_fa || cid}» برای انتشار خروجی راهبردی پیکربندی نشده است`);
      }
      const entry = { channel_config_id: cid, ok: false, error: null, messageId: null };
      try {
        const sendRes = await sendMessengerText(cid, text);
        await insertMessengerSendLog({
          user_id: user?.id,
          usage_key: PUBLISH_USAGE,
          channel_config_id: cid,
          payload_kind: "text",
          status: "ok",
          platform_message_id: sendRes.messageId,
          request_meta: { strategy_output_id: existing.id },
        });
        entry.ok = true;
        entry.messageId = sendRes.messageId;
      } catch (e) {
        entry.error = e.message;
        await insertMessengerSendLog({
          user_id: user?.id,
          usage_key: PUBLISH_USAGE,
          channel_config_id: cid,
          payload_kind: "text",
          status: "error",
          error_message: e.message,
          request_meta: { strategy_output_id: existing.id },
        }).catch(() => {});
      }
      messengerResults.push(entry);
    }
  }

  const r = await pool.query(
    `UPDATE tbl_strategy_outputs SET
       status = 'published',
       published_at = CURRENT_TIMESTAMP,
       updated_at = CURRENT_TIMESTAMP
     WHERE id = $1
     RETURNING *`,
    [existing.id],
  );

  return { output: r.rows[0], messenger_results: messengerResults };
}

export async function generateSoftWarAnnexDraft(body, user) {
  const periodLabel = String(body?.period_label || "").trim();
  const sourceSummary = String(body?.source_summary || "").trim();
  const extraNotes = String(body?.extra_notes || "").trim();
  let priorAnnex = "";
  if (body?.previous_output_id) {
    const prev = await getStrategyOutput(body.previous_output_id);
    if (prev) priorAnnex = String(prev.content_text || "").slice(0, 8000);
  }

  const ai = await executeFormAiAction({
    formName: "strategy_command_outputs",
    actionName: "generate_soft_war_annex",
    formData: {
      period_label: periodLabel,
      source_summary: sourceSummary,
      prior_annex: priorAnnex,
      extra_notes: extraNotes,
    },
    userId: user?.id ?? null,
  });

  const contentText = String(ai?.result_text || ai?.text || ai?.draft || "").trim();
  if (!contentText) throw new Error("پاسخ هوش‌افزار خالی بود");

  const contentJson = parseSoftWarSections(contentText);
  const title = String(body?.title || `پیوست جنگ نرم — ${periodLabel || "بدون دوره"}`).slice(0, 400);

  const created = await createStrategyOutput(
    {
      output_type: "soft_war_annex",
      title,
      period_start: body?.period_start || null,
      period_end: body?.period_end || null,
      content_text: contentText,
      content_json: contentJson,
      source_refs: body?.source_refs || {},
      previous_output_id: body?.previous_output_id || null,
    },
    user,
  );

  return { output: created, ai };
}
