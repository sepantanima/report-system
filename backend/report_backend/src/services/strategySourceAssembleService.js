import moment from "jalali-moment";
import pool from "../db.js";
import { STRATEGY_PROMPT_LIMITS } from "../constants/promptFieldLimits.js";
import { toGregorianDate } from "../utils/analysisHelpers.js";
import { normalizeJalaliDate } from "./newsTextUtils.js";
import {
  instanceNewsAndSql,
  fieldReportListScopeSql,
  fieldReportTypeJoinSql,
} from "./instanceScopeService.js";

const DEFAULT_SOURCES = {
  news_finalized: true,
  field_verified: true,
  analyses: true,
  prior_strategy: true,
};

function gregorianToJalali(ymd) {
  const g = toGregorianDate(ymd);
  if (!g) return null;
  const m = moment(g, "YYYY-MM-DD");
  return m.isValid() ? m.format("jYYYY-jMM-jDD") : null;
}

function normalizeSources(raw) {
  const s = raw && typeof raw === "object" ? raw : {};
  return {
    news_finalized: s.news_finalized !== false,
    field_verified: s.field_verified !== false,
    analyses: s.analyses !== false,
    prior_strategy: s.prior_strategy !== false,
  };
}

/**
 * بازه را از from/to میلادی یا جلالی نرمال می‌کند.
 */
export function resolveStrategyPeriod(body = {}) {
  let fromG = toGregorianDate(body.from || body.period_start);
  let toG = toGregorianDate(body.to || body.period_end);
  let fromJ = normalizeJalaliDate(body.from_jalali) || (fromG ? gregorianToJalali(fromG) : null);
  let toJ = normalizeJalaliDate(body.to_jalali) || (toG ? gregorianToJalali(toG) : null);

  if ((!fromG || !toG) && fromJ && toJ) {
    fromG = toGregorianDate(fromJ);
    toG = toGregorianDate(toJ);
  }

  if (!fromG || !toG) {
    const err = new Error("بازه تاریخ (from/to) الزامی است");
    err.status = 400;
    throw err;
  }
  if (fromG > toG) {
    const err = new Error("تاریخ شروع نباید بعد از تاریخ پایان باشد");
    err.status = 400;
    throw err;
  }

  if (!fromJ) fromJ = gregorianToJalali(fromG);
  if (!toJ) toJ = gregorianToJalali(toG);

  const days =
    Math.floor(
      (new Date(`${toG}T12:00:00`).getTime() - new Date(`${fromG}T12:00:00`).getTime()) / 86400000,
    ) + 1;

  return {
    from: fromG,
    to: toG,
    from_jalali: fromJ,
    to_jalali: toJ,
    days,
    period_label: String(body.period_label || "").trim()
      || `${fromJ} تا ${toJ}`,
  };
}

async function countNewsFinalized(fromJ, toJ) {
  const r = await pool.query(
    `SELECT COUNT(*)::int AS c
     FROM tbl_news n
     WHERE COALESCE(n.is_deleted, false) = false
       AND COALESCE(n.workflow_status, '') = 'finalized'
       AND COALESCE(NULLIF(trim(n.source_date_jalali), ''), NULLIF(trim(n.relay_date_jalali), ''))
           BETWEEN $1 AND $2${instanceNewsAndSql("n")}`,
    [fromJ, toJ],
  );
  return r.rows[0]?.c ?? 0;
}

async function countFieldVerified(fromJ, toJ) {
  const r = await pool.query(
    `SELECT COUNT(*)::int AS c
     FROM tbl_unit_events e
     ${fieldReportTypeJoinSql("e")}
     WHERE COALESCE(e.state, '') = 'verified'
       AND (e.is_deleted = false OR e.is_deleted IS NULL)
       AND e.date BETWEEN $1 AND $2
       ${fieldReportListScopeSql("e", "rt_scope")}`,
    [fromJ, toJ],
  );
  return r.rows[0]?.c ?? 0;
}

async function countAnalyses(fromG, toG) {
  const r = await pool.query(
    `SELECT COUNT(*)::int AS c
     FROM tbl_analysis_assignments a
     WHERE a.status IN ('FinalApproved', 'Archived')
       AND COALESCE(a.updated_at, a.created_at)::date BETWEEN $1::date AND $2::date`,
    [fromG, toG],
  );
  return r.rows[0]?.c ?? 0;
}

async function countPriorStrategy(fromG, toG) {
  const r = await pool.query(
    `SELECT COUNT(*)::int AS c
     FROM tbl_strategy_outputs o
     WHERE o.status = 'published'
       AND COALESCE(o.published_at, o.created_at)::date BETWEEN $1::date AND $2::date`,
    [fromG, toG],
  );
  return r.rows[0]?.c ?? 0;
}

