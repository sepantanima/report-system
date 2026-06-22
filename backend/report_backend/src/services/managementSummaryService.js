import crypto from "crypto";
import pool from "../db.js";
import { resolvePeriod, periodKindLabelFa } from "../utils/managementPeriod.js";

export const SUMMARY_TYPES = new Set(["provincial", "special", "general"]);

const SUMMARY_TYPE_FA = { provincial: "استانی", special: "یگان (محدود)", general: "عمومی" };

const CLASSIFICATION_FA = { 1: "عمومی", 2: "استانی", 3: "واحد", 4: "خاص" };

export function summaryTypeLabelFa(t) {
  return SUMMARY_TYPE_FA[t] || t;
}

function toPersianDigits(val) {
  return String(val ?? "").replace(/[0-9]/g, (d) => "۰۱۲۳۴۵۶۷۸۹"[d]);
}

/** اتصال فارسی اعضای لیست: «الف، ب و ج» */
function faJoin(items) {
  const arr = (items || []).filter(Boolean);
  if (!arr.length) return "";
  if (arr.length === 1) return arr[0];
  return `${arr.slice(0, -1).join("، ")} و ${arr[arr.length - 1]}`;
}

/** نمایش تاریخ شمسی ذخیره‌شده (YYYY-MM-DD) با ارقام فارسی و جداکننده اسلش */
export function faJalali(dateStr) {
  if (!dateStr) return "—";
  return toPersianDigits(String(dateStr).replace(/-/g, "/"));
}

function normalizeStringArray(v) {
  if (!Array.isArray(v)) return [];
  const seen = new Set();
  const out = [];
  for (const item of v) {
    const s = String(item ?? "").trim();
    if (s && !seen.has(s)) {
      seen.add(s);
      out.push(s);
    }
  }
  return out;
}

function parseClassificationOptional(c) {
  if (c === undefined || c === null || c === "" || c === "all") return null;
  const map = { عمومی: 1, استانی: 2, واحد: 3, خاص: 4 };
  if (map[c]) return map[c];
  const n = parseInt(c, 10);
  return [1, 2, 3, 4].includes(n) ? n : null;
}

function parseClassificationsArray(body = {}) {
  if (Array.isArray(body.classifications)) {
    const seen = new Set();
    const out = [];
    for (const item of body.classifications) {
      const n = parseClassificationOptional(item);
      if (n != null && !seen.has(n)) {
        seen.add(n);
        out.push(n);
      }
    }
    return out;
  }
  const single = parseClassificationOptional(body.classification);
  return single != null ? [single] : [];
}

function deriveSummaryType(classifications, provinces, unitCodes) {
  if (unitCodes.length) return "special";
  if (provinces.length) return "provincial";
  if (classifications.length === 1 && classifications[0] === 1) return "general";
  if (classifications.some((c) => c === 3 || c === 4)) return "special";
  if (classifications.some((c) => c === 2)) return "provincial";
  return "provincial";
}

/** بخش بازه در زیرعنوان — برای یک روز از «برای یک روز» استفاده می‌شود */
export function buildRangePart(periodStart, periodEnd, dayCount) {
  if (periodStart === periodEnd || dayCount === 1) {
    return `برای یک روز (${faJalali(periodStart)})`;
  }
  return `از ${faJalali(periodStart)} تا ${faJalali(periodEnd)}`;
}

/** نرمال‌سازی فیلترهای ورودی فرم ایجاد خلاصه — دامنهٔ انتشار، نوع خلاصه و فیلتر جغرافی را هم‌راستا می‌کند */
export function resolveFilters(body = {}) {
  const classifications = parseClassificationsArray(body);
  const cls = classifications.length === 1 ? classifications[0] : classifications[0] ?? null;

  let provinces = [];
  let unitCodes = [];

  if (classifications.length === 1 && classifications[0] === 1) {
    provinces = [];
    unitCodes = [];
  } else {
    const allowProvinces = !classifications.length || classifications.includes(2);
    const allowUnits = !classifications.length || classifications.some((c) => c === 3 || c === 4);
    if (allowProvinces) provinces = normalizeStringArray(body.provinces);
    if (allowUnits) unitCodes = normalizeStringArray(body.unit_codes);
  }

  let summaryType = deriveSummaryType(classifications, provinces, unitCodes);
  if (!classifications.length && SUMMARY_TYPES.has(body.summary_type)) {
    summaryType = body.summary_type;
    if (summaryType === "provincial" || summaryType === "general") {
      provinces = summaryType === "provincial" ? normalizeStringArray(body.provinces) : [];
    }
    if (summaryType === "special") {
      unitCodes = normalizeStringArray(body.unit_codes);
    }
  }

  const { periodKind, periodStart, periodEnd, dayCount } = resolvePeriod({
    period_kind: body.period_kind,
    period_start: body.period_start,
    period_end: body.period_end,
  });
  return {
    summaryType,
    periodKind,
    periodStart,
    periodEnd,
    dayCount,
    provinces,
    unitCodes,
    topics: normalizeStringArray(body.topics),
    classification: cls,
    classifications,
    onlyVerified: body.only_verified !== false && body.only_verified !== "false",
  };
}

/** هش کانونیکال فیلترها برای تشخیص خلاصه تکراری */
export function computeFilterSignature(f) {
  const canonical = JSON.stringify({
    type: f.summaryType,
    kind: f.periodKind,
    start: f.periodStart,
    end: f.periodEnd,
    provinces: [...f.provinces].sort(),
    units: [...f.unitCodes].sort(),
    topics: [...f.topics].sort(),
    classifications: [...(f.classifications || [])].sort(),
    classification: f.classification,
    onlyVerified: f.onlyVerified,
  });
  return crypto.createHash("sha256").update(canonical).digest("hex");
}

async function getUnitNames(unitCodes) {
  if (!unitCodes?.length) return [];
  const r = await pool.query(
    `SELECT "UnitCode", COALESCE(NULLIF(TRIM("Name"), ''), "UnitShortName") AS unit_display_name
     FROM tbl_units WHERE "UnitCode"::text = ANY($1::text[])`,
    [unitCodes],
  );
  const byCode = new Map(r.rows.map((row) => [String(row.UnitCode), row.unit_display_name]));
  return unitCodes.map((c) => byCode.get(String(c)) || String(c));
}

/**
 * ساخت جمله زیرعنوان از روی فیلترها، مثل:
 * «بررسی شایعات و نقاط قوت گزارش‌های هفتگی از ۱۴۰۵/۰۲/۰۱ تا ۱۴۰۵/۰۲/۰۸ برای استان‌های فارس و خوزستان»
 */
export function buildSubtitle(f, unitNames = []) {
  const topicsPart = f.topics.length ? faJoin(f.topics) : "همه موضوعات";
  const kindFa = periodKindLabelFa(f.periodKind);
  const kindPart = f.periodKind === "custom" ? "گزارش‌های بازه دلخواه" : `گزارش‌های ${kindFa}`;
  const rangePart = buildRangePart(f.periodStart, f.periodEnd, f.dayCount);

  const classifications = f.classifications || [];
  let scopePart;

  if (classifications.length === 1 && classifications[0] === 1 && f.summaryType === "general") {
    scopePart = "دامنه عمومی (کل کشور)";
  } else {
    const scopeBits = [];
    if (classifications.length) {
      const labels = classifications.map((c) => CLASSIFICATION_FA[c]).filter(Boolean);
      if (labels.length) scopeBits.push(`دامنه ${faJoin(labels)}`);
    }

    const showProvinces = !classifications.length || classifications.includes(2);
    const showUnits = !classifications.length || classifications.some((c) => c === 3 || c === 4);

    if (showProvinces && (f.summaryType === "provincial" || f.provinces.length)) {
      if (f.provinces.length) {
        scopeBits.push(`برای ${f.provinces.length > 1 ? "استان‌های" : "استان"} ${faJoin(f.provinces)}`);
      } else if (classifications.includes(2) || !classifications.length) {
        scopeBits.push("برای همه استان‌ها");
      }
    }
    if (showUnits && (f.summaryType === "special" || f.unitCodes.length)) {
      if (unitNames.length) {
        scopeBits.push(`برای ${unitNames.length > 1 ? "یگان‌های" : "یگان"} ${faJoin(unitNames)}`);
      } else {
        scopeBits.push("برای همه یگان‌ها");
      }
    }

    scopePart = scopeBits.length ? scopeBits.join(" ") : "برای همه دامنه‌ها";
  }

  return `بررسی ${topicsPart} ${kindPart} ${rangePart} ${scopePart}`;
}