export async function previewStrategySources(body = {}) {
  const period = resolveStrategyPeriod(body);
  const sources = normalizeSources(body.sources);
  const counts = {
    news_finalized: 0,
    field_verified: 0,
    analyses: 0,
    prior_strategy: 0,
    total: 0,
  };

  if (sources.news_finalized) {
    counts.news_finalized = await countNewsFinalized(period.from_jalali, period.to_jalali);
  }
  if (sources.field_verified) {
    counts.field_verified = await countFieldVerified(period.from_jalali, period.to_jalali);
  }
  if (sources.analyses) {
    counts.analyses = await countAnalyses(period.from, period.to);
  }
  if (sources.prior_strategy) {
    counts.prior_strategy = await countPriorStrategy(period.from, period.to);
  }

  counts.total =
    counts.news_finalized + counts.field_verified + counts.analyses + counts.prior_strategy;

  return {
    period,
    sources_requested: sources,
    counts,
    empty: counts.total === 0,
    warnings: counts.total === 0
      ? ["در این بازه و با منابع انتخاب‌شده محتوایی یافت نشد"]
      : [],
  };
}

function clip(text, max) {
  const s = String(text || "").replace(/\s+/g, " ").trim();
  if (s.length <= max) return s;
  return `${s.slice(0, Math.max(0, max - 1))}…`;
}

async function fetchNewsDigest(fromJ, toJ, budget) {
  const r = await pool.query(
    `SELECT n.id, n.cleaned_text, n.summary, n.source,
            COALESCE(NULLIF(trim(n.source_date_jalali), ''), NULLIF(trim(n.relay_date_jalali), '')) AS event_date
     FROM tbl_news n
     WHERE COALESCE(n.is_deleted, false) = false
       AND COALESCE(n.workflow_status, '') = 'finalized'
       AND COALESCE(NULLIF(trim(n.source_date_jalali), ''), NULLIF(trim(n.relay_date_jalali), ''))
           BETWEEN $1 AND $2${instanceNewsAndSql("n")}
     ORDER BY event_date DESC, n.id DESC
     LIMIT 80`,
    [fromJ, toJ],
  );
  const ids = [];
  const lines = [];
  let used = 0;
  for (const row of r.rows) {
    const body = clip(row.summary || row.cleaned_text, 460);
    const line = `- [#${row.id} | ${row.event_date || "—"} | ${clip(row.source || "منبع نامشخص", 60)}]\n  ${body}`;
    if (used + line.length + 1 > budget) break;
    lines.push(line);
    ids.push(row.id);
    used += line.length + 1;
  }
  return { text: lines.join("\n"), ids, used, truncated: ids.length < r.rows.length };
}

async function fetchFieldDigest(fromJ, toJ, budget) {
  const r = await pool.query(
    `SELECT e.id, e.title, e.chat_title, e.date, e.cleaned_text, e.raw_text, e.province, e.priority
     FROM tbl_unit_events e
     ${fieldReportTypeJoinSql("e")}
     WHERE COALESCE(e.state, '') = 'verified'
       AND (e.is_deleted = false OR e.is_deleted IS NULL)
       AND e.date BETWEEN $1 AND $2
       ${fieldReportListScopeSql("e", "rt_scope")}
     ORDER BY e.date DESC, e.id DESC
     LIMIT 80`,
    [fromJ, toJ],
  );
  const ids = [];
  const lines = [];
  let used = 0;
  for (const row of r.rows) {
    const body = clip(row.cleaned_text || row.raw_text || row.title, 420);
    const line = `- [#${row.id} | ${row.date || "—"} | ${row.province || "—"} | اولویت ${row.priority ?? "—"}] ${clip(row.title || row.chat_title || "رصد", 120)}\n  ${body}`;
    if (used + line.length + 1 > budget) break;
    lines.push(line);
    ids.push(row.id);
    used += line.length + 1;
  }
  return { text: lines.join("\n"), ids, used, truncated: ids.length < r.rows.length };
}