/** واکشی گزارش‌های میدانی منطبق با فیلترها (تاریخ‌ها شمسی، هم‌فرمت با فیلد date) */
export async function fetchReportsForFilters(f) {
  const params = [f.periodStart, f.periodEnd];
  let q = `
    SELECT e.hash_key, e.title, e.chat_title, e.date, e.time, e.state, e.cleaned_text, e.raw_text,
           e.classification, e.unitcd,
           COALESCE(NULLIF(TRIM(u."Name"), ''), u."UnitShortName") AS "UnitName",
           COALESCE(u."StateName", e.province) AS "StateName"
    FROM tbl_unit_events e
    LEFT JOIN tbl_units u ON e.unitcd = u."UnitCode"
    WHERE e.date BETWEEN $1 AND $2
      AND (e.is_deleted = false OR e.is_deleted IS NULL)
  `;
  if (f.provinces.length) {
    params.push(f.provinces);
    q += ` AND COALESCE(u."StateName", e.province) = ANY($${params.length}::text[])`;
  }
  if (f.unitCodes.length) {
    params.push(f.unitCodes);
    q += ` AND e.unitcd::text = ANY($${params.length}::text[])`;
  }
  if (f.topics.length) {
    params.push(f.topics);
    q += ` AND e.chat_title = ANY($${params.length}::text[])`;
  }
  if (f.classifications?.length) {
    params.push(f.classifications);
    q += ` AND e.classification = ANY($${params.length}::int[])`;
  } else if (f.classification != null) {
    params.push(f.classification);
    q += ` AND e.classification = $${params.length}`;
  }
  if (f.onlyVerified) {
    q += ` AND e.state = 'verified'`;
  }
  q += ` ORDER BY e.date DESC, e.time DESC LIMIT 1000`;
  const r = await pool.query(q, params);
  return r.rows;
}

/** پیش‌نمایش گزارش‌های منطبق + زیرعنوان پیشنهادی برای فرم ایجاد */
export async function previewReports(body) {
  const f = resolveFilters(body);
  const [rows, unitNames] = await Promise.all([
    fetchReportsForFilters(f),
    getUnitNames(f.unitCodes),
  ]);
  return {
    summary_type: f.summaryType,
    period_kind: f.periodKind,
    period_start: f.periodStart,
    period_end: f.periodEnd,
    day_count: f.dayCount,
    classification: f.classification,
    classifications: f.classifications,
    subtitle: buildSubtitle(f, unitNames),
    count: rows.length,
    hash_keys: rows.map((r) => r.hash_key),
    reports: rows.map((r) => ({
      hash_key: r.hash_key,
      date: r.date,
      time: r.time,
      state: r.state,
      title: r.title,
      chat_title: r.chat_title,
      UnitName: r.UnitName,
      StateName: r.StateName,
      text: String(r.cleaned_text || r.raw_text || "").slice(0, 6000),
      cleaned_text: r.cleaned_text ? String(r.cleaned_text).slice(0, 6000) : null,
      raw_text: r.raw_text ? String(r.raw_text).slice(0, 2000) : null,
    })),
  };
}

export function buildDigest(rows, maxItems = 100, textSlice = 450) {
  const lines = [];
  let i = 0;
  for (const row of rows) {
    if (i++ >= maxItems) {
      lines.push(`... و ${rows.length - maxItems} گزارش دیگر`);
      break;
    }
    const title = (row.title || "").slice(0, 120);
    const topic = (row.chat_title || "").slice(0, 120);
    const unit = row.UnitName || "";
    const dt = row.date || "";
    const txt = (row.cleaned_text || row.raw_text || "").replace(/\s+/g, " ").slice(0, textSlice);
    lines.push(`- [${row.hash_key}] ${dt} | ${unit} | موضوع: ${topic} | عنوان: ${title}\n  متن: ${txt}`);
  }
  return lines.join("\n");
}

export async function aiDraft(body, userId = null) {
  const { executeFormAiAction } = await import("./aiFormRunOrchestrator.js");
  return executeFormAiAction({
    formName: "field_management_summary_create",
    actionName: "generate_summary",
    formData: body,
    userId,
  });
}

/**
 * ذخیره خلاصه جدید: زیرعنوان سمت سرور ساخته می‌شود و در صورت تکراری بودن
 * امضای فیلترها، شمارنده به عنوان و زیرعنوان الحاق می‌شود.
 */
export async function saveSummary(body, userId) {
  const f = resolveFilters(body);
  const signature = computeFilterSignature(f);

  let keys = Array.isArray(body.hash_keys) ? body.hash_keys.filter(Boolean) : null;
  if (!keys || !keys.length) {
    const rows = await fetchReportsForFilters(f);
    keys = rows.map((r) => r.hash_key);
  }

  const unitNames = await getUnitNames(f.unitCodes);
  const baseSubtitle = buildSubtitle(f, unitNames);
  const baseTitle = String(body.title || "").trim().slice(0, 480) || "خلاصه مدیریتی گزارشات میدانی";

  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const seqRes = await client.query(
      `SELECT COALESCE(MAX(seq_no), 0) AS max_seq FROM tbl_field_management_summaries WHERE filter_signature = $1`,
      [signature],
    );
    const seqNo = (parseInt(seqRes.rows[0].max_seq, 10) || 0) + 1;
    const suffix = seqNo > 1 ? ` — شماره ${toPersianDigits(seqNo)}` : "";
    const title = `${baseTitle}${suffix}`;
    const subtitle = `${baseSubtitle}${suffix}`;

    const ins = await client.query(
      `INSERT INTO tbl_field_management_summaries (
         title, subtitle, summary_type, period_kind, period_start, period_end,
         provinces, unit_codes, topics, classification, classifications, only_verified,
         filter_signature, seq_no, report_count, summary_body,
         prompt_key_used, ai_usage_key_used, ai_config_id_used, created_by, updated_at
       ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,CURRENT_TIMESTAMP)
       RETURNING id, title, subtitle, seq_no`,
      [
        title,
        subtitle,
        f.summaryType,
        f.periodKind,
        f.periodStart,
        f.periodEnd,
        f.provinces,
        f.unitCodes,
        f.topics,
        f.classification,
        f.classifications,
        f.onlyVerified,
        signature,
        seqNo,
        keys.length,
        String(body.summary_body || ""),
        body.prompt_key_used || null,
        body.ai_usage_key_used || null,
        body.ai_config_id_used != null ? parseInt(body.ai_config_id_used, 10) : null,
        userId ?? null,
      ],
    );
    const summaryId = ins.rows[0].id;
    for (const hk of keys) {
      await client.query(
        `INSERT INTO tbl_field_mgmt_summary_report_refs (summary_id, hash_key) VALUES ($1, $2)
         ON CONFLICT (summary_id, hash_key) DO NOTHING`,
        [summaryId, hk],
      );
    }
    await client.query("COMMIT");
    return ins.rows[0];
  } catch (e) {
    await client.query("ROLLBACK");
    throw e;
  } finally {
    client.release();
  }
}

/** ویرایش متن خلاصه و/یا عنوان (عنوان حداکثر ۴۸۰ کاراکتر) */
export async function updateSummary(id, body = {}) {
  const parts = [];
  const params = [];
  let i = 1;
  if (body.summary_body !== undefined) {
    parts.push(`summary_body = $${i++}`);
    params.push(String(body.summary_body || ""));
  }
  if (body.title !== undefined) {
    parts.push(`title = $${i++}`);
    params.push(String(body.title ?? "").trim().slice(0, 480));
  }
  if (!parts.length) return null;
  params.push(id);
  const r = await pool.query(
    `UPDATE tbl_field_management_summaries
     SET ${parts.join(", ")}, updated_at = CURRENT_TIMESTAMP
     WHERE id = $${i}
     RETURNING id`,
    params,
  );
  return r.rows.length ? r.rows[0] : null;
}

const SORTABLE_COLUMNS = {
  id: "s.id",
  created_at: "s.created_at",
  summary_type: "s.summary_type",
  title: "s.title",
  subtitle: "s.subtitle",
  period_start: "s.period_start",
  period_end: "s.period_end",
  period_kind: "s.period_kind",
  report_count: "s.report_count",
};