async function fetchAnalysesDigest(fromG, toG, budget) {
  const r = await pool.query(
    `SELECT a.id, a.status, a.updated_at, a.created_at,
            t.title AS topic_title,
            (
              SELECT LEFT(COALESCE(v.content, ''), 800)
              FROM tbl_analysis_analyses an
              JOIN tbl_analysis_versions v ON v.analysis_id = an.id
              WHERE an.assignment_id = a.id
              ORDER BY v.id DESC
              LIMIT 1
            ) AS content_preview
     FROM tbl_analysis_assignments a
     LEFT JOIN tbl_analysis_topics t ON t.id = a.topic_id
     WHERE a.status IN ('FinalApproved', 'Archived')
       AND COALESCE(a.updated_at, a.created_at)::date BETWEEN $1::date AND $2::date
     ORDER BY COALESCE(a.updated_at, a.created_at) DESC
     LIMIT 40`,
    [fromG, toG],
  );
  const ids = [];
  const lines = [];
  let used = 0;
  for (const row of r.rows) {
    const line = `- [مأموریت #${row.id} | ${row.status}] ${clip(row.topic_title || "بدون موضوع", 140)}\n  ${clip(row.content_preview || "—", 500)}`;
    if (used + line.length + 1 > budget) break;
    lines.push(line);
    ids.push(row.id);
    used += line.length + 1;
  }
  return { text: lines.join("\n"), ids, used, truncated: ids.length < r.rows.length };
}

async function fetchPriorStrategyDigest(fromG, toG, budget) {
  const r = await pool.query(
    `SELECT o.id, o.title, o.output_type, o.content_text, o.published_at, o.created_at
     FROM tbl_strategy_outputs o
     WHERE o.status = 'published'
       AND COALESCE(o.published_at, o.created_at)::date BETWEEN $1::date AND $2::date
     ORDER BY COALESCE(o.published_at, o.created_at) DESC
     LIMIT 20`,
    [fromG, toG],
  );
  const ids = [];
  const lines = [];
  let used = 0;
  for (const row of r.rows) {
    const line = `- [خروجی #${row.id} | ${row.output_type}] ${clip(row.title || "بدون عنوان", 140)}\n  ${clip(row.content_text, 700)}`;
    if (used + line.length + 1 > budget) break;
    lines.push(line);
    ids.push(row.id);
    used += line.length + 1;
  }
  return { text: lines.join("\n"), ids, used, truncated: ids.length < r.rows.length };
}

/**
 * ساخت digest متنی منابع برای تزریق به AI + شمارش و شناسه‌ها.
 */
export async function assembleStrategySourceDigest(body = {}) {
  const period = resolveStrategyPeriod(body);
  const sources = normalizeSources(body.sources);
  const maxChars = Math.min(
    Number(body.max_digest_chars) || STRATEGY_PROMPT_LIMITS.sourceDigestMaxChars,
    STRATEGY_PROMPT_LIMITS.sourceDigestMaxChars,
  );

  const preview = await previewStrategySources({ ...body, sources });
  const sections = [];
  const source_refs = {
    news_ids: [],
    field_ids: [],
    analysis_assignment_ids: [],
    strategy_output_ids: [],
  };
  const warnings = [...(preview.warnings || [])];
  let remaining = maxChars;
  let truncated = false;

  const pushSection = (title, block) => {
    if (!block?.text) return;
    const header = `## ${title}\n`;
    const chunk = header + block.text;
    if (chunk.length > remaining) {
      truncated = true;
      return;
    }
    sections.push(chunk);
    remaining -= chunk.length + 2;
  };

  if (sources.news_finalized && remaining > 200) {
    const block = await fetchNewsDigest(period.from_jalali, period.to_jalali, remaining - 40);
    source_refs.news_ids = block.ids;
    if (block.truncated) truncated = true;
    pushSection("اخبار نهایی‌شده", block);
  }
  if (sources.field_verified && remaining > 200) {
    const block = await fetchFieldDigest(period.from_jalali, period.to_jalali, remaining - 40);
    source_refs.field_ids = block.ids;
    if (block.truncated) truncated = true;
    pushSection("رصدهای میدانی تأییدشده", block);
  }
  if (sources.analyses && remaining > 200) {
    const block = await fetchAnalysesDigest(period.from, period.to, remaining - 40);
    source_refs.analysis_assignment_ids = block.ids;
    if (block.truncated) truncated = true;
    pushSection("تحلیل‌های نهایی", block);
  }
  if (sources.prior_strategy && remaining > 200) {
    const block = await fetchPriorStrategyDigest(period.from, period.to, remaining - 40);
    source_refs.strategy_output_ids = block.ids;
    if (block.truncated) truncated = true;
    pushSection("خروجی‌های راهبردی قبلی", block);
  }

  if (truncated) {
    warnings.push("به‌خاطر محدودیت حجم کانتکست، بخشی از محتوا خلاصه/حذف شده است");
  }

  const digest = sections.join("\n\n").trim();
  return {
    period,
    sources_requested: sources,
    counts: preview.counts,
    digest,
    source_refs,
    truncated,
    warnings,
    empty: !digest,
  };
}