/** لیست خلاصه‌ها با جستجو، فیلتر، مرتب‌سازی و صفحه‌بندی */
export async function listSummaries(query = {}) {
  const params = [];
  let where = ` WHERE 1=1`;

  const q = String(query.q || "").trim();
  if (q) {
    params.push(`%${q}%`);
    where += ` AND (s.title ILIKE $${params.length} OR s.subtitle ILIKE $${params.length})`;
  }
  if (query.summary_type && SUMMARY_TYPES.has(query.summary_type)) {
    params.push(query.summary_type);
    where += ` AND s.summary_type = $${params.length}`;
  }
  if (query.period_kind) {
    params.push(String(query.period_kind));
    where += ` AND s.period_kind = $${params.length}`;
  }
  const provinces = normalizeStringArray(
    typeof query.provinces === "string" ? query.provinces.split(",") : query.provinces,
  );
  if (provinces.length) {
    params.push(provinces);
    where += ` AND s.provinces && $${params.length}::text[]`;
  }
  const units = normalizeStringArray(
    typeof query.units === "string" ? query.units.split(",") : query.units,
  );
  if (units.length) {
    params.push(units);
    where += ` AND s.unit_codes && $${params.length}::text[]`;
  }
  const topics = normalizeStringArray(
    typeof query.topics === "string" ? query.topics.split(",") : query.topics,
  );
  if (topics.length) {
    params.push(topics);
    where += ` AND s.topics && $${params.length}::text[]`;
  }
  // فیلتر تاریخ ایجاد: ورودی میلادی ISO (تبدیل از شمسی سمت کلاینت)
  if (query.created_from) {
    params.push(query.created_from);
    where += ` AND s.created_at::date >= $${params.length}::date`;
  }
  if (query.created_to) {
    params.push(query.created_to);
    where += ` AND s.created_at::date <= $${params.length}::date`;
  }

  const sortCol = SORTABLE_COLUMNS[query.sort_by] || "s.created_at";
  const sortDir = String(query.sort_dir).toLowerCase() === "asc" ? "ASC" : "DESC";

  const lim = Math.min(parseInt(query.limit, 10) || 20, 200);
  const off = parseInt(query.offset, 10) || 0;
  params.push(lim, off);

  const r = await pool.query(
    `SELECT s.*, usr.name AS created_by_name, COUNT(*) OVER() AS total_count
     FROM tbl_field_management_summaries s
     LEFT JOIN tbl_users usr ON usr.id = s.created_by
     ${where}
     ORDER BY ${sortCol} ${sortDir}, s.id DESC
     LIMIT $${params.length - 1} OFFSET $${params.length}`,
    params,
  );
  const total = r.rows.length ? parseInt(r.rows[0].total_count, 10) : 0;
  return {
    total,
    rows: r.rows.map(({ total_count, ...row }) => row),
  };
}

export async function getSummaryById(id) {
  const s = await pool.query(
    `SELECT s.*, usr.name AS created_by_name
     FROM tbl_field_management_summaries s
     LEFT JOIN tbl_users usr ON usr.id = s.created_by
     WHERE s.id = $1`,
    [id],
  );
  if (!s.rows.length) return null;
  const summary = s.rows[0];
  summary.unit_names = await getUnitNames(summary.unit_codes || []);
  const refs = await pool.query(
    `SELECT r.hash_key, e.title, e.chat_title, e.date, e.time, e.state, e.classification,
            e.cleaned_text, e.raw_text,
            COALESCE(NULLIF(TRIM(u."Name"), ''), u."UnitShortName") AS "UnitName",
            COALESCE(u."StateName", e.province) AS "StateName"
     FROM tbl_field_mgmt_summary_report_refs r
     LEFT JOIN tbl_unit_events e ON e.hash_key = r.hash_key
     LEFT JOIN tbl_units u ON e.unitcd = u."UnitCode"
     WHERE r.summary_id = $1
     ORDER BY e.date DESC NULLS LAST, e.time DESC NULLS LAST`,
    [id],
  );
  return { summary, refs: refs.rows };
}
